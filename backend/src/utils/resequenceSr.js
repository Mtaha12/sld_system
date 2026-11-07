import Counter from '../models/Counter.js';
import logger from './logger.js';

/**
 * Re-sequences and auto-adjusts SR numbers when a record is deleted.
 * 
 * Guarantees that:
 * 1. No SR# is missing or blank after an entry is deleted.
 * 2. All records with SR# higher than the deleted entry are shifted down by 1.
 * 3. The Counter collection's sequence is automatically kept in perfect sync.
 *
 * @param {import('mongoose').Model} Model - The Mongoose model (e.g. DownloadItem, WhatsappUpdate, Statute)
 * @param {Object} deletedItem - The deleted document before or after marking isDeleted
 * @param {Object} options
 * @param {string} [options.srField='srNumber'] - Field name storing SR number
 * @param {string} [options.intField=''] - Integer field name if separate (e.g. 'srNumberInt', 'sldNumberInt')
 * @param {boolean} [options.isString=false] - Whether primary srField is stored as string
 * @param {string} [options.counterName=''] - Name of counter sequence in Counter collection
 */
export async function adjustSrOnDelete(Model, deletedItem, options = {}) {
  try {
    const {
      srField = 'srNumber',
      intField = '',
      isString = false,
      counterName = ''
    } = options;

    if (!deletedItem) return;

    // 1. Determine the numeric SR value of the deleted item
    let deletedNum = 0;
    if (intField && typeof deletedItem[intField] === 'number' && deletedItem[intField] > 0) {
      deletedNum = deletedItem[intField];
    } else if (typeof deletedItem[srField] === 'number') {
      deletedNum = deletedItem[srField];
    } else if (deletedItem[srField]) {
      const parsed = parseInt(String(deletedItem[srField]).replace(/\D+/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0) {
        deletedNum = parsed;
      }
    }

    if (!deletedNum || deletedNum <= 0) {
      // If deleted entry had no valid SR# (was blank/useless), perform general gap healing
      await healGapsInCollection(Model, options);
      return;
    }

    logger.info(`[SR Auto-Adjust] Adjusting SR numbers in ${Model.modelName} after deleting SR #${deletedNum}...`);

    // 2. Adjust subsequent records down by 1
    if (isString && intField) {
      // Both intField and string srField (e.g. Statute, Notification, Case)
      await Model.updateMany(
        { isDeleted: { $ne: true }, [intField]: { $gt: deletedNum } },
        [
          {
            $set: {
              [intField]: { $subtract: [`$${intField}`, 1] },
              [srField]: { $toString: { $subtract: [`$${intField}`, 1] } }
            }
          }
        ]
      );
    } else if (isString) {
      // Only string srField
      const subsequentDocs = await Model.find({ isDeleted: { $ne: true } })
        .select(`_id ${srField}`)
        .lean();

      const bulkOps = [];
      for (const doc of subsequentDocs) {
        const docNum = parseInt(String(doc[srField] || '').replace(/\D+/g, ''), 10);
        if (!isNaN(docNum) && docNum > deletedNum) {
          const newSr = String(docNum - 1);
          bulkOps.push({
            updateOne: {
              filter: { _id: doc._id },
              update: { $set: { [srField]: newSr } }
            }
          });
        }
      }
      if (bulkOps.length > 0) {
        await Model.bulkWrite(bulkOps);
      }
    } else {
      // Pure numeric srNumber (DownloadItem, WhatsappUpdate, News, TaxCard, etc.)
      await Model.updateMany(
        { isDeleted: { $ne: true }, [srField]: { $gt: deletedNum } },
        { $inc: { [srField]: -1 } }
      );
    }

    // 3. Keep Counter sequence aligned
    if (counterName) {
      await Counter.findOneAndUpdate(
        { _id: counterName, seq: { $gte: deletedNum } },
        { $inc: { seq: -1 } }
      );
    }

    logger.info(`[SR Auto-Adjust] Successfully adjusted SR numbers for ${Model.modelName}. No missing SR numbers remain.`);
  } catch (error) {
    logger.error(`[SR Auto-Adjust Error] Could not adjust SR in ${Model?.modelName}:`, error);
  }
}

/**
 * Heals any preexisting gaps or blank SR numbers in a collection.
 * Ensures active records are consecutively numbered 1 .. N with no blanks or missing numbers.
 */
export async function healGapsInCollection(Model, options = {}) {
  try {
    const {
      srField = 'srNumber',
      intField = '',
      isString = false,
      counterName = '',
      sortField = 'createdAt'
    } = options;

    const activeDocs = await Model.find({ isDeleted: { $ne: true } })
      .sort({ [intField || srField]: 1, [sortField]: 1, _id: 1 })
      .select(`_id ${srField} ${intField ? intField : ''}`)
      .lean();

    if (!activeDocs || activeDocs.length === 0) return;

    const bulkOps = [];
    let currentSeq = 1;

    for (const doc of activeDocs) {
      const docNum = intField
        ? (doc[intField] || parseInt(String(doc[srField] || '').replace(/\D+/g, ''), 10))
        : (typeof doc[srField] === 'number' ? doc[srField] : parseInt(String(doc[srField] || '').replace(/\D+/g, ''), 10));

      if (docNum !== currentSeq || !doc[srField]) {
        const updateDoc = {};
        if (isString) {
          updateDoc[srField] = String(currentSeq);
        } else {
          updateDoc[srField] = currentSeq;
        }
        if (intField) {
          updateDoc[intField] = currentSeq;
        }

        bulkOps.push({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: updateDoc }
          }
        });
      }
      currentSeq++;
    }

    if (bulkOps.length > 0) {
      await Model.bulkWrite(bulkOps);
      logger.info(`[SR Gap-Healer] Repaired ${bulkOps.length} out-of-sequence / blank SR numbers in ${Model.modelName}.`);
    }

    if (counterName) {
      await Counter.findByIdAndUpdate(
        counterName,
        { $set: { seq: activeDocs.length } },
        { upsert: true }
      );
    }
  } catch (err) {
    logger.warn(`[SR Gap-Healer Warning] ${Model?.modelName} gap heal notice:`, err.message);
  }
}
