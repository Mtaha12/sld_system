const formatOneCitation = (value) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';

  // 1. (Year) Vol Mag Page: e.g. "(2025) 131 TAX 1" or "2025 131 TAX 1"
  const m1 = text.match(/^\(?(\d{4})\)?\s+(\d{1,4})\s+([A-Za-z][A-Za-z.-]*)\s+(\d+)$/i);
  if (m1) {
    const yr = m1[1];
    const vol = m1[2];
    const mag = m1[3].toUpperCase();
    const page = m1[4];
    return `(${yr}) ${vol} ${mag} ${page}`;
  }

  // 2. Vol Mag Page: e.g. "131 TAX 1" (where vol < 1900)
  const m2 = text.match(/^(\d{1,4})\s+([A-Za-z][A-Za-z.-]*)\s+(\d+)$/i);
  if (m2 && parseInt(m2[1], 10) < 1900) {
    const vol = m2[1];
    const mag = m2[2].toUpperCase();
    const page = m2[3];
    return `${vol} ${mag} ${page}`;
  }

  // 3. Year Mag Page: e.g. "2024 SLD 5052"
  const m3 = text.match(/^\(?(\d{4})\)?\s+([A-Za-z][A-Za-z.-]*)\s+(\d+)$/i);
  if (m3) {
    const yr = m3[1];
    const mag = m3[2].toUpperCase();
    const page = m3[3];
    return `${yr} ${mag} ${page}`;
  }

  // 4. Mag Year Page: e.g. "SLD 2024 5052"
  const m4 = text.match(/^([A-Za-z][A-Za-z.-]*)\s+(\d{4})\s+(\d+)$/i);
  if (m4) {
    const mag = m4[1].toUpperCase();
    const yr = m4[2];
    const page = m4[3];
    return `${yr} ${mag} ${page}`;
  }

  // 5. Mag Vol Page: e.g. "TAX 131 1"
  const m5 = text.match(/^([A-Za-z][A-Za-z.-]*)\s+(\d{1,4})\s+(\d+)$/i);
  if (m5 && parseInt(m5[2], 10) < 1900) {
    const mag = m5[1].toUpperCase();
    const vol = m5[2];
    const page = m5[3];
    return `${vol} ${mag} ${page}`;
  }

  return text;
};

export const formatCitations = (mapYearPage = [], publications = []) => {
  const mappedCitations = Array.isArray(mapYearPage) ? mapYearPage : [];
  const publicationCitations = Array.isArray(publications) ? publications.map((p) => {
    if (!p) return '';
    const mag = String(p.mag || p.magazine || '').trim().toUpperCase();
    const page = String(p.page || '').trim();
    const yr = String(p.year || '').trim();
    const vol = String(p.vol || '').trim();
    if (!mag || !page) return '';

    if (yr && vol) {
      return `(${yr}) ${vol} ${mag} ${page}`;
    }
    if (vol) {
      return `${vol} ${mag} ${page}`;
    }
    if (yr) {
      return `${yr} ${mag} ${page}`;
    }
    return `${mag} ${page}`;
  }).filter(Boolean) : [];

  const source = [...mappedCitations, ...publicationCitations];
  const formattedList = source.map(formatOneCitation).filter(Boolean);

  const citationMap = new Map();
  for (const cit of formattedList) {
    const parsed = cit.match(/^(?:\(?(\d{4})\)?\s+)?(?:(\d{1,4})\s+)?([A-Za-z][A-Za-z.-]*)\s+(\d+)$/i);
    let key;
    let hasVol = false;
    if (parsed) {
      const yr = parsed[1] || '';
      const vol = parsed[2] || '';
      const mag = parsed[3].toUpperCase();
      const page = parsed[4];
      hasVol = Boolean(vol);
      key = `${yr ? `${yr}_` : ''}${mag}_${page}`.toLowerCase();
    } else {
      key = cit.replace(/[()]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    }

    if (!citationMap.has(key)) {
      citationMap.set(key, { cit, hasVol });
    } else {
      const existing = citationMap.get(key);
      if (!existing.hasVol && hasVol) {
        citationMap.set(key, { cit, hasVol });
      }
    }
  }

  return Array.from(citationMap.values()).map(entry => entry.cit);
};

export const getCitationSortKey = (mapYearPage = [], publications = [], magazine = '') => {
  const cleanMagazine = String(magazine || '').trim().toLowerCase();
  const citations = formatCitations(mapYearPage, publications);
  const matching = citations
    .filter((citation) => !cleanMagazine || citation.toLowerCase().split(/\s+/).includes(cleanMagazine))
    .map((citation) => {
      const match = citation.match(/^(?:\(?(\d{4})\)?\s+)?(?:(\d{1,4})\s+)?[A-Za-z][A-Za-z.-]*\s+(\d+)$/);
      return match ? { year: Number(match[1] || match[2] || 0), page: Number(match[3]) } : null;
    })
    .filter(Boolean);

  if (matching.length === 0) return { year: -1, page: -1 };
  return matching.reduce((best, current) => (
    current.year > best.year || (current.year === best.year && current.page > best.page)
      ? current
      : best
  ));
};

export default formatCitations;
