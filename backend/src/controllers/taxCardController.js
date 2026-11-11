import TaxCard from '../models/TaxCard.js';
import mongoose from 'mongoose';
import { adjustSrOnDelete } from '../utils/resequenceSr.js';
import { saveBase64ToFile } from '../utils/attachmentStorage.js';
import sharedApiCache from '../utils/memoryCache.js';

const escapeRegex = (string) => {
  if (string == null) return '';
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const taxCardListCache = new Map();
const TAX_CARD_CACHE_TTL_MS = 3 * 60 * 1000;
const clearTaxCardCache = () => {
  taxCardListCache.clear();
  sharedApiCache.invalidatePrefix('dashboard:');
};

const buildTaxCardLookupQuery = (id) => {
  const query = {
    $or: [{ taxCardId: id }, { tax_card_id: id }],
    isDeleted: { $ne: true }
  };
  if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
  if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });
  return query;
};

const formatItem = (d) => ({
  id: d.srNumber ? d.srNumber.toString() : (d.taxCardId || d._id.toString()),
  mongoId: d._id.toString(),
  taxCardId: d.taxCardId || d.tax_card_id || '',
  srNumber: d.srNumber || 1,
  heading: d.heading || '',
  category: d.category || '',
  date: d.date || '',
  year: d.year || '',
  attachment: d.attachment || '',
  attachmentName: d.attachmentName || '',
  detail: d.detail || '',
  createdAt: d.createdAt,
  updatedAt: d.updatedAt
});

export const getTaxCards = async (req, res, next) => {
  try {
    const { query, category } = req.query;
    const cacheKey = `${String(category || '').trim().toLowerCase()}|${String(query || '').trim().toLowerCase()}`;
    const cached = taxCardListCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.status(200).json({
        success: true,
        message: 'Tax cards retrieved successfully.',
        count: cached.data.length,
        data: cached.data
      });
    }

    const filter = { isDeleted: { $ne: true } };
    if (category) {
      filter.category = String(category).trim();
    }

    if (query) {
      const q = String(query).trim();
      const searchRegex = new RegExp(escapeRegex(q), 'i');
      const numQ = Number(q);
      const orConditions = [
        { heading: searchRegex },
        { taxCardId: searchRegex },
        { date: searchRegex },
        { detail: searchRegex },
      ];
      if (!isNaN(numQ)) {
        orConditions.push({ srNumber: numQ });
        orConditions.push({ year: numQ });
      }
      filter.$or = orConditions;
    }

    const items = await TaxCard.find(filter).sort({ srNumber: -1, createdAt: -1 }).lean();
    const data = items.map(formatItem);
    if (taxCardListCache.size > 100) taxCardListCache.clear();
    taxCardListCache.set(cacheKey, { data, expiresAt: Date.now() + TAX_CARD_CACHE_TTL_MS });

    return res.status(200).json({
      success: true,
      message: 'Tax cards retrieved successfully.',
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getTaxCardById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await TaxCard.findOne(buildTaxCardLookupQuery(id)).lean();
    if (!item) {
      return res.status(404).json({ success: false, message: `Tax Card '${id}' not found.` });
    }
    return res.status(200).json({ success: true, data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const createTaxCard = async (req, res, next) => {
  try {
    const { heading, category, date, year, attachment, attachmentName, detail } = req.body;

    if (!heading?.trim()) {
      return res.status(400).json({ success: false, message: 'Heading is required.' });
    }
    if (!date?.trim()) {
      return res.status(400).json({ success: false, message: 'Date is required.' });
    }
    if (!year || isNaN(Number(year))) {
      return res.status(400).json({ success: false, message: 'Valid Year is required.' });
    }

    const cleanAttachment = attachment ? saveBase64ToFile(attachment, attachmentName || 'tax-card.pdf') : '';

    const item = new TaxCard({
      heading: heading.trim(),
      category: (category || 'tax-cards').trim(),
      date: date.trim(),
      year: parseInt(year, 10),
      attachment: cleanAttachment,
      attachmentName: attachmentName || '',
      detail: detail || ''
    });

    await item.save();
    clearTaxCardCache();
    return res.status(201).json({ success: true, message: 'Tax Card record created.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const updateTaxCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { heading, category, date, year, attachment, attachmentName, detail } = req.body;

    const item = await TaxCard.findOne(buildTaxCardLookupQuery(id));
    if (!item) {
      return res.status(404).json({ success: false, message: `Tax Card '${id}' not found.` });
    }

    if (heading !== undefined) item.heading = heading.trim();
    if (category !== undefined) item.category = String(category).trim();
    if (date !== undefined) item.date = date.trim();
    if (year !== undefined && !isNaN(Number(year))) item.year = parseInt(year, 10);
    if (attachment !== undefined) {
      item.attachment = attachment ? saveBase64ToFile(attachment, attachmentName || item.attachmentName || 'tax-card.pdf') : '';
    }
    if (attachmentName !== undefined) item.attachmentName = attachmentName;
    if (detail !== undefined) item.detail = detail;

    await item.save();
    clearTaxCardCache();
    return res.status(200).json({ success: true, message: 'Tax Card record updated.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const deleteTaxCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await TaxCard.findOne(buildTaxCardLookupQuery(id));
    if (!item) {
      return res.status(404).json({ success: false, message: `Tax Card '${id}' not found.` });
    }

    item.isDeleted = true;
    item.deletedAt = new Date();
    await item.save();

    await adjustSrOnDelete(TaxCard, item, { srField: 'srNumber', counterName: 'tax_card' });
    clearTaxCardCache();

    return res.status(200).json({ success: true, message: 'Tax Card record deleted and SR# auto-adjusted.' });
  } catch (error) {
    next(error);
  }
};
