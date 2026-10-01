import Case from '../models/Case.js';
import Notification from '../models/Notification.js';
import Statute from '../models/Statute.js';
import User from '../models/User.js';
import Counter from '../models/Counter.js';
import { formatUniqueId, syncCounter, parseSequenceFromId, DEFAULT_ENTITY_CONFIGS } from './uniqueIdGenerator.js';
import logger from './logger.js';

/**
 * Backfill unique IDs for a specific collection
 *
 * @param {import('mongoose').Model} Model
 * @param {string} entityName
 * @param {string} primaryField
 * @param {string[]} aliases
 * @param {string} prefix
 * @param {number} padLength
 */
const backfillCollection = async (Model, entityName, primaryField, aliases = [], prefix = '', padLength = 6) => {
  try {
    // Fast path: Check if any records are actually missing the unique ID
    const missingCount = await Model.countDocuments({
      $or: [
        { [primaryField]: { $exists: false } },
        { [primaryField]: null },
        { [primaryField]: '' }
      ]
    });

    if (missingCount === 0) {
      return { total: 0, backfilled: 0 };
    }

    // 1. Find existing max sequence if some records already have an ID
    const existingWithId = await Model.find({ [primaryField]: { $exists: true, $ne: null, $nin: [''] } })
      .select(primaryField)
      .lean();

    let maxSeq = 0;
    for (const doc of existingWithId) {
      const parsed = parseSequenceFromId(doc[primaryField]);
      if (parsed && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }

    // Check current Counter value
    const counterDoc = await Counter.findById(entityName);
    if (counterDoc && counterDoc.seq > maxSeq) {
      maxSeq = counterDoc.seq;
    }

    // 2. Find records missing the unique ID
    const recordsWithoutId = await Model.find({
      $or: [
        { [primaryField]: { $exists: false } },
        { [primaryField]: null },
        { [primaryField]: '' }
      ]
    }).sort({ createdAt: 1, _id: 1 });

    logger.info(`[Backfill] Found ${recordsWithoutId.length} '${entityName}' records missing unique IDs. Starting backfill...`);

    let currentSeq = maxSeq;
    for (const doc of recordsWithoutId) {
      currentSeq += 1;
      const formattedId = formatUniqueId(currentSeq, prefix, padLength, '-');

      const updateObj = { [primaryField]: formattedId };
      for (const alias of aliases) {
        updateObj[alias] = formattedId;
      }

      await Model.updateOne({ _id: doc._id }, { $set: updateObj });
    }

    // 3. Update counter to the new highest sequence
    await syncCounter(entityName, currentSeq);

    logger.info(`[Backfill] Successfully backfilled ${recordsWithoutId.length} '${entityName}' records. Latest sequence: ${currentSeq}`);
    return {
      total: existingWithId.length + recordsWithoutId.length,
      backfilled: recordsWithoutId.length,
      currentMaxSeq: currentSeq
    };
  } catch (err) {
    logger.error(`[Backfill Error] Failed to backfill '${entityName}': ${err.message}`);
    throw err;
  }
};

/**
 * Executes system-wide unique ID backfill across all modules
 */
export const backfillAllMissingUniqueIds = async () => {
  logger.info('[Backfill] Starting system-wide Unique ID backfill check...');

  const results = {};

  // 1. Cases
  results.cases = await backfillCollection(
    Case,
    'case',
    DEFAULT_ENTITY_CONFIGS.case.field,
    DEFAULT_ENTITY_CONFIGS.case.aliases,
    DEFAULT_ENTITY_CONFIGS.case.prefix,
    DEFAULT_ENTITY_CONFIGS.case.padLength
  );

  // 2. Notifications
  results.notifications = await backfillCollection(
    Notification,
    'notification',
    DEFAULT_ENTITY_CONFIGS.notification.field,
    DEFAULT_ENTITY_CONFIGS.notification.aliases,
    DEFAULT_ENTITY_CONFIGS.notification.prefix,
    DEFAULT_ENTITY_CONFIGS.notification.padLength
  );

  // 3. Statutes
  results.statutes = await backfillCollection(
    Statute,
    'statute',
    DEFAULT_ENTITY_CONFIGS.statute.field,
    DEFAULT_ENTITY_CONFIGS.statute.aliases,
    DEFAULT_ENTITY_CONFIGS.statute.prefix,
    DEFAULT_ENTITY_CONFIGS.statute.padLength
  );

  // 4. Users
  results.users = await backfillCollection(
    User,
    'user',
    DEFAULT_ENTITY_CONFIGS.user.field,
    DEFAULT_ENTITY_CONFIGS.user.aliases,
    DEFAULT_ENTITY_CONFIGS.user.prefix,
    DEFAULT_ENTITY_CONFIGS.user.padLength
  );

  logger.info('[Backfill] System-wide Unique ID verification & backfill completed.');
  return results;
};

// If run directly from CLI: node src/utils/backfillUniqueIds.js
if (process.argv[1] && process.argv[1].endsWith('backfillUniqueIds.js')) {
  import('dotenv').then(async (dotenv) => {
    dotenv.config();
    const mongoose = (await import('mongoose')).default;
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI is not defined.');
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    await backfillAllMissingUniqueIds();
    await mongoose.disconnect();
    console.log('Done.');
    process.exit(0);
  });
}

export default backfillAllMissingUniqueIds;
