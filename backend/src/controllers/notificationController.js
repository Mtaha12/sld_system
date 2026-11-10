import fs from 'fs';
import path from 'path';
import { sanitizeBlocksAttachments, resolveUploadFilePath } from '../utils/attachmentStorage.js';
import Notification from '../models/Notification.js';
import UserActivity from '../models/UserActivity.js';
import { spoofNotification } from '../utils/spammerHoneypot.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';
import { adjustSrOnDelete } from '../utils/resequenceSr.js';
import { getBoardStatuteAndNotificationCounts, invalidateBoardCountsCache } from '../utils/dashboardBoardStats.js';

/**
 * Format notification for frontend representation
 */
const formatNotificationForFrontend = (n) => {
  let lawDate = n.lawDate || '';

  if (!lawDate && n.blocks && n.blocks.length > 0 && n.blocks[0].date) {
    const d = new Date(n.blocks[0].date);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[d.getMonth()];
      const year = d.getFullYear();
      lawDate = `${day} ${month} ${year}`;
    } else {
      lawDate = n.blocks[0].date;
    }
  }

  // Format blocks to ensure attachments array is consistently populated
  const safeBlocks = Array.isArray(n.blocks) ? n.blocks.map(b => {
    const bAtts = Array.isArray(b.attachments) ? [...b.attachments] : (b.attachment ? [b.attachment] : []);
    return {
      ...b,
      attachments: bAtts
    };
  }) : [];

  const safeRootAttachments = Array.isArray(n.attachments) ? [...n.attachments] : (n.attachment ? [n.attachment] : []);

  return {
    id: n.srNumber || n.notificationId || n._id.toString(), // Frontend looks up by id, which maps to srNumber or notificationId
    mongoId: n._id.toString(),
    notificationId: n.notificationId || n.notification_id || '',
    notification_id: n.notification_id || n.notificationId || '',
    srNumber: n.srNumber || n.notificationId || '',
    number: n.number || '',
    year: n.year || new Date().getFullYear(),
    department: n.department || 'Notifications',
    subDepartment: n.subDepartment || 'federal',
    sroNumber: n.sroNumber || '',
    subject: n.subject || '',
    lawDate,
    lawStatute: n.lawStatute || '',
    section: n.section || '',
    laws: Array.isArray(n.laws) ? n.laws : [],
    status: n.status || 'Active',
    attachments: safeRootAttachments,
    attachment: n.attachment || '',
    blocks: safeBlocks
  };
};

