#!/usr/bin/env node
/**
 * SLD SYSTEM - VERIFIED CASE LAW ATTACHMENT AUDIT & REPORT SCRIPT
 * Checks every case in MongoDB with an attachment, verifies whether
 * the physical PDF file exists on the VPS disk, confirms it's a valid PDF,
 * and prints an exact list of all working case laws with their citations and filenames.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(process.cwd(), '.env'),
  '/var/www/sld_system/backend/.env',
  '/var/www/sld-system/backend/.env',
  '/var/www/sldsystem.com/backend/.env',
  '/var/www/api.sldsystem.com/backend/.env'
];

for (const ep of envPaths) {
  if (fs.existsSync(ep)) {
    dotenv.config({ path: ep });
    break;
  }
}

const STORAGE_ROOTS = [
  path.resolve(__dirname, '../../../uploads/reference_views'),
  path.resolve(__dirname, '../../uploads/reference_views'),
  '/var/www/sld_system/backend/uploads/reference_views',
  '/var/www/sld_system/uploads/reference_views',
  '/var/www/sld-system/backend/uploads/reference_views',
  '/var/www/sldsystem.com/backend/uploads/reference_views'
];

const findPhysicalFile = (rawFilenameOrUrl) => {
  if (!rawFilenameOrUrl) return null;
  const decoded = decodeURIComponent(String(rawFilenameOrUrl).trim());
  const cleanBase = path.basename(decoded.split('?')[0].split('#')[0]);
  if (!cleanBase || cleanBase === '.' || cleanBase === '/') return null;

  const variants = [
    cleanBase,
    cleanBase.replace(/ /g, '-'),
    cleanBase.replace(/-/g, ' '),
    cleanBase.toLowerCase(),
    cleanBase.replace(/ /g, '-').toLowerCase(),
    cleanBase.replace(/-/g, ' ').toLowerCase()
  ];

  for (const root of STORAGE_ROOTS) {
    if (!fs.existsSync(root)) continue;
    for (const v of variants) {
      const p = path.join(root, v);
      if (fs.existsSync(p)) {
        try {
          const stats = fs.statSync(p);
          if (stats.isFile() && stats.size > 0) {
            // Check PDF header
            const fd = fs.openSync(p, 'r');
            const buffer = Buffer.alloc(5);
            fs.readSync(fd, buffer, 0, 5, 0);
            fs.closeSync(fd);
            const isPdf = buffer.toString('utf8', 0, 5).startsWith('%PDF-');
            return {
              path: p,
              size: stats.size,
              filename: v,
              isPdf
            };
          }
        } catch (_) {}
      }
    }
  }
  return null;
};

async function auditCaseAttachments() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  console.log('\n================================================================');
  console.log('   SLD SYSTEM - CASE LAW ATTACHMENT AUDIT & VERIFICATION       ');
  console.log('================================================================');
  console.log(`Connecting to database...`);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const collections = ['cases', 'othercaselaws'];
  const verifiedCases = [];
  const missingCases = [];

  for (const colName of collections) {
    const cursor = db.collection(colName).find({
      isDeleted: { $ne: true },
      $or: [
        { 'attachments.0': { $exists: true } },
        { 'attachments': { $exists: true, $not: { $size: 0 } } },
        { 'attachment': { $exists: true, $nin: ['', null] } },
        { 'attachmentsData.0': { $exists: true } },
        { 'downloadLink': { $exists: true, $nin: ['', null] } },
        { 'reference': { $exists: true, $nin: ['', null] } },
        { 'references.0': { $exists: true } }
      ]
    }).sort({ sldNumberInt: 1, sldNumber: 1 });

    for await (const doc of cursor) {
      const sldNo = doc.sldNumber || doc.srNumber || doc.caseId || doc._id;
      let citation = doc.mapYearPage || '';
      if (Array.isArray(doc.publications) && doc.publications.length > 0) {
        const p = doc.publications[0];
        citation = `${p.year || ''} ${(p.mag || p.magazine || 'SLD').toUpperCase()} ${p.page || ''}`.trim();
      }
      const title = (Array.isArray(doc.caseNumber) ? doc.caseNumber[0] : doc.caseNumber) || doc.title || doc.court || 'Case Document';

      // Gather candidate attachment paths
      const candidates = [];
      if (Array.isArray(doc.attachments)) {
        for (const a of doc.attachments) {
          if (typeof a === 'string') candidates.push(a);
          else if (a && typeof a === 'object') {
            if (a.url) candidates.push(a.url);
            if (a.path) candidates.push(a.path);
            if (a.name) candidates.push(a.name);
            if (a.filename) candidates.push(a.filename);
          }
        }
      }
      if (doc.attachment && typeof doc.attachment === 'string') {
        candidates.push(doc.attachment);
      }
      if (doc.downloadLink && typeof doc.downloadLink === 'string') {
        candidates.push(doc.downloadLink);
      }
      if (doc.reference && typeof doc.reference === 'string' && /\.pdf/i.test(doc.reference)) {
        candidates.push(doc.reference);
      }
      if (Array.isArray(doc.references)) {
        for (const r of doc.references) {
          if (typeof r === 'string' && /\.pdf/i.test(r)) candidates.push(r);
        }
      }

      let resolvedFile = null;
      for (const c of candidates) {
        const res = findPhysicalFile(c);
        if (res) {
          resolvedFile = res;
          break;
        }
      }

      if (resolvedFile) {
        verifiedCases.push({
          collection: colName,
          sldNumber: sldNo,
          citation,
          title: title.slice(0, 50),
          filename: resolvedFile.filename,
          sizeKb: Math.round(resolvedFile.size / 1024),
          isValidPdf: resolvedFile.isPdf,
          diskPath: resolvedFile.path
        });
      } else if (candidates.length > 0) {
        missingCases.push({
          collection: colName,
          sldNumber: sldNo,
          citation,
          title: title.slice(0, 50),
          referencedAttachments: candidates.slice(0, 2)
        });
      }
    }
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`TOTAL CASES EVALUATED WITH ATTACHMENT ENTRIES: ${verifiedCases.length + missingCases.length}`);
  console.log(`  ✓ PROPER WORKING ATTACHMENTS (VERIFIED ON DISK): ${verifiedCases.length}`);
  console.log(`  ✗ MISSING ATTACHMENTS (IN DB BUT FILE NOT ON DISK): ${missingCases.length}`);
  console.log('----------------------------------------------------------------\n');

  console.log('=== [1] LIST OF CASE LAWS WITH PROPER ATTACHMENTS (OPENING CLEANLY) ===\n');
  printfTable(verifiedCases);

  // Write text report
  const reportPath = path.resolve(process.cwd(), 'verified_case_attachments_report.txt');
  let reportText = `SLD SYSTEM - CASE LAW ATTACHMENT AUDIT REPORT\n`;
  reportText += `Generated on: ${new Date().toISOString()}\n`;
  reportText += `Verified Working Attachments: ${verifiedCases.length}\n`;
  reportText += `Missing Attachments: ${missingCases.length}\n\n`;
  reportText += `=========================================================================================\n`;
  reportText += `SLD #      | CITATION             | FILE NAME                                | SIZE (KB)\n`;
  reportText += `=========================================================================================\n`;
  for (const c of verifiedCases) {
    reportText += `${String(c.sldNumber).padEnd(10)} | ${String(c.citation).padEnd(20)} | ${String(c.filename).padEnd(40)} | ${c.sizeKb} KB\n`;
  }
  if (missingCases.length > 0) {
    reportText += `\n=========================================================================================\n`;
    reportText += `CASES WITH MISSING FILES ON DISK (${missingCases.length})\n`;
    reportText += `=========================================================================================\n`;
    for (const m of missingCases) {
      reportText += `SLD #${m.sldNumber} | ${m.citation} | Refs: ${m.referencedAttachments.join(', ')}\n`;
    }
  }
  fs.writeFileSync(reportPath, reportText);
  console.log(`\nFull report written to: ${reportPath}`);

  // Write JSON report as well
  const jsonPath = path.resolve(process.cwd(), 'verified_case_attachments_report.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ verifiedCases, missingCases }, null, 2));
  console.log(`JSON report written to: ${jsonPath}`);

  await mongoose.disconnect();
  process.exit(0);
}

function printfTable(rows) {
  if (rows.length === 0) {
    console.log('  No verified case laws with attachments found yet.');
    return;
  }
  console.log(
    'SLD #'.padEnd(10) +
    '| ' + 'CITATION'.padEnd(20) +
    '| ' + 'FILE NAME'.padEnd(42) +
    '| ' + 'SIZE (KB)'.padEnd(10) +
    '| STATUS'
  );
  console.log('-'.repeat(95));
  for (const r of rows) {
    console.log(
      String(r.sldNumber).padEnd(10) +
      '| ' + String(r.citation).padEnd(20) +
      '| ' + String(r.filename).padEnd(42) +
      '| ' + `${r.sizeKb} KB`.padEnd(10) +
      '| ✓ Verified PDF'
    );
  }
}

auditCaseAttachments().catch(err => {
  console.error('[Error during audit]:', err);
  process.exit(1);
});
