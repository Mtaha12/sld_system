import TaxCard from '../models/TaxCard.js';
import mongoose from 'mongoose';

const formatItem = (d) => ({
  id: d.srNumber ? d.srNumber.toString() : (d.taxCardId || d._id.toString()),
  mongoId: d._id.toString(),
  taxCardId: d.taxCardId || d.tax_card_id || '',
  srNumber: d.srNumber || 1,
  heading: d.heading || '',
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
    const { query } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (query) {
      const q = query.trim();
      const searchRegex = new RegExp(q, 'i');
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

    const items = await TaxCard.find(filter).sort({ srNumber: -1, createdAt: -1 });
    const data = items.map(formatItem);

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
    const query = {
      $or: [{ taxCardId: id }, { tax_card_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await TaxCard.findOne(query);
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
    const { heading, date, year, attachment, attachmentName, detail } = req.body;

    if (!heading?.trim()) {
      return res.status(400).json({ success: false, message: 'Heading is required.' });
    }
    if (!date?.trim()) {
      return res.status(400).json({ success: false, message: 'Date is required.' });
    }
    if (!year || isNaN(Number(year))) {
      return res.status(400).json({ success: false, message: 'Valid Year is required.' });
    }

    const item = new TaxCard({
      heading: heading.trim(),
      date: date.trim(),
      year: parseInt(year, 10),
      attachment: attachment || '',
      attachmentName: attachmentName || '',
      detail: detail || ''
    });

    await item.save();
    return res.status(201).json({ success: true, message: 'Tax Card record created.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const updateTaxCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { heading, date, year, attachment, attachmentName, detail } = req.body;

    const query = {
      $or: [{ taxCardId: id }, { tax_card_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await TaxCard.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Tax Card '${id}' not found.` });
    }

    if (heading !== undefined) item.heading = heading.trim();
    if (date !== undefined) item.date = date.trim();
    if (year !== undefined && !isNaN(Number(year))) item.year = parseInt(year, 10);
    if (attachment !== undefined) item.attachment = attachment;
    if (attachmentName !== undefined) item.attachmentName = attachmentName;
    if (detail !== undefined) item.detail = detail;

    await item.save();
    return res.status(200).json({ success: true, message: 'Tax Card record updated.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const deleteTaxCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [{ taxCardId: id }, { tax_card_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await TaxCard.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Tax Card '${id}' not found.` });
    }

    item.isDeleted = true;
    item.deletedAt = new Date();
    await item.save();
    return res.status(200).json({ success: true, message: 'Tax Card record deleted.' });
  } catch (error) {
    next(error);
  }
};