const escapeRegex = (str) => {
  if (!str) return '';
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Notification APIs Controllers
 */
export const getNotifications = async (req, res, next) => {
  try {
    const { 
      query, page, limit, all, full, sortField, sortOrder,
      lawStatute, law, section, number, year, date, text, text2, subject, department, sroNumber, exact
    } = req.query;

    const filter = { isDeleted: false };

    // Explicit lawStatute filter (e.g. from dropdown or exact law search)
    const targetLaw = (lawStatute || law || '').trim();
    if (targetLaw) {
      if (exact === 'true') {
        filter.lawStatute = new RegExp(`^${escapeRegex(targetLaw)}$`, 'i');
      } else {
        filter.lawStatute = new RegExp(escapeRegex(targetLaw), 'i');
      }
    }

    if (section && section.trim()) {
      const rawSec = section.trim();
      const cleanSec = rawSec.replace(/^(?:section|sec\.?)\s*/i, '').trim();
      filter.section = new RegExp(`^(?:section\\s+)?${escapeRegex(cleanSec)}$`, 'i');
    }

    if (number && number.trim()) {
      const rawNum = number.trim();
      // Match exact SRO number or bounded numeric sequence, avoiding partial prefixes/suffixes like 1468 or 11468
      const isPureDigits = /^\d+$/.test(rawNum);
      const sroBoundedRegex = isPureDigits
        ? new RegExp(`(?:^|\\D)${escapeRegex(rawNum)}(?:\\D|$)`, 'i')
        : new RegExp(escapeRegex(rawNum), 'i');

      filter.$or = [
        { sroNumber: sroBoundedRegex },
        { number: new RegExp(`^${escapeRegex(rawNum)}$`, 'i') },
        { notificationId: rawNum }
      ];
    }

    if (year && year.trim()) {
      const yNum = parseInt(year.trim(), 10);
      if (!isNaN(yNum)) {
        filter.year = yNum;
      } else {
        filter.year = new RegExp(escapeRegex(year.trim()), 'i');
      }
    }

    if (date && date.trim()) {
      const dRegex = new RegExp(escapeRegex(date.trim()), 'i');
      filter.$or = [
        { lawDate: dRegex },
        { 'blocks.date': dRegex }
      ];
    }

    if (department && department.trim()) {
      filter.department = new RegExp(escapeRegex(department.trim()), 'i');
    }

    if (sroNumber && sroNumber.trim()) {
      filter.sroNumber = new RegExp(escapeRegex(sroNumber.trim()), 'i');
    }

    if (subject && subject.trim()) {
      filter.subject = new RegExp(escapeRegex(subject.trim()), 'i');
    }

    const text1 = (text || '').trim();
    const text2Clean = (text2 || req.query.text2 || '').trim();
    const textConditions = [];

    if (text1) {
      const r1 = new RegExp(escapeRegex(text1), 'i');
      textConditions.push({
        $or: [
          { subject: r1 },
          { sroNumber: r1 },
          { 'blocks.detail': r1 },
          { content: r1 }
        ]
      });
    }

    if (text2Clean) {
      const r2 = new RegExp(escapeRegex(text2Clean), 'i');
      textConditions.push({
        $or: [
          { subject: r2 },
          { sroNumber: r2 },
          { 'blocks.detail': r2 },
          { content: r2 }
        ]
      });
    }

    if (textConditions.length > 0) {
      filter.$and = filter.$and || [];
      if (filter.$or) {
        filter.$and.push({ $or: filter.$or });
        delete filter.$or;
      }
      textConditions.forEach(cond => filter.$and.push(cond));
    }

    // Generic query fallback
    if (query && query.trim()) {
      const q = query.trim().replace(/\bsaes\b/gi, 'sales');
      const searchRegex = new RegExp(escapeRegex(q), 'i');
      
      const tokens = q.split(/\s+/).filter(Boolean).map(escapeRegex);
      const tokenRegex = tokens.length > 1 
        ? new RegExp(tokens.map(t => `(?=.*${t})`).join(''), 'i')
        : searchRegex;

      const queryOr = [
        { notificationId: searchRegex },
        { notification_id: searchRegex },
        { srNumber: searchRegex },
        { number: searchRegex },
        { sroNumber: searchRegex },
        { subject: searchRegex },
        { lawStatute: tokenRegex },
        { section: searchRegex },
        { department: searchRegex }
      ];

      // Only search inside blocks.detail if exact is not specified and no explicit law filter
      if (!targetLaw && exact !== 'true') {
        queryOr.push({ 'blocks.detail': searchRegex });
      }

      if (filter.$or) {
        filter.$and = filter.$and || [];
        filter.$and.push({ $or: filter.$or }, { $or: queryOr });
        delete filter.$or;
      } else {
        filter.$or = queryOr;
      }
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const isAll = all === 'true';

    const safeLimit = isAll ? 1000 : Math.min(Math.max(limitNum || 100, 1), 1000);
    const safePage = Math.max(pageNum || 1, 1);

    const total = await Notification.countDocuments(filter);
    const totalPages = Math.ceil(total / safeLimit) || 1;

    const order = sortOrder === 'asc' ? 1 : -1;
    let sortObj = { srNumberInt: order };
    if (sortField === 'year') sortObj = { year: order, srNumberInt: order };
    else if (sortField === 'subject') sortObj = { subject: order };
    else if (sortField === 'number') sortObj = { number: order };
    else if (sortField === 'department') sortObj = { department: order };

    let dbQuery = Notification.find(filter).sort(sortObj);

    if (full !== 'true') {
      dbQuery = dbQuery.select('notificationId notification_id srNumber number year department subDepartment sroNumber subject lawDate lawStatute section status blocks createdAt updatedAt');
    }

    if (!isAll) {
      dbQuery = dbQuery.skip((safePage - 1) * safeLimit).limit(safeLimit);
    }

    const notifications = await dbQuery.lean();
    const isSpammer = req.user?.isSpammer === true;
    const data = (isSpammer ? notifications.map(spoofNotification) : notifications).map(formatNotificationForFrontend);
    const isUnfiltered = Object.keys(filter).length === 1;
    const boardCounts = await getBoardStatuteAndNotificationCounts({ liveNotifications: isUnfiltered ? total : null });

    return res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully.',
      count: data.length,
      total,
      dashboardTotal: boardCounts.boardNotifications,
      totalPages,
      currentPage: safePage,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getNotificationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Search by client ID (srNumber), notificationId, or Mongoose ID
    const parsedSr = Number(id);
    const query = {
      $or: [
        { notificationId: id },
        { notification_id: id },
        { srNumber: String(id) },
        ...(Number.isFinite(parsedSr) ? [{ srNumberInt: parsedSr }, { srNumber: parsedSr }] : []),
        ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])
      ],
      isDeleted: { $ne: true }
    };

    const n = await Notification.findOne(query).lean();

    if (!n) {
      return res.status(404).json({
        success: false,
        message: 'Notification record not found.'
      });
    }

    if (req.user) {
      const clientIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1').split(',')[0].trim().replace(/^::ffff:/, '');
      UserActivity.create({
        activityType: 'notification',
        userId: req.user._id,
        loginId: req.user.loginId || req.user.username || req.user.email,
        fullName: req.user.fullName || req.user.username,
        agency: req.user.agencyName || 'General',
        documentId: n.notificationId || n.srNumber,
        documentNumber: n.sroNumber || n.srNumber || n.notificationId,
        documentTitle: n.subject || 'Notification SRO',
        ipAddress: clientIp,
        dated: new Date(),
      }).catch(() => {});
    }

    const payload = req.user?.isSpammer === true ? spoofNotification(n) : n;

    return res.status(200).json({
      success: true,
      data: formatNotificationForFrontend(payload)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/next-sr
 * Returns the highest existing Notification SR # and the next sequential SR #.
 */
export const getNextNotificationSr = async (req, res, next) => {
  try {
    const topNotif = await Notification.findOne({ isDeleted: false, srNumberInt: { $ne: null } })
      .sort({ srNumberInt: -1 })
      .select('srNumber srNumberInt')
      .lean();

    let latestSr = 0;
    if (topNotif) {
      if (typeof topNotif.srNumberInt === 'number' && !isNaN(topNotif.srNumberInt)) {
        latestSr = topNotif.srNumberInt;
      } else if (topNotif.srNumber && !isNaN(parseInt(topNotif.srNumber, 10))) {
        latestSr = parseInt(topNotif.srNumber, 10);
      }
    }

    const nextSr = latestSr > 0 ? latestSr + 1 : 1;

    return res.status(200).json({
      success: true,
      latestSr,
      nextSr
    });
  } catch (error) {
    next(error);
  }
};

export const createNotification = async (req, res, next) => {
  try {
    const { 
      srNumber, department, subDepartment, year, number, 
      sroNumber, subject, status, lawStatute, section, blocks 
    } = req.body;

    const normalizedDepartment = typeof department === 'string'
      ? department.trim().toLowerCase()
      : 'notification';

    const normalizedSubDepartment = typeof subDepartment === 'string'
      ? subDepartment.trim().toLowerCase()
      : 'federal';

    let finalSr = srNumber && typeof srNumber === 'string' ? srNumber.trim() : '';

    if (finalSr) {
      const exist = await Notification.findOne({ srNumber: finalSr, isDeleted: { $ne: true } });
      if (exist) {
        return res.status(400).json({
          success: false,
          message: `Notification with SR #${finalSr} already exists.`
        });
      }
    } else {
      // Auto-assign next sequential SR #
      const topNotif = await Notification.findOne({ isDeleted: false, srNumberInt: { $ne: null } })
        .sort({ srNumberInt: -1 })
        .select('srNumber srNumberInt')
        .lean();
      let latestSr = 0;
      if (topNotif) {
        if (typeof topNotif.srNumberInt === 'number' && !isNaN(topNotif.srNumberInt)) {
          latestSr = topNotif.srNumberInt;
        } else if (topNotif.srNumber && !isNaN(parseInt(topNotif.srNumber, 10))) {
          latestSr = parseInt(topNotif.srNumber, 10);
        }
      }
      finalSr = String(latestSr > 0 ? latestSr + 1 : 1);
    }

    const srInt = !isNaN(parseInt(finalSr, 10)) ? parseInt(finalSr, 10) : undefined;

    const newNotif = new Notification({
      srNumber: finalSr,
      srNumberInt: srInt,
      department: normalizedDepartment,
      subDepartment: normalizedSubDepartment,
      year: year ? parseInt(year, 10) : new Date().getFullYear(),
      number: number || '',
      sroNumber: sroNumber || '',
      subject: typeof subject === 'string' ? subject.trim() : '',
      laws: Array.isArray(req.body.laws) ? req.body.laws : [],
      lawStatute: lawStatute || '',
      section: section || '',
      blocks: sanitizeBlocksAttachments(blocks || [])
    });

    await newNotif.save();

    // If srNumber was omitted, sync to generated notificationId
    if (!newNotif.srNumber) {
      newNotif.srNumber = newNotif.notificationId;
      await newNotif.save();
    }

    invalidateBoardCountsCache();
    logger.info(`[Notification Created] Notification ID ${newNotif.notificationId} (SR #${newNotif.srNumber}) added.`);

    return res.status(201).json({
      success: true,
      message: 'Notification record created successfully.',
      data: formatNotificationForFrontend(newNotif)
    });
  } catch (error) {
    next(error);
  }
};

export const updateNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = {
      $or: [
        { notificationId: id },
        { notification_id: id },
        { srNumber: id },
        ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])
      ],
      isDeleted: { $ne: true }
    };

    const { 
      srNumber, department, subDepartment, year, number, 
      sroNumber, subject, status, lawStatute, section, blocks 
    } = req.body;

    const normalizedDepartment = typeof department === 'string'
      ? department.trim().toLowerCase()
      : undefined;

    const normalizedSubDepartment = typeof subDepartment === 'string'
      ? subDepartment.trim().toLowerCase()
      : undefined;

    const n = await Notification.findOne(query);
    if (!n) {
      return res.status(404).json({
        success: false,
        message: 'Notification record not found.'
      });
    }

    // Strictly preserve original srNumber on edit: never reassign to a new counter or generated ID
    const originalSr = n.srNumber;
    if (srNumber && String(srNumber).trim() && String(srNumber).trim() !== String(n.srNumber).trim()) {
      const cleanSr = String(srNumber).trim();
      const exist = await Notification.findOne({ srNumber: cleanSr, _id: { $ne: n._id }, isDeleted: { $ne: true } });
      if (exist) {
        return res.status(400).json({
          success: false,
          message: `Notification with SR #${cleanSr} already exists.`
        });
      }
      n.srNumber = cleanSr;
    } else {
      n.srNumber = originalSr;
    }
    if (n.srNumber) {
      const parsed = parseInt(String(n.srNumber).replace(/\D+/g, ''), 10);
      n.srNumberInt = !isNaN(parsed) ? parsed : null;
    }

    if (department !== undefined) n.department = normalizedDepartment ?? n.department;
    if (subDepartment !== undefined) n.subDepartment = normalizedSubDepartment ?? n.subDepartment;
    if (year !== undefined) n.year = year ? parseInt(year, 10) : n.year;
    if (number !== undefined) n.number = number;
    if (sroNumber !== undefined) n.sroNumber = sroNumber;
    if (subject !== undefined) n.subject = typeof subject === 'string' ? subject.trim() : '';
    if (status !== undefined) n.status = status;
    if (lawStatute !== undefined) n.lawStatute = lawStatute;
    if (section !== undefined) n.section = section;
    if (Array.isArray(req.body.laws)) n.laws = req.body.laws;
    if (blocks !== undefined) n.blocks = sanitizeBlocksAttachments(blocks);

    await n.save();
    logger.info(`[Notification Updated] SR #${n.srNumber} updated.`);

    return res.status(200).json({
      success: true,
      message: 'Notification record updated successfully.',
      data: formatNotificationForFrontend(n)
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = {
      $or: [
        { notificationId: id },
        { notification_id: id },
        { srNumber: id },
        ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])
      ],
      isDeleted: { $ne: true }
    };

    const n = await Notification.findOne(query);
    if (!n) {
      return res.status(404).json({
        success: false,
        message: 'Notification record not found.'
      });
    }

    n.isDeleted = true;
    n.deletedAt = new Date();
    await n.save();

    await adjustSrOnDelete(Notification, n, { srField: 'srNumber', intField: 'srNumberInt', isString: true, counterName: 'notification' });
    invalidateBoardCountsCache();
    logger.info(`[Notification Deleted] ID ${n.notificationId || n.srNumber} soft-deleted and SR# auto-adjusted.`);

    return res.status(200).json({
      success: true,
      message: `Notification deleted successfully.`,
      id: n._id
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/:id/attachment
 * Public inline attachment stream so new browser tabs can view document directly
 */
export const getNotificationAttachmentStream = async (req, res, next) => {
  try {
    const { id } = req.params;
    const blockIndex = parseInt(req.query.block || '0', 10);
    const attIndex = parseInt(req.query.att || '0', 10);

    const query = {
      $or: [
        { notificationId: id },
        { notification_id: id },
        { srNumber: id },
        ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])
      ],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });

    const notif = await Notification.findOne(query).lean();
    if (!notif) {
      return res.status(404).send('Notification not found.');
    }

    // Find attachment from blocks or root
    let target = null;
    if (Array.isArray(notif.blocks) && notif.blocks[blockIndex]) {
      const b = notif.blocks[blockIndex];
      if (Array.isArray(b.attachments) && b.attachments[attIndex]) target = b.attachments[attIndex];
      else if (b.attachment) target = b.attachment;
    }
    if (!target) {
      if (Array.isArray(notif.attachments) && notif.attachments[attIndex]) target = notif.attachments[attIndex];
      else if (notif.attachment) target = notif.attachment;
    }

    if (!target) {
      return res.status(404).send('No attachment recorded for this notification.');
    }

    let url = typeof target === 'string' ? target : (target.url || target.path || target.name || '');
    let filename = (typeof target === 'object' && target.name) ? target.name : path.basename(url || 'document.pdf');

    // 1. Base64 Data URL
    if (url.startsWith('data:')) {
      const matches = url.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        return res.send(buffer);
      }
    }

    // 2. Local File in uploads (checks both backend/uploads and process.cwd()/uploads)
    const resolvedFile = resolveUploadFilePath(url);
    if (resolvedFile) {
      const ext = path.extname(resolvedFile).toLowerCase();
      const mimeMap = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain'
      };
      if (mimeMap[ext]) {
        res.setHeader('Content-Type', mimeMap[ext]);
      }
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      return res.sendFile(resolvedFile);
    }

    // 3. Remote URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return res.redirect(url);
    }

    return res.status(404).send('Attachment document file could not be located on server.');
  } catch (err) {
    next(err);
  }
};

/**
 * Dedicated document attachment upload for notification records
 */
export const uploadNotificationAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    const relativeUrl = `/uploads/reference_views/${req.file.filename}`;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const type = ext === '.docx' || ext === '.doc' ? 'word' : (['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? 'image' : 'pdf');
    return res.status(200).json({
      success: true,
      message: 'Notification attachment uploaded successfully.',
      data: {
        name: (req.file.originalname && String(req.file.originalname).trim()) || `Attachment_${Date.now()}.pdf`,
        url: relativeUrl,
        size: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
        type
      },
      url: relativeUrl,
      name: req.file.originalname,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (err) {
    next(err);
  }
};
