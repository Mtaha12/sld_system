import DownloadItem from '../models/DownloadItem.js';
import mongoose from 'mongoose';

const formatItem = (d) => ({
  id: d.srNumber ? d.srNumber.toString() : (d.downloadId || d._id.toString()),
  mongoId: d._id.toString(),
  downloadId: d.downloadId || d.download_id || '',
  srNumber: d.srNumber || 1,
  heading: d.heading || '',
  date: d.date || '',
  latest: d.latest || 'Finance Act',
  attachment: d.attachment || '',
  attachmentName: d.attachmentName || '',
  detail: d.detail || '',
  createdAt: d.createdAt,
  updatedAt: d.updatedAt
});

export const getDownloads = async (req, res, next) => {
  try {
    const { query, category } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (category) {
      filter.latest = category;
    }

    if (query) {
      const q = query.trim();
      const searchRegex = new RegExp(q, 'i');
      const numQ = Number(q);
      const orConditions = [
        { heading: searchRegex },
        { downloadId: searchRegex },
        { date: searchRegex },
        { latest: searchRegex },
        { detail: searchRegex },
      ];
      if (!isNaN(numQ)) {
        orConditions.push({ srNumber: numQ });
      }
      filter.$or = orConditions;
    }

    const items = await DownloadItem.find(filter).sort({ srNumber: -1, createdAt: -1 });
    const data = items.map(formatItem);

    return res.status(200).json({
      success: true,
      message: 'Downloads retrieved successfully.',
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getDownloadById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [{ downloadId: id }, { download_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await DownloadItem.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Download '${id}' not found.` });
    }
    return res.status(200).json({ success: true, data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const createDownload = async (req, res, next) => {
  try {
    const { heading, date, latest, attachment, attachmentName, detail } = req.body;

    if (!heading?.trim()) {
      return res.status(400).json({ success: false, message: 'Heading is required.' });
    }
    if (!date?.trim()) {
      return res.status(400).json({ success: false, message: 'Date is required.' });
    }

    // Default or map category
    const validCategories = ['Finance Act', 'Tax Return', 'Updated Law'];
    const chosenLatest = validCategories.includes(latest) ? latest : 'Finance Act';

    const item = new DownloadItem({
      heading: heading.trim(),
      date: date.trim(),
      latest: chosenLatest,
      attachment: attachment || '',
      attachmentName: attachmentName || '',
      detail: detail || ''
    });

    await item.save();
    return res.status(201).json({ success: true, message: 'Download record created.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const updateDownload = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { heading, date, latest, attachment, attachmentName, detail } = req.body;

    const query = {
      $or: [{ downloadId: id }, { download_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await DownloadItem.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Download '${id}' not found.` });
    }

    if (heading !== undefined) item.heading = heading.trim();
    if (date !== undefined) item.date = date.trim();
    if (latest !== undefined) {
      const validCategories = ['Finance Act', 'Tax Return', 'Updated Law'];
      if (validCategories.includes(latest)) {
        item.latest = latest;
      }
    }
    if (attachment !== undefined) item.attachment = attachment;
    if (attachmentName !== undefined) item.attachmentName = attachmentName;
    if (detail !== undefined) item.detail = detail;

    await item.save();
    return res.status(200).json({ success: true, message: 'Download record updated.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const deleteDownload = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [{ downloadId: id }, { download_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await DownloadItem.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Download '${id}' not found.` });
    }

    item.isDeleted = true;
    item.deletedAt = new Date();
    await item.save();
    return res.status(200).json({ success: true, message: 'Download record deleted.' });
  } catch (error) {
    next(error);
  }
};
