import XLSX from 'xlsx';

const wb = XLSX.readFile('../1-15000.xlsx');
const s = wb.Sheets['CASE DATA'];
const data = XLSX.utils.sheet_to_json(s, { header: 1 });

const clean = (val) => String(val ?? '').trim();

/**
 * Parses individual citation string into object and normalized Year Mag Page string
 */
function normalizeCitation(rawCitation) {
  let text = clean(rawCitation);
  if (!text) return null;

  // Handle parenthesized year: e.g. (2005) 92 TAX 141 or (2011) 103 TAX 216
  const parenMatch = text.match(/^\((\d{4})\)\s*(.*)$/);
  if (parenMatch) {
    const year = parenMatch[1];
    const rest = parenMatch[2].trim();
    const parts = rest.split(/\s+/);
    // e.g. 92 TAX 141 -> vol: 92, mag: TAX, page: 141
    if (parts.length >= 3) {
      return {
        year,
        vol: parts[0],
        mag: parts[1],
        page: parts.slice(2).join(' '),
        formatted: `(${year}) ${parts[0]} ${parts[1].toUpperCase()} ${parts.slice(2).join(' ')}`
      };
    } else if (parts.length === 2) {
      return {
        year,
        vol: '',
        mag: parts[0],
        page: parts[1],
        formatted: `(${year}) ${parts[0].toUpperCase()} ${parts[1]}`
      };
    }
    return {
      year,
      vol: '',
      mag: parts[0] || '',
      page: parts.slice(1).join(' '),
      formatted: `(${year}) ${rest}`
    };
  }

  // Handle standard tokens:
  // e.g. "SLD 2006 1" -> mag year page -> year mag page: "2006 SLD 1"
  // e.g. "2006 SLD 1" -> year mag page: "2006 SLD 1"
  // e.g. "2006 PTD 499" -> year mag page: "2006 PTD 499"
  // e.g. "2009 PTCL 341" -> year mag page: "2009 PTCL 341"
  const parts = text.split(/\s+/);
  
  // Check if first part is 4-digit year: "2006 SLD 1"
  if (/^\d{4}$/.test(parts[0])) {
    const year = parts[0];
    if (parts.length >= 4 && /^\d+$/.test(parts[1])) {
      // 2005 92 TAX 141 (year, vol, mag, page)
      const vol = parts[1];
      const mag = parts[2];
      const page = parts.slice(3).join(' ');
      return {
        year,
        vol,
        mag,
        page,
        formatted: `${year} ${vol} ${mag.toUpperCase()} ${page}`
      };
    } else if (parts.length >= 3) {
      // 2006 SLD 1
      const mag = parts[1];
      const page = parts.slice(2).join(' ');
      return {
        year,
        vol: '',
        mag,
        page,
        formatted: `${year} ${mag.toUpperCase()} ${page}`
      };
    } else if (parts.length === 2) {
      return {
        year,
        vol: '',
        mag: parts[1],
        page: '',
        formatted: `${year} ${parts[1].toUpperCase()}`
      };
    }
  }

  // Check if second part is 4-digit year: "SLD 2006 1"
  if (parts.length >= 3 && /^\d{4}$/.test(parts[1])) {
    const mag = parts[0];
    const year = parts[1];
    const page = parts.slice(2).join(' ');
    return {
      year,
      vol: '',
      mag,
      page,
      formatted: `${year} ${mag.toUpperCase()} ${page}`
    };
  }

  // Fallback
  return {
    year: '',
    vol: '',
    mag: parts[0] || '',
    page: parts.slice(1).join(' '),
    formatted: text
  };
}

function parseRowCitations(rawCell) {
  if (!rawCell) return { mapYearPage: [], publications: [] };
  // Split cell by 2 or more whitespace characters or '='
  const rawParts = String(rawCell).split(/(?:\s{2,}|=|;|\r?\n)/).map(clean).filter(Boolean);
  
  const publications = [];
  const mapYearPage = [];
  const seenKeys = new Set();

  for (const part of rawParts) {
    const parsed = normalizeCitation(part);
    if (!parsed) continue;

    // Deduplication key: e.g. "2006|sld|1"
    const dedupKey = `${parsed.year}|${parsed.mag.toLowerCase()}|${parsed.vol}|${parsed.page}`.toLowerCase();
    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);

    publications.push({
      year: parsed.year,
      vol: parsed.vol,
      mag: parsed.mag.toLowerCase(),
      page: parsed.page
    });
    mapYearPage.push(parsed.formatted);
  }

  return { mapYearPage, publications };
}

// Test on first 15 rows
for (let i = 1; i <= 15; i++) {
  const parsed = parseRowCitations(data[i][1]);
  console.log(`\nSLD ${data[i][0]}:`);
  console.log('RAW: ', data[i][1]);
  console.log('MAP: ', parsed.mapYearPage);
  console.log('PUBS:', parsed.publications);
}
