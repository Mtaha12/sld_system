import Statute from '../models/Statute.js';
import UserActivity from '../models/UserActivity.js';
import { spoofStatute } from '../utils/spammerHoneypot.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';
import { sanitizeBlocksAttachments } from '../utils/attachmentStorage.js';

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
      const rawSec = section.trim();
      const cleanSec = rawSec.replace(/^(?:section|sec\.?)\s*/i, '').trim();
      filter.section = new RegExp(`^(?:section\\s+)?${escapeRegex(cleanSec)}$`, 'i');
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
        // Text search is deliberately limited to the substantive text of blocks.
        // Do not match a record only because the term appears in a heading or
        // another top-level statute field.
        filter.$and.push({
          'blocks.detail': textRegex
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

    const order = sortOrder === 'desc' ? -1 : 1;
    let sortObj = { srNumberInt: -1 };
    let useCollation = false;

    if (sortField === 'section' || (!sortField && targetLaw)) {
      sortObj = { section: order, srNumberInt: order };
      useCollation = true;
    } else if (sortField === 'law') {
      sortObj = { law: order, srNumberInt: order };
    } else if (sortField === 'chapter') {
      sortObj = { chapter: order, srNumberInt: order };
    } else if (sortField === 'department') {
      sortObj = { department: order, srNumberInt: order };
    } else if (sortField === 'srNumber' || sortField === 'id') {
      sortObj = { srNumberInt: order };
    }

    let dbQuery = Statute.find(filter).sort(sortObj);
    if (useCollation) {
      dbQuery = dbQuery.collation({ locale: 'en', numericOrdering: true });
    }

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
    const { law: targetLaw } = req.query;

    let lawStatute = null;
    if (targetLaw && targetLaw.trim()) {
      lawStatute = await Statute.findOne({
        isDeleted: { $ne: true },
        law: new RegExp('^' + escapeRegex(targetLaw.trim()) + '$', 'i')
      })
        .sort({ srNumberInt: -1, _id: -1 })
        .select('srNumber srNumberInt law chapter heading department section blocks')
        .lean();
    }

    let topStatute = await Statute.findOne({ isDeleted: { $ne: true } })
      .sort({ srNumberInt: -1, _id: -1 })
      .select('srNumber srNumberInt law chapter heading department section blocks')
      .lean();

    if (!topStatute) {
      topStatute = await Statute.findOne({ isDeleted: { $ne: true } })
        .sort({ _id: -1 })
        .select('srNumber srNumberInt law chapter heading department section blocks')
        .lean();
    }

    let latestSr = 0;
    if (topStatute) {
      if (typeof topStatute.srNumberInt === 'number' && !isNaN(topStatute.srNumberInt) && topStatute.srNumberInt > 0) {
        latestSr = topStatute.srNumberInt;
      } else if (topStatute.srNumber && !isNaN(parseInt(topStatute.srNumber, 10))) {
        latestSr = parseInt(topStatute.srNumber, 10);
      }
    }

    if (latestSr === 0) {
      const byId = await Statute.findOne({ isDeleted: { $ne: true } })
        .sort({ _id: -1 })
        .select('srNumber srNumberInt')
        .lean();
      if (byId?.srNumberInt && !isNaN(byId.srNumberInt)) {
        latestSr = byId.srNumberInt;
      } else if (byId?.srNumber && !isNaN(parseInt(byId.srNumber, 10))) {
        latestSr = parseInt(byId.srNumber, 10);
      }
    }

    const nextSr = latestSr > 0 ? latestSr + 1 : 1;

    // Retrieve previous entry fields (chapter, law, heading, department)
    let law = (lawStatute?.law || topStatute?.law || targetLaw || '').trim();
    let chapter = (lawStatute?.chapter || topStatute?.chapter || '').trim();
    let heading = (lawStatute?.heading || lawStatute?.blocks?.[0]?.sectionHeading || topStatute?.heading || topStatute?.blocks?.[0]?.sectionHeading || '').trim();
    let department = (lawStatute?.department || topStatute?.department || 'tax').toLowerCase().trim();

    if (!law) {
      const withLaw = await Statute.findOne({
        isDeleted: { $ne: true },
        law: { $exists: true, $nin: ['', null], $regex: /\S/ }
      })
        .sort({ srNumberInt: -1, _id: -1 })
        .select('law')
        .lean();
      if (withLaw?.law && withLaw.law.trim()) law = withLaw.law.trim();
    }

    if (!chapter && targetLaw && targetLaw.trim()) {
      const withLawChapter = await Statute.findOne({
        isDeleted: { $ne: true },
        law: new RegExp('^' + escapeRegex(targetLaw.trim()) + '$', 'i'),
        chapter: { $exists: true, $nin: ['', null], $regex: /\S/ }
      })
        .sort({ srNumberInt: -1, _id: -1 })
        .select('chapter')
        .lean();
      if (withLawChapter?.chapter && withLawChapter.chapter.trim()) {
        chapter = withLawChapter.chapter.trim();
      }
    }

    if (!chapter) {
      const withChapter = await Statute.findOne({
        isDeleted: { $ne: true },
        chapter: { $exists: true, $nin: ['', null], $regex: /\S/ }
      })
        .sort({ srNumberInt: -1, _id: -1 })
        .select('chapter')
        .lean();
      if (withChapter?.chapter && withChapter.chapter.trim()) chapter = withChapter.chapter.trim();
    }

    if (!heading && targetLaw && targetLaw.trim()) {
      const withLawHeading = await Statute.findOne({
        isDeleted: { $ne: true },
        law: new RegExp('^' + escapeRegex(targetLaw.trim()) + '$', 'i'),
        $or: [
          { heading: { $exists: true, $nin: ['', null], $regex: /\S/ } },
          { 'blocks.0.sectionHeading': { $exists: true, $nin: ['', null], $regex: /\S/ } }
        ]
      })
        .sort({ srNumberInt: -1, _id: -1 })
        .select('heading blocks')
        .lean();
      if (withLawHeading?.heading && withLawHeading.heading.trim()) {
        heading = withLawHeading.heading.trim();
      } else if (withLawHeading?.blocks?.[0]?.sectionHeading && withLawHeading.blocks[0].sectionHeading.trim()) {
        heading = withLawHeading.blocks[0].sectionHeading.trim();
      }
    }

    if (!heading) {
      const withHeading = await Statute.findOne({
        isDeleted: { $ne: true },
        $or: [
          { heading: { $exists: true, $nin: ['', null], $regex: /\S/ } },
          { 'blocks.0.sectionHeading': { $exists: true, $nin: ['', null], $regex: /\S/ } }
        ]
      })
        .sort({ srNumberInt: -1, _id: -1 })
        .select('heading blocks')
        .lean();
      if (withHeading?.heading && withHeading.heading.trim()) {
        heading = withHeading.heading.trim();
      } else if (withHeading?.blocks?.[0]?.sectionHeading && withHeading.blocks[0].sectionHeading.trim()) {
        heading = withHeading.blocks[0].sectionHeading.trim();
      }
    }

    if ((!department || department === 'tax') && targetLaw && targetLaw.trim()) {
      const withLawDept = await Statute.findOne({
        isDeleted: { $ne: true },
        law: new RegExp('^' + escapeRegex(targetLaw.trim()) + '$', 'i'),
        department: { $exists: true, $nin: ['', null], $regex: /\S/ }
      })
        .sort({ srNumberInt: -1, _id: -1 })
        .select('department')
        .lean();
      if (withLawDept?.department && withLawDept.department.trim()) {
        department = withLawDept.department.toLowerCase().trim();
      }
    }

    if (!department || department === 'tax') {
      const withDept = await Statute.findOne({
        isDeleted: { $ne: true },
        department: { $exists: true, $nin: ['', null], $regex: /\S/ }
      })
        .sort({ srNumberInt: -1, _id: -1 })
        .select('department')
        .lean();
      if (withDept?.department && withDept.department.trim()) {
        department = withDept.department.toLowerCase().trim();
      }
    }

    return res.status(200).json({
      success: true,
      latestSr,
      nextSr,
      lastEntry: {
        law,
        chapter,
        heading,
        department
      }
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
      blocks: sanitizeBlocksAttachments(blocks || [])
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

    const { srNumber, department, chapter, law, section, heading, blocks, display, status } = req.body;

    const s = await Statute.findOne(query);
    if (!s) {
      return res.status(404).json({
        success: false,
        message: 'Statute record not found.'
      });
    }

    // Strictly preserve original srNumber on edit: never reassign to a new counter or generated ID
    const originalSr = s.srNumber;
    if (srNumber && String(srNumber).trim() && String(srNumber).trim() !== String(s.srNumber).trim()) {
      const cleanSr = String(srNumber).trim();
      const exist = await Statute.findOne({ srNumber: cleanSr, _id: { $ne: s._id }, isDeleted: { $ne: true } });
      if (exist) {
        return res.status(400).json({
          success: false,
          message: `Statute with SR #${cleanSr} already exists.`
        });
      }
      s.srNumber = cleanSr;
    } else {
      s.srNumber = originalSr;
    }
    if (s.srNumber) {
      const parsed = parseInt(String(s.srNumber).replace(/\D+/g, ''), 10);
      s.srNumberInt = !isNaN(parsed) ? parsed : null;
    }

    if (department !== undefined) s.department = department;
    if (chapter !== undefined) s.chapter = chapter;
    if (display !== undefined) s.display = display;
    if (status !== undefined) s.status = status;
    if (law !== undefined) s.law = law;
    if (section !== undefined) s.section = section;
    if (heading !== undefined) s.heading = heading;
    if (blocks !== undefined) s.blocks = sanitizeBlocksAttachments(blocks);

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

let cachedDistinctLaws = null;
let cachedDistinctLawsExpiresAt = 0;

export const getDistinctLaws = async (req, res, next) => {
  try {
    const now = Date.now();
    if (cachedDistinctLaws && now < cachedDistinctLawsExpiresAt) {
      return res.status(200).json({
        success: true,
        data: cachedDistinctLaws
      });
    }

    const laws = await Statute.distinct('law', { isDeleted: { $ne: true } });
    const cleanLaws = Array.from(
      new Set(laws.filter(Boolean).map(l => String(l).trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    cachedDistinctLaws = cleanLaws;
    cachedDistinctLawsExpiresAt = now + 10 * 60 * 1000; // 10 minutes cache

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

/**
 * Retrieves latest statute metadata (law, chapter, heading) for prefilling new entries
 */
export const getLatestStatuteMeta = async (req, res, next) => {
  try {
    const { law: targetLaw } = req.query;

    let lawStatute = null;
    if (targetLaw && targetLaw.trim()) {
      lawStatute = await Statute.findOne({
        isDeleted: { $ne: true },
        law: new RegExp('^' + escapeRegex(targetLaw.trim()) + '$', 'i')
      })
        .sort({ srNumberInt: -1, _id: -1 })
        .select('srNumber srNumberInt law chapter heading department section blocks')
        .lean();
    }

    let latest = await Statute.findOne({ isDeleted: { $ne: true } })
      .sort({ srNumberInt: -1, _id: -1 })
      .select('law chapter heading department srNumber srNumberInt blocks')
      .lean();

    if (!latest) {
      latest = await Statute.findOne({ isDeleted: { $ne: true } })
        .sort({ _id: -1 })
        .select('law chapter heading department srNumber srNumberInt blocks')
        .lean();
    }

    let law = (lawStatute?.law || latest?.law || targetLaw || '').trim();
    let chapter = (lawStatute?.chapter || latest?.chapter || '').trim();
    let heading = (lawStatute?.heading || lawStatute?.blocks?.[0]?.sectionHeading || latest?.heading || latest?.blocks?.[0]?.sectionHeading || '').trim();
    let department = (lawStatute?.department || latest?.department || 'tax').toLowerCase().trim();

    if (!law) {
      const withLaw = await Statute.findOne({
        isDeleted: { $ne: true },
        law: { $exists: true, $nin: ['', null], $regex: /\S/ }
      })
        .sort({ srNumberInt: -1, _id: -1 })
        .select('law')
        .lean();
      if (withLaw?.law && withLaw.law.trim()) law = withLaw.law.trim();
    }

    if (!chapter && targetLaw && targetLaw.trim()) {
      const withLawChapter = await Statute.findOne({
        isDeleted: { $ne: true },
        law: new RegExp('^' + escapeRegex(targetLaw.trim()) + '$', 'i'),
        chapter: { $exists: true, $nin: ['', null], $regex: /\S/ }
      })
        .sort({ srNumberInt: -1, _id: -1 })
        .select('chapter')
        .lean();
      if (withLawChapter?.chapter && withLawChapter.chapter.trim()) {
        chapter = withLawChapter.chapter.trim();
      }
    }

    if (!chapter) {
      const withChapter = await Statute.findOne({
        isDeleted: { $ne: true },
        chapter: { $exists: true, $nin: ['', null], $regex: /\S/ }
      })
        .sort({ srNumberInt: -1, _id: -1 })
        .select('chapter')
        .lean();
      if (withChapter?.chapter && withChapter.chapter.trim()) chapter = withChapter.chapter.trim();
    }

    if (!heading && targetLaw && targetLaw.trim()) {
      const withLawHeading = await Statute.findOne({
        isDeleted: { $ne: true },
        law: new RegExp('^' + escapeRegex(targetLaw.trim()) + '$', 'i'),
        $or: [
          { heading: { $exists: true, $nin: ['', null], $regex: /\S/ } },
          { 'blocks.0.sectionHeading': { $exists: true, $nin: ['', null], $regex: /\S/ } }
        ]
      })
        .sort({ srNumberInt: -1, _id: -1 })
        .select('heading blocks')
        .lean();
      if (withLawHeading?.heading && withLawHeading.heading.trim()) {
        heading = withLawHeading.heading.trim();
      } else if (withLawHeading?.blocks?.[0]?.sectionHeading && withLawHeading.blocks[0].sectionHeading.trim()) {
        heading = withLawHeading.blocks[0].sectionHeading.trim();
      }
    }

    if (!heading) {
      const withHeading = await Statute.findOne({
        isDeleted: { $ne: true },
        $or: [
          { heading: { $exists: true, $nin: ['', null], $regex: /\S/ } },
          { 'blocks.0.sectionHeading': { $exists: true, $nin: ['', null], $regex: /\S/ } }
        ]
      })
        .sort({ srNumberInt: -1, _id: -1 })
        .select('heading blocks')
        .lean();
      if (withHeading?.heading && withHeading.heading.trim()) {
        heading = withHeading.heading.trim();
      } else if (withHeading?.blocks?.[0]?.sectionHeading && withHeading.blocks[0].sectionHeading.trim()) {
        heading = withHeading.blocks[0].sectionHeading.trim();
      }
    }

    if ((!department || department === 'tax') && targetLaw && targetLaw.trim()) {
      const withLawDept = await Statute.findOne({
        isDeleted: { $ne: true },
        law: new RegExp('^' + escapeRegex(targetLaw.trim()) + '$', 'i'),
        department: { $exists: true, $nin: ['', null], $regex: /\S/ }
      })
        .sort({ srNumberInt: -1, _id: -1 })
        .select('department')
        .lean();
      if (withLawDept?.department && withLawDept.department.trim()) {
        department = withLawDept.department.toLowerCase().trim();
      }
    }

    if (!department || department === 'tax') {
      const withDept = await Statute.findOne({
        isDeleted: { $ne: true },
        department: { $exists: true, $nin: ['', null], $regex: /\S/ }
      })
        .sort({ srNumberInt: -1, _id: -1 })
        .select('department')
        .lean();
      if (withDept?.department && withDept.department.trim()) {
        department = withDept.department.toLowerCase().trim();
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        law,
        chapter,
        heading,
        department,
        srNumber: latest?.srNumber || ''
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload single attachment document for a statute provision block
 */
export const uploadStatuteAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    const relativeUrl = `/uploads/reference_views/${req.file.filename}`;
    return res.status(200).json({
      success: true,
      url: relativeUrl,
      name: req.file.originalname,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      type: req.file.mimetype
    });
  } catch (err) {
    next(err);
  }
};
