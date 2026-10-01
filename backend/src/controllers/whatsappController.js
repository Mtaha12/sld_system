import WhatsappUpdate from '../models/WhatsappUpdate.js';
import mongoose from 'mongoose';

const formatItem = (w) => ({
  id: w.srNumber ? w.srNumber.toString() : (w.whatsappId || w._id.toString()),
  mongoId: w._id.toString(),
  whatsappId: w.whatsappId || w.whatsapp_id || '',
  srNumber: w.srNumber || 1,
  heading: w.heading || '',
  dated: w.dated || '',
  date: w.dated || '',
  attachment: w.attachment || '',
  attachmentName: w.attachmentName || '',
  createdAt: w.createdAt,
  updatedAt: w.updatedAt
});

export const getWhatsappUpdates = async (req, res, next) => {
  try {
    const { query, page, limit, all } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (query) {
      const q = query.trim();
      const searchRegex = new RegExp(q, 'i');
      const numQ = Number(q);
      const orConditions = [
        { heading: searchRegex },
        { whatsappId: searchRegex },
        { dated: searchRegex },
      ];
      if (!isNaN(numQ)) {
        orConditions.push({ srNumber: numQ });
      }
      filter.$or = orConditions;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const isAll = all === 'true';

    const safeLimit = isAll ? 1000 : Math.min(Math.max(limitNum || 25, 1), 200);
    const safePage = Math.max(pageNum || 1, 1);

    const total = await WhatsappUpdate.countDocuments(filter);
    const totalPages = Math.ceil(total / safeLimit) || 1;

    let dbQuery = WhatsappUpdate.find(filter).sort({ srNumber: -1, createdAt: -1 });

    if (!isAll) {
      dbQuery = dbQuery.skip((safePage - 1) * safeLimit).limit(safeLimit);
    }

    const items = await dbQuery.lean();
    const data = items.map(formatItem);

    return res.status(200).json({
      success: true,
      message: 'Whatsapp updates retrieved successfully.',
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

export const getWhatsappUpdateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [
        { whatsappId: id },
        { whatsapp_id: id }
      ],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await WhatsappUpdate.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Whatsapp update '${id}' not found.` });
    }
    return res.status(200).json({ success: true, data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const createWhatsappUpdate = async (req, res, next) => {
  try {
    const { heading, dated, attachment, attachmentName } = req.body;

    if (!heading?.trim()) {
      return res.status(400).json({ success: false, message: 'Heading is required.' });
    }
    if (!dated?.trim()) {
      return res.status(400).json({ success: false, message: 'Dated is required.' });
    }

    const item = new WhatsappUpdate({
      heading: heading.trim(),
      dated: dated.trim(),
      attachment: attachment || '',
      attachmentName: attachmentName || ''
    });

    await item.save();
    return res.status(201).json({ success: true, message: 'Whatsapp update created.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const updateWhatsappUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { heading, dated, attachment, attachmentName } = req.body;

    const query = {
      $or: [{ whatsappId: id }, { whatsapp_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await WhatsappUpdate.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Whatsapp update '${id}' not found.` });
    }

    if (heading !== undefined) item.heading = heading.trim();
    if (dated !== undefined) item.dated = dated.trim();
    if (attachment !== undefined) item.attachment = attachment;
    if (attachmentName !== undefined) item.attachmentName = attachmentName;

    await item.save();
    return res.status(200).json({ success: true, message: 'Whatsapp update updated.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const deleteWhatsappUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [{ whatsappId: id }, { whatsapp_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await WhatsappUpdate.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Whatsapp update '${id}' not found.` });
    }

    item.isDeleted = true;
    item.deletedAt = new Date();
    await item.save();
    return res.status(200).json({ success: true, message: 'Whatsapp update deleted.' });
  } catch (error) {
    next(error);
  }
};
