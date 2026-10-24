import WhatsappUpdate from '../models/WhatsappUpdate.js';
import Counter from '../models/Counter.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const escapeRegex = (string) => {
  if (string == null) return '';
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const formatItem = (w) => {
  const docId = w.srNumber ? w.srNumber.toString() : (w.whatsappId || w._id.toString());
  const hasAttachment = Boolean(
    (w.attachmentName && w.attachmentName.trim() !== '') ||
    (w.attachment && w.attachment.trim() !== '')
  );

  return {
    id: docId,
    mongoId: w._id.toString(),
    whatsappId: w.whatsappId || w.whatsapp_id || '',
    srNumber: w.srNumber || 1,
    heading: w.heading || '',
    dated: w.dated || '',
    date: w.dated || '',
    hasAttachment,
    attachment: w.attachment || '',
    attachmentName: w.attachmentName || '',
    viewUrl: `/api/whatsapp-updates/${docId}/view`,
    downloadUrl: `/api/whatsapp-updates/${docId}/download`,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt
  };
};

export const getNextWhatsappSr = async (req, res, next) => {
  try {
    const latestDoc = await WhatsappUpdate.findOne({ isDeleted: { $ne: true } })
      .sort({ srNumber: -1 })
      .select('srNumber dated')
      .lean();

    const nextSr = (latestDoc?.srNumber || 0) + 1;
    const lastDated = latestDoc?.dated || '';

    return res.status(200).json({
      success: true,
      nextSr,
      lastDated,
      data: {
        nextSr,
        lastDated
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getWhatsappUpdates = async (req, res, next) => {
  try {
    const { query, page, limit, all } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (query) {
      const q = query.trim();
      const searchRegex = new RegExp(escapeRegex(q), 'i');
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

    const safeLimit = isAll ? 500 : Math.min(Math.max(limitNum || 25, 1), 200);
    const safePage = Math.max(pageNum || 1, 1);

    let dbQuery = WhatsappUpdate.find(filter)
      .sort({ srNumber: -1, createdAt: -1 })
      .select('srNumber heading dated attachment attachmentName whatsappId isDeleted createdAt updatedAt');

    if (!isAll) {
      dbQuery = dbQuery.skip((safePage - 1) * safeLimit).limit(safeLimit);
    }

    // Execute count and query in parallel for max performance
    const [total, items] = await Promise.all([
      WhatsappUpdate.countDocuments(filter),
      dbQuery.lean()
    ]);

    const totalPages = Math.ceil(total / safeLimit) || 1;
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

export const viewWhatsappAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [{ whatsappId: id }, { whatsapp_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await WhatsappUpdate.findOne(query).select('attachment attachmentName');
    if (!item || !item.attachment) {
      return res.status(404).send('No attachment file found for this record.');
    }

    const filename = item.attachmentName || 'document.pdf';

    // Handle Data URL (base64)
    if (item.attachment.startsWith('data:')) {
      const matches = item.attachment.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        return res.send(buffer);
      }
    }

    // Handle local file in uploads/
    if (item.attachment.startsWith('/uploads') || item.attachment.startsWith('uploads/')) {
      const filePath = path.resolve(process.cwd(), item.attachment.replace(/^\/+/, ''));
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        return res.sendFile(filePath);
      }
    }

    // Handle external URL
    if (item.attachment.startsWith('http://') || item.attachment.startsWith('https://')) {
      return res.redirect(item.attachment);
    }

    return res.status(404).send('Attachment file could not be resolved.');
  } catch (error) {
    next(error);
  }
};

export const downloadWhatsappAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [{ whatsappId: id }, { whatsapp_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await WhatsappUpdate.findOne(query).select('attachment attachmentName');
    if (!item || !item.attachment) {
      return res.status(404).send('No attachment file found for this record.');
    }

    const filename = item.attachmentName || 'document.pdf';

    // Handle Data URL (base64)
    if (item.attachment.startsWith('data:')) {
      const matches = item.attachment.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        return res.send(buffer);
      }
    }

    // Handle local file in uploads/
    if (item.attachment.startsWith('/uploads') || item.attachment.startsWith('uploads/')) {
      const filePath = path.resolve(process.cwd(), item.attachment.replace(/^\/+/, ''));
      if (fs.existsSync(filePath)) {
        return res.download(filePath, filename);
      }
    }

    // Handle external URL
    if (item.attachment.startsWith('http://') || item.attachment.startsWith('https://')) {
      return res.redirect(item.attachment);
    }

    return res.status(404).send('Attachment file could not be resolved.');
  } catch (error) {
    next(error);
  }
};

export const createWhatsappUpdate = async (req, res, next) => {
  try {
    const { heading, dated, attachment, attachmentName, srNumber } = req.body;

    if (!heading?.trim()) {
      return res.status(400).json({ success: false, message: 'Heading is required.' });
    }
    if (!dated?.trim()) {
      return res.status(400).json({ success: false, message: 'Dated is required.' });
    }

    const parsedSr = srNumber && !isNaN(Number(srNumber)) ? Number(srNumber) : undefined;

    const item = new WhatsappUpdate({
      heading: heading.trim(),
      dated: dated.trim(),
      attachment: attachment || '',
      attachmentName: attachmentName || '',
      ...(parsedSr ? { srNumber: parsedSr } : {})
    });

    await item.save();

    // Ensure Counter is synchronized if manual SR was passed
    if (parsedSr) {
      await Counter.findByIdAndUpdate(
        'whatsapp_sr_seq',
        { $max: { seq: parsedSr } },
        { upsert: true }
      ).catch(() => {});
    }

    return res.status(201).json({ success: true, message: 'Whatsapp update created.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const updateWhatsappUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { heading, dated, attachment, attachmentName, srNumber } = req.body;

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
    if (srNumber !== undefined && !isNaN(Number(srNumber))) {
      item.srNumber = Number(srNumber);
    }

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
