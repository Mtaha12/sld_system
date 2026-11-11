#!/usr/bin/env node
/**
 * SLD System - VPS Production Script: Set Priority Statute Law & Magazine Sequence
 *
 * Updates `lawsettings` (top 13 laws at ordering 1..13, remaining 14..N cleanly resequenced)
 * and `magazines` (exact sequence 1..31 on top, remaining 32..M cleanly resequenced)
 * safely and idempotently without modifying cases, statutes, or existing metadata.
 *
 * Usage:
 *   node backend/src/scripts/vps_set_law_magazine_order.js
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import LawSetting from '../models/LawSetting.js';
import Magazine from '../models/Magazine.js';
import { PRIORITY_STATUTE_LAWS, PRIORITY_MAGAZINES } from '../utils/priorityOrdering.js';

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

const LEGACY_MAG_RENAMES = {
  pctlr: 'PTCLR',
  taxforum: 'TAX FORUM'
};

async function updateMagazinesOrder() {
  console.log('>>> Step 1: Aligning Magazine sequence (1..31)...');
  const existing = await Magazine.find({}).sort({ ordering: 1, name: 1 }).lean();

  const lowerToDoc = new Map();
  for (const doc of existing) {
    const key = String(doc.name || '').trim().toLowerCase();
    if (key && !lowerToDoc.has(key)) {
      lowerToDoc.set(key, doc);
    }
  }

  // Safely migrate historical spelling variants if the canonical name doesn't already exist
  for (const [legacyKey, canonicalName] of Object.entries(LEGACY_MAG_RENAMES)) {
    const canonicalKey = canonicalName.toLowerCase();
    if (lowerToDoc.has(legacyKey) && !lowerToDoc.has(canonicalKey)) {
      const legacyDoc = lowerToDoc.get(legacyKey);
      lowerToDoc.delete(legacyKey);
      lowerToDoc.set(canonicalKey, { ...legacyDoc, name: canonicalName });
    }
  }

  const ops = [];
  const usedIds = new Set();

  for (let i = 0; i < PRIORITY_MAGAZINES.length; i++) {
    const targetName = PRIORITY_MAGAZINES[i];
    const targetOrder = i + 1;
    const match = lowerToDoc.get(targetName.toLowerCase());

    if (match) {
      usedIds.add(String(match._id));
      ops.push({
        updateOne: {
          filter: { _id: match._id },
          update: {
            $set: {
              name: targetName,
              ordering: targetOrder,
              status: 'active'
            }
          }
        }
      });
    } else {
      ops.push({
        insertOne: {
          document: {
            name: targetName,
            ordering: targetOrder,
            status: 'active'
          }
        }
      });
    }
  }

  let nextOrder = PRIORITY_MAGAZINES.length + 1;
  for (const doc of existing) {
    if (usedIds.has(String(doc._id))) continue;
    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { ordering: nextOrder++ } }
      }
    });
  }

  if (ops.length > 0) {
    await Magazine.bulkWrite(ops, { ordered: false });
  }

  const verifyMags = await Magazine.find({}).sort({ ordering: 1, name: 1 }).lean();
  console.log(`    [OK] Total magazines in DB: ${verifyMags.length}`);
  console.log('    Top 31 sequence verification:');
  verifyMags.slice(0, 31).forEach((m) => {
    console.log(`      ${String(m.ordering).padStart(2, ' ')}. ${m.name} (${m.status})`);
  });
}

async function updateLawSettingsOrder() {
  console.log('\n>>> Step 2: Putting top 13 Statute Laws at top of LawSetting...');
  const existing = await LawSetting.find({})
    .select('_id name ordering court status')
    .sort({ ordering: 1, name: 1 })
    .lean();

  const lowerToDoc = new Map();
  for (const doc of existing) {
    const key = String(doc.name || '').trim().toLowerCase();
    if (key && !lowerToDoc.has(key)) {
      lowerToDoc.set(key, doc);
    }
  }

  const ops = [];
  const usedIds = new Set();

  for (let i = 0; i < PRIORITY_STATUTE_LAWS.length; i++) {
    const targetName = PRIORITY_STATUTE_LAWS[i];
    const targetOrder = i + 1;
    const match = lowerToDoc.get(targetName.toLowerCase());

    if (match) {
      usedIds.add(String(match._id));
      ops.push({
        updateOne: {
          filter: { _id: match._id },
          update: {
            $set: {
              name: targetName,
              ordering: targetOrder,
              status: 'active'
            }
          }
        }
      });
    } else {
      ops.push({
        insertOne: {
          document: {
            name: targetName,
            ordering: targetOrder,
            date: new Date(),
            court: 'Federal / Provincial',
            status: 'active'
          }
        }
      });
    }
  }

  // Resequence all remaining laws cleanly without ordering number collisions
  let nextOrder = PRIORITY_STATUTE_LAWS.length + 1;
  for (const doc of existing) {
    if (usedIds.has(String(doc._id))) continue;
    if (doc.ordering !== nextOrder) {
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { ordering: nextOrder } }
        }
      });
    }
    nextOrder++;
  }

  if (ops.length > 0) {
    await LawSetting.bulkWrite(ops, { ordered: false });
  }

  const verifyLaws = await LawSetting.find({})
    .select('name ordering status')
    .sort({ ordering: 1, name: 1 })
    .limit(18)
    .lean();
  const totalLaws = await LawSetting.countDocuments();
  console.log(`    [OK] Total laws in DB: ${totalLaws}`);
  console.log('    Top 18 laws verification:');
  verifyLaws.forEach((l) => {
    console.log(`      ${String(l.ordering).padStart(2, ' ')}. ${l.name} (${l.status})`);
  });
}

async function run() {
  console.log('\n==========================================================');
  console.log('   SLD SYSTEM - VPS LAW & MAGAZINE PRIORITY ORDER UPDATE');
  console.log('==========================================================\n');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  console.log(`[INFO] Connecting to MongoDB: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}`);
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  console.log('[OK] Connected to MongoDB.\n');

  await updateMagazinesOrder();
  await updateLawSettingsOrder();

  console.log('\n==========================================================');
  console.log('      LAW & MAGAZINE ORDER UPDATE COMPLETED SUCCESSFULLY   ');
  console.log('==========================================================\n');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[ERROR] Script failed:', err);
  process.exit(1);
});
