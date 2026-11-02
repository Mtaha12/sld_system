#!/usr/bin/env node

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * SLD System — Missing Headnotes Extraction & Excel Export
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * Extracts all case-law records where the Headnote is empty, null, or whitespace,
 * and saves them into a production-grade Excel (.xlsx) file with full tracking columns.
 * 
 * Requirements met:
 * 1. Stream/cursor-based processing to protect server memory.
 * 2. Stable database identifiers (MongoDB _id and SLD Ref #).
 * 3. Exact 10 standard tracking columns.
 * 4. Zero modification to database records (read-only export).
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

const CaseSchema = new mongoose.Schema({
  caseId: String,
  sldNumber: String,
  sldNumberInt: Number,
  title: String,
  petitioners: [String],
  citation: String,
  mapYearPage: mongoose.Schema.Types.Mixed,
  publications: [mongoose.Schema.Types.Mixed],
  caseNumber: [String],
  dated: mongoose.Schema.Types.Mixed,
  date: mongoose.Schema.Types.Mixed,
  decisionDate: mongoose.Schema.Types.Mixed,
  judgmentDate: mongoose.Schema.Types.Mixed,
  court: String,
  references: String,
  attachments: [mongoose.Schema.Types.Mixed],
  headNote: String,
  judgment: String,
  isDeleted: { type: Boolean, default: false }
}, { collection: 'cases', strict: false });

const Case = mongoose.models.Case || mongoose.model('Case', CaseSchema);

function formatCitation(doc) {
  if (doc.citation && doc.citation.trim() && doc.citation !== 'Nil') {
    return doc.citation.trim();
  }
  if (Array.isArray(doc.mapYearPage) && doc.mapYearPage.length > 0) {
    const formatted = doc.mapYearPage.map(m => {
      if (typeof m === 'string') return m;
      if (m && typeof m === 'object') {
        return [m.year, m.mag, m.page].filter(Boolean).join(' ');
      }
      return '';
    }).filter(Boolean).join(' = ');
    if (formatted) return formatted;
  }
  if (Array.isArray(doc.publications) && doc.publications.length > 0) {
    const pubs = doc.publications.map(p => {
      if (!p) return '';
      const mag = (p.mag || 'SLD').toUpperCase();
      const yr = p.year || '';
      const pg = p.page || '';
      return [yr, mag, pg].filter(Boolean).join(' ');
    }).filter(Boolean).join(' = ');
    if (pubs) return pubs;
  }
  if (doc.sldNumber) {
    return `SLD Ref #${doc.sldNumber}`;
  }
  return 'Unreported / Pending Publication';
}

function formatCaseTitle(doc) {
  if (doc.title && doc.title.trim()) return doc.title.trim();
  if (Array.isArray(doc.petitioners) && doc.petitioners.length > 0) {
    const cleanPet = doc.petitioners.filter(Boolean).join(' vs ');
    if (cleanPet) return cleanPet;
  }
  return 'Not Specified';
}

function formatCaseNumbers(doc) {
  if (Array.isArray(doc.caseNumber) && doc.caseNumber.length > 0) {
    return doc.caseNumber.filter(Boolean).join('; ');
  }
  if (typeof doc.caseNumber === 'string' && doc.caseNumber.trim()) {
    return doc.caseNumber.trim();
  }
  return 'N/A';
}

function formatDecisionDate(doc) {
  const raw = doc.dated || doc.decisionDate || doc.judgmentDate || doc.date;
  if (!raw) return '';
  if (typeof raw === 'string') return raw.slice(0, 10);
  try {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function formatReferenceUrl(doc) {
  if (doc.references && typeof doc.references === 'string' && doc.references.trim()) {
    return doc.references.trim();
  }
  if (Array.isArray(doc.attachments) && doc.attachments.length > 0) {
    const first = doc.attachments[0];
    if (first && (first.url || first.path)) {
      return first.url || first.path;
    }
  }
  return '';
}

async function exportMissingHeadnotesToExcel() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  console.log('╔════════════════════════════════════════════════════════════════════════╗');
  console.log('║        SLD SYSTEM — MISSING HEADNOTES EXTRACTION & EXCEL EXPORT       ║');
  console.log('╚════════════════════════════════════════════════════════════════════════╝');
  console.log(`Connecting to: ${mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')}...`);

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
  console.log('✓ Connected to MongoDB successfully.\n');

  const filter = {
    isDeleted: { $ne: true },
    $or: [
      { headNote: { $exists: false } },
      { headNote: null },
      { headNote: '' },
      { headNote: { $regex: /^\s*$/ } }
    ]
  };

  console.log('Scanning database for case law records with missing headnotes...');
  const totalMissing = await Case.countDocuments(filter);
  console.log(`Found total: ${totalMissing.toLocaleString()} cases with missing headnotes.\n`);

  if (totalMissing === 0) {
    console.log('🎉 No cases found with missing headnotes! All records are fully populated.');
    await mongoose.disconnect();
    return;
  }

  console.log('Streaming records and preparing structured Excel workbook...');
  const cursor = Case.find(filter)
    .select('_id sldNumber citation title petitioners caseNumber dated date decisionDate judgmentDate court references attachments judgment mapYearPage publications')
    .sort({ sldNumberInt: 1, _id: 1 })
    .lean()
    .cursor();

  const rows = [];
  let serial = 1;
  let hasJudgmentCount = 0;

  for await (const doc of cursor) {
    const hasJudgment = doc.judgment && typeof doc.judgment === 'string' && doc.judgment.trim().length > 50;
    if (hasJudgment) hasJudgmentCount++;

    rows.push({
      'Serial Number': serial++,
      'Case ID / Database ID': doc._id.toString(),
      'SLD Number': doc.sldNumber || '',
      'Citation': formatCitation(doc),
      'Case Title': formatCaseTitle(doc),
      'Case Number': formatCaseNumbers(doc),
      'Decision Date': formatDecisionDate(doc),
      'Court': doc.court || 'Superior Court',
      'Judgment Reference / URL': formatReferenceUrl(doc),
      'Headnote Status': 'Missing',
      'Recovery Status': hasJudgment ? 'Ready for Extraction (Judgment Available)' : 'Pending (Judgment Required)'
    });

    if (serial % 500 === 0 || serial === totalMissing + 1) {
      process.stdout.write(`  Processed ${Math.min(serial - 1, totalMissing)} / ${totalMissing} cases...\r`);
    }
  }

  console.log(`\n✓ Successfully processed all ${rows.length.toLocaleString()} records.`);
  console.log(`  - With verbatim judgment text ready for extraction: ${hasJudgmentCount.toLocaleString()}`);
  console.log(`  - Requiring external source / URL retrieval:        ${(rows.length - hasJudgmentCount).toLocaleString()}\n`);

  // Create Excel Workbook
  console.log('Building Excel worksheet and applying column widths...');
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set professional column widths
  worksheet['!cols'] = [
    { wch: 14 }, // Serial Number
    { wch: 28 }, // Case ID / Database ID
    { wch: 14 }, // SLD Number
    { wch: 28 }, // Citation
    { wch: 45 }, // Case Title
    { wch: 35 }, // Case Number
    { wch: 16 }, // Decision Date
    { wch: 35 }, // Court
    { wch: 45 }, // Judgment Reference / URL
    { wch: 16 }, // Headnote Status
    { wch: 42 }  // Recovery Status
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Missing Headnotes');

  const todayStr = new Date().toISOString().slice(0, 10);
  const rootOutputPath = path.resolve(process.cwd(), `Missing_Headnotes_${todayStr}.xlsx`);
  const fixedOutputPath = path.resolve(process.cwd(), 'Missing_Headnotes.xlsx');

  console.log(`Writing Excel file to disk...`);
  XLSX.writeFile(workbook, rootOutputPath);
  XLSX.writeFile(workbook, fixedOutputPath);

  const stats = fs.statSync(rootOutputPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
  console.log('║                       EXPORT COMPLETED SUCCESSFULLY                    ║');
  console.log('╚════════════════════════════════════════════════════════════════════════╝');
  console.log(` Total Exported Records: ${rows.length.toLocaleString()}`);
  console.log(` File Size:              ${sizeMB} MB`);
  console.log(` File Saved To:          ${rootOutputPath}`);
  console.log(` Alias Saved To:         ${fixedOutputPath}`);
  console.log('────────────────────────────────────────────────────────────────────────\n');

  await mongoose.disconnect();
}

exportMissingHeadnotesToExcel().catch(err => {
  console.error('\n❌ Fatal error running missing headnotes export:', err);
  process.exit(1);
});

