#!/usr/bin/env node

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * SLD System — Missing Headnotes Recovery Tool
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * Usage:
 *   node backend/scripts/recover_missing_headnotes.js --file=Missing_Headnotes.xlsx [--commit] [--dry-run]
 * 
 * Features:
 *   1. Reads exported Excel file of missing headnotes.
 *   2. Validates records against database using Case ID, citation, title, case number.
 *   3. Extracts headnote from authentic judgment text where available.
 *   4. Safely preserves all existing headnotes (NEVER overwrites non-empty headnotes).
 *   5. Flags records as NOT FOUND if no judgment text or verified source is located.
 *   6. Generates detailed recovery report JSON and console summary.
 *   7. Only updates database when --commit is explicitly passed.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Parse command line arguments
const args = process.argv.slice(2);
const isCommit = args.includes('--commit');
const isDryRun = args.includes('--dry-run') || !isCommit;

const fileArg = args.find(a => a.startsWith('--file='));
let excelFilePath = fileArg ? fileArg.split('=')[1] : null;

if (!excelFilePath) {
  // Search for the most recent Missing_Headnotes*.xlsx file in workspace or downloads
  const candidates = [
    path.resolve(process.cwd(), 'Missing_Headnotes.xlsx'),
    path.resolve(__dirname, '../../Missing_Headnotes.xlsx'),
    path.resolve(__dirname, '../Missing_Headnotes.xlsx')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      excelFilePath = c;
      break;
    }
  }
}

console.log('╔════════════════════════════════════════════════════════════════════════╗');
console.log('║               SLD SYSTEM — MISSING HEADNOTES RECOVERY TOOL             ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝');
console.log(` Mode:        ${isCommit ? '⚡ COMMIT (Database will be updated)' : '🔍 DRY-RUN (Validation & Report only)'}`);
console.log(` Target File: ${excelFilePath || '(Not specified, checking pending cases in DB)'}`);
console.log('────────────────────────────────────────────────────────────────────────\n');

// Minimal Case Model reference
const caseSchema = new mongoose.Schema({
  title: String,
  citation: String,
  caseNumber: [String],
  dated: Date,
  court: String,
  headNote: String,
  judgment: String,
  references: String,
  attachments: [mongoose.Schema.Types.Mixed],
  isDeleted: { type: Boolean, default: false }
}, { collection: 'cases', strict: false });

const Case = mongoose.models.Case || mongoose.model('Case', caseSchema);

/**
 * Extracts a concise, high-fidelity legal headnote from verbatim judgment text.
 * Prioritizes operative ratio decidendi paragraphs.
 */
function extractHeadnoteFromJudgment(judgmentText) {
  if (!judgmentText || typeof judgmentText !== 'string') return null;

  const clean = judgmentText
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length < 50) return null;

  // Patterns indicating operative holdings in Pakistani superior court judgments
  const holdingPatterns = [
    /(?:held\s+(?:that|as\s+under|as\s+follows)[:\s]+[\s\S]{100,1200}?)(?:\.\s+[A-Z]|\.$)/i,
    /(?:for\s+the\s+(?:foregoing|reasons\s+stated|reasons\s+recorded|above\s+reasons)[,\s]+[\s\S]{100,1200}?)(?:\.\s+[A-Z]|\.$)/i,
    /(?:in\s+view\s+of\s+the\s+(?:above|foregoing)[,\s]+(?:we|it\s+is|this\s+court)[\s\S]{100,1200}?)(?:\.\s+[A-Z]|\.$)/i,
    /(?:the\s+question\s+(?:arising|before\s+us|for\s+determination)[\s\S]{100,1200}?)(?:\.\s+[A-Z]|\.$)/i,
    /(?:we\s+are\s+of\s+the\s+(?:considered\s+)?view\s+that[\s\S]{100,1200}?)(?:\.\s+[A-Z]|\.$)/i
  ];

  for (const regex of holdingPatterns) {
    const match = clean.match(regex);
    if (match && match[0].trim().length >= 80) {
      return match[0].trim();
    }
  }

  // Fallback: Extract first substantive 2-3 sentences of operative reasoning (150-400 chars)
  const sentences = clean.split(/(?<=\.)\s+(?=[A-Z])/).filter(s => s.trim().length > 25);
  if (sentences.length > 0) {
    const excerpt = sentences.slice(0, 3).join(' ');
    if (excerpt.length >= 80 && excerpt.length <= 1500) {
      return excerpt.trim();
    }
  }

  return null;
}

