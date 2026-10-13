import Statute from '../models/Statute.js';
import UserActivity from '../models/UserActivity.js';
import { spoofStatute } from '../utils/spammerHoneypot.js';
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
    id: s.srNumber || s.statuteId || s._id.toString(), // Frontend looks up by id, which maps to srNumber or statuteId
    mongoId: s._id.toString(),
    statuteId: s.statuteId || s.statute_id || '',
    statute_id: s.statute_id || s.statuteId || '',
    srNumber: s.srNumber || s.statuteId || '',
    law: s.law || '',
    chapter: s.chapter || '',

    status: s.status || 'active',
    dated,
    section: s.section || '',
    sectionHeading,
    department: s.department ? s.department.charAt(0).toUpperCase() + s.department.slice(1) : 'Tax',
    heading: s.heading || '',
    blocks: s.blocks || []
  };
};

const escapeRegex = (str) => {
  if (!str) return '';
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Statute APIs Controllers
 */
export const getStatutes = async (req, res, next) => {
  try {
    const { 
      query, page, limit, all, full, sortField, sortOrder,
      law, section, chapter, text, text2, heading, department, exact
    } = req.query;

    const filter = { isDeleted: { $ne: true } };

    // Explicit law filter (e.g. from dropdown or exact law search)
    const targetLaw = (law || '').trim();
    if (targetLaw) {
      if (exact === 'true') {
        filter.law = new RegExp(`^${escapeRegex(targetLaw)}$`, 'i');
      } else {
        filter.law = new RegExp(escapeRegex(targetLaw), 'i');
      }
    }

    if (section && section.trim()) {
      filter.section = new RegExp(escapeRegex(section.trim()), 'i');
    }

    if (chapter && chapter.trim()) {
      filter.chapter = new RegExp(escapeRegex(chapter.trim()), 'i');
    }

    if (department && department.trim()) {
      filter.department = new RegExp(escapeRegex(department.trim()), 'i');
    }

    if (heading && heading.trim()) {
      filter.heading = new RegExp(escapeRegex(heading.trim()), 'i');
    }

    const textQueries = [text, text2].filter(t => t && t.trim()).map(t => t.trim());
    if (textQueries.length > 0) {
      filter.$and = filter.$and || [];
      for (const t of textQueries) {
        const textRegex = new RegExp(escapeRegex(t), 'i');
        filter.$and.push({
          $or: [
            { heading: textRegex },
            { 'blocks.sectionHeading': textRegex },
            { 'blocks.detail': textRegex }
          ]
        });
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
        { statuteId: searchRegex },
        { statute_id: searchRegex },
        { srNumber: searchRegex },
        { law: tokenRegex },
        { chapter: searchRegex },
        { section: searchRegex },
        { heading: searchRegex },
        { department: searchRegex }
      ];

      // Only search inside blocks.detail if exact is not specified and no explicit law filter
      if (!targetLaw && exact !== 'true') {
        queryOr.push({ 'blocks.sectionHeading': searchRegex }, { 'blocks.detail': searchRegex });
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

    const total = await Statute.countDocuments(filter);
    const totalPages = Math.ceil(total / safeLimit) || 1;

    const order = sortOrder === 'asc' ? 1 : -1;
    let sortObj = { srNumberInt: order };
    if (sortField === 'law') sortObj = { law: order, srNumberInt: order };
    else if (sortField === 'chapter') sortObj = { chapter: order };
    else if (sortField === 'section') sortObj = { section: order };
    else if (sortField === 'department') sortObj = { department: order };

    let dbQuery = Statute.find(filter).sort(sortObj);

    if (full !== 'true') {
      dbQuery = dbQuery.select('statuteId statute_id srNumber law chapter section heading department status blocks createdAt updatedAt');
    }

    if (!isAll) {
      dbQuery = dbQuery.skip((safePage - 1) * safeLimit).limit(safeLimit);
    }

    const statutes = await dbQuery.lean();
    const isSpammer = req.user?.isSpammer === true;
    const data = (isSpammer ? statutes.map(spoofStatute) : statutes).map(formatStatuteForFrontend);

    return res.status(200).json({
      success: true,
      message: 'Statutes retrieved successfully.',
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

export const getStatuteById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Retrieve by srNumber, statuteId, or Mongo ID
    const parsedSr = Number(id);
    const query = {
      $or: [
        { statuteId: id },
        { statute_id: id },
        { srNumber: String(id) },
        ...(Number.isFinite(parsedSr) ? [{ srNumberInt: parsedSr }, { srNumber: parsedSr }] : []),
        ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])
      ],
      isDeleted: { $ne: true }
    };

    const s = await Statute.findOne(query).lean();

    if (!s) {
      return res.status(404).json({
        success: false,
        message: 'Statute record not found.'
      });
    }

    if (req.user) {
      const clientIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1').split(',')[0].trim().replace(/^::ffff:/, '');
      UserActivity.create({
        activityType: 'statute',
        userId: req.user._id,
        loginId: req.user.loginId || req.user.username || req.user.email,
        fullName: req.user.fullName || req.user.username,
        agency: req.user.agencyName || 'General',
        documentId: s.statuteId || s.srNumber,
        documentNumber: s.section || s.statuteId || s.srNumber,
        documentTitle: s.heading || s.law || 'Statute Section',
        ipAddress: clientIp,
        dated: new Date(),
      }).catch(() => {});
    }

    const payload = req.user?.isSpammer === true ? spoofStatute(s) : s;

    return res.status(200).json({
      success: true,
      data: formatStatuteForFrontend(payload)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/statutes/next-sr
 * Returns the highest existing Statute SR # and the next sequential SR #.
 */
export const getNextStatuteSr = async (req, res, next) => {
  try {
    const topStatute = await Statute.findOne({ isDeleted: { $ne: true }, srNumberInt: { $ne: null } })
      .sort({ srNumberInt: -1 })
      .select('srNumber srNumberInt')
      .lean();

    let latestSr = 0;
    if (topStatute) {
      if (typeof topStatute.srNumberInt === 'number' && !isNaN(topStatute.srNumberInt)) {
        latestSr = topStatute.srNumberInt;
      } else if (topStatute.srNumber && !isNaN(parseInt(topStatute.srNumber, 10))) {
        latestSr = parseInt(topStatute.srNumber, 10);
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

export const createStatute = async (req, res, next) => {
  try {
    const { srNumber, department, chapter, law, section, heading, blocks } = req.body;

    let finalSr = srNumber && typeof srNumber === 'string' ? srNumber.trim() : '';

    if (finalSr) {
      const exist = await Statute.findOne({ srNumber: finalSr });
      if (exist) {
        return res.status(400).json({
          success: false,
          message: `Statute with SR #${finalSr} already exists.`
        });
      }
    } else {
      // Auto-assign next sequential SR #
      const topStatute = await Statute.findOne({ isDeleted: { $ne: true }, srNumberInt: { $ne: null } })
        .sort({ srNumberInt: -1 })
        .select('srNumber srNumberInt')
        .lean();
      let latestSr = 0;
      if (topStatute) {
        if (typeof topStatute.srNumberInt === 'number' && !isNaN(topStatute.srNumberInt)) {
          latestSr = topStatute.srNumberInt;
        } else if (topStatute.srNumber && !isNaN(parseInt(topStatute.srNumber, 10))) {
          latestSr = parseInt(topStatute.srNumber, 10);
        }
      }
      finalSr = String(latestSr > 0 ? latestSr + 1 : 1);
    }

    const srInt = !isNaN(parseInt(finalSr, 10)) ? parseInt(finalSr, 10) : undefined;

    const newStatute = new Statute({
      srNumber: finalSr,
      srNumberInt: srInt,
      department: department || 'tax',
      chapter: chapter || '',
      law: law || '',
      section: section || '',
      heading: heading || '',
      blocks: blocks || []
    });

    await newStatute.save();

    // If srNumber was omitted, sync to generated statuteId
    if (!newStatute.srNumber) {
      newStatute.srNumber = newStatute.statuteId;
      await newStatute.save();
    }

    logger.info(`[Statute Created] Statute ID ${newStatute.statuteId} (SR #${newStatute.srNumber}) added.`);

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

    const query = {
      $or: [
        { statuteId: id },
        { statute_id: id },
        { srNumber: id },
        ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])
      ],
      isDeleted: { $ne: true }
    };

    const { srNumber, department, chapter, law, section, heading, blocks } = req.body;

    const s = await Statute.findOne(query);
    if (!s) {
      return res.status(404).json({
        success: false,
        message: 'Statute record not found.'
      });
    }

    if (srNumber && srNumber !== s.srNumber) {
      const exist = await Statute.findOne({ srNumber, _id: { $ne: s._id } });
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

    const query = {
      $or: [
        { statuteId: id },
        { statute_id: id },
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

    s.isDeleted = true;
    s.deletedAt = new Date();
    await s.save();

    logger.info(`[Statute Deleted] ID ${s.statuteId || s.srNumber} soft-deleted.`);

    return res.status(200).json({
      success: true,
      message: `Statute record deleted successfully.`,
      id: s._id
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get distinct laws from statutes
 */
export const getDistinctLaws = async (req, res, next) => {
  try {
    const laws = await Statute.distinct('law', { isDeleted: { $ne: true } });
    const cleanLaws = Array.from(
      new Set(laws.filter(Boolean).map(l => String(l).trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    return res.status(200).json({
      success: true,
      data: cleanLaws
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update latest fromDate of all statutes belonging to a specified law
 */
export const updateLawDate = async (req, res, next) => {
  try {
    const { law, date } = req.body;
    if (!law || !date) {
      return res.status(400).json({
        success: false,
        message: 'Law and Date are required.'
      });
    }

    const trimmedLaw = String(law).trim();
    let formattedDate = date;
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    const lawRegex = new RegExp(`^${escapeRegex(trimmedLaw)}$`, 'i');

    const totalCount = await Statute.countDocuments({ law: lawRegex, isDeleted: { $ne: true } });
    if (totalCount === 0) {
      return res.status(404).json({
        success: false,
        message: `No statute records found for law "${trimmedLaw}".`
      });
    }

    // Update blocks.0.fromDate for records with existing blocks
    await Statute.updateMany(
      { law: lawRegex, 'blocks.0': { $exists: true }, isDeleted: { $ne: true } },
      { $set: { 'blocks.0.fromDate': formattedDate } }
    );

    // Initialize block with fromDate for records without blocks
    await Statute.updateMany(
      { law: lawRegex, 'blocks.0': { $exists: false }, isDeleted: { $ne: true } },
      { $set: { blocks: [{ fromDate: formattedDate, sectionHeading: '', detail: '', attachments: [] }] } }
    );

    logger.info(`[Statute Law Date Updated] Law "${trimmedLaw}" updated with fromDate "${formattedDate}" across ${totalCount} records.`);

    return res.status(200).json({
      success: true,
      message: `Updated date to "${formattedDate}" for law "${trimmedLaw}" across ${totalCount} records.`,
      updatedCount: totalCount,
      date: formattedDate
    });
  } catch (error) {
    next(error);
  }
};
