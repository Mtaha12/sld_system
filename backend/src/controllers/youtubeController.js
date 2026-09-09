import YoutubeUpdate from '../models/YoutubeUpdate.js';
import mongoose from 'mongoose';

const formatItem = (y) => ({
  id: y.srNumber ? y.srNumber.toString() : (y.youtubeId || y._id.toString()),
  mongoId: y._id.toString(),
  youtubeId: y.youtubeId || y.youtube_id || '',
  srNumber: y.srNumber || 1,
  caption: y.caption || '',
  dated: y.dated || '',
  date: y.dated || '',
  url: y.url || '',
  photo: y.photo || '',
  photoName: y.photoName || '',
  createdAt: y.createdAt,
  updatedAt: y.updatedAt
});

export const getYoutubeUpdates = async (req, res, next) => {
  try {
    const { query } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (query) {
      const q = query.trim();
      const searchRegex = new RegExp(q, 'i');
      const numQ = Number(q);
      const orConditions = [
        { caption: searchRegex },
        { youtubeId: searchRegex },
        { dated: searchRegex },
        { url: searchRegex },
      ];
      if (!isNaN(numQ)) {
        orConditions.push({ srNumber: numQ });
      }
      filter.$or = orConditions;
    }

    const items = await YoutubeUpdate.find(filter).sort({ srNumber: -1, createdAt: -1 });
    const data = items.map(formatItem);

    return res.status(200).json({
      success: true,
      message: 'Youtube updates retrieved successfully.',
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getYoutubeUpdateById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [{ youtubeId: id }, { youtube_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await YoutubeUpdate.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Youtube update '${id}' not found.` });
    }
    return res.status(200).json({ success: true, data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const createYoutubeUpdate = async (req, res, next) => {
  try {
    const { caption, dated, url, photo, photoName } = req.body;

    if (!caption?.trim()) {
      return res.status(400).json({ success: false, message: 'Caption is required.' });
    }
    if (!dated?.trim()) {
      return res.status(400).json({ success: false, message: 'Dated is required.' });
    }
    if (!url?.trim()) {
      return res.status(400).json({ success: false, message: 'URL is required.' });
    }

    const item = new YoutubeUpdate({
      caption: caption.trim(),
      dated: dated.trim(),
      url: url.trim(),
      photo: photo || '',
      photoName: photoName || ''
    });

    await item.save();
    return res.status(201).json({ success: true, message: 'Youtube update created.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const updateYoutubeUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { caption, dated, url, photo, photoName } = req.body;

    const query = {
      $or: [{ youtubeId: id }, { youtube_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await YoutubeUpdate.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Youtube update '${id}' not found.` });
    }

    if (caption !== undefined) item.caption = caption.trim();
    if (dated !== undefined) item.dated = dated.trim();
    if (url !== undefined) item.url = url.trim();
    if (photo !== undefined) item.photo = photo;
    if (photoName !== undefined) item.photoName = photoName;

    await item.save();
    return res.status(200).json({ success: true, message: 'Youtube update updated.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const deleteYoutubeUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [{ youtubeId: id }, { youtube_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await YoutubeUpdate.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Youtube update '${id}' not found.` });
    }

    item.isDeleted = true;
    item.deletedAt = new Date();
    await item.save();
    return res.status(200).json({ success: true, message: 'Youtube update deleted.' });
  } catch (error) {
    next(error);
  }
};