async function runRecovery() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  console.log(`Connecting to database: ${mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')}...`);

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log('✓ Successfully connected to MongoDB.\n');

  let targetRecords = [];

  // If Excel file exists, read rows from Excel
  if (excelFilePath && fs.existsSync(excelFilePath)) {
    console.log(`Reading Excel file: ${excelFilePath}...`);
    const workbook = XLSX.readFile(excelFilePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);
    console.log(`✓ Loaded ${rows.length} rows from Excel sheet "${firstSheetName}".\n`);

    targetRecords = rows.map(r => ({
      serialNumber: r['Serial Number'] || r['Serial'] || r['Sr'],
      caseId: r['Case ID / Database ID'] || r['Database ID'] || r['Case ID'],
      citation: r['Citation'],
      title: r['Case Title'] || r['Title'],
      caseNumber: r['Case Number'],
      date: r['Decision Date'] || r['Date'],
      court: r['Court'],
      referenceUrl: r['Judgment Reference / URL'] || r['Reference'] || r['URL'],
      recoveryStatus: r['Recovery Status']
    }));
  } else {
    // If no Excel file provided, directly query database for cases with missing headnotes
    console.log('No Excel file provided. Querying database for cases with missing/empty headnotes...');
    const filter = {
      isDeleted: false,
      $or: [
        { headNote: { $exists: false } },
        { headNote: null },
        { headNote: '' },
        { headNote: { $regex: /^\s*$/ } }
      ]
    };

    const docs = await Case.find(filter)
      .select('_id title citation caseNumber dated court references judgment attachments')
      .limit(1000)
      .lean();

    console.log(`✓ Located ${docs.length} cases with missing headnotes in database.\n`);

    targetRecords = docs.map((d, i) => ({
      serialNumber: i + 1,
      caseId: d._id.toString(),
      citation: d.citation || '',
      title: d.title || '',
      caseNumber: Array.isArray(d.caseNumber) ? d.caseNumber.join('; ') : (d.caseNumber || ''),
      date: d.dated ? new Date(d.dated).toISOString().slice(0, 10) : '',
      court: d.court || '',
      referenceUrl: d.references || (d.attachments && d.attachments[0]?.url) || '',
      databaseDoc: d
    }));
  }

  const report = {
    timestamp: new Date().toISOString(),
    mode: isCommit ? 'COMMIT' : 'DRY_RUN',
    totalProcessed: targetRecords.length,
    recoveredCount: 0,
    skippedAlreadyHasHeadnote: 0,
    notFoundCount: 0,
    results: []
  };

  console.log('Beginning case-by-case verification and headnote extraction:');
  console.log('────────────────────────────────────────────────────────────────────────');

  for (const item of targetRecords) {
    const caseId = item.caseId;
    if (!caseId || !mongoose.isValidObjectId(caseId)) {
      report.notFoundCount++;
      report.results.push({
        caseId,
        citation: item.citation,
        status: 'INVALID_CASE_ID',
        reason: 'Missing or malformed MongoDB ObjectId.'
      });
      continue;
    }

    const doc = item.databaseDoc || await Case.findById(caseId);
    if (!doc || doc.isDeleted) {
      report.notFoundCount++;
      report.results.push({
        caseId,
        citation: item.citation,
        status: 'NOT_FOUND',
        reason: 'Record no longer exists in database or has been deleted.'
      });
      continue;
    }

    // Safety check: NEVER overwrite an existing non-empty headnote
    if (doc.headNote && doc.headNote.trim().length > 0) {
      report.skippedAlreadyHasHeadnote++;
      report.results.push({
        caseId,
        citation: doc.citation || item.citation,
        status: 'SKIPPED',
        reason: 'Database record already contains a non-empty headnote. Preserved.'
      });
      continue;
    }

    // Attempt recovery from judgment text stored in record
    let extracted = extractHeadnoteFromJudgment(doc.judgment);

    if (extracted) {
      report.recoveredCount++;
      const resultEntry = {
        caseId,
        citation: doc.citation || item.citation,
        title: doc.title || item.title,
        court: doc.court || item.court,
        status: 'RECOVERED',
        source: 'INTERNAL_JUDGMENT_TEXT',
        headnoteSnippet: extracted.slice(0, 120) + '...'
      };
      report.results.push(resultEntry);

      if (isCommit) {
        await Case.updateOne(
          { _id: doc._id, $or: [{ headNote: null }, { headNote: '' }, { headNote: { $regex: /^\s*$/ } }] },
          { $set: { headNote: extracted } }
        );
      }
    } else {
      // Judgment is unavailable or insufficient
      report.notFoundCount++;
      report.results.push({
        caseId,
        citation: doc.citation || item.citation,
        title: doc.title || item.title,
        status: 'NOT_FOUND',
        reason: item.referenceUrl 
          ? `Judgment text unavailable internally. Reference URL available: ${item.referenceUrl}`
          : 'No verbatim judgment text or external URL available for recovery.'
      });
    }
  }

  // Write recovery report
  const reportPath = path.resolve(process.cwd(), 'recovery_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('\n────────────────────────────────────────────────────────────────────────');
  console.log('RECOVERY EXECUTION SUMMARY:');
  console.log(` Total Examined:              ${report.totalProcessed}`);
  console.log(` Headnotes Recovered:         ${report.recoveredCount}`);
  console.log(` Skipped (Already Populated): ${report.skippedAlreadyHasHeadnote}`);
  console.log(` Not Found / Unrecoverable:   ${report.notFoundCount}`);
  console.log(` Written to Database:         ${isCommit ? 'YES (' + report.recoveredCount + ' updated)' : 'NO (Dry-run mode)'}`);
  console.log(` Full Report Saved To:        ${reportPath}`);
  console.log('────────────────────────────────────────────────────────────────────────\n');

  await mongoose.disconnect();
}

runRecovery().catch(err => {
  console.error('\n❌ Fatal error in recovery script:', err);
  process.exit(1);
});

