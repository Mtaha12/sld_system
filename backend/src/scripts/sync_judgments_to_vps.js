import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load .env automatically from backend/.env or .env if present
if (fs.existsSync('backend/.env')) {
  dotenv.config({ path: 'backend/.env' });
} else if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' });
} else {
  dotenv.config();
}

async function main() {
  const args = process.argv.slice(2);
  let vpsUri = process.env.VPS_MONGODB_URI || process.env.MONGODB_URI;

  for (const arg of args) {
    if (arg.startsWith('--uri=')) {
      vpsUri = arg.replace(/^--uri=/, '').trim();
    } else if (arg.startsWith('-u=')) {
      vpsUri = arg.replace(/^-u=/, '').trim();
    }
  }

  // Fallback to local default if running on the VPS machine itself
  if (!vpsUri) {
    vpsUri = 'mongodb://127.0.0.1:27017/sld_system';
  }

  // Remove potential outer quotes
  vpsUri = vpsUri.replace(/^["']|["']$/g, '').trim();

  // Candidate paths for delta file (compressed or raw)
  const candidatePaths = [
    { p: path.resolve('backend/scratch/transferred_judgments_delta.json.gz'), isGz: true },
    { p: path.resolve('scratch/transferred_judgments_delta.json.gz'), isGz: true },
    { p: path.resolve('backend/scratch/transferred_judgments_delta.json'), isGz: false },
    { p: path.resolve('scratch/transferred_judgments_delta.json'), isGz: false },
    { p: path.resolve('transferred_judgments_delta.json.gz'), isGz: true },
    { p: path.resolve('transferred_judgments_delta.json'), isGz: false }
  ];

  let resolvedFile = null;
  for (const c of candidatePaths) {
    if (fs.existsSync(c.p)) {
      resolvedFile = c;
      break;
    }
  }

  if (!resolvedFile) {
    console.error('Error: Delta file not found in any of these locations:');
    candidatePaths.forEach(c => console.error('  -', c.p));
    process.exit(1);
  }

  console.log(`Reading transferred judgments delta from: ${resolvedFile.p} ...`);
  const rawBuf = fs.readFileSync(resolvedFile.p);
  const jsonStr = resolvedFile.isGz ? zlib.gunzipSync(rawBuf).toString('utf8') : rawBuf.toString('utf8');
  const deltas = JSON.parse(jsonStr);
  console.log(`Loaded ${deltas.length.toLocaleString()} judgments to sync.\n`);

  console.log(`Connecting to MongoDB at: ${vpsUri.replace(/:([^@:]+)@/, ':****@')} ...`);
  const conn = await mongoose.createConnection(vpsUri).asPromise();
  console.log('Connected to MongoDB successfully!\n');

  const casesCollection = conn.collection('cases');
  const vpsTotalCases = await casesCollection.countDocuments();
  console.log(`Total Cases on Target Database: ${vpsTotalCases.toLocaleString()}`);

  const BATCH_SIZE = 100;
  let totalMatched = 0;
  let totalModified = 0;
  const startTime = Date.now();

  console.log(`\nSyncing ${deltas.length.toLocaleString()} judgments in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < deltas.length; i += BATCH_SIZE) {
    const batch = deltas.slice(i, i + BATCH_SIZE);
    const bulkOps = batch.map(item => ({
      updateOne: {
        filter: { sldNumberInt: item.targetSld },
        update: {
          $set: {
            judgment: item.judgment
          }
        }
      }
    }));

    const res = await casesCollection.bulkWrite(bulkOps, { ordered: false });
    totalMatched += (res.matchedCount || 0);
    totalModified += (res.modifiedCount || 0);

    const processed = Math.min(i + BATCH_SIZE, deltas.length);
    const pct = ((processed / deltas.length) * 100).toFixed(1);
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`\rProgress: ${processed.toLocaleString()}/${deltas.length.toLocaleString()} (${pct}%) | Matched: ${totalMatched.toLocaleString()} | Updated: ${totalModified.toLocaleString()} | ${elapsedSec}s`);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n\n================ TARGET SYNC COMPLETED SUCCESSFULLY ================`);
  console.log(`Total Judgments in Payload:      ${deltas.length.toLocaleString()}`);
  console.log(`Matched on Target Database:      ${totalMatched.toLocaleString()}`);
  console.log(`Updated/Replaced on Target DB:   ${totalModified.toLocaleString()}`);
  console.log(`Total Execution Time:            ${durationSec}s`);

  const vpsWithoutJudgment = await casesCollection.countDocuments({
    $or: [
      { judgment: { $exists: false } },
      { judgment: null },
      { judgment: '' }
    ]
  });
  console.log(`Remaining Cases Without Judgment: ${vpsWithoutJudgment.toLocaleString()}`);

  await conn.close();
  process.exit(0);
}

main().catch(err => {
  console.error('\nFatal error during sync:', err);
  process.exit(1);
});
