import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envCandidates = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];
for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';

/**
 * Enables AI Search (`aiAssistant: true`) for all existing user accounts in MongoDB.
 * Safe and idempotent: updates only records where `aiAssistant` is not already `true`.
 */
const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[Enable AI Search] Connected to MongoDB.');

    const usersCol = mongoose.connection.collection('users');
    const totalUsers = await usersCol.countDocuments({});
    const nonDeletedUsers = await usersCol.countDocuments({ isDeleted: { $ne: true } });
    const previouslyDisabled = await usersCol.countDocuments({ aiAssistant: { $ne: true } });

    const updateResult = await usersCol.updateMany(
      { aiAssistant: { $ne: true } },
      { $set: { aiAssistant: true, updatedAt: new Date() } }
    );

    const remainingDisabled = await usersCol.countDocuments({ aiAssistant: { $ne: true } });

    console.log(JSON.stringify({
      totalUsers,
      nonDeletedUsers,
      previouslyDisabled,
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      remainingDisabled,
    }, null, 2));

    if (remainingDisabled !== 0) {
      console.error('[Enable AI Search] Warning: Some users still do not have aiAssistant=true.');
      process.exitCode = 1;
    } else {
      console.log('[Enable AI Search] All users now have AI Search (aiAssistant: true) enabled.');
    }
  } catch (err) {
    console.error('[Enable AI Search] Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();

