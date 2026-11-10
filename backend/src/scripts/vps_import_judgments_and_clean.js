#!/usr/bin/env node
/**
 * SLD System - VPS Production Judgment Import & TaxCard Purge Script
 * 
 * Usage:
 *   node backend/src/scripts/vps_import_judgments_and_clean.js
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { cleanLegalPlainText } from '../utils/textSanitizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locate backend/.env
const envPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(process.cwd(), '.env')
];
for (const ep of envPaths) {
  if (fs.existsSync(ep)) {
    dotenv.config({ path: ep });
    break;
  }
}

function cleanHtmlToJudgment(rawHtml) {
  return cleanLegalPlainText(rawHtml);
}

function loadJudgments() {
  const gzPath = path.resolve(__dirname, 'vps_judgments_delta.json.gz');
  if (fs.existsSync(gzPath)) {
    console.log(`[INFO] Found compressed payload: ${gzPath}`);
    const buffer = fs.readFileSync(gzPath);
    const decompressed = zlib.gunzipSync(buffer);
    const list = JSON.parse(decompressed.toString('utf8'));
    console.log(`[INFO] Decompressed ${list.length} judgments from payload.`);
    return list;
  }

  // Fallback to HTML files if present
  console.log('[INFO] Payload not found, checking for raw HTML files...');
  const f1 = path.resolve(process.cwd(), '117501 to 120000 Judgment data missing.html');
  const f2 = path.resolve(process.cwd(), '125922 TO 127000.html');
  const list = [];
  const regex = /SLD\s*#:\s*(\d+)[\s\S]*?(?=(?:SLD\s*#:\s*\d+|$))/gi;

  for (const fp of [f1, f2]) {
    if (fs.existsSync(fp)) {
      console.log(`[INFO] Reading ${fp}...`);
      const html = fs.readFileSync(fp, 'utf8');
      let m;
      while ((m = regex.exec(html)) !== null) {
        const sld = m[1];
        const cl = cleanHtmlToJudgment(m[0]);
        if (cl && cl.length > 10) {
          list.push({ sldNumber: sld, sldNumberInt: parseInt(sld, 10), judgment: cl });
        }
      }
    }
  }

  const map = new Map();
  for (const item of list) {
    map.set(item.sldNumber, item);
  }
  return Array.from(map.values());
}

async function run() {
  console.log('\n==========================================================');
  console.log('   SLD SYSTEM - VPS PRODUCTION JUDGMENT & TAXCARD UPDATE');
  console.log('==========================================================\n');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  console.log('[INFO] Connecting to MongoDB...');
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  console.log('[OK] MongoDB connected successfully.\n');

  const db = mongoose.connection.db;
  const Case = db.collection('cases');
  const TaxCard = db.collection('taxcards');
  const DownloadItem = db.collection('downloaditems');

  // STEP 1: PURGE TAXCARD AND MANAGE DOWNLOAD RECORDS AS REQUESTED
  console.log('>>> Step 1: Purging TaxCard and Manage Downloads records...');
  const taxCountBefore = await TaxCard.countDocuments();
  console.log(`    Tax cards before deletion: ${taxCountBefore}`);
  const deleteRes = await TaxCard.deleteMany({});
  console.log(`    [OK] Deleted ${deleteRes.deletedCount} tax card records.`);

  const downloadCountBefore = await DownloadItem.countDocuments();
  console.log(`    Manage Downloads before deletion: ${downloadCountBefore}`);
  const downloadDelRes = await DownloadItem.deleteMany({});
  console.log(`    [OK] Deleted ${downloadDelRes.deletedCount} Manage Download records.`);
  console.log(`    Current Tax cards: 0, Manage Downloads: 0\n`);

  // STEP 2: LOAD JUDGMENTS PAYLOAD
  console.log('>>> Step 2: Loading Judgments payload...');
  const judgments = loadJudgments();
  if (judgments.length === 0) {
    console.error('[ERROR] No judgments found to import. Exiting.');
    process.exit(1);
  }
  console.log(`    [OK] Ready to process ${judgments.length} unique case judgments.\n`);

  // STEP 3: DATABASE STATUS BEFORE UPDATE
  console.log('>>> Step 3: Checking Case Law status before import...');
  const totalCasesBefore = await Case.countDocuments();
  const emptyBefore = await Case.countDocuments({ judgment: { $in: ['', null] } });
  console.log(`    Total cases in database: ${totalCasesBefore}`);
  console.log(`    Cases currently EMPTY: ${emptyBefore}\n`);

  // STEP 4: UPDATE CASES IN BATCHES
  console.log('>>> Step 4: Updating judgments in MongoDB...');
  const BATCH_SIZE = 500;
  let totalUpdated = 0;
  let totalMatched = 0;

  for (let i = 0; i < judgments.length; i += BATCH_SIZE) {
    const batch = judgments.slice(i, i + BATCH_SIZE);
    const ops = batch.map(it => {
      const parsedInt = it.sldNumberInt || parseInt(it.sldNumber, 10);
      return {
        updateOne: {
          filter: parsedInt ? { sldNumberInt: parsedInt } : { sldNumber: String(it.sldNumber) },
          update: {
            $set: {
              judgment: it.judgment,
              updatedAt: new Date()
            }
          }
        }
      };
    });

    const res = await Case.bulkWrite(ops, { ordered: false });
    totalMatched += (res.matchedCount || 0);
    totalUpdated += (res.modifiedCount || 0);

    const progress = Math.min(i + BATCH_SIZE, judgments.length);
    process.stdout.write(`    Progress: ${progress} / ${judgments.length} processed (Matched: ${totalMatched}, Updated: ${totalUpdated})\r`);
  }

  console.log(`\n    [OK] Bulk write finished. Matched: ${totalMatched}, Updated: ${totalUpdated}\n`);

  // STEP 5: FINAL VERIFICATION
  console.log('>>> Step 5: Final Database Verification...');
  const totalCasesAfter = await Case.countDocuments();
  const emptyStringAfter = await Case.countDocuments({ judgment: '' });
  const emptyNullAfter = await Case.countDocuments({ judgment: null });
  const notExistsAfter = await Case.countDocuments({ judgment: { $exists: false } });
  const totalEmptyAfter = emptyStringAfter + emptyNullAfter + notExistsAfter;
  const totalPopulated = totalCasesAfter - totalEmptyAfter;

  console.log('==========================================================');
  console.log('                 FINAL VPS DATABASE SUMMARY               ');
  console.log('==========================================================');
  console.log(`Total Case Laws in Database : ${totalCasesAfter}`);
  console.log(`Case Laws WITH Judgments    : ${totalPopulated}`);
  console.log(`Case Laws EMPTY Judgments   : ${totalEmptyAfter}`);
  console.log(`  - judgment is empty string: ${emptyStringAfter}`);
  console.log(`  - judgment is null        : ${emptyNullAfter}`);
  console.log(`  - judgment field missing  : ${notExistsAfter}`);
  console.log(`Tax Cards in Database       : ${taxCountAfter}`);
  console.log('==========================================================\n');

  await mongoose.disconnect();
  console.log('[OK] Database disconnected. Update completed successfully!\n');
}

run().catch(err => {
  console.error('[ERROR] Fatal failure:', err);
  process.exit(1);
});

