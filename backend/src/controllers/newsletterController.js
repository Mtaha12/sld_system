import Newsletter from '../models/Newsletter.js';
import mongoose from 'mongoose';

const formatItem = (d) => ({
  id: d.srNumber ? d.srNumber.toString() : (d.newsletterId || d._id.toString()),
  mongoId: d._id.toString(),
  newsletterId: d.newsletterId || d.newsletter_id || '',
  srNumber: d.srNumber || 1,
  subject: d.subject || '',
  date: d.date || '',
  category: d.category || 'Updates',
  message: d.message || '',
  attachment: d.attachment || '',
  attachmentName: d.attachmentName || '',
  createdAt: d.createdAt,
  updatedAt: d.updatedAt
});

export const getNewsletters = async (req, res, next) => {
  try {
    const { query, category } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (category) {
      filter.category = category;
    }

    if (query) {
      const q = query.trim();
      const searchRegex = new RegExp(q, 'i');
      const numQ = Number(q);
      const orConditions = [
        { subject: searchRegex },
        { newsletterId: searchRegex },
        { date: searchRegex },
        { category: searchRegex },
        { message: searchRegex },
      ];
      if (!isNaN(numQ)) {
        orConditions.push({ srNumber: numQ });
      }
      filter.$or = orConditions;
    }

    const items = await Newsletter.find(filter).sort({ srNumber: -1, createdAt: -1 });
    const data = items.map(formatItem);

    return res.status(200).json({
      success: true,
      message: 'Newsletters retrieved successfully.',
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getNewsletterById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [{ newsletterId: id }, { newsletter_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await Newsletter.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Newsletter '${id}' not found.` });
    }
    return res.status(200).json({ success: true, data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const createNewsletter = async (req, res, next) => {
  try {
    const { subject, date, category, message, attachment, attachmentName } = req.body;

    if (!subject?.trim()) {
      return res.status(400).json({ success: false, message: 'Subject is required.' });
    }
    if (!date?.trim()) {
      return res.status(400).json({ success: false, message: 'Date is required.' });
    }

    const item = new Newsletter({
      subject: subject.trim(),
      date: date.trim(),
      category: category?.trim() || 'Updates',
      message: message || '',
      attachment: attachment || '',
      attachmentName: attachmentName || ''
    });

    await item.save();
    return res.status(201).json({ success: true, message: 'Newsletter record created.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const updateNewsletter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { subject, date, category, message, attachment, attachmentName } = req.body;

    const query = {
      $or: [{ newsletterId: id }, { newsletter_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await Newsletter.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Newsletter '${id}' not found.` });
    }

    if (subject !== undefined) item.subject = subject.trim();
    if (date !== undefined) item.date = date.trim();
    if (category !== undefined) item.category = category.trim();
    if (message !== undefined) item.message = message;
    if (attachment !== undefined) item.attachment = attachment;
    if (attachmentName !== undefined) item.attachmentName = attachmentName;

    await item.save();
    return res.status(200).json({ success: true, message: 'Newsletter record updated.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const deleteNewsletter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [{ newsletterId: id }, { newsletter_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await Newsletter.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Newsletter '${id}' not found.` });
    }

    item.isDeleted = true;
    item.deletedAt = new Date();
    await item.save();
    return res.status(200).json({ success: true, message: 'Newsletter record deleted.' });
  } catch (error) {
    next(error);
  }
};
