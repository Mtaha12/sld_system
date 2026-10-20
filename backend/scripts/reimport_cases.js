/**
 * SLD Case Law Re-Import Script — Memory-Efficient Streaming Version
 * ──────────────────────────────────────────────────────────────────
 * Processes each Excel chunk (e.g. 1-15000.xlsx) together with its
 * matching HTML file(s) in one pass, then immediately bulk-inserts
 * and frees memory before moving to the next chunk.
 *
 * Run: cd backend && node --env-file=.env scripts/reimport_cases.js
 */

import mongoose from 'mongoose';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '../../');
const BATCH_SIZE = 300;

// ─── Text Cleaning ────────────────────────────────────────────────────────────

function cleanText(raw) {
  if (!raw) return '';
  let t = String(raw);

  // Remove literal \n\r \r\n \n \r sequences that appear as TEXT in Excel cells
  t = t.replace(/\\n\\r|\\r\\n|\\n|\\r/g, ' ');
  // Normalise actual line endings
  t = t.replace(/\r\n|\n\r|\r/g, '\n');

  // HTML: convert line-break tags → newline
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<\/p>/gi, '\n');
  t = t.replace(/<\/div>/gi, '\n');
  t = t.replace(/<\/li>/gi, '\n');
  t = t.replace(/<hr[^>]*>/gi, '\n');

  // Strip all remaining HTML tags
  t = t.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  t = t
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&#\d+;/g, '');

  // Normalise whitespace
  t = t.replace(/[ \t]+/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

// ─── Citation Parsing ─────────────────────────────────────────────────────────

function parseCitationCell(raw) {
  if (!raw) return { mapYearPage: [], publications: [] };
  const parts = String(raw).split(/\s*=\s*/).map(s => s.trim()).filter(Boolean);
  const mapYearPage  = [];
  const publications = [];
  const seen = new Set();

  for (const part of parts) {
    const key = part.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) continue;
    seen.add(key);
    mapYearPage.push(part);

    let pub = null;
    const m1 = part.match(/^\(?(\d{4})\)?\s+(\d{1,4})\s+([A-Za-z]+)\s+(\d+)$/);
    if (m1) { pub = { year: m1[1], vol: m1[2], mag: m1[3].toUpperCase(), page: m1[4] }; }

    if (!pub) {
      const m2 = part.match(/^(\d{4})\s+([A-Za-z]+)\s+(\d+)$/);
      if (m2) pub = { year: m2[1], vol: '', mag: m2[2].toUpperCase(), page: m2[3] };
    }
    if (!pub) {
      const m3 = part.match(/^([A-Za-z]+)\s+(\d{4})\s+(\d+)$/);
      if (m3) pub = { year: m3[2], vol: '', mag: m3[1].toUpperCase(), page: m3[3] };
    }
    if (pub) publications.push(pub);
  }
  return { mapYearPage, publications };
}

// ─── Laws Parsing ─────────────────────────────────────────────────────────────

function parseLaws(raw) {
  if (!raw) return [];
  // Split on literal \n\r or \r\n sequences (as text) or actual newlines
  const parts = String(raw)
    .split(/\\n\\r|\\r\\n|\\n|\\r|\n|\r/)
    .map(s => s.trim())
    .filter(Boolean);

  const laws = [];
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq > 0) {
      const statute  = part.slice(0, eq).trim();
      const sections = part.slice(eq + 1).trim();
      if (!statute) continue;
      const sp = sections.split(/[,;]/).map(s => s.trim()).filter(Boolean);
      if (sp.length === 0) {
        laws.push({ lawStatute: statute, section: '' });
      } else {
        for (const s of sp) laws.push({ lawStatute: statute, section: s });
      }
    } else if (part.trim()) {
      laws.push({ lawStatute: part.trim(), section: '' });
    }
  }
  return laws;
}

// ─── Helper Parsers ───────────────────────────────────────────────────────────

function parseJudges(raw) {
  if (!raw) return [];
  let t = cleanText(String(raw)).replace(/^AUTHOR\(S\)\s*:\s*/i, '');
  return t.split(/\bAND\b/i).map(s => s.trim()).filter(Boolean);
}

function parseLawyers(raw) {
  if (!raw) return [];
  return cleanText(String(raw)).split(/\n/).map(s => s.trim()).filter(Boolean);
}

