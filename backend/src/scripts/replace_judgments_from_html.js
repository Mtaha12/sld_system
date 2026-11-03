import fs from 'fs';
import path from 'path';
import connectDB from '../config/db.js';
import Case from '../models/Case.js';

// HTML entity decoder
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&#(\d+);/g, (match, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return match;
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return match;
      }
    });
}

// Clean HTML to formatted plain text judgment
function cleanHtmlToJudgmentText(rawHtml) {
  if (!rawHtml) return '';
  let text = rawHtml;

  // Cut off at the end-of-block boundary:
  // Usually <div style="clear:both;"></div> followed by <hr> or next div
  const clearBothIdx = text.search(/<div[^>]*style=["'][^"']*clear\s*:\s*both[^"']*["'][^>]*>/i);
  if (clearBothIdx !== -1) {
    text = text.slice(0, clearBothIdx);
  }

  // Also remove trailing <hr> if any remains
  text = text.replace(/<hr[^>]*>[\s\S]*$/i, '');

  // Convert line breaks and paragraph breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/?(?:p|div|tr|h\d)[^>]*>/gi, '\n');
  text = text.replace(/<\/td>/gi, '\t');

  // Strip all other HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Normalize whitespace:
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  text = text.replace(/[ \t]+/g, ' '); // collapse horizontal spaces
  text = text.replace(/^[ \t]+/gm, '').replace(/[ \t]+$/gm, ''); // trim lines
  text = text.replace(/\n{3,}/g, '\n\n'); // normalize double newlines

  return text.trim();
}

// 12 HTML files with their calculated offsets and target ranges
const fileRules = [
  {
    file: '138800  TO 140000 TRANSFER IN THESE NUMBER.html',
    sourceMin: 138800,
    sourceMax: 140000,
    targetMin: 138800,
    targetMax: 140000,
    offset: 0
  },
  {
    file: '140001 TO 142000 TRANSFER IN THESE NUMBER.html',
    sourceMin: 140001,
    sourceMax: 142000,
    targetMin: 140001,
    targetMax: 142000,
    offset: 0
  },
  {
    file: '146714-149832 TRANSFER IN 147381 TO 150499.html',
    sourceMin: 146714,
    sourceMax: 149832,
    targetMin: 147381,
    targetMax: 150499,
    offset: 667
  },
  {
    file: '150800-152000 TRANSFER IN 151467 TO 152667.html',
    sourceMin: 150800,
    sourceMax: 152000,
    targetMin: 151467,
    targetMax: 152667,
    offset: 667
  },
  {
    file: '152001 TO 154000 TRANSFER IN 152668 TO 154667.html',
    sourceMin: 152001,
    sourceMax: 154000,
    targetMin: 152668,
    targetMax: 154667,
    offset: 667
  },
  {
    file: '154001-155180 TRANSFER IN 154668 TO 155847.html',
    sourceMin: 154001,
    sourceMax: 155180,
    targetMin: 154668,
    targetMax: 155847,
    offset: 667
  },
  {
    file: '155184-156000 TRANSFER IN 155859 TO 156675.html',
    sourceMin: 155184,
    sourceMax: 156000,
    targetMin: 155859,
    targetMax: 156675,
    offset: 675
  },
  {
    file: '156001 TO 158000 TRANSFER IN 156676 TO 158675.html',
    sourceMin: 156001,
    sourceMax: 158000,
    targetMin: 156676,
    targetMax: 158675,
    offset: 675
  },
  {
    file: '158001-160000 TRANSFER IN 158676 TO 160675.html',
    sourceMin: 158001,
    sourceMax: 160000,
    targetMin: 158676,
    targetMax: 160675,
    offset: 675
  },
  {
    file: '160001 TO 162000 TRANFFER IN 160676 TO 162675.html',
    sourceMin: 160001,
    sourceMax: 162000,
    targetMin: 160676,
    targetMax: 162675,
    offset: 675
  },
  {
    file: '162001 TO 164000 TRABSFER IN 162676 TO 164675.html',
    sourceMin: 162001,
    sourceMax: 164000,
    targetMin: 162676,
    targetMax: 164675,
    offset: 675
  },
  {
    file: '164001-165132 TRANSFER IN 164676 TO 165807.html',
    sourceMin: 164001,
    sourceMax: 165132,
    targetMin: 164676,
    targetMax: 165807,
    offset: 675
  }
];

async function run() {
  const overallStartTime = Date.now();
  console.log('Connecting to MongoDB...');
  await connectDB();
  console.log('MongoDB Connected successfully.\n');

  // Baseline database stats
  const totalCasesInDb = await Case.countDocuments();
  const baselineWithoutJudgment = await Case.countDocuments({
    $or: [
      { judgment: { $exists: false } },
      { judgment: null },
      { judgment: '' }
    ]
  });
  const baselineWithJudgment = totalCasesInDb - baselineWithoutJudgment;

  console.log('================ INITIAL DATABASE STATUS ================');
  console.log(`Total Cases in DB:             ${totalCasesInDb.toLocaleString()}`);
  console.log(`Cases with Judgment (Initial): ${baselineWithJudgment.toLocaleString()}`);
  console.log(`Cases without Judgment (Initial): ${baselineWithoutJudgment.toLocaleString()}\n`);

  const perFileReports = [];
  const allTransferredDeltas = []; // for VPS sync export
  let grandTotalMatched = 0;
  let grandTotalUpdated = 0;
  let grandTotalNonEmptyJudgments = 0;
  let grandTotalEmptySkipped = 0;

  for (let fileIdx = 0; fileIdx < fileRules.length; fileIdx++) {
    const rule = fileRules[fileIdx];
    const fileStartTime = Date.now();
    console.log(`\n---------------------------------------------------------`);
    console.log(`[File ${fileIdx + 1}/${fileRules.length}] Processing: ${rule.file}`);
    console.log(`Offset: +${rule.offset} (Source ${rule.sourceMin}..${rule.sourceMax} -> Target ${rule.targetMin}..${rule.targetMax})`);

    if (!fs.existsSync(rule.file)) {
      console.error(`File NOT found: ${rule.file}`);
      continue;
    }

    const content = fs.readFileSync(rule.file, 'utf8');
    const regex = /SLD\s*#:\s*(\d+)([\s\S]*?)(?=(?:SLD\s*#:\s*\d+|$))/gi;
    let match;

    const parsedEntries = [];
    let fileEmptyCount = 0;

    while ((match = regex.exec(content)) !== null) {
      const sourceSld = parseInt(match[1], 10);
      const rawBody = match[2];
      const cleanJudgment = cleanHtmlToJudgmentText(rawBody);

      if (cleanJudgment.length > 0) {
        const targetSld = sourceSld + rule.offset;
        parsedEntries.push({
          sourceSld,
          targetSld,
          cleanJudgment
        });
      } else {
        fileEmptyCount++;
      }
    }

    grandTotalNonEmptyJudgments += parsedEntries.length;
    grandTotalEmptySkipped += fileEmptyCount;

    console.log(`Parsed ${parsedEntries.length} non-empty judgments (${fileEmptyCount} empty skipped in HTML).`);

    // Bulk update in batches of 100 for optimal socket performance and zero timeouts
    const BATCH_SIZE = 100;
    let fileMatched = 0;
    let fileUpdated = 0;

    for (let i = 0; i < parsedEntries.length; i += BATCH_SIZE) {
      const batch = parsedEntries.slice(i, i + BATCH_SIZE);
      const bulkOps = batch.map(item => ({
        updateOne: {
          filter: { sldNumberInt: item.targetSld },
          update: {
            $set: {
              judgment: item.cleanJudgment
            }
          }
        }
      }));

      const res = await Case.bulkWrite(bulkOps, { ordered: false });
      fileMatched += (res.matchedCount || 0);
      fileUpdated += (res.modifiedCount || 0);

      // Collect delta for VPS export
      for (const item of batch) {
        allTransferredDeltas.push({
          targetSld: item.targetSld,
          judgment: item.cleanJudgment
        });
      }

      if ((i + BATCH_SIZE) % 500 === 0 || (i + BATCH_SIZE) >= parsedEntries.length) {
        const progressCount = Math.min(i + BATCH_SIZE, parsedEntries.length);
        const progressPct = ((progressCount / parsedEntries.length) * 100).toFixed(0);
        process.stdout.write(`  Updating DB: ${progressCount}/${parsedEntries.length} (${progressPct}%) | Matched: ${fileMatched} | Modified: ${fileUpdated}\r`);
      }
    }

    grandTotalMatched += fileMatched;
    grandTotalUpdated += fileUpdated;

    const fileDurationSec = ((Date.now() - fileStartTime) / 1000).toFixed(2);
    console.log(`\n-> Completed in ${fileDurationSec}s | Matched in DB: ${fileMatched} | Updated/Replaced: ${fileUpdated}`);

    perFileReports.push({
      file: rule.file,
      sourceRange: `${rule.sourceMin} - ${rule.sourceMax}`,
      targetRange: `${rule.targetMin} - ${rule.targetMax}`,
      offset: rule.offset,
      nonEmptyJudgments: parsedEntries.length,
      emptySkipped: fileEmptyCount,
      matchedInDb: fileMatched,
      updatedInDb: fileUpdated,
      durationSec: fileDurationSec
    });
  }

  // After all updates, calculate final database status
  console.log(`\n================ FINAL DATABASE STATUS ================`);
  const finalCasesInDb = await Case.countDocuments();
  const finalWithoutJudgment = await Case.countDocuments({
    $or: [
      { judgment: { $exists: false } },
      { judgment: null },
      { judgment: '' }
    ]
  });
  const finalWithJudgment = finalCasesInDb - finalWithoutJudgment;
  const netGainedJudgments = finalWithJudgment - baselineWithJudgment;

  console.log(`Total Cases in DB:               ${finalCasesInDb.toLocaleString()}`);
  console.log(`Total Judgments Matched & Transferred: ${grandTotalMatched.toLocaleString()} cases`);
  console.log(`Total Judgments Modified/Replaced:     ${grandTotalUpdated.toLocaleString()} cases`);
  console.log(`Cases WITH Judgment (Final):     ${finalWithJudgment.toLocaleString()} (Net gain: +${netGainedJudgments.toLocaleString()})`);
  console.log(`Cases WITHOUT Judgment (Final):  ${finalWithoutJudgment.toLocaleString()} (Reduced from ${baselineWithoutJudgment.toLocaleString()})`);
  console.log(`Total Execution Time:            ${((Date.now() - overallStartTime) / 1000).toFixed(2)}s`);

  // Save the export file for VPS transfer
  const exportDir = path.resolve('backend/scratch');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const exportFilePath = path.join(exportDir, 'transferred_judgments_delta.json');
  console.log(`\nWriting VPS delta export file to ${exportFilePath}...`);
  fs.writeFileSync(exportFilePath, JSON.stringify(allTransferredDeltas), 'utf8');
  const exportStats = fs.statSync(exportFilePath);
  console.log(`Export file ready: ${(exportStats.size / (1024 * 1024)).toFixed(2)} MB (${allTransferredDeltas.length.toLocaleString()} records).`);

  // Write a summary log file
  const summaryFilePath = path.join(exportDir, 'replacement_summary_report.json');
  fs.writeFileSync(summaryFilePath, JSON.stringify({
    totalCasesInDb: finalCasesInDb,
    grandTotalNonEmptyInFiles: grandTotalNonEmptyJudgments,
    grandTotalEmptyInFiles: grandTotalEmptySkipped,
    grandTotalMatchedInDb: grandTotalMatched,
    grandTotalUpdatedInDb: grandTotalUpdated,
    baselineWithoutJudgment,
    finalWithoutJudgment,
    finalWithJudgment,
    netGainedJudgments,
    perFileReports
  }, null, 2), 'utf8');
  console.log(`Summary report saved to ${summaryFilePath}.`);

  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error during judgment replacement:', err);
  process.exit(1);
});
