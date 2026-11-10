#!/usr/bin/env node
/**
 * SLD System - Recount & Persist Total Database Citations (~550k+)
 *
 * Computes the exact citation count across all Case (`publications` & `mapYearPage`)
 * and `OtherCaseLaw` documents, persisting the result in `counters`
 * (`_id: 'case_citation_stats_v1'`) so `/api/cases/stats` returns instantaneously.
 *
 * Usage:
 *   node backend/src/scripts/vps_recount_citations.js
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { computeAndPersistCitationStats } from '../controllers/caseController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  console.log(`[INFO] Connecting to MongoDB: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}`);
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  console.log('[OK] Connected. Computing exact citation totals across database...');

  const t0 = Date.now();
  const stats = await computeAndPersistCitationStats();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);

  if (!stats) {
    console.error('[ERROR] Citation count calculation failed.');
    process.exit(1);
  }

  console.log('\n==========================================================');
  console.log('         DATABASE CITATION STATISTICS UPDATED             ');
  console.log('==========================================================');
  console.log(`Elapsed time                     : ${elapsed}s`);
  console.log(`Total Case Laws (Main DB)        : ${stats.totalCases.toLocaleString()}`);
  console.log(`Total Case Citations (All Arrays): ${stats.totalCitations.toLocaleString()}`);
  console.log(`Total Other Case Laws            : ${stats.totalOtherCases.toLocaleString()}`);
  console.log(`Total Citations Displayed        : ${stats.displayCount}`);
  console.log('==========================================================\n');

  await mongoose.disconnect();
  console.log('[OK] Done.');
}

run().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});
