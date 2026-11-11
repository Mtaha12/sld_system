import Dictionary from '../models/Dictionary.js';
import mongoose from 'mongoose';
import { adjustSrOnDelete } from '../utils/resequenceSr.js';
import sharedApiCache from '../utils/memoryCache.js';

const DICTIONARY_CACHE_TTL_MS = 5 * 60 * 1000;

const escapeRegex = (string) => {
  if (string == null) return '';
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const formatItem = (d) => {
  const numSr = typeof d.srNumber === 'number' && !isNaN(d.srNumber)
    ? d.srNumber 
    : (parseInt(d.srNumber, 10) || (d.id && !isNaN(parseInt(d.id, 10)) ? parseInt(d.id, 10) : 1));

  return {
    id: numSr ? numSr.toString() : (d.dictionaryId || d._id.toString()),
    mongoId: d._id.toString(),
    dictionaryId: d.dictionaryId || d.dictionary_id || '',
    srNumber: numSr,
    words: d.words || '',
    meaning: d.meaning || '',
    createdAt: d.createdAt,
    updatedAt: d.updatedAt
  };
};

export const getDictionary = async (req, res, next) => {
  try {
    const { query, page, limit, all, sortField, sortOrder } = req.query;
    const cacheKey = `dictionary:list:${String(query || '').trim().toLowerCase()}|${page || ''}|${limit || ''}|${all || ''}|${sortField || ''}|${sortOrder || ''}`;
    const cached = sharedApiCache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const filter = { isDeleted: { $ne: true } };

    if (query) {
      const q = query.trim();
      const searchRegex = new RegExp(escapeRegex(q), 'i');
      const numQ = Number(q);
      const orConditions = [
        { words: searchRegex },
        { dictionaryId: searchRegex },
        { meaning: searchRegex },
      ];
      if (!isNaN(numQ)) {
        orConditions.push({ srNumber: numQ });
      }
      filter.$or = orConditions;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const isAll = all === 'true';

    const safeLimit = isAll ? 1000 : Math.min(Math.max(limitNum || 100, 1), 1000);
    const safePage = Math.max(pageNum || 1, 1);

    const order = sortOrder === 'desc' ? -1 : 1;
    let sortObj = { srNumber: order, words: 1 };
    if (sortField === 'words') {
      sortObj = { words: order, srNumber: order };
    } else if (sortField === 'srNumber' || !sortField) {
      sortObj = { srNumber: order, _id: order };
    }

    let dbQuery = Dictionary.find(filter).sort(sortObj);
    if (!isAll) {
      dbQuery = dbQuery.skip((safePage - 1) * safeLimit).limit(safeLimit);
    }

    const isUnfiltered = !query || !String(query).trim();
    const [total, maxDoc, items] = await Promise.all([
      isUnfiltered ? Dictionary.estimatedDocumentCount() : Dictionary.countDocuments(filter),
      Dictionary.findOne().sort({ srNumber: -1 }).select('srNumber').lean().catch(() => null),
      dbQuery.lean()
    ]);

    const totalPages = Math.ceil(total / safeLimit) || 1;
    const maxSrNumber = maxDoc?.srNumber ? Math.max(maxDoc.srNumber, 41427) : 41427;
    const data = items.map(formatItem);

    const payload = {
      success: true,
      message: 'Dictionary terms retrieved successfully.',
      count: data.length,
      total,
      maxSrNumber,
      dashboardTotal: maxSrNumber,
      totalPages,
      currentPage: safePage,
      data
    };
    sharedApiCache.set(cacheKey, payload, DICTIONARY_CACHE_TTL_MS);
    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

export const getDictionaryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [{ dictionaryId: id }, { dictionary_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await Dictionary.findOne(query).lean();
    if (!item) {
      return res.status(404).json({ success: false, message: `Dictionary item '${id}' not found.` });
    }
    return res.status(200).json({ success: true, data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const createDictionary = async (req, res, next) => {
  try {
    const { words, srNumber, meaning } = req.body;

    if (!words?.trim()) {
      return res.status(400).json({ success: false, message: 'Words is required.' });
    }

    const item = new Dictionary({
      words: words.trim(),
      meaning: meaning || ''
    });

    if (srNumber !== undefined && srNumber !== null && !isNaN(Number(srNumber))) {
      item.srNumber = parseInt(srNumber, 10);
    }

    await item.save();
    sharedApiCache.invalidatePrefix('dictionary:');
    sharedApiCache.invalidatePrefix('dashboard:');
    return res.status(201).json({ success: true, message: 'Dictionary entry added.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const updateDictionary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { words, srNumber, meaning } = req.body;

    const query = {
      $or: [{ dictionaryId: id }, { dictionary_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await Dictionary.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Dictionary item '${id}' not found.` });
    }

    if (words !== undefined) item.words = words.trim();
    if (meaning !== undefined) item.meaning = meaning;
    if (srNumber !== undefined && srNumber !== null && !isNaN(Number(srNumber))) {
      item.srNumber = parseInt(srNumber, 10);
    }

    await item.save();
    sharedApiCache.invalidatePrefix('dictionary:');
    sharedApiCache.invalidatePrefix('dashboard:');
    return res.status(200).json({ success: true, message: 'Dictionary entry updated.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const deleteDictionary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [{ dictionaryId: id }, { dictionary_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await Dictionary.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Dictionary item '${id}' not found.` });
    }

    item.isDeleted = true;
    item.deletedAt = new Date();
    await item.save();

    await adjustSrOnDelete(Dictionary, item, { srField: 'srNumber', counterName: 'dictionary_sr_seq' });
    sharedApiCache.invalidatePrefix('dictionary:');
    sharedApiCache.invalidatePrefix('dashboard:');

    return res.status(200).json({ success: true, message: 'Dictionary entry deleted.' });
  } catch (error) {
    next(error);
  }
};
