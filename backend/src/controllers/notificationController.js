import Notification from '../models/Notification.js';
import UserActivity from '../models/UserActivity.js';
import { spoofNotification } from '../utils/spammerHoneypot.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

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
    status: n.status || 'Active',
    blocks: n.blocks || []
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
      lawStatute, law, section, number, year, date, text, subject, department, sroNumber, exact
    } = req.query;

    const filter = { isDeleted: { $ne: true } };

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
      filter.section = new RegExp(escapeRegex(section.trim()), 'i');
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

    if (text && text.trim()) {
      const textRegex = new RegExp(escapeRegex(text.trim()), 'i');
      const textOr = [
        { subject: textRegex },
        { 'blocks.detail': textRegex }
      ];
      if (filter.$or) {
        filter.$and = filter.$and || [];
        filter.$and.push({ $or: filter.$or }, { $or: textOr });
        delete filter.$or;
      } else {
        filter.$or = textOr;
      }
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

    return res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully.',
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
    const topNotif = await Notification.findOne({ isDeleted: { $ne: true }, srNumberInt: { $ne: null } })
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
      const exist = await Notification.findOne({ srNumber: finalSr });
      if (exist) {
        return res.status(400).json({
          success: false,
          message: `Notification with SR #${finalSr} already exists.`
        });
      }
    } else {
      // Auto-assign next sequential SR #
      const topNotif = await Notification.findOne({ isDeleted: { $ne: true }, srNumberInt: { $ne: null } })
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
      subject: subject || '',
      lawStatute: lawStatute || '',
      section: section || '',
      blocks: blocks || []
    });

    await newNotif.save();

    // If srNumber was omitted, sync to generated notificationId
    if (!newNotif.srNumber) {
      newNotif.srNumber = newNotif.notificationId;
      await newNotif.save();
    }

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

    if (srNumber && srNumber !== n.srNumber) {
      const exist = await Notification.findOne({ srNumber, _id: { $ne: n._id } });
      if (exist) {
        return res.status(400).json({
          success: false,
          message: `Notification with SR #${srNumber} already exists.`
        });
      }
      n.srNumber = srNumber;
    }

    if (department !== undefined) n.department = normalizedDepartment ?? n.department;
    if (subDepartment !== undefined) n.subDepartment = normalizedSubDepartment ?? n.subDepartment;
    if (year !== undefined) n.year = year ? parseInt(year, 10) : n.year;
    if (number !== undefined) n.number = number;
    if (sroNumber !== undefined) n.sroNumber = sroNumber;
    if (subject !== undefined) n.subject = subject;
    if (status !== undefined) n.status = status;
    if (lawStatute !== undefined) n.lawStatute = lawStatute;
    if (section !== undefined) n.section = section;
    if (blocks !== undefined) n.blocks = blocks;

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

    logger.info(`[Notification Deleted] ID ${n.notificationId || n.srNumber} soft-deleted.`);

    return res.status(200).json({
      success: true,
      message: `Notification deleted successfully.`,
      id: n._id
    });
  } catch (error) {
    next(error);
  }
};
