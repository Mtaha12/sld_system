import Counter from '../models/Counter.js';
import logger from './logger.js';

/**
 * Standard configuration for entity prefixes and padding
 */
export const DEFAULT_ENTITY_CONFIGS = {
  case: { prefix: 'CASE', padLength: 6, field: 'caseId', aliases: ['case_id'] },
  notification: { prefix: 'NOTIF', padLength: 6, field: 'notificationId', aliases: ['notification_id'] },
  statute: { prefix: 'STAT', padLength: 6, field: 'statuteId', aliases: ['statute_id'] },
  news: { prefix: 'NEWS', padLength: 6, field: 'newsId', aliases: ['news_id'] },
  whatsapp: { prefix: 'WA', padLength: 6, field: 'whatsappId', aliases: ['whatsapp_id'] },
  update: { prefix: 'UPD', padLength: 6, field: 'updateId', aliases: ['update_id'] },
  download: { prefix: 'DWN', padLength: 6, field: 'downloadId', aliases: ['download_id'] },
  youtube: { prefix: 'YT', padLength: 6, field: 'youtubeId', aliases: ['youtube_id'] },
  user: { prefix: 'USER', padLength: 6, field: 'userId', aliases: ['user_id'] },
  default: { prefix: 'REC', padLength: 6, field: 'recordId', aliases: ['record_id'] }
};

/**
 * Atomically retrieves the next sequential number for an entity
 * Uses MongoDB findByIdAndUpdate with $inc for 100% concurrency safety
 *
 * @param {string} entityName
 * @param {import('mongoose').ClientSession|null} session
 * @returns {Promise<number>}
 */
export const getNextSequence = async (entityName, session = null) => {
  if (!entityName || typeof entityName !== 'string') {
    throw new Error('entityName must be a non-empty string');
  }

  const queryOptions = {
    returnDocument: 'after',
    upsert: true,
    setDefaultsOnInsert: true
  };

  if (session) {
    queryOptions.session = session;
  }

  const counter = await Counter.findByIdAndUpdate(
    entityName.toLowerCase().trim(),
    { $inc: { seq: 1 } },
    queryOptions
  );

  return counter.seq;
};

/**
 * Formats a sequence number into a standard prefixed ID
 *
 * @param {number} seq
 * @param {string} prefix
 * @param {number} padLength
 * @param {string} delimiter
 * @returns {string}
 */
export const formatUniqueId = (seq, prefix = 'REC', padLength = 6, delimiter = '-') => {
  const paddedSeq = String(seq).padStart(padLength, '0');
  return prefix ? `${prefix}${delimiter}${paddedSeq}` : paddedSeq;
};

/**
 * Atomically generates a formatted unique ID
 *
 * @param {Object} options
 * @param {string} options.entityName - Entity identifier (e.g. 'case', 'notification', 'statute')
 * @param {string} [options.prefix] - Prefix (e.g. 'CASE', 'NOTIF', 'STAT')
 * @param {number} [options.padLength=6] - Number of padded digits
 * @param {string} [options.delimiter='-'] - Separator
 * @param {import('mongoose').ClientSession|null} [options.session]
 * @returns {Promise<string>}
 */
export const generateUniqueId = async ({
  entityName,
  prefix,
  padLength = 6,
  delimiter = '-',
  session = null
} = {}) => {
  const normalizedEntity = (entityName || 'default').toLowerCase().trim();
  const config = DEFAULT_ENTITY_CONFIGS[normalizedEntity] || DEFAULT_ENTITY_CONFIGS.default;

  const resolvedPrefix = prefix !== undefined ? prefix : config.prefix;
  const resolvedPadLength = padLength || config.padLength;

  const seq = await getNextSequence(normalizedEntity, session);
  return formatUniqueId(seq, resolvedPrefix, resolvedPadLength, delimiter);
};

/**
 * Synchronizes a counter so its seq is at least `targetSeq`
 * Useful during migrations or backfills to prevent duplicate IDs
 *
 * @param {string} entityName
 * @param {number} targetSeq
 * @returns {Promise<number>}
 */
export const syncCounter = async (entityName, targetSeq) => {
  const normalizedEntity = (entityName || 'default').toLowerCase().trim();
  const current = await Counter.findById(normalizedEntity);
  const currentSeq = current ? current.seq : 0;

  if (targetSeq > currentSeq) {
    await Counter.findByIdAndUpdate(
      normalizedEntity,
      { $set: { seq: targetSeq } },
      { upsert: true, returnDocument: 'after' }
    );
    logger.info(`[UniqueId] Synchronized counter '${normalizedEntity}' from ${currentSeq} to ${targetSeq}`);
    return targetSeq;
  }

  return currentSeq;
};

/**
 * Parses numeric sequence from a generated ID string
 * E.g. "CASE-000042" -> 42
 *
 * @param {string} idString
 * @param {string} delimiter
 * @returns {number|null}
 */
export const parseSequenceFromId = (idString, delimiter = '-') => {
  if (!idString || typeof idString !== 'string') return null;
  const parts = idString.split(delimiter);
  const lastPart = parts[parts.length - 1];
  const num = parseInt(lastPart, 10);
  return isNaN(num) ? null : num;
};

export default {
  DEFAULT_ENTITY_CONFIGS,
  getNextSequence,
  formatUniqueId,
  generateUniqueId,
  syncCounter,
  parseSequenceFromId
};
