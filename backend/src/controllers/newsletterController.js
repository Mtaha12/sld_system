import path from 'path';
import Newsletter from '../models/Newsletter.js';
import mongoose from 'mongoose';
import { adjustSrOnDelete } from '../utils/resequenceSr.js';

const escapeRegex = (string) => {
  if (string == null) return '';
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const NEWSLETTER_CACHE_TTL_MS = 2 * 60 * 1000;
const newsletterListCache = new Map();

const invalidateNewsletterCache = () => {
  newsletterListCache.clear();
};

const decodeBasicHtmlEntities = (str) =>
  String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();

const normalizeLinkItems = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const link = String(item.link || item.url || '').trim();
      const heading = String(item.heading || item.name || item.title || '').trim();
      const attachmentName = String(item.attachmentName || item.name || (link ? link.split('/').pop() : '')).trim();
      if (!link && !heading) return null;
      return {
        heading: heading || attachmentName || 'Document Link',
        link,
        attachmentName,
        size: Number(item.size) || 0,
        type: String(item.type || '').trim()
      };
    })
    .filter(Boolean);

/**
 * Extracts structured (heading, link, attachmentName) rows from saved linkItems,
 * or falls back cleanly to anchor links inside message HTML & legacy attachments.
 */
const extractNewsletterLinkItems = (d) => {
  if (d.linkItemsInitialized || (Array.isArray(d.linkItems) && d.linkItems.length > 0)) {
    return normalizeLinkItems(d.linkItems);
  }

  const rows = [];
  const seenUrls = new Set();

  if (d.message && typeof d.message === 'string') {
    const anchorRegex = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = anchorRegex.exec(d.message)) !== null) {
      const link = String(match[1] || '').trim();
      const heading = decodeBasicHtmlEntities(String(match[2] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
      if (!link || /^(mailto:|tel:|javascript:|#)/i.test(link)) continue;
      const key = `${heading.toLowerCase()}|${link.toLowerCase()}`;
      if (seenUrls.has(key)) continue;
      seenUrls.add(key);
      rows.push({
        heading: heading || link.split('/').pop() || 'Document Link',
        link,
        attachmentName: link.split('/').pop()?.split('?')[0] || '',
        size: 0,
        type: ''
      });
    }
  }

  const legacyAtts = Array.isArray(d.attachments) && d.attachments.length > 0
    ? d.attachments
    : (d.attachment
        ? String(d.attachment)
            .split(/\r?\n/)
            .map(s => s.trim())
            .filter(Boolean)
            .map(u => ({ url: u, name: d.attachmentName || u.split('/').pop() }))
        : []);

  for (const att of legacyAtts) {
    const url = String(att?.url || '').trim();
    if (!url) continue;
    const alreadyInRows = rows.some(r => r.link.toLowerCase() === url.toLowerCase());
    if (!alreadyInRows) {
      const cleanName = String(att?.name || url.split('/').pop() || 'Attachment').trim();
      rows.push({
        heading: cleanName.replace(/\.[^.]+$/, '') || cleanName,
        link: url,
        attachmentName: cleanName,
        size: Number(att?.size) || 0,
        type: String(att?.type || '').trim()
      });
    }
  }

  return rows;
};

const buildAttachmentsFromLinkItems = (linkItems = [], existingAttachments = []) => {
  const fromLinks = normalizeLinkItems(linkItems)
    .filter(item => item.link)
    .map(item => ({
      url: item.link,
      name: item.attachmentName || item.heading || item.link.split('/').pop() || 'Attachment',
      size: item.size || 0,
      type: item.type || ''
    }));
  if (fromLinks.length > 0) return fromLinks;
  return Array.isArray(existingAttachments) ? existingAttachments : [];
};

const formatItem = (d) => {
  const linkItems = extractNewsletterLinkItems(d);

  let atts = [];
  if (Array.isArray(d.attachments) && d.attachments.length > 0) {
    atts = d.attachments;
  } else if (d.attachment) {
    const urls = String(d.attachment).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    atts = urls.map(u => ({
      url: u,
      name: d.attachmentName || u.split('/').pop() || 'Attachment'
    }));
  } else if (linkItems.length > 0) {
    atts = linkItems
      .filter(li => li.link)
      .map(li => ({
        url: li.link,
        name: li.attachmentName || li.heading || li.link.split('/').pop() || 'Attachment',
        size: li.size || 0,
        type: li.type || ''
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
    linkItems,
    linkItemsInitialized: Boolean(d.linkItemsInitialized),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt
  };
};

export const getNewsletters = async (req, res, next) => {
  try {
    const { query, category } = req.query;
    const cacheKey = JSON.stringify({ query: query || '', category: category || '' });
    const cached = newsletterListCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < NEWSLETTER_CACHE_TTL_MS) {
      return res.status(200).json(cached.payload);
    }

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
        { 'linkItems.heading': searchRegex },
        { 'linkItems.link': searchRegex }
      ];
      if (!isNaN(numQ)) {
        orConditions.push({ srNumber: numQ });
      }
      filter.$or = orConditions;
    }

    const items = await Newsletter.find(filter).sort({ srNumber: -1, createdAt: -1 }).lean();
    const data = items.map(formatItem);

    const payload = {
      success: true,
      message: 'Newsletters retrieved successfully.',
      count: data.length,
      data
    };

    if (newsletterListCache.size >= 50) {
      const oldest = newsletterListCache.keys().next().value;
      newsletterListCache.delete(oldest);
    }
    newsletterListCache.set(cacheKey, { ts: Date.now(), payload });

    return res.status(200).json(payload);
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

    const item = await Newsletter.findOne(query).lean();
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
    const { subject, date, category, message, attachment, attachmentName, attachments, linkItems } = req.body;

    if (!subject?.trim()) {
      return res.status(400).json({ success: false, message: 'Subject is required.' });
    }
    if (!date?.trim()) {
      return res.status(400).json({ success: false, message: 'Date is required.' });
    }

    const normalizedLinkItems = normalizeLinkItems(linkItems);
    const hasExplicitLinks = Array.isArray(linkItems);

    let processedAttachments = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      processedAttachments = attachments;
    } else if (normalizedLinkItems.length > 0) {
      processedAttachments = buildAttachmentsFromLinkItems(normalizedLinkItems);
    } else if (attachment) {
      const urls = String(attachment).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      processedAttachments = urls.map(u => ({ url: u, name: u.split('/').pop() || 'Attachment' }));
    }

    // If linkItems weren't supplied explicitly, derive initial rows from uploaded attachments or message links
    const finalLinkItems = hasExplicitLinks
      ? normalizedLinkItems
      : extractNewsletterLinkItems({ message: message || '', attachments: processedAttachments, attachment, attachmentName });

    const item = new Newsletter({
      subject: subject.trim(),
      date: date.trim(),
      category: category?.trim() || 'Updates',
      message: message || '',
      attachments: processedAttachments,
      attachment: processedAttachments.length > 0 ? processedAttachments.map(a => a.url).join('\n') : (attachment || ''),
      attachmentName: processedAttachments.length > 0 ? processedAttachments.map(a => a.name || a.url.split('/').pop()).join(', ') : (attachmentName || ''),
      linkItems: finalLinkItems,
      linkItemsInitialized: hasExplicitLinks || finalLinkItems.length > 0
    });

    await item.save();
    invalidateNewsletterCache();
    return res.status(201).json({ success: true, message: 'Newsletter record created.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const updateNewsletter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { subject, date, category, message, attachment, attachmentName, attachments, linkItems } = req.body;

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

    if (Array.isArray(linkItems)) {
      item.linkItems = normalizeLinkItems(linkItems);
      item.linkItemsInitialized = true;
    }

    if (attachments !== undefined && Array.isArray(attachments)) {
      item.attachments = attachments;
      item.attachment = attachments.map(a => a.url).join('\n');
      item.attachmentName = attachments.map(a => a.name || a.url.split('/').pop()).join(', ');
    } else if (Array.isArray(linkItems)) {
      const syncedAtts = buildAttachmentsFromLinkItems(item.linkItems, item.attachments);
      item.attachments = syncedAtts;
      item.attachment = syncedAtts.map(a => a.url).join('\n');
      item.attachmentName = syncedAtts.map(a => a.name).join(', ');
    } else {
      if (attachment !== undefined) item.attachment = attachment;
      if (attachmentName !== undefined) item.attachmentName = attachmentName;
    }

    await item.save();
    invalidateNewsletterCache();
    return res.status(200).json({ success: true, message: 'Newsletter record updated.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const updateNewsletterLinks = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { linkItems, date, subject } = req.body;

    if (!Array.isArray(linkItems)) {
      return res.status(400).json({ success: false, message: 'linkItems array is required.' });
    }

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

    const normalized = normalizeLinkItems(linkItems);
    item.linkItems = normalized;
    item.linkItemsInitialized = true;
    if (date !== undefined && String(date).trim()) item.date = String(date).trim();
    if (subject !== undefined && String(subject).trim()) item.subject = String(subject).trim();

    const syncedAtts = buildAttachmentsFromLinkItems(normalized, item.attachments);
    item.attachments = syncedAtts;
    item.attachment = syncedAtts.map(a => a.url).join('\n');
    item.attachmentName = syncedAtts.map(a => a.name).join(', ');

    await item.save();
    invalidateNewsletterCache();
    return res.status(200).json({
      success: true,
      message: 'Newsletter link list updated successfully.',
      data: formatItem(item)
    });
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

    const defaultYear = String(new Date().getFullYear());
    const rawHost = String(req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
    const isLocalHost = rawHost.startsWith('localhost') || rawHost.startsWith('127.');
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
    const protocol = (forwardedProto === 'https' || req.protocol === 'https' || !isLocalHost) ? 'https' : 'http';
    const origin = rawHost ? `${protocol}://${rawHost}` : '';

    const results = uploadedFiles.map(f => {
      const folderYear = f.destination ? path.basename(f.destination) : defaultYear;
      const relativeUrl = `/uploads/newsletters/${folderYear}/${f.filename}`;
      const fullUrl = origin ? `${origin}${relativeUrl}` : relativeUrl;
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
    invalidateNewsletterCache();

    return res.status(200).json({ success: true, message: 'Newsletter record deleted and SR# auto-adjusted.' });
  } catch (error) {
    next(error);
  }
};
