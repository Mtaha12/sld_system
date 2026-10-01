import Dictionary from '../models/Dictionary.js';
import mongoose from 'mongoose';

const formatItem = (d) => ({
  id: d.srNumber ? d.srNumber.toString() : (d.dictionaryId || d._id.toString()),
  mongoId: d._id.toString(),
  dictionaryId: d.dictionaryId || d.dictionary_id || '',
  srNumber: d.srNumber || 1,
  words: d.words || '',
  meaning: d.meaning || '',
  createdAt: d.createdAt,
  updatedAt: d.updatedAt
});

export const getDictionary = async (req, res, next) => {
  try {
    const { query, page, limit, all } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (query) {
      const q = query.trim();
      const searchRegex = new RegExp(q, 'i');
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

    const safeLimit = isAll ? 1000 : Math.min(Math.max(limitNum || 50, 1), 200);
    const safePage = Math.max(pageNum || 1, 1);

    const total = await Dictionary.countDocuments(filter);
    const totalPages = Math.ceil(total / safeLimit) || 1;

    let dbQuery = Dictionary.find(filter).sort({ words: 1 });

    if (!isAll) {
      dbQuery = dbQuery.skip((safePage - 1) * safeLimit).limit(safeLimit);
    }

    const items = await dbQuery.lean();
    const data = items.map(formatItem);

    return res.status(200).json({
      success: true,
      message: 'Dictionary terms retrieved successfully.',
      count: data.length,
      total,
      totalPages,
      currentPage: safePage,
      data
    });
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

    const item = await Dictionary.findOne(query);
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
    return res.status(200).json({ success: true, message: 'Dictionary entry deleted.' });
  } catch (error) {
    next(error);
  }
};
