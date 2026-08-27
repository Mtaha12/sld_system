import Notification from '../models/Notification.js';
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
    id: n.srNumber, // Frontend looks up by id, which maps to srNumber
    mongoId: n._id.toString(),
    srNumber: n.srNumber,
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

    const notifications = await Notification.find(filter).sort({ srNumber: -1 });
    const data = notifications.map(formatNotificationForFrontend);

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

    // Search by client ID (srNumber) or Mongoose ID
    const query = {
      $or: [
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

    return res.status(200).json({
      success: true,
      data: {
        id: n._id.toString()
      }
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

    if (!srNumber) {
      return res.status(400).json({
        success: false,
        message: 'SR # (srNumber) is required.'
      });
    }

    const exist = await Notification.findOne({ srNumber });
    if (exist) {
      return res.status(400).json({
        success: false,
        message: `Notification with SR #${srNumber} already exists.`
      });
    }

    const newNotif = new Notification({
      srNumber,
      department: department || 'Notifications',
      subDepartment: subDepartment || 'federal',
      year: year ? parseInt(year, 10) : new Date().getFullYear(),
      number: number || '',
      sroNumber: sroNumber || '',
      subject: subject || '',
      status: status || 'Active',
      lawStatute: lawStatute || '',
      section: section || '',
      blocks: blocks || []
    });

    await newNotif.save();
    logger.info(`[Notification Created] SR #${newNotif.srNumber} added.`);

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

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID format. Modifications require a valid Mongoose ID.'
      });
    }

    const { 
      srNumber, department, subDepartment, year, number, 
      sroNumber, subject, status, lawStatute, section, blocks 
    } = req.body;

    const n = await Notification.findById(id);
    if (!n) {
      return res.status(404).json({
        success: false,
        message: 'Notification record not found.'
      });
    }

    if (srNumber && srNumber !== n.srNumber) {
      const exist = await Notification.findOne({ srNumber });
      if (exist) {
        return res.status(400).json({
          success: false,
          message: `Notification with SR #${srNumber} already exists.`
        });
      }
      n.srNumber = srNumber;
    }

    if (department !== undefined) n.department = department;
    if (subDepartment !== undefined) n.subDepartment = subDepartment;
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

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID format. Deletion requires a valid Mongoose ID.'
      });
    }

    const n = await Notification.findById(id);
    if (!n) {
      return res.status(404).json({
        success: false,
        message: 'Notification record not found.'
      });
    }

    n.isDeleted = true;
    n.deletedAt = new Date();
    await n.save();

    logger.info(`[Notification Deleted] SR #${n.srNumber} soft-deleted.`);

    return res.status(200).json({
      success: true,
      message: `Notification deleted successfully.`,
      id
    });
  } catch (error) {
    next(error);
  }
};
