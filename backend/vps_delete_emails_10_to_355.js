/**
 * VPS & Local MongoDB Script - Delete Email Newsletters SR 10 to 355
 * 
 * Purpose:
 *   Deletes newsletters with serial number (srNumber) between 10 and 355 (inclusive).
 * 
 * Safety:
 *   - Automatically creates a full backup collection before performing deletion:
 *     `newsletters_backup_<timestamp>`
 *   - Supports --dry-run (default if no args) and --execute.
 * 
 * Usage on VPS:
 *   cd /var/www/sld_system/backend
 *   node vps_delete_emails_10_to_355.js --dry-run
 *   node vps_delete_emails_10_to_355.js --execute
 * 
 * You can also pass a MongoDB URI directly:
 *   node vps_delete_emails_10_to_355.js --execute "mongodb://localhost:27017/sld_system"
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
  path.resolve(__dirname, 'backend', '.env'),
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', 'backend', '.env')
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

async function runDelete() {
  console.log('================================================================');
  console.log('     SLD SYSTEM - DELETE NEWSLETTERS SR 10 TO 355               ');
  console.log('================================================================');
  console.log(`Database URI:   ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  console.log(`Execution Mode: ${isExecute ? 'EXECUTE (REAL DELETION WITH BACKUP)' : 'DRY-RUN (SIMULATION ONLY)'}`);
  console.log('Target Filter:  srNumber between 10 and 355 (inclusive)');
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

    // Query documents in range 10 to 355
    const toDeleteDocs = await collection.find({
      srNumber: { $gte: 10, $lte: 355 }
    }).toArray();

    console.log(`Matching records found for deletion (SR 10 to 355): ${toDeleteDocs.length}`);

    const preservedAbove355 = await collection.countDocuments({
      srNumber: { $gt: 355 }
    });
    const preservedBelow10 = await collection.countDocuments({
      srNumber: { $lt: 10 }
    });

    console.log(`Preserved records below SR 10:                       ${preservedBelow10}`);
    console.log(`Preserved records above SR 355:                      ${preservedAbove355}`);

    if (toDeleteDocs.length > 0) {
      console.log('\nSample records to be deleted:');
      toDeleteDocs.slice(0, 5).forEach(doc => {
        console.log(`   - SR #${doc.srNumber} | Date: ${doc.date} | Subject: ${doc.subject}`);
      });
      if (toDeleteDocs.length > 5) {
        console.log('   ...');
        toDeleteDocs.slice(-3).forEach(doc => {
          console.log(`   - SR #${doc.srNumber} | Date: ${doc.date} | Subject: ${doc.subject}`);
        });
      }
    }

    if (!isExecute) {
      console.log('\n================================================================');
      console.log(' DRY-RUN FINISHED. No changes were made to the database.');
      console.log(' To perform actual deletion with automatic full backup, run:');
      console.log('   node vps_delete_emails_10_to_355.js --execute');
      console.log('================================================================\n');
      await mongoose.disconnect();
      return;
    }

    if (toDeleteDocs.length === 0) {
      console.log('\n No records found in range SR 10 to 355. Nothing to delete.');
      await mongoose.disconnect();
      return;
    }

    // 1. Create full backup collection
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupCollectionName = `newsletters_backup_before_delete_10_355_${timestamp}`;
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
    const remainingInRange = await collection.countDocuments({
      srNumber: { $gte: 10, $lte: 355 }
    });

    console.log('\n================================================================');
    console.log('                    CLEANUP SUMMARY RESULT                      ');
    console.log('================================================================');
    console.log(`Total newsletters before:            ${totalBefore}`);
    console.log(`Total records deleted (SR 10-355):   ${deleteResult.deletedCount}`);
    console.log(`Total newsletters remaining:         ${totalAfter}`);
    console.log(`Remaining in range 10-355:           ${remainingInRange}`);
    console.log(`Preserved below 10:                  ${preservedBelow10}`);
    console.log(`Preserved above 355:                 ${preservedAbove355}`);
    console.log(`Safety Backup collection:            ${backupCollectionName}`);
    console.log('================================================================\n');

    await mongoose.disconnect();
    console.log(' Database disconnected cleanly.');
  } catch (err) {
    console.error('\n Error during deletion execution:', err);
    process.exit(1);
  }
}

runDelete();
