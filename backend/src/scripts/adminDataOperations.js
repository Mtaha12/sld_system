import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import DownloadItem from '../models/DownloadItem.js';
import Counter from '../models/Counter.js';
import Statute from '../models/Statute.js';
import User from '../models/User.js';

// Connection URIs
const TARGET_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
const SOURCE_URI = process.env.SOURCE_MONGODB_URI || process.env.VPS_MONGODB_URI || process.env.PROD_MONGODB_URI || TARGET_URI;

/**
 * 1. Remove Finance Act and Updated Laws from DownloadItem while strictly preserving Tax Returns.
 * Resequences the remaining Tax Return records gaplessly (1, 2, 3...)
 */
export async function cleanDownloads() {
  console.log('\n--- [1] CLEANING MANAGE DOWNLOADS (DownloadItem) ---');
  
  const beforeCount = await DownloadItem.countDocuments();
  console.log(`Total DownloadItem records before cleanup: ${beforeCount}`);

  // Count existing categories
  const taxReturnsCount = await DownloadItem.countDocuments({
    latest: { $regex: /tax\s*return/i }
  });
  console.log(`Preserving Tax Returns records: ${taxReturnsCount}`);

  // Delete only Finance Act and Updated Laws (strictly avoiding Tax Returns)
  const deleteResult = await DownloadItem.deleteMany({
    $and: [
      {
        $or: [
          { latest: { $in: ['Finance Act', 'Updated Law', 'Updated Laws'] } },
          { latest: { $regex: /finance/i } },
          { latest: { $regex: /update/i } }
        ]
      },
      {
        latest: { $not: /tax\s*return/i }
      }
    ]
  });

  console.log(`Successfully removed ${deleteResult.deletedCount} Finance Act and Updated Law records.`);

  // Fetch all remaining preserved records and sort ascending by date / creation / old srNumber
  const remaining = await DownloadItem.find({}).sort({ date: 1, createdAt: 1, _id: 1 });
  console.log(`Resequencing remaining ${remaining.length} Tax Return records gaplessly from SR# 1...`);

  for (let i = 0; i < remaining.length; i++) {
    const newSr = i + 1;
    await DownloadItem.updateOne(
      { _id: remaining[i]._id },
      { $set: { srNumber: newSr } }
    );
  }

  // Update or set Counter for downloads
  await Counter.findOneAndUpdate(
    { name: 'download' },
    { $set: { seq: remaining.length } },
    { upsert: true }
  );

  console.log(`[DONE] DownloadItem now has ${remaining.length} clean, gaplessly sequenced Tax Return records.`);
  return { deleted: deleteResult.deletedCount, remaining: remaining.length };
}

/**
 * 2. Transfer Statutes from source database between SR# 5870 and 9372.
 */
export async function transferStatutes(sourceUri = SOURCE_URI, minSr = 5870, maxSr = 9372) {
  console.log(`\n--- [2] TRANSFERRING STATUTES (SR# ${minSr} to ${maxSr}) ---`);
  
  if (sourceUri === TARGET_URI) {
    console.log(`Target database: ${TARGET_URI}`);
    console.log(`Counting local statutes between ${minSr} and ${maxSr}...`);
    const count = await Statute.countDocuments({ srNumber: { $gte: minSr, $lte: maxSr } });
    console.log(`Found ${count} statutes matching range [${minSr} - ${maxSr}] in current database.`);
    return count;
  }

  console.log(`Connecting to Source Database: ${sourceUri}...`);
  const sourceConn = await mongoose.createConnection(sourceUri).asPromise();
  const SourceStatute = sourceConn.model('Statute', Statute.schema);

  const query = { srNumber: { $gte: minSr, $lte: maxSr } };
  const statutesToTransfer = await SourceStatute.find(query).lean();
  console.log(`Found ${statutesToTransfer.length} statute records in source database.`);

  if (statutesToTransfer.length === 0) {
    console.log('No statutes found in source database matching the range.');
    await sourceConn.close();
    return 0;
  }

  console.log(`Upserting ${statutesToTransfer.length} statutes into target database...`);
  let upsertedCount = 0;
  const batchSize = 500;

  for (let i = 0; i < statutesToTransfer.length; i += batchSize) {
    const chunk = statutesToTransfer.slice(i, i + batchSize);
    const operations = chunk.map(doc => {
      const matchCriteria = doc.statuteId 
        ? { statuteId: doc.statuteId }
        : { srNumber: doc.srNumber };

      return {
        updateOne: {
          filter: matchCriteria,
          update: { $set: doc },
          upsert: true,
        }
      };
    });

    const res = await Statute.bulkWrite(operations, { ordered: false });
    upsertedCount += (res.upsertedCount + res.modifiedCount);
  }

  console.log(`[DONE] Successfully transferred / updated ${upsertedCount} statutes.`);
  await sourceConn.close();
  return upsertedCount;
}

/**
 * 3. Transfer Users from source database.
 */
export async function transferUsers(sourceUri = SOURCE_URI) {
  console.log(`\n--- [3] TRANSFERRING USER DATA FROM NEW DATABASE ---`);
  
  if (sourceUri === TARGET_URI) {
    console.log('Source URI matches target URI. Skipping self-transfer.');
    const userCount = await User.countDocuments();
    console.log(`Current users in database: ${userCount}`);
    return userCount;
  }

  console.log(`Connecting to Source Database: ${sourceUri}...`);
  const sourceConn = await mongoose.createConnection(sourceUri).asPromise();
  const SourceUser = sourceConn.model('User', User.schema);

  const usersToTransfer = await SourceUser.find({}).lean();
  console.log(`Found ${usersToTransfer.length} users in source database.`);

  if (usersToTransfer.length === 0) {
    console.log('No users found in source database.');
    await sourceConn.close();
    return 0;
  }

  let transferred = 0;
  for (const userDoc of usersToTransfer) {
    const email = userDoc.email ? userDoc.email.trim().toLowerCase() : null;
    const filter = email ? { email } : { _id: userDoc._id };

    await User.updateOne(
      filter,
      { $set: userDoc },
      { upsert: true }
    );
    transferred++;
  }

  console.log(`[DONE] Successfully transferred / updated ${transferred} user accounts.`);
  await sourceConn.close();
  return transferred;
}

/**
 * Main execution runner
 */
async function main() {
  console.log('='.repeat(70));
  console.log('SLD SYSTEM - ADMIN PORTAL DATA OPERATIONS');
  console.log('='.repeat(70));

  await mongoose.connect(TARGET_URI);
  console.log(`Connected to Target MongoDB: ${TARGET_URI}`);

  const args = process.argv.slice(2);
  const action = args[0] || 'all';

  try {
    if (action === 'clean-downloads' || action === 'downloads' || action === 'all') {
      await cleanDownloads();
    }

    if (action === 'statutes' || action === 'all') {
      const min = parseInt(args[1], 10) || 5870;
      const max = parseInt(args[2], 10) || 9372;
      await transferStatutes(SOURCE_URI, min, max);
    }

    if (action === 'users' || action === 'all') {
      await transferUsers(SOURCE_URI);
    }

    console.log('\n[SUCCESS] All requested admin operations completed successfully.');
  } catch (err) {
    console.error('\n[ERROR] Admin data operation failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('adminDataOperations.js')) {
  main();
}

