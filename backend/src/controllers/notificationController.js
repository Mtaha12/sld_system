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

/**
 * Notification APIs Controllers
 */
export const getNotifications = async (req, res, next) => {
  try {
    const { query } = req.query;

    const filter = { isDeleted: { $ne: true } };

    if (query) {
      const q = query.trim();
      const searchRegex = new RegExp(q, 'i');
      filter.$or = [
        { notificationId: searchRegex },
        { notification_id: searchRegex },
        { srNumber: searchRegex },
        { number: searchRegex },
        { sroNumber: searchRegex },
        { subject: searchRegex },
        { lawStatute: searchRegex },
        { section: searchRegex },
        { department: searchRegex },
        { 'blocks.detail': searchRegex }
      ];
    }

    const notifications = await Notification.find(filter).sort({ createdAt: -1, srNumber: -1 });
    const isSpammer = req.user?.isSpammer === true;
    const data = (isSpammer ? notifications.map(spoofNotification) : notifications).map(formatNotificationForFrontend);

    return res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully.',
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

    if (srNumber && typeof srNumber === 'string' && srNumber.trim().length > 0) {
      const exist = await Notification.findOne({ srNumber: srNumber.trim() });
      if (exist) {
        return res.status(400).json({
          success: false,
          message: `Notification with SR #${srNumber} already exists.`
        });
      }
    }

    const newNotif = new Notification({
      srNumber: srNumber ? srNumber.trim() : undefined,
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
