import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { default: mongoose } = await import('mongoose');
const { default: User } = await import('../models/User.js');

async function fixUserIndexes() {
  console.log('[1/4] Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system');
  console.log('[2/4] Inspecting User collection indexes...');

  const indexes = await User.collection.indexes();
  console.log('Current indexes:');
  indexes.forEach(idx => console.log(`  - ${idx.name}: unique=${!!idx.unique}, keys=${JSON.stringify(idx.key)}`));

  // 1. Drop unique index on email
  const uniqueEmailIndex = indexes.find(
    (idx) => (idx.name === 'email_1' || (idx.key && idx.key.email)) && idx.unique
  );
  if (uniqueEmailIndex) {
    console.log(`[3/4] Dropping unique index: ${uniqueEmailIndex.name}...`);
    await User.collection.dropIndex(uniqueEmailIndex.name);
    console.log('Unique email index dropped successfully.');
  } else {
    console.log('[3/4] Email index is already non-unique.');
  }

  // Ensure non-unique email index
  await User.collection.createIndex({ email: 1 }, { background: true });
  console.log('Ensured non-unique index on email.');

  // 2. Drop unique index on username if it lacks partial filter, and recreate with partialFilterExpression
  const uniqueUsernameIndex = indexes.find(
    (idx) => (idx.name === 'username_1' || (idx.key && idx.key.username)) && idx.unique && !idx.partialFilterExpression
  );
  if (uniqueUsernameIndex) {
    console.log(`Updating ${uniqueUsernameIndex.name} to apply partialFilterExpression for non-deleted users...`);
    try {
      await User.collection.dropIndex(uniqueUsernameIndex.name);
      await User.collection.createIndex(
        { username: 1 },
        { unique: true, partialFilterExpression: { isDeleted: false }, background: true }
      );
      console.log('Recreated username unique index with partial filter (ignoring deleted accounts).');
    } catch (uErr) {
      console.warn('Note on username index:', uErr.message);
    }
  }

  console.log('[4/4] Verifying updated indexes...');
  const updatedIndexes = await User.collection.indexes();
  updatedIndexes.forEach(idx => console.log(`  - ${idx.name}: unique=${!!idx.unique}, keys=${JSON.stringify(idx.key)}`));

  console.log('\n[SUCCESS] User indexes updated successfully! Multiple accounts can now share the same email.');
  await mongoose.disconnect();
}

fixUserIndexes().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
