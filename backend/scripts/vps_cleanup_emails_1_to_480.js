/**
 * VPS & Local MongoDB Cleanup Script for SLD Email Newsletters
 * 
 * Purpose:
 *   Deletes newsletters with serial number (srNumber) from 1 to 480
 *   while STRICTLY PROTECTING all October and November dated records
 *   and all records with srNumber > 480.
 * 
 * Safety:
 *   - Automatically creates a full backup collection before performing deletions:
 *     `newsletters_backup_<timestamp>`
 *   - Supports --dry-run (default if no args) and --execute.
 * 
 * Usage on VPS:
 *   cd /var/www/sld_system/backend
 *   node vps_cleanup_emails_1_to_480.js --dry-run
 *   node vps_cleanup_emails_1_to_480.js --execute
 * 
 * You can also pass a MongoDB URI directly:
 *   node vps_cleanup_emails_1_to_480.js --execute "mongodb://localhost:27017/sld_system"
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

function resolveModule(moduleName) {
  const candidatePaths = [
    moduleName,
    path.resolve(__dirname, 'node_modules', moduleName),
    path.resolve(__dirname, '..', 'node_modules', moduleName),
    path.resolve(__dirname, 'backend', 'node_modules', moduleName),
    path.resolve(__dirname, '..', 'backend', 'node_modules', moduleName)
  ];
  for (const p of candidatePaths) {
    try {
      return require(p);
    } catch (_) {}
  }
  throw new Error(`Unable to resolve required module "${moduleName}". Please run 'npm install' inside backend directory.`);
}

const dotenv = resolveModule('dotenv');
const mongoose = resolveModule('mongoose');

// Load environment variables
const envPaths = [
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, 'backend', '.env')
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const args = process.argv.slice(2);
const isExecute = args.includes('--execute') || args.includes('-e');
const customUri = args.find(a => a.startsWith('mongodb://') || a.startsWith('mongodb+srv://'));

const MONGODB_URI = customUri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';

export function isOctoberOrNovember(doc) {
  if (!doc) return false;
  const d = String(doc.date || '').trim();
  const s = String(doc.subject || '').trim();

  // 1. DD/MM/YYYY or DD-MM-YYYY (e.g. 29/10/2026, 05-11-2026)
  const dmy = d.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) {
    const month = parseInt(dmy[2], 10);
    if (month === 10 || month === 11) return true;
  }

  // 2. YYYY-MM-DD or YYYY/MM/DD (e.g. 2026-10-29, 2024-11-01)
  const ymd = d.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymd) {
    const month = parseInt(ymd[2], 10);
    if (month === 10 || month === 11) return true;
  }

  // 3. Delimited month tokens in date (e.g. /10/, -10-, /11/, -11-)
  if (/(-|\/)(10|11)(-|\/)/.test(d)) {
    return true;
  }

  // 4. Textual month names in date or subject
  if (/\b(oct|october|nov|november)\b/i.test(d) || /\b(oct|october|nov|november)\b/i.test(s)) {
    return true;
  }

  return false;
}

async function runCleanup() {
  console.log('================================================================');
  console.log('       SLD SYSTEM - EMAIL NEWSLETTERS CLEANUP SCRIPT            ');
  console.log('================================================================');
  console.log(`Database URI:   ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  console.log(`Execution Mode: ${isExecute ? 'EXECUTE (REAL DELETION WITH BACKUP)' : 'DRY-RUN (SIMULATION ONLY)'}`);
  console.log('Target Range:   srNumber 1 to 480');
  console.log('Protection:     October and November dated files are STRICTLY PRESERVED');
  console.log('----------------------------------------------------------------\n');

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    console.log(' Connected to MongoDB successfully.\n');

    const db = mongoose.connection.db;
    const collection = db.collection('newsletters');

    const totalBefore = await collection.countDocuments();
    console.log(`Total newsletters currently in database: ${totalBefore}`);

    const inRangeDocs = await collection.find({
      srNumber: { $gte: 1, $lte: 480 }
    }).toArray();

    console.log(`Records found with srNumber between 1 and 480: ${inRangeDocs.length}`);

    const protectedOctNov = [];
    const toDeleteDocs = [];

    for (const doc of inRangeDocs) {
      if (isOctoberOrNovember(doc)) {
        protectedOctNov.push(doc);
      } else {
        toDeleteDocs.push(doc);
      }
    }

    const preservedAbove480 = await collection.countDocuments({
      srNumber: { $gt: 480 }
    });

    console.log(`  Protected (October & November):       ${protectedOctNov.length} files`);
    console.log(`  To Delete (Non-Oct/Nov in 1..480):    ${toDeleteDocs.length} files`);
    console.log(`  Preserved (Above srNumber 480):        ${preservedAbove480} files`);

    if (protectedOctNov.length > 0) {
      console.log('\nSample Protected October / November records:');
      protectedOctNov.slice(0, 5).forEach(doc => {
        console.log(`   - SR #${doc.srNumber} | Date: ${doc.date} | Subject: ${doc.subject}`);
      });
    }

    if (toDeleteDocs.length > 0) {
      console.log('\nSample records queued for deletion:');
      toDeleteDocs.slice(0, 5).forEach(doc => {
        console.log(`   - SR #${doc.srNumber} | Date: ${doc.date} | Subject: ${doc.subject}`);
      });
    }

    if (!isExecute) {
      console.log('\n================================================================');
      console.log(' DRY-RUN FINISHED. No changes were made to the database.');
      console.log(' To perform actual deletion with automatic backup, run:');
      console.log('   node vps_cleanup_emails_1_to_480.js --execute');
      console.log('================================================================\n');
      await mongoose.disconnect();
      return;
    }

    if (toDeleteDocs.length === 0) {
      console.log('\n No records match deletion criteria. Nothing to delete.');
      await mongoose.disconnect();
      return;
    }

    // 1. Create full backup collection
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupCollectionName = `newsletters_backup_${timestamp}`;
    console.log(`\n Creating backup collection: "${backupCollectionName}"...`);

    const allDocs = await collection.find({}).toArray();
    if (allDocs.length > 0) {
      await db.collection(backupCollectionName).insertMany(allDocs);
      console.log(` Backup completed: ${allDocs.length} documents saved to "${backupCollectionName}".`);
    }

    // 2. Perform deletion
    const deleteIds = toDeleteDocs.map(d => d._id);
    const deleteResult = await collection.deleteMany({
      _id: { $in: deleteIds }
    });

    console.log(`\n Deletion completed! Deleted count: ${deleteResult.deletedCount}`);

    // 3. Verify final counts
    const totalAfter = await collection.countDocuments();
    const remainingProtected = await collection.countDocuments({
      srNumber: { $gte: 1, $lte: 480 }
    });

    console.log('\n================================================================');
    console.log('                    CLEANUP SUMMARY RESULT                      ');
    console.log('================================================================');
    console.log(`Total newsletters before:            ${totalBefore}`);
    console.log(`Total records deleted:               ${deleteResult.deletedCount}`);
    console.log(`Total newsletters remaining:         ${totalAfter}`);
    console.log(`Remaining in range 1-480 (Oct & Nov): ${remainingProtected}`);
    console.log(`Preserved above 480:                 ${preservedAbove480}`);
    console.log(`Safety Backup collection:            ${backupCollectionName}`);
    console.log('================================================================\n');

    await mongoose.disconnect();
    console.log(' Database disconnected cleanly.');
  } catch (err) {
    console.error('\n Error during cleanup execution:', err);
    process.exit(1);
  }
}

runCleanup();
