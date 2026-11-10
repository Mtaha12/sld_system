#!/usr/bin/env node
/**
 * SLD System - Complete Production Database Setup & Website Formatting Cleanup
 *
 * Performs idempotent setup & sanitation across the VPS/local MongoDB:
 *  1. Ensures backend upload directories exist (reference_views, newsletters, payment_proofs, court_cache).
 *  2. Imports clean judgments from vps_judgments_delta.json.gz for empty or scraper-noisy cases.
 *  3. Sanitizes all Case (`headNote`, `judgment`) records removing website/scraper HTML, scripts,
 *     broken attributes, and UTF-8/Win-1252 mojibake without losing text or paragraph structure.
 *  4. Cleans website inline CSS/HTML bloat and mojibake from News, Statutes, Notifications,
 *     Downloads, Dictionary, and OtherCaseLaw records.
 *  5. Initializes Dashboard Board fixed baselines:
 *       - Statutes / Laws: 3,000 (+ auto-increments as new records are added)
 *       - Notifications:   30,000 (+ auto-increments as new records are added)
 *     (Pass --no-reset-baselines to preserve existing baseline counters.)
 *  6. Recomputes and persists exact Case & OtherCaseLaw citation counts (550k+ citations).
 *
 * Usage:
 *   node backend/src/scripts/vps_clean_and_setup_db.js
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import Case from '../models/Case.js';
import Statute from '../models/Statute.js';
import Notification from '../models/Notification.js';
import News from '../models/News.js';
import Dictionary from '../models/Dictionary.js';
import DownloadItem from '../models/DownloadItem.js';
import OtherCaseLaw from '../models/OtherCaseLaw.js';
import { cleanLegalPlainText, cleanWebsiteHtmlBloat } from '../utils/textSanitizer.js';
import { getCandidateUploadRoots } from '../utils/attachmentStorage.js';
import { getBoardStatuteAndNotificationCounts } from '../utils/dashboardBoardStats.js';

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

const SCRAPER_CASE_NOISE_RE =
  /<(?:div|hr|script|style|noscript|iframe|table|tbody|tr|td|html|head|body|meta|link|font)\b|<\/?(?:https?|mailto|ftp):|clear:both|margin:\s*50px|!important"|<!--|\b(?:width|height|text-align):""/i;

const RICH_HTML_BLOAT_RE =
  /helvetica=""|open=""|general=""|Open Sans|Helvetica Neue|<(?:p|div|span|li|h[1-6]|td|th)(?:Times|Open Sans|Helvetica|Arial|font-|style=)|<(?:p|div|span|a|img|table)\b[^>]*$|box-sizing:|font-family:|border:\s*0px|vertical-align:|<script\b|<style\b|<noscript\b|<iframe\b|<!--|mso-|!important"|â€|Â[\s\u00a0]/i;

const MONGO_CANDIDATE_NOISE_RE = /<[a-z\/!]|!important|clear:both|box-sizing:|helvetica=""|general=""|Open Sans|Helvetica Neue|border:\s*0px|mso-|â€|Â/i;

function sanitizeCaseField(raw) {
  if (!raw || typeof raw !== 'string') return raw || '';
  if (SCRAPER_CASE_NOISE_RE.test(raw)) {
    return cleanLegalPlainText(raw);
  }
  if (RICH_HTML_BLOAT_RE.test(raw)) {
    return cleanWebsiteHtmlBloat(raw);
  }
  return raw;
}

async function flushBulk(model, ops) {
  if (!ops.length) return 0;
  const res = await model.bulkWrite(ops, { ordered: false });
  ops.length = 0;
  return res.modifiedCount || 0;
}

async function ensureUploadDirectories() {
  const roots = getCandidateUploadRoots();
  const primaryRoot = roots[0];
  const subdirs = ['reference_views', 'newsletters', 'payment_proofs', 'court_cache'];
  fs.mkdirSync(primaryRoot, { recursive: true });
  for (const sub of subdirs) {
    fs.mkdirSync(path.join(primaryRoot, sub), { recursive: true });
  }
  return primaryRoot;
}

async function applyDeltaJudgmentsIfNeeded() {
  const deltaPath = path.join(__dirname, 'vps_judgments_delta.json.gz');
  if (!fs.existsSync(deltaPath)) {
    console.log('[SKIP] vps_judgments_delta.json.gz not found; skipping delta step.');
    return { total: 0, updated: 0 };
  }

  const parsed = JSON.parse(zlib.gunzipSync(fs.readFileSync(deltaPath)).toString('utf8'));
  const deltaMap = new Map();
  for (const item of parsed) {
    if (item?.sldNumberInt && typeof item.judgment === 'string') {
      deltaMap.set(Number(item.sldNumberInt), cleanLegalPlainText(item.judgment));
    }
  }

  const sldInts = Array.from(deltaMap.keys());
  const existing = await Case.find(
    { sldNumberInt: { $in: sldInts } },
    { _id: 1, sldNumberInt: 1, judgment: 1 }
  ).lean();

  const ops = [];
  let updated = 0;
  for (const doc of existing) {
    const targetClean = deltaMap.get(doc.sldNumberInt);
    if (typeof targetClean !== 'string') continue;

    const currentRaw = (doc.judgment || '').trim();
    const currentStripped = SCRAPER_CASE_NOISE_RE.test(currentRaw)
      ? cleanLegalPlainText(currentRaw)
      : currentRaw;

    // Update if empty, stub-only, or containing raw scraper HTML that differs from clean delta
    const shouldReplace =
      currentStripped.length === 0 ||
      (SCRAPER_CASE_NOISE_RE.test(currentRaw) && targetClean.length > 0 && currentRaw !== targetClean);

    if (shouldReplace && currentRaw !== targetClean) {
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { judgment: targetClean } }
        }
      });
      if (ops.length >= 500) {
        updated += await flushBulk(Case, ops);
      }
    }
  }
  updated += await flushBulk(Case, ops);
  return { total: deltaMap.size, updated };
}

async function cleanCasesCollection() {
  const cursor = Case.find(
    {
      $or: [
        { judgment: { $regex: MONGO_CANDIDATE_NOISE_RE } },
        { headNote: { $regex: MONGO_CANDIDATE_NOISE_RE } }
      ]
    },
    { _id: 1, judgment: 1, headNote: 1 }
  )
    .lean()
    .cursor();

  let scanned = 0;
  let modified = 0;
  const ops = [];

  for await (const doc of cursor) {
    scanned += 1;
    const patch = {};

    if (typeof doc.judgment === 'string') {
      const cleanedJ = sanitizeCaseField(doc.judgment);
      if (cleanedJ !== doc.judgment) {
        patch.judgment = cleanedJ;
      }
    }
    if (typeof doc.headNote === 'string') {
      const cleanedH = sanitizeCaseField(doc.headNote);
      if (cleanedH !== doc.headNote) {
        patch.headNote = cleanedH;
      }
    }

    if (Object.keys(patch).length > 0) {
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: patch }
        }
      });
      if (ops.length >= 500) {
        modified += await flushBulk(Case, ops);
      }
    }
  }
  modified += await flushBulk(Case, ops);
  return { scanned, modified };
}

async function cleanRichFieldCollection(model, fieldName, label, hasBlocks = false) {
  const filter = hasBlocks
    ? {
        $or: [
          { [fieldName]: { $regex: MONGO_CANDIDATE_NOISE_RE } },
          { 'blocks.detail': { $regex: MONGO_CANDIDATE_NOISE_RE } }
        ]
      }
    : { [fieldName]: { $regex: MONGO_CANDIDATE_NOISE_RE } };
  const cursor = model.find(filter, { _id: 1, [fieldName]: 1, ...(hasBlocks ? { blocks: 1 } : {}) }).lean().cursor();

  let scanned = 0;
  let modified = 0;
  const ops = [];

  for await (const doc of cursor) {
    scanned += 1;
    const rawVal = doc[fieldName];
    const patch = {};

    if (typeof rawVal === 'string' && RICH_HTML_BLOAT_RE.test(rawVal)) {
      const cleaned = cleanWebsiteHtmlBloat(rawVal);
      if (cleaned !== rawVal) {
        patch[fieldName] = cleaned;
      }
    }

    if (Array.isArray(doc.blocks) && doc.blocks.length > 0) {
      let blocksChanged = false;
      const newBlocks = doc.blocks.map((blk) => {
        if (blk && typeof blk.detail === 'string' && RICH_HTML_BLOAT_RE.test(blk.detail)) {
          const cleanedDetail = cleanWebsiteHtmlBloat(blk.detail);
          if (cleanedDetail !== blk.detail) {
            blocksChanged = true;
            return { ...blk, detail: cleanedDetail };
          }
        }
        return blk;
      });
      if (blocksChanged) {
        patch.blocks = newBlocks;
      }
    }

    if (Object.keys(patch).length > 0) {
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: patch }
        }
      });
      if (ops.length >= 500) {
        modified += await flushBulk(model, ops);
      }
    }
  }
  modified += await flushBulk(model, ops);
  return { label, scanned, modified };
}

async function run() {
  const t0 = Date.now();
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  console.log(`[INFO] Connecting to MongoDB: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}`);
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 20000 });
  console.log('[OK] Connected.');

  const primaryUploadDir = await ensureUploadDirectories();
  console.log(`[OK] Upload root verified: ${primaryUploadDir}`);

  const deltaStats = await applyDeltaJudgmentsIfNeeded();
  console.log(`[OK] Delta judgments check: ${deltaStats.updated} updated (out of ${deltaStats.total} delta records).`);

  const caseStats = await cleanCasesCollection();
  console.log(`[OK] Cases formatting sanitation: ${caseStats.modified} updated (${caseStats.scanned} candidates scanned).`);

  const collectionResults = [];
  collectionResults.push(await cleanRichFieldCollection(News, 'detail', 'News', false));
  collectionResults.push(await cleanRichFieldCollection(Statute, 'detail', 'Statutes', true));
  collectionResults.push(await cleanRichFieldCollection(Notification, 'detail', 'Notifications', true));
  collectionResults.push(await cleanRichFieldCollection(DownloadItem, 'detail', 'Downloads', false));
  collectionResults.push(await cleanRichFieldCollection(Dictionary, 'meaning', 'Dictionary', false));
  collectionResults.push(await cleanRichFieldCollection(OtherCaseLaw, 'headNotes', 'OtherCaseLaw', false));

  for (const r of collectionResults) {
    console.log(`[OK] ${r.label}: ${r.modified} cleaned (${r.scanned} scanned).`);
  }

  // Post-clean verification scan on Case collection
  const remainingHtmlCases = await Case.countDocuments({
    isDeleted: { $ne: true },
    $or: [
      { judgment: { $regex: /<(?:div|hr|script|style|table|tr|td|html|head|body|meta|link|font|http:)/i } },
      { headNote: { $regex: /<(?:div|hr|script|style|table|tr|td|html|head|body|meta|link|font|http:)/i } }
    ]
  });

  // Set Dashboard Board Baselines (Statutes = 3,000, Notifications = 30,000)
  const resetBaselines = !process.argv.includes('--no-reset-baselines');
  const boardCounts = await getBoardStatuteAndNotificationCounts({ forceResetBaselines: resetBaselines });

  // Recompute citation totals (dynamically imported after dotenv.config loads env vars)
  const { computeAndPersistCitationStats } = await import('../controllers/caseController.js');
  const citationStats = await computeAndPersistCitationStats();

  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  console.log('\n====================================================================');
  console.log('       SLD SYSTEM PRODUCTION DATABASE SETUP & SANITATION REPORT     ');
  console.log('====================================================================');
  console.log(`Elapsed Time                : ${elapsed}s`);
  console.log(`Upload Root Directory       : ${primaryUploadDir}`);
  console.log(`Delta Judgments Updated     : ${deltaStats.updated}`);
  console.log(`Cases Cleaned (HTML/Noise)  : ${caseStats.modified}`);
  console.log(`Remaining Noisy Case HTML   : ${remainingHtmlCases}`);
  console.log(`Statutes Board Value        : ${boardCounts.boardStatutes.toLocaleString()} (Live DB baseline: ${boardCounts.baseStatutes})`);
  console.log(`Notifications Board Value   : ${boardCounts.boardNotifications.toLocaleString()} (Live DB baseline: ${boardCounts.baseNotifications})`);
  if (citationStats) {
    console.log(`Total Case Laws             : ${citationStats.totalCases.toLocaleString()}`);
    console.log(`Total Citations Displayed   : ${citationStats.displayCount}`);
  }
  console.log('====================================================================\n');

  await mongoose.disconnect();
  console.log('[OK] Database setup completed cleanly.');
}

run().catch((err) => {
  console.error('[ERROR] Database setup failed:', err);
  process.exit(1);
});
