import WebsiteUpdate from '../models/WebsiteUpdate.js';
import mongoose from 'mongoose';

const formatItem = (u) => ({
  id: u.srNumber ? u.srNumber.toString() : (u.updateId || u._id.toString()),
  mongoId: u._id.toString(),
  updateId: u.updateId || u.update_id || '',
  srNumber: u.srNumber || 1,
  heading: u.heading || '',
  dated: u.dated || '',
  date: u.dated || '',
  url: u.url || '',
  createdAt: u.createdAt,
  updatedAt: u.updatedAt
});

export const getUpdates = async (req, res, next) => {
  try {
    const { query } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (query) {
      const q = query.trim();
      const searchRegex = new RegExp(q, 'i');
      const numQ = Number(q);
      const orConditions = [
        { heading: searchRegex },
        { updateId: searchRegex },
        { dated: searchRegex },
        { url: searchRegex },
      ];
      if (!isNaN(numQ)) {
        orConditions.push({ srNumber: numQ });
      }
      filter.$or = orConditions;
    }

    const items = await WebsiteUpdate.find(filter).sort({ srNumber: -1, createdAt: -1 });
    const data = items.map(formatItem);

    return res.status(200).json({
      success: true,
      message: 'Updates retrieved successfully.',
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getUpdateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [{ updateId: id }, { update_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await WebsiteUpdate.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Update '${id}' not found.` });
    }
    return res.status(200).json({ success: true, data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const createUpdate = async (req, res, next) => {
  try {
    const { heading, dated, url } = req.body;

    if (!heading?.trim()) {
      return res.status(400).json({ success: false, message: 'Heading is required.' });
    }
    if (!dated?.trim()) {
      return res.status(400).json({ success: false, message: 'Dated is required.' });
    }
    if (!url?.trim()) {
      return res.status(400).json({ success: false, message: 'URL is required.' });
    }

    const item = new WebsiteUpdate({
      heading: heading.trim(),
      dated: dated.trim(),
      url: url.trim()
    });

    await item.save();
    return res.status(201).json({ success: true, message: 'Update created.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const updateUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { heading, dated, url } = req.body;

    const query = {
      $or: [{ updateId: id }, { update_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await WebsiteUpdate.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Update '${id}' not found.` });
    }

    if (heading !== undefined) item.heading = heading.trim();
    if (dated !== undefined) item.dated = dated.trim();
    if (url !== undefined) item.url = url.trim();

    await item.save();
    return res.status(200).json({ success: true, message: 'Update updated.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const deleteUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [{ updateId: id }, { update_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await WebsiteUpdate.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Update '${id}' not found.` });
    }

    item.isDeleted = true;
    item.deletedAt = new Date();
    await item.save();
    return res.status(200).json({ success: true, message: 'Update deleted.' });
  } catch (error) {
    next(error);
  }
};