function parsePetitioners(raw) {
  if (!raw) return [];
  return cleanText(String(raw)).split(/\bVS\.?\b|\bVERSUS\b/i).map(s => s.trim()).filter(Boolean);
}

function extractDate(caseNum) {
  if (!caseNum) return '';
  const m = String(caseNum).match(/decision\s*dated?\s*[:\-]?\s*([\d]{1,2}[-\/][\d]{1,2}[-\/][\d]{4})/i);
  return m ? m[1] : '';
}

function parseCaseNumbers(raw) {
  if (!raw) return [];
  const t = cleanText(String(raw));
  const lines = t.split(/\n/).map(s => s.trim()).filter(Boolean);
  return lines.length > 0 ? lines : (t ? [t] : []);
}

// ─── HTML Judgment Extraction ─────────────────────────────────────────────────

/**
 * Parse one HTML file and return Map<sldNumber (int), cleanJudgmentText>
 * Uses streaming line-by-line so we never hold the full file in a JS Map
 */
function parseHtmlFile(filePath) {
  const map = new Map();
  const html = fs.readFileSync(filePath, 'utf8');

  const caseRegex = /SLD\s*#\s*:\s*(\d+)\s*<br>/gi;
  let match;
  const positions = [];

  while ((match = caseRegex.exec(html)) !== null) {
    positions.push({ id: parseInt(match[1], 10), start: match.index });
  }
  for (let i = 0; i < positions.length; i++) {
    positions[i].end = i + 1 < positions.length ? positions[i + 1].start : html.length;
  }

  for (const pos of positions) {
    const chunk = html.slice(pos.start, pos.end);
    const text  = cleanText(chunk).replace(/^SLD\s*#\s*:\s*\d+\s*\n*/i, '').trim();
    if (text.length > 10) map.set(pos.id, text);
  }

  return map;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  console.log('\n🔌 Connecting to MongoDB:', MONGO_URI.replace(/:[^:@]+@/, ':***@'));

  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 600000,
  });
  console.log('✓ Connected to MongoDB\n');

  const { default: Case } = await import('../src/models/Case.js');

  // ── Step 1: Identify all Excel and HTML files ─────────────────────────────
  // This importer deliberately uses idempotent upserts. It must never remove
  // records that are not represented by the files being imported.
  const xlsxFiles = fs.readdirSync(ROOT)
    .filter(f => f.endsWith('.xlsx'))
    .sort((a, b) => {
      const na = parseInt(a.split('-')[0], 10) || 0;
      const nb = parseInt(b.split('-')[0], 10) || 0;
      return na - nb;
    });

  const htmlFiles = fs.readdirSync(ROOT)
    .filter(f => f.endsWith('.html'))
    .sort();

  console.log(`Found ${xlsxFiles.length} Excel files and ${htmlFiles.length} HTML files\n`);

  const excelIds = new Set();
  const htmlIds = new Set();
  const missingJudgments = new Set();
  let totalInserted = 0;
  let totalUpdated  = 0;
  let totalErrors   = 0;

  // ── Step 3: Process each Excel file in isolation ──────────────────────────
  for (const xlFile of xlsxFiles) {
    // Determine SLD range from filename, e.g. "1-15000.xlsx" → [1, 15000]
    const rangeMatch = xlFile.match(/^(\d+)-(\d+)\.xlsx$/);
    if (!rangeMatch) continue;
    const rangeMin = parseInt(rangeMatch[1], 10);
    const rangeMax = parseInt(rangeMatch[2], 10);

    console.log(`\n📊 Processing ${xlFile} (SLD #${rangeMin}–${rangeMax})`);

    // Load only the HTML files whose range overlaps with this Excel file
    const relevantHtml = htmlFiles.filter(h => {
      const hm = h.match(/^(\d+)-(\d+)\.html$/);
      if (!hm) return false;
      const hMin = parseInt(hm[1], 10);
      const hMax = parseInt(hm[2], 10);
      // Overlapping ranges
      return hMax >= rangeMin && hMin <= rangeMax;
    });

    console.log(`  Loading ${relevantHtml.length} matching HTML files for this range...`);

    // Build judgment map from only these HTML files
    const judgmentMap = new Map();
    for (const hf of relevantHtml) {
      const hPath = path.join(ROOT, hf);
      const sizeMB = Math.round(fs.statSync(hPath).size / 1024 / 1024 * 10) / 10;
      process.stdout.write(`    ${hf} (${sizeMB} MB)... `);
      const hMap = parseHtmlFile(hPath);
      for (const [id, text] of hMap) {
        htmlIds.add(id);
        judgmentMap.set(id, text);
      }
      console.log(`${hMap.size} judgments`);
    }

    // Parse Excel
    const xlPath = path.join(ROOT, xlFile);
    const wb   = xlsx.readFile(xlPath);
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

    const cases = [];
    for (let r = 1; r < rows.length; r++) {
      const row    = rows[r];
      const sldRaw = row[0];
      if (!sldRaw || isNaN(parseInt(sldRaw, 10))) continue;

      const sldInt = parseInt(sldRaw, 10);
      const sldStr = String(sldInt);
      excelIds.add(sldInt);

      const { mapYearPage, publications } = parseCitationCell(row[1]);
      const court       = cleanText(String(row[2] || ''));
      const laws        = parseLaws(row[3]);
      const caseNumber  = parseCaseNumbers(row[4]);
      const judges      = parseJudges(row[5]);
      const lawyers     = parseLawyers(row[6]);
      const petitioners = parsePetitioners(row[7]);
      const headNote    = cleanText(String(row[8] || ''));
      const dated       = extractDate(row[4]);
      const judgment    = judgmentMap.get(sldInt) || '';
      if (!judgment) missingJudgments.add(sldInt);

      cases.push({
        caseId:       `CASE-${sldStr.padStart(6, '0')}`,
        case_id:      `CASE-${sldStr.padStart(6, '0')}`,
        sldNumber:    sldStr,
        sldNumberInt: sldInt,
        dated,
        department:   'tax',
        court,
        caseNumber,
        judges,
        petitioners,
        lawyers,
        headNote,
        references:   '',
        principleLaw: '',
        legalMaxim:   '',
        judgment,
        publications,
        laws,
        mapYearPage,
        attachments:  [],
        isDeleted:    false,
        deletedAt:    null,
      });
    }

    console.log(`  Parsed ${cases.length} cases from Excel, ${cases.filter(c => c.judgment).length} have judgment text`);

    // Bulk upsert this batch. Existing records retain their manually curated
    // judgment when a source HTML record is absent.
    let batchInserted = 0;
    let batchUpdated = 0;
    let batchErrors   = 0;
    for (let i = 0; i < cases.length; i += BATCH_SIZE) {
      const batch = cases.slice(i, i + BATCH_SIZE);
      try {
        const operations = batch.map((item) => {
          const { judgment, ...metadata } = item;
          const set = judgment ? { ...metadata, judgment } : metadata;
          return {
            updateOne: {
              filter: { sldNumber: item.sldNumber },
              update: {
                $set: set,
                $setOnInsert: {
                  isDeleted: false,
                  deletedAt: null,
                },
              },
              upsert: true,
            },
          };
        });
        const result = await Case.bulkWrite(operations, { ordered: false });
        batchInserted += result.upsertedCount || 0;
        batchUpdated += result.modifiedCount || 0;
      } catch (err) {
        if (err.writeErrors) {
          batchErrors += err.writeErrors.length;
        } else {
          console.error(`  ❌ Batch error:`, err.message);
          batchErrors += batch.length;
        }
      }
    }

    totalInserted += batchInserted;
    totalUpdated += batchUpdated;
    totalErrors   += batchErrors;
    console.log(`  ✓ Inserted: ${batchInserted} | Updated: ${batchUpdated} | Errors: ${batchErrors} | Running total: ${totalInserted + totalUpdated}`);

    // Explicitly clear memory
    cases.length = 0;
    judgmentMap.clear();
  }

  console.log('\n✅ Import complete!');
  console.log(`   Total inserted : ${totalInserted}`);
  console.log(`   Total updated  : ${totalUpdated}`);
  console.log(`   Total errors   : ${totalErrors}`);
  console.log(`   Excel SLDs     : ${excelIds.size}`);
  console.log(`   HTML SLDs      : ${htmlIds.size}`);
  console.log(`   Missing HTML   : ${missingJudgments.size}`);
  if (missingJudgments.size > 0) {
    console.log(`   Missing IDs    : ${Array.from(missingJudgments).sort((a, b) => a - b).slice(0, 50).join(', ')}${missingJudgments.size > 50 ? ', ...' : ''}`);
  }

  // Final verification
  const count = await Case.countDocuments({ isDeleted: false });
  console.log(`   Live DB count  : ${count}`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected\n');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
