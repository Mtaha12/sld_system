import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import XLSX from 'xlsx';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ROOT_DIR = path.resolve(__dirname, '../../..');
const JUDGMENT_DIR = path.resolve(ROOT_DIR, 'JUDGMENT');

/**
 * Universal text sanitizer: strips HTML tags, decodes entities, cleans slash escapes
 */
export function cleanText(val) {
  if (!val || typeof val !== 'string') return '';

  let cleaned = val;

  // 1. Replace <br> and <br/> with newline
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');

  // 2. Replace closing block tags with newline
  cleaned = cleaned.replace(/<\/(tr|div|p|h[1-6]|li)>/gi, '\n');

  // 3. Replace table cells with spaces
  cleaned = cleaned.replace(/<(td|th)[^>]*>/gi, ' ');
  cleaned = cleaned.replace(/<\/(td|th)>/gi, '   ');

  // 4. Strip links but preserve text: <a ...>text</a> -> text
  cleaned = cleaned.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1');

  // 5. Strip any remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // 6. Decode HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&#39;|&apos;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&hellip;/gi, '…')
    .replace(/&bull;/gi, '•')
    .replace(/&rsquo;|&lsquo;/gi, "'")
    .replace(/&rdquo;|&ldquo;/gi, '"');

  // 7. Clean escaped newline/return markers (e.g. literal "\n\r", "\n", "\r", "/n/r", "/n", "/r")
  cleaned = cleaned
    .replace(/\\r\\n|\\n\\r/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\/n\/r|\/r\/n/g, '\n')
    .replace(/\r/g, '');

  // 8. Clean trailing spaces and excessive blank lines
  cleaned = cleaned
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

/**
 * Robust Law Parser that splits on literal \n\r, \r\n, /n, /r, real \n, real \r
 */
export function parseRawLaws(rawVal) {
  if (!rawVal) return [];
  const text = String(rawVal).trim();
  const lines = text
    .split(/(?:\\r\\n|\\n\\r|\\n|\\r|\/r\/n|\/n\/r|\/n|\/r|\r?\n)+/)
    .map(s => s.trim())
    .filter(Boolean);

  const results = [];

  for (const line of lines) {
    const cleanLine = line.replace(/\\r|\\n|\/r|\/n|\r|\n/g, '').trim();
    if (!cleanLine) continue;

    if (cleanLine.includes('=')) {
      const idx = cleanLine.indexOf('=');
      const lawStatute = cleanText(cleanLine.slice(0, idx));
      const sections = cleanLine
        .slice(idx + 1)
        .split(',')
        .map(s => cleanText(s.replace(/\\r|\\n|\/r|\/n|\r|\n/g, '')))
        .filter(Boolean);

      for (const section of (sections.length ? sections : [''])) {
        results.push({ lawStatute, section });
      }
    } else {
      const match = cleanLine.match(/^(.+?,\s*\d{4}|\D+?)\s+([0-9A-Za-z(),._ -]+)$/);
      if (match) {
        const lawStatute = cleanText(match[1]);
        const sections = match[2]
          .split(',')
          .map(s => cleanText(s.replace(/\\r|\\n|\/r|\/n|\r|\n/g, '')))
          .filter(Boolean);

        for (const section of (sections.length ? sections : [''])) {
          results.push({ lawStatute, section });
        }
      } else {
        results.push({ lawStatute: cleanText(cleanLine), section: '' });
      }
    }
  }
  return results;
}

async function run() {
  console.log('='.repeat(75));
  console.log('STARTING DEFINITIVE FIX FOR MISSING JUDGMENTS, LAWS & SLASHES');
  console.log('='.repeat(75));

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  await mongoose.connect(mongoUri);
  console.log('[1/4] Connected to MongoDB.');

  const coll = mongoose.connection.db.collection('cases');

  // STEP 1: Fix Laws for cases 162866..165278 directly from 150001-170000.xlsx
  console.log('\n[2/4] Re-parsing Laws for cases 162866..165278 to eliminate all \\n\\r pollution...');
  const file150k = path.join(ROOT_DIR, '150001-170000.xlsx');
  const wb = XLSX.readFile(file150k, { cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const lawBulkOps = [];
  for (let i = 1; i < rows.length; i++) {
    const sldNum = parseInt(rows[i][0], 10);
    if (isNaN(sldNum)) continue;

    const rawLaws = rows[i][4];
    if (rawLaws) {
      const parsedLaws = parseRawLaws(rawLaws);
      lawBulkOps.push({
        updateOne: {
          filter: { sldNumberInt: sldNum },
          update: {
            $set: {
              laws: parsedLaws,
              headNote: cleanText(rows[i][9]),
              court: cleanText(rows[i][3])
            }
          }
        }
      });
    }
  }

  if (lawBulkOps.length > 0) {
    console.log(`Writing cleanly parsed laws for ${lawBulkOps.length} cases...`);
    const BATCH = 500;
    for (let i = 0; i < lawBulkOps.length; i += BATCH) {
      await coll.bulkWrite(lawBulkOps.slice(i, i + BATCH));
      console.log(`  Updated ${Math.min(i + BATCH, lawBulkOps.length)} / ${lawBulkOps.length}`);
    }
  }

  // STEP 2: Import missing judgments from JUDGMENT/ folder
  console.log('\n[3/4] Importing missing judgments from JUDGMENT/ folder (e.g. SLD 34741, 36366)...');
  const judgmentFiles = fs.readdirSync(JUDGMENT_DIR).filter(f => f.endsWith('.html'));
  let judgmentsImportedCount = 0;

  for (const file of judgmentFiles) {
    const content = fs.readFileSync(path.join(JUDGMENT_DIR, file), 'utf-8');
    const regex = /SLD\s*#\s*:\s*(\d+)/gi;

    let match;
    let lastSld = null;
    let lastIndex = 0;
    const fileEntries = [];

    while ((match = regex.exec(content)) !== null) {
      if (lastSld !== null) {
        fileEntries.push({ sld: lastSld, raw: content.slice(lastIndex, match.index) });
      }
      lastSld = parseInt(match[1], 10);
      lastIndex = match.index + match[0].length;
    }
    if (lastSld !== null) {
      fileEntries.push({ sld: lastSld, raw: content.slice(lastIndex) });
    }

    for (const e of fileEntries) {
      const cleanJ = cleanText(e.raw);
      if (cleanJ.length > 50) {
        const doc = await coll.findOne({ sldNumberInt: e.sld }, { projection: { sldNumber: 1, judgment: 1 } });
        if (!doc || !doc.judgment || doc.judgment.trim().length === 0) {
          await coll.updateOne(
            { sldNumberInt: e.sld },
            { $set: { judgment: cleanJ } }
          );
          judgmentsImportedCount++;
          console.log(`  -> Added missing judgment for SLD ${e.sld} (${cleanJ.length} chars) from ${file}`);
        }
      }
    }
  }

  console.log(`Imported ${judgmentsImportedCount} previously missing judgments.`);

  // STEP 3: Clean any remaining escaped \n, \r, /n, /r across all cases
  console.log('\n[4/4] Sanitizing all escaped markers (\\n, \\r, /n, /r) across all fields...');
  const dirtyCases = await coll.find({
    $or: [
      { judgment: { $regex: /\\n|\\r|\\r\\n|\/n\/r/ } },
      { headNote: { $regex: /\\n|\\r|\\r\\n|\/n\/r/ } },
      { 'laws.section': { $regex: /\\n|\\r|\/n|\/r/ } },
      { 'laws.lawStatute': { $regex: /\\n|\\r|\/n|\/r/ } }
    ]
  }, { projection: { _id: 1, judgment: 1, headNote: 1, laws: 1 } }).toArray();

  console.log(`Found ${dirtyCases.length} cases with remaining escaped markers.`);

  if (dirtyCases.length > 0) {
    const cleanOps = [];
    for (const doc of dirtyCases) {
      const update = {};
      if (doc.judgment) update.judgment = cleanText(doc.judgment);
      if (doc.headNote) update.headNote = cleanText(doc.headNote);
      if (Array.isArray(doc.laws)) {
        update.laws = doc.laws.map(l => ({
          lawStatute: cleanText(l.lawStatute),
          section: cleanText(l.section)
        }));
      }

      cleanOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: update }
        }
      });
    }

    await coll.bulkWrite(cleanOps);
    console.log(`Cleaned all ${cleanOps.length} cases.`);
  }

  // AUDIT CHECKS
  const badLawsRemaining = await coll.countDocuments({
    $or: [
      { 'laws.lawStatute': { $regex: /\\n|\\r|\/n|\/r/ } },
      { 'laws.section': { $regex: /\\n|\\r|\/n|\/r/ } }
    ]
  });

  const badHnRemaining = await coll.countDocuments({
    headNote: { $regex: /\\n|\\r|\\r\\n|\/n\/r/ }
  });

  const badJudgmentRemaining = await coll.countDocuments({
    judgment: { $regex: /\\n|\\r|\\r\\n|\/n\/r/ }
  });

  const htmlRemaining = await coll.countDocuments({
    $or: [
      { judgment: { $regex: /<[a-z/][\s\S]*?>/i } },
      { headNote: { $regex: /<[a-z/][\s\S]*?>/i } }
    ]
  });

  console.log('='.repeat(75));
  console.log('FINAL AUDIT:');
  console.log(`- Cases with bad laws remaining: ${badLawsRemaining}`);
  console.log(`- Cases with bad headnotes remaining: ${badHnRemaining}`);
  console.log(`- Cases with bad judgments remaining: ${badJudgmentRemaining}`);
  console.log(`- Cases with HTML tags remaining: ${htmlRemaining}`);
  console.log('='.repeat(75));

  process.exit(0);
}

run().catch(err => {
  console.error('[Error]:', err);
  process.exit(1);
});
