import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function cleanText(val) {
  if (!val || typeof val !== 'string') return '';
  return val
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(tr|div|p|h[1-6]|li)>/gi, '\n')
    .replace(/<(td|th)[^>]*>/gi, ' ')
    .replace(/<\/(td|th)>/gi, '   ')
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
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
    .replace(/&rdquo;|&ldquo;/gi, '"')
    .replace(/\\r\\n|\\n\\r/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\/n\/r|\/r\/n/g, '\n')
    .replace(/\r/g, '')
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function verifyAllJudgments() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  await mongoose.connect(mongoUri);
  const coll = mongoose.connection.db.collection('cases');

  console.log('[1/4] Connected to MongoDB.');

  // Fetch all SLDs that currently have no judgment
  const emptyDocs = await coll.find(
    { $or: [{ judgment: { $exists: false } }, { judgment: null }, { judgment: '' }] },
    { projection: { sldNumberInt: 1, sldNumber: 1 } }
  ).toArray();

  const emptySldMap = new Map();
  for (const d of emptyDocs) {
    if (d.sldNumberInt) emptySldMap.set(d.sldNumberInt, d);
    else if (d.sldNumber) emptySldMap.set(parseInt(d.sldNumber, 10), d);
  }

  console.log(`[2/4] Total cases without judgment in DB: ${emptySldMap.size}`);

  const htmlFiles = fs.readdirSync(ROOT_DIR).filter(f => f.endsWith('.html') && /^\d+-\d+\.html$/.test(f));
  console.log(`[3/4] Scanning ${htmlFiles.length} HTML files...`);

  const updatesToApply = [];
  let checkedCount = 0;

  for (const file of htmlFiles) {
    const filePath = path.join(ROOT_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
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

    checkedCount += fileEntries.length;

    for (const e of fileEntries) {
      if (emptySldMap.has(e.sld)) {
        const text = cleanText(e.raw);
        if (text.length > 30) {
          updatesToApply.push({ sld: e.sld, judgment: text, source: file });
          emptySldMap.delete(e.sld); // Marked as restored
        }
      }
    }
  }

  console.log(`[4/4] Checked ${checkedCount} entries across all HTML files.`);
  console.log(`Found ${updatesToApply.length} judgments that can be restored!`);

  if (updatesToApply.length > 0) {
    console.log(`Applying updates to MongoDB...`);
    const bulkOps = updatesToApply.map(u => ({
      updateOne: {
        filter: { sldNumberInt: u.sld },
        update: { $set: { judgment: u.judgment } }
      }
    }));

    const BATCH = 500;
    for (let i = 0; i < bulkOps.length; i += BATCH) {
      await coll.bulkWrite(bulkOps.slice(i, i + BATCH));
      console.log(`  Updated ${Math.min(i + BATCH, bulkOps.length)} / ${bulkOps.length}`);
    }
    console.log('Restoration complete!');
  }

  // Final check
  const totalCases = await coll.countDocuments();
  const withJ = await coll.countDocuments({ judgment: { $exists: true, $nin: [null, ''] } });
  const remainingWithoutJ = await coll.countDocuments({ $or: [{ judgment: { $exists: false } }, { judgment: null }, { judgment: '' }] });

  console.log('\n================ DATABASE STATUS ================');
  console.log(`Total Cases: ${totalCases}`);
  console.log(`Cases with Judgment: ${withJ}`);
  console.log(`Cases without Judgment remaining: ${remainingWithoutJ}`);

  // Sample the remaining cases to see what they are
  if (remainingWithoutJ > 0) {
    const remainingSample = await coll.find(
      { $or: [{ judgment: { $exists: false } }, { judgment: null }, { judgment: '' }] },
      { projection: { sldNumber: 1, sldNumberInt: 1, headNote: 1, court: 1, laws: 1, yearVolume: 1 } }
    ).limit(5).toArray();

    console.log('\nSample of remaining cases without judgment:');
    for (const s of remainingSample) {
      console.log(`- SLD #${s.sldNumber} (${s.yearVolume || ''}): HeadNote chars = ${(s.headNote || '').length}`);
    }
  }
  console.log('=================================================');

  process.exit(0);
}

verifyAllJudgments().catch(err => {
  console.error(err);
  process.exit(1);
});
