import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';

async function main() {
  console.log('================================================================');
  console.log('   SLD SYSTEM: USER ROLES AUDIT & CASE INDEXES SYNCHRONIZER     ');
  console.log('================================================================');

  await mongoose.connect(MONGODB_URI, {
    family: 4,
    serverSelectionTimeoutMS: 15000,
  });
  console.log('[OK] Connected to MongoDB at:', mongoose.connection.host);

  const db = mongoose.connection.db;
  const usersCol = db.collection('users');
  const casesCol = db.collection('cases');

  // 1. Identify Administrators
  // Administrators are those registered via Manage Admins (e.g. userType: 'Super Admin', or specific admin logins)
  const explicitAdminLogins = ['admin', 'haroon rafiq', 'haroon', 'haroonrafiq'];
  const explicitAdminEmails = ['admin@sldsystem.com', 'haroon@sldsystem.com', 'haroon.rafiq@sldsystem.com'];

  // Find admins
  const admins = await usersCol.find({
    $or: [
      { userType: { $in: ['Super Admin', 'super admin', 'Admin', 'admin'] } },
      { username: { $in: explicitAdminLogins } },
      { loginId: { $in: explicitAdminLogins } },
      { email: { $in: explicitAdminEmails } }
    ]
  }).toArray();

  const adminIds = admins.map(a => a._id);
  console.log(`\n[1] Verified Administrators (${admins.length} total):`);
  admins.forEach(a => {
    console.log(`    - ID: ${a._id} | User: ${a.username || a.loginId} | Name: ${a.fullName || a.name} | Role: ${a.role} | Type: ${a.userType}`);
  });

  // Guarantee these accounts have role: 'Administrator'
  if (adminIds.length > 0) {
    await usersCol.updateMany(
      { _id: { $in: adminIds } },
      { $set: { role: 'Administrator' } }
    );
    console.log(`    -> Confirmed role: 'Administrator' for ${adminIds.length} admin accounts.`);
  }

  // 2. Guarantee ALL OTHER accounts have role: 'User' and allowAllForms: false
  const clientUpdateResult = await usersCol.updateMany(
    { _id: { $nin: adminIds } },
    { $set: { role: 'User', allowAllForms: false } }
  );
  console.log(`\n[2] Client Accounts Role Fix:`);
  console.log(`    -> Matched & updated ${clientUpdateResult.modifiedCount} accounts to role: 'User' and allowAllForms: false.`);

  const clientCount = await usersCol.countDocuments({ role: 'User' });
  const adminCount = await usersCol.countDocuments({ role: 'Administrator' });
  console.log(`    -> Current DB Totals: ${adminCount} Administrators | ${clientCount} Clients`);

  // 3. Clean up competing / redundant indexes on Case collection
  console.log('\n[3] Synchronizing Case Indexes (Removing Multiplanner Timeout Cause)...');
  const currentIndexes = await casesCol.indexes();
  console.log(`    Found ${currentIndexes.length} total indexes on 'cases' collection.`);

  // Import Case model and run syncIndexes
  const { default: Case } = await import('../models/Case.js');
  console.log('    Running Case.syncIndexes() to prune redundant compound indexes...');
  await Case.syncIndexes();

  const syncedIndexes = await casesCol.indexes();
  console.log(`    [OK] Synchronization complete! Clean index count: ${syncedIndexes.length}`);
  syncedIndexes.forEach(idx => {
    console.log(`       - ${idx.name} : ${JSON.stringify(idx.key)}`);
  });

  console.log('\n================================================================');
  console.log('   AUDIT & SYNC FINISHED SUCCESSFULLY. SYSTEM IS OPTIMIZED.     ');
  console.log('================================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('[FATAL ERROR]', err);
  process.exit(1);
});

