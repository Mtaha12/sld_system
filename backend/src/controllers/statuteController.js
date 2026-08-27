import Statute from '../models/Statute.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

/**
 * Format statute for frontend representation
 */
const formatStatuteForFrontend = (s) => {
  // Derive dated and sectionHeading from first block if present
  let dated = '';
  let sectionHeading = '';

  if (s.blocks && s.blocks.length > 0) {
    if (s.blocks[0].fromDate) {
      // Format Date object or string
      const d = new Date(s.blocks[0].fromDate);
      if (!isNaN(d.getTime())) {
        dated = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
      } else {
        dated = s.blocks[0].fromDate;
      }
    }
    sectionHeading = s.blocks[0].sectionHeading || '';
  }

  return {
    id: s.srNumber, // Frontend looks up by id, which maps to srNumber
    mongoId: s._id.toString(),
    srNumber: s.srNumber,
    law: s.law || '',
    chapter: s.chapter || '',
    display: s.display === 'no' ? 'No' : 'Active', // Mock data displays "Active" or "No" (which maps to active/inactive status)
    status: s.status || 'active',
    dated,
    section: s.section || '',
    sectionHeading,
    department: s.department ? s.department.charAt(0).toUpperCase() + s.department.slice(1) : 'Tax',
    heading: s.heading || '',
    blocks: s.blocks || []
  };
};

/**
 * Statute APIs Controllers
 */
export const getStatutes = async (req, res, next) => {
  try {
    const { query } = req.query;

    const filter = { isDeleted: { $ne: true } };

    if (query) {
      const q = query.trim();
      const searchRegex = new RegExp(q, 'i');
      filter.$or = [
        { srNumber: searchRegex },
        { law: searchRegex },
        { chapter: searchRegex },
        { section: searchRegex },
        { heading: searchRegex },
        { department: searchRegex },
        { 'blocks.sectionHeading': searchRegex },
        { 'blocks.detail': searchRegex }
      ];
    }

    const statutes = await Statute.find(filter).sort({ srNumber: -1 });
    const data = statutes.map(formatStatuteForFrontend);

    return res.status(200).json({
      success: true,
      message: 'Statutes retrieved successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getStatuteById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Retrieve by srNumber (which is the client-facing ID) or Mongo ID
    const query = {
      $or: [
        { srNumber: id },
        ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])
      ],
      isDeleted: { $ne: true }
    };

    const s = await Statute.findOne(query);

    if (!s) {
      return res.status(404).json({
        success: false,
        message: 'Statute record not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: s._id.toString()
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createStatute = async (req, res, next) => {
  try {
    const { srNumber, department, chapter, display, status, law, section, heading, blocks } = req.body;

    if (!srNumber) {
      return res.status(400).json({
        success: false,
        message: 'SR # (srNumber) is required.'
      });
    }

    const exist = await Statute.findOne({ srNumber });
    if (exist) {
      return res.status(400).json({
        success: false,
        message: `Statute with SR #${srNumber} already exists.`
      });
    }

    const newStatute = new Statute({
      srNumber,
      department: department || 'tax',
      chapter: chapter || '',
      display: display || 'yes',
      status: status || 'active',
      law: law || '',
      section: section || '',
      heading: heading || '',
      blocks: blocks || []
    });

    await newStatute.save();
    logger.info(`[Statute Created] SR #${newStatute.srNumber} added.`);

    return res.status(201).json({
      success: true,
      message: 'Statute record created successfully.',
      data: formatStatuteForFrontend(newStatute)
    });
  } catch (error) {
    next(error);
  }
};

export const updateStatute = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid statute ID format. Modifications require a valid Mongoose ID.'
      });
    }

    const { srNumber, department, chapter, display, status, law, section, heading, blocks } = req.body;

    const s = await Statute.findById(id);
    if (!s) {
      return res.status(404).json({
        success: false,
        message: 'Statute record not found.'
      });
    }

    if (srNumber && srNumber !== s.srNumber) {
      const exist = await Statute.findOne({ srNumber });
      if (exist) {
        return res.status(400).json({
          success: false,
          message: `Statute with SR #${srNumber} already exists.`
        });
      }
      s.srNumber = srNumber;
    }

    if (department !== undefined) s.department = department;
    if (chapter !== undefined) s.chapter = chapter;
    if (display !== undefined) s.display = display;
    if (status !== undefined) s.status = status;
    if (law !== undefined) s.law = law;
    if (section !== undefined) s.section = section;
    if (heading !== undefined) s.heading = heading;
    if (blocks !== undefined) s.blocks = blocks;

    await s.save();
    logger.info(`[Statute Updated] SR #${s.srNumber} updated.`);

    return res.status(200).json({
      success: true,
      message: 'Statute record updated successfully.',
      data: formatStatuteForFrontend(s)
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStatute = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid statute ID format. Deletion requires a valid Mongoose ID.'
      });
    }

    const s = await Statute.findById(id);
    if (!s) {
      return res.status(404).json({
        success: false,
        message: 'Statute record not found.'
      });
    }

    s.isDeleted = true;
    s.deletedAt = new Date();
    await s.save();

    logger.info(`[Statute Deleted] SR #${s.srNumber} soft-deleted.`);

    return res.status(200).json({
      success: true,
      message: `Statute record deleted successfully.`,
      id
    });
  } catch (error) {
    next(error);
  }
};
