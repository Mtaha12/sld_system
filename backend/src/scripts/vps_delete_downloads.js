#!/usr/bin/env node
/**
 * SLD System - VPS Production Script: Delete Manage Downloads Records
 * 
 * Usage:
 *   node backend/src/scripts/vps_delete_downloads.js
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locate backend/.env or root .env
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

async function run() {
  console.log('\n==========================================================');
  console.log('   SLD SYSTEM - VPS PRODUCTION DELETE MANAGE DOWNLOADS');
  console.log('==========================================================\n');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  console.log(`[INFO] Connecting to MongoDB: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}`);
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  console.log('[OK] Connected to MongoDB.\n');

  const db = mongoose.connection.db;

  // 1. Delete all records from downloaditems (Manage Downloads: Finance Act, Tax Return, Updated Law)
  const downloadColl = db.collection('downloaditems');
  const countBefore = await downloadColl.countDocuments();
  console.log(`>>> Step 1: Manage Downloads records before purge: ${countBefore}`);

  const deleteResult = await downloadColl.deleteMany({});
  console.log(`    [OK] Successfully deleted ${deleteResult.deletedCount} Manage Download records.`);

  const countAfter = await downloadColl.countDocuments();
  console.log(`    Manage Downloads records remaining in database: ${countAfter}\n`);

  // 2. Also ensure taxcards records remain 0
  const taxColl = db.collection('taxcards');
  const taxBefore = await taxColl.countDocuments();
  if (taxBefore > 0) {
    const taxDel = await taxColl.deleteMany({});
    console.log(`>>> Step 2: Deleted ${taxDel.deletedCount} remaining TaxCard records.`);
  } else {
    console.log(`>>> Step 2: TaxCard collection is already empty (0 records).`);
  }

  console.log('\n==========================================================');
  console.log('                 VPS PURGE COMPLETED                      ');
  console.log('==========================================================');
  console.log(`Manage Downloads Remaining : ${countAfter}`);
  console.log(`Tax Cards Remaining        : 0`);
  console.log('==========================================================\n');

  await mongoose.disconnect();
  console.log('[OK] Database disconnected. Operation finished successfully!\n');
}

run().catch(err => {
  console.error('[ERROR] Fatal failure:', err);
  process.exit(1);
});

