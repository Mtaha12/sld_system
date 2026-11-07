import Newsletter from '../models/Newsletter.js';
import mongoose from 'mongoose';
import { adjustSrOnDelete } from '../utils/resequenceSr.js';

const escapeRegex = (string) => {
  if (string == null) return '';
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const formatItem = (d) => {
  let atts = [];
  if (Array.isArray(d.attachments) && d.attachments.length > 0) {
    atts = d.attachments;
  } else if (d.attachment) {
    const urls = String(d.attachment).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    atts = urls.map(u => ({
      url: u,
      name: d.attachmentName || u.split('/').pop() || 'Attachment'
    }));
  }

  return {
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
    attachments: atts,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt
  };
};

export const getNewsletters = async (req, res, next) => {
  try {
    const { query, category } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (category) {
      filter.category = category;
    }

    if (query) {
      const q = query.trim();
      const searchRegex = new RegExp(escapeRegex(q), 'i');
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
    const { subject, date, category, message, attachment, attachmentName, attachments } = req.body;

    if (!subject?.trim()) {
      return res.status(400).json({ success: false, message: 'Subject is required.' });
    }
    if (!date?.trim()) {
      return res.status(400).json({ success: false, message: 'Date is required.' });
    }

    let processedAttachments = [];
    if (Array.isArray(attachments)) {
      processedAttachments = attachments;
    } else if (attachment) {
      const urls = String(attachment).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      processedAttachments = urls.map(u => ({ url: u, name: u.split('/').pop() || 'Attachment' }));
    }

    const item = new Newsletter({
      subject: subject.trim(),
      date: date.trim(),
      category: category?.trim() || 'Updates',
      message: message || '',
      attachments: processedAttachments,
      attachment: processedAttachments.length > 0 ? processedAttachments.map(a => a.url).join('\n') : (attachment || ''),
      attachmentName: processedAttachments.length > 0 ? processedAttachments.map(a => a.name || a.url.split('/').pop()).join(', ') : (attachmentName || '')
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
    const { subject, date, category, message, attachment, attachmentName, attachments } = req.body;

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
    
    if (attachments !== undefined && Array.isArray(attachments)) {
      item.attachments = attachments;
      item.attachment = attachments.map(a => a.url).join('\n');
      item.attachmentName = attachments.map(a => a.name || a.url.split('/').pop()).join(', ');
    } else {
      if (attachment !== undefined) item.attachment = attachment;
      if (attachmentName !== undefined) item.attachmentName = attachmentName;
    }

    await item.save();
    return res.status(200).json({ success: true, message: 'Newsletter record updated.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const uploadNewsletterAttachment = async (req, res, next) => {
  try {
    const uploadedFiles = [];
    if (req.files) {
      if (req.files.files && Array.isArray(req.files.files)) {
        uploadedFiles.push(...req.files.files);
      }
      if (req.files.file && Array.isArray(req.files.file)) {
        uploadedFiles.push(...req.files.file);
      }
    } else if (req.file) {
      uploadedFiles.push(req.file);
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const year = new Date().getFullYear();
    const host = req.get('host');
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : req.protocol;
    const origin = `${protocol}://${host}`;

    const results = uploadedFiles.map(f => {
      const relativeUrl = `/uploads/newsletters/${year}/${f.filename}`;
      const fullUrl = `${origin}${relativeUrl}`;
      return {
        url: fullUrl,
        relativeUrl: relativeUrl,
        filename: f.filename,
        name: f.originalname,
        originalName: f.originalname,
        size: f.size,
        type: f.mimetype
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Attachment(s) uploaded successfully.',
      data: results.length === 1 ? results[0] : results,
      files: results
    });
  } catch (err) {
    next(err);
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

    await adjustSrOnDelete(Newsletter, item, { srField: 'srNumber', counterName: 'newsletter' });

    return res.status(200).json({ success: true, message: 'Newsletter record deleted and SR# auto-adjusted.' });
  } catch (error) {
    next(error);
  }
};
