import Case from '../models/Case.js';
import UserActivity from '../models/UserActivity.js';
import { spoofCase, spoofCaseList } from '../utils/spammerHoneypot.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

const escapeRegex = (string) => {
  if (string == null) return '';
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * High-speed In-Memory Case Cache (< 1ms)
 */
const caseDetailCache = new Map();
const CASE_CACHE_MAX = 400;
const CASE_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const getCachedCase = (key) => {
  const item = caseDetailCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    caseDetailCache.delete(key);
    return null;
  }
  return item.data;
};

const setCachedCase = (key, data) => {
  if (caseDetailCache.size >= CASE_CACHE_MAX) {
    const oldest = caseDetailCache.keys().next().value;
    caseDetailCache.delete(oldest);
  }
  caseDetailCache.set(key, { data, expiresAt: Date.now() + CASE_CACHE_TTL });
};

/**
 * High-speed In-Memory Count Cache for Cases
 */
let cachedTotalCasesCount = 0;
let cachedTotalCasesExpiresAt = 0;

const getTotalCasesCount = async (query, hasFilter) => {
  if (hasFilter) {
    return Case.countDocuments(query);
  }
  const now = Date.now();
  if (cachedTotalCasesCount > 0 && now < cachedTotalCasesExpiresAt) {
    return cachedTotalCasesCount;
  }
  try {
    const count = await Case.estimatedDocumentCount();
    cachedTotalCasesCount = count;
    cachedTotalCasesExpiresAt = now + 5 * 60_000;
    return count;
  } catch {
    return cachedTotalCasesCount || 162865;
  }
};


/**
 * Helper to translate a space or newline separated string into an array of trimmed strings
 */
const stringToArray = (str) => {
  if (!str) return [];
  if (Array.isArray(str)) return str;
  return str
    .split(/[\n,]/)
    .map(item => item.trim())
    .filter(item => item.length > 0);
};

const normalizeLawReferences = (laws = []) => (Array.isArray(laws) ? laws : [])
  .map((law) => ({
    lawStatute: String(law?.lawStatute || '').trim(),
    section: String(law?.section || '').trim(),
  }))
  .filter((law) => law.lawStatute || law.section);

const buildMapYearPage = (publications = []) => {
  const entries = [];

  publications.forEach((pub) => {
    if (!pub || (!pub.year && !pub.mag && !pub.page && !pub.vol)) return;

    const magStr = (pub.mag || 'SLD').toUpperCase();
    const yearStr = pub.year || '';
    const volStr = pub.vol ? `${pub.vol} ` : '';
    const pageStr = pub.page || '';

    // Format: Year Mag Page e.g. "2026 SLD 8325" or "(2005) 92 TAX 141"
    let citation = '';
    if (pub.vol) {
      citation = `(${yearStr}) ${volStr}${magStr} ${pageStr}`.trim();
    } else if (yearStr) {
      citation = `${yearStr} ${magStr} ${pageStr}`.trim();
    } else {
      citation = `${magStr} ${pageStr}`.trim();
    }

    if (!citation) return;

    const key = `${yearStr}|${magStr}|${pageStr}`.toLowerCase();
    const existingIndex = entries.findIndex((entry) => entry.key === key);

    if (existingIndex === -1) {
      entries.push({ value: citation, key });
      return;
    }

    const current = entries[existingIndex];
    const currentHasVol = current.value.includes('(') || /\(\d{4}\)/.test(current.value);
    const nextHasVol = Boolean(pub.vol && String(pub.vol).trim());

    if (nextHasVol && !currentHasVol) {
      entries[existingIndex] = { value: citation, key };
    }
  });

  return entries.map((entry) => entry.value);
};

/**
 * Helper to format case model for frontend compatibility
 */
const formatCaseForFrontend = (c) => {
  let mapYearPage = Array.isArray(c.mapYearPage) ? c.mapYearPage.filter(Boolean) : [];

  if (mapYearPage.length === 0 && c.publications && c.publications.length > 0) {
    mapYearPage = buildMapYearPage(c.publications);
  }

  return {
    id: c._id.toString(),
    caseId: c.caseId || c.case_id || '',
    case_id: c.case_id || c.caseId || '',
    sldNumber: c.sldNumber || c.caseId || '',
    dated: c.dated || '',
    department: c.department || 'tax',
    court: c.court || '',
    caseNumber: c.caseNumber || [],
    judges: c.judges || [],
    petitioners: c.petitioners || [],
    lawyers: c.lawyers || [],
    headNote: c.headNote || '',
    references: c.references || '',
    principleLaw: c.principleLaw || '',
    legalMaxim: c.legalMaxim || '',
    judgment: c.judgment || '',
    publications: c.publications || [],
    laws: c.laws || [],
    attachments: c.attachments ? c.attachments.length : 0,
    attachmentsData: c.attachments || [],
    mapYearPage
  };
};

/**
 * Case Laws API Controllers
 */
export const getCases = async (req, res, next) => {
  try {
    const { subject, fromDate, toDate, fromYear, toYear, magazine, page, limit, sortField, sortOrder } = req.query;

    const query = { isDeleted: { $ne: true } };

    // Apply filters
    if (subject) {
      const q = subject.trim();
      if (q) {
        const searchRegex = new RegExp(escapeRegex(q), 'i');
        query.$or = [
          { caseId: searchRegex },
          { case_id: searchRegex },
          { sldNumber: searchRegex },
          { court: searchRegex },
          { headNote: searchRegex },
          { references: searchRegex },
          { principleLaw: searchRegex },
          { caseNumber: searchRegex },
          { judges: searchRegex },
          { lawyers: searchRegex },
          { petitioners: searchRegex },
          { mapYearPage: searchRegex }
        ];
      }
    }

    if (fromDate) {
      query.dated = { ...query.dated, $gte: fromDate };
    }

    if (toDate) {
      query.dated = { ...query.dated, $lte: toDate };
    }

    // Support year to year search (fromYear to toYear)
    if (fromYear || toYear) {
      const fy = fromYear ? String(fromYear).trim() : '';
      const ty = toYear ? String(toYear).trim() : '';
      const yearConditions = [];
      if (fy && ty) {
        yearConditions.push(
          { 'publications.year': { $gte: fy, $lte: ty } },
          { dated: { $gte: `${fy}-01-01`, $lte: `${ty}-12-31` } }
        );
      } else if (fy) {
        yearConditions.push(
          { 'publications.year': { $gte: fy } },
          { dated: { $gte: `${fy}-01-01` } }
        );
      } else if (ty) {
        yearConditions.push(
          { 'publications.year': { $lte: ty } },
          { dated: { $lte: `${ty}-12-31` } }
        );
      }
      if (yearConditions.length > 0) {
        if (query.$or) {
          query.$and = [{ $or: query.$or }, { $or: yearConditions }];
          delete query.$or;
        } else {
          query.$or = yearConditions;
        }
      }
    }

    if (magazine && magazine.trim()) {
      const magClean = escapeRegex(magazine.trim());
      const magRegex = new RegExp(magClean, 'i');
      const magCondition = [
        { 'publications.mag': magRegex },
        { mapYearPage: magRegex }
      ];
      if (query.$and) {
        query.$and.push({ $or: magCondition });
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: magCondition }];
        delete query.$or;
      } else {
        query.$or = magCondition;
      }
    }

    // Pagination (allow up to 2000 if magazine search is active to retrieve all entries)
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const maxLimitAllowed = (magazine && magazine.trim()) ? 2000 : 100;
    const defaultLimit = (magazine && magazine.trim()) ? 500 : 25;
    const limitNum = Math.min(maxLimitAllowed, Math.max(1, parseInt(limit, 10) || defaultLimit));
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sortFieldMap = {
      sldNumber: 'sldNumberInt',
      dated: 'dated',
      court: 'court',
      caseNumber: 'caseNumber',
      mapYearPage: 'mapYearPage'
    };
    const targetSortField = sortFieldMap[sortField] || 'sldNumberInt';
    const safeSortOrder = sortOrder === 'desc' ? -1 : 1;
    const sortObj = { [targetSortField]: safeSortOrder };

    const hasFilter = Boolean((subject && subject.trim()) || fromDate || toDate || fromYear || toYear || (magazine && magazine.trim()));

    // Execute count + paginated query in parallel using fast indexed queries
    const [totalItems, cases] = await Promise.all([
      getTotalCasesCount(query, hasFilter),
      Case.find(query)
        .select('caseId case_id sldNumber dated court caseNumber judges lawyers petitioners mapYearPage publications laws attachments department headNote principleLaw')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    let data = cases.map(formatCaseForFrontend);
    if (req.user?.isSpammer === true) {
      data = spoofCaseList(data);
    }
    const totalPages = Math.ceil(totalItems / limitNum);

    return res.status(200).json({
      success: true,
      message: 'Cases retrieved successfully.',
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/cases/max-page?year=2026&mag=sld
 * Returns the highest page number stored for a given year+magazine combination.
 * Used by the Add/Edit form to auto-suggest the next page number.
 */
export const getMaxPage = async (req, res, next) => {
  try {
    const { year, mag } = req.query;

    if (!year || !mag) {
      return res.status(400).json({
        success: false,
        message: 'year and mag query parameters are required.'
      });
    }

    const result = await Case.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $unwind: '$publications' },
      {
        $match: {
          'publications.year': String(year).trim(),
          'publications.mag': { $regex: `^${escapeRegex(String(mag).trim())}$`, $options: 'i' }
        }
      },
      {
        $group: {
          _id: null,
          maxPage: { $max: { $toInt: '$publications.page' } }
        }
      }
    ]);

    const maxPage = result.length > 0 && result[0].maxPage != null
      ? result[0].maxPage
      : null;

    return res.status(200).json({
      success: true,
      maxPage
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/cases/sld/:sld
 * Directly fetches case by SLD number (or caseId)
 */
export const getCaseBySld = async (req, res, next) => {
  try {
    const { sld } = req.params;
    if (!sld || !sld.trim()) {
      return res.status(400).json({
        success: false,
        message: 'SLD Number parameter is required.'
      });
    }

    const cleanSld = sld.trim();
    const cleanNum = cleanSld.replace(/^(?:case|sld)\s*(?:no\.?|#|id)?\s*[:\-]?\s*/i, '').trim();
    const numInt = parseInt(cleanNum, 10);

    const conditions = [
      { sldNumber: cleanSld },
      { sldNumber: cleanNum },
      { caseId: new RegExp(`^${escapeRegex(cleanSld)}$`, 'i') },
      { case_id: new RegExp(`^${escapeRegex(cleanSld)}$`, 'i') },
      { caseId: new RegExp(`^${escapeRegex(cleanNum)}$`, 'i') },
      { case_id: new RegExp(`^${escapeRegex(cleanNum)}$`, 'i') },
      { caseId: `CASE-IMPORT-${cleanSld}` },
      { caseId: `CASE-IMPORT-${cleanNum}` }
    ];

    if (!isNaN(numInt)) {
      conditions.push({ sldNumber: String(numInt) });
      conditions.push({ caseId: new RegExp(`^CASE-0*${numInt}$`, 'i') });
      conditions.push({ case_id: new RegExp(`^CASE-0*${numInt}$`, 'i') });
    }

    if (mongoose.isValidObjectId(cleanSld)) {
      conditions.push({ _id: cleanSld });
    }

    const cached = getCachedCase(`sld_${cleanSld.toLowerCase()}`);
    if (cached) {
      const payload = req.user?.isSpammer === true ? spoofCase(cached) : cached;
      return res.status(200).json({
        success: true,
        message: 'Case retrieved successfully.',
        data: payload
      });
    }

    const c = await Case.findOne({
      $or: conditions,
      isDeleted: { $ne: true }
    }).lean();

    if (!c) {
      return res.status(404).json({
        success: false,
        message: `Case law with SLD #${cleanSld} was not found.`
      });
    }

    if (req.user) {
      const clientIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1').split(',')[0].trim().replace(/^::ffff:/, '');
      UserActivity.create({
        activityType: 'case',
        userId: req.user._id,
        loginId: req.user.loginId || req.user.username || req.user.email,
        fullName: req.user.fullName || req.user.username,
        agency: req.user.agencyName || 'General',
        documentId: c.caseId || c.sldNumber,
        documentNumber: c.sldNumber || c.caseId,
        documentTitle: (c.petitioners && c.petitioners[0]) || (c.caseNumber && c.caseNumber[0]) || 'Case Law Record',
        ipAddress: clientIp,
        dated: new Date(),
      }).catch(() => {});
    }

    const formatted = formatCaseForFrontend(c);
    setCachedCase(`sld_${cleanSld.toLowerCase()}`, formatted);
    if (c._id) setCachedCase(`id_${c._id.toString()}`, formatted);
    if (c.caseId) setCachedCase(`id_${c.caseId.toLowerCase()}`, formatted);

    const payload = req.user?.isSpammer === true ? spoofCase(formatted) : formatted;

    return res.status(200).json({
      success: true,
      message: 'Case retrieved successfully.',
      data: payload
    });
  } catch (error) {
    next(error);
  }
};

export const getCaseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !id.trim()) {
      return res.status(400).json({ success: false, message: 'Case ID parameter is required' });
    }

    const rawId = id.trim();
    const cleanId = rawId.replace(/^(?:case\s*(?:id|no\.?|#)?\s*[:\-]?\s*|sld\s*(?:no\.?|#)?\s*[:\-]?\s*)/i, '').trim();
    const numInt = parseInt(cleanId, 10);

    const citationMatch = rawId.match(/^(?:([A-Za-z]+)\s+(\d{4})\s+(\d+)|(\d{4})\s+([A-Za-z]+)\s+(\d+))$/i);
    const citationMagazine = citationMatch?.[1] || citationMatch?.[5];
    const citationYear = citationMatch?.[2] || citationMatch?.[4];
    const citationPage = citationMatch?.[3] || citationMatch?.[6];

    let query;
    if (mongoose.isValidObjectId(rawId)) {
      query = { _id: rawId };
    } else if (citationMatch) {
      query = {
        $or: [
          { mapYearPage: { $in: [rawId, rawId.toUpperCase()] } },
          {
            publications: {
              $elemMatch: {
                mag: { $regex: `^${escapeRegex(citationMagazine)}$`, $options: 'i' },
                year: citationYear,
                page: citationPage
              }
            }
          }
        ]
      };
    } else {
      const orList = [
        { caseId: new RegExp(`^${escapeRegex(rawId)}$`, 'i') },
        { case_id: new RegExp(`^${escapeRegex(rawId)}$`, 'i') },
        { sldNumber: rawId },
        { caseId: new RegExp(`^${escapeRegex(cleanId)}$`, 'i') },
        { case_id: new RegExp(`^${escapeRegex(cleanId)}$`, 'i') },
        { sldNumber: cleanId },
        { caseId: `CASE-IMPORT-${cleanId}` },
        { caseId: `CASE-IMPORT-${rawId}` }
      ];
      if (!isNaN(numInt)) {
        orList.push({ sldNumber: String(numInt) });
        orList.push({ caseId: new RegExp(`^CASE-0*${numInt}$`, 'i') });
        orList.push({ case_id: new RegExp(`^CASE-0*${numInt}$`, 'i') });
      }
      query = { $or: orList };
    }

    const cached = getCachedCase(`id_${rawId.toLowerCase()}`);
    if (cached) {
      const payload = req.user?.isSpammer === true ? spoofCase(cached) : cached;
      return res.status(200).json({
        success: true,
        data: payload
      });
    }

    const c = await Case.findOne({ ...query, isDeleted: { $ne: true } }).lean();

    if (!c) {
      return res.status(404).json({
        success: false,
        message: 'Case law record not found.'
      });
    }

    if (req.user) {
      const clientIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1').split(',')[0].trim().replace(/^::ffff:/, '');
      UserActivity.create({
        activityType: 'case',
        userId: req.user._id,
        loginId: req.user.loginId || req.user.username || req.user.email,
        fullName: req.user.fullName || req.user.username,
        agency: req.user.agencyName || 'General',
        documentId: c.caseId || c.sldNumber,
        documentNumber: c.sldNumber || c.caseId,
        documentTitle: (c.petitioners && c.petitioners[0]) || (c.caseNumber && c.caseNumber[0]) || 'Case Law Record',
        ipAddress: clientIp,
        dated: new Date(),
      }).catch(() => {});
    }

    const formatted = formatCaseForFrontend(c);
    setCachedCase(`id_${rawId.toLowerCase()}`, formatted);
    if (c.sldNumber) setCachedCase(`sld_${c.sldNumber.toLowerCase()}`, formatted);
    if (c._id) setCachedCase(`id_${c._id.toString()}`, formatted);

    const payload = req.user?.isSpammer === true ? spoofCase(formatted) : formatted;

    return res.status(200).json({
      success: true,
      data: payload
    });
  } catch (error) {
    next(error);
  }
};

export const createCase = async (req, res, next) => {
  try {
    const { 
      srNumber, dated, department, court, 
      caseNumber, judges, petitioners, lawyers, 
      headNote, references, principleLaw, legalMaxim, judgment, 
      publications, laws, attachments 
    } = req.body;

    const safeDepartment = typeof department === 'string' && department.trim().length > 0
      ? department.trim().toLowerCase()
      : 'tax';

    if (srNumber && typeof srNumber === 'string' && srNumber.trim().length > 0) {
      const exist = await Case.findOne({ sldNumber: srNumber.trim() });
      if (exist) {
        return res.status(400).json({
          success: false,
          message: `Case law with SLD/SR #${srNumber} already exists.`
        });
      }
    }

    const pubs = publications || [];
    const mapYearPage = buildMapYearPage(pubs);

    const newCase = new Case({
      sldNumber: srNumber ? srNumber.trim() : undefined,
      dated: dated || null,
      department: safeDepartment,
      court: court || '',
      caseNumber: stringToArray(caseNumber),
      judges: stringToArray(judges),
      petitioners: stringToArray(petitioners),
      lawyers: stringToArray(lawyers),
      headNote: headNote || '',
      references: references || '',
      principleLaw: principleLaw || '',
      legalMaxim: legalMaxim || '',
      judgment: judgment || '',
      publications: pubs,
      laws: normalizeLawReferences(laws),
      attachments: attachments || [],
      mapYearPage
    });

    await newCase.save();

    // If sldNumber was empty, fallback to generated caseId
    if (!newCase.sldNumber) {
      newCase.sldNumber = newCase.caseId;
      await newCase.save();
    }

    caseDetailCache.clear();
    logger.info(`[Case Created] Case ID ${newCase.caseId} (SLD #${newCase.sldNumber}) added.`);

    return res.status(201).json({
      success: true,
      message: 'Case law record created successfully.',
      data: formatCaseForFrontend(newCase)
    });
  } catch (error) {
    next(error);
  }
};

export const updateCase = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = {
      $or: [
        { caseId: id },
        { case_id: id },
        { sldNumber: id },
        ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])
      ],
      isDeleted: { $ne: true }
    };

    const { 
      srNumber, dated, department, court, 
      caseNumber, judges, petitioners, lawyers, 
      headNote, references, principleLaw, legalMaxim, judgment, 
      publications, laws, attachments 
    } = req.body;

    const safeDepartment = typeof department === 'string' && department.trim().length > 0
      ? department.trim().toLowerCase()
      : undefined;

    const c = await Case.findOne(query);
    if (!c) {
      return res.status(404).json({
        success: false,
        message: 'Case law record not found.'
      });
    }

    if (srNumber && srNumber !== c.sldNumber) {
      const exist = await Case.findOne({ sldNumber: srNumber, _id: { $ne: c._id } });
      if (exist) {
        return res.status(400).json({
          success: false,
          message: `Case law with SLD/SR #${srNumber} already exists.`
        });
      }
      c.sldNumber = srNumber;
    }

    if (dated !== undefined) c.dated = dated;
    if (department !== undefined) c.department = safeDepartment ?? c.department;
    if (court !== undefined) c.court = court;
    if (caseNumber !== undefined) c.caseNumber = stringToArray(caseNumber);
    if (judges !== undefined) c.judges = stringToArray(judges);
    if (petitioners !== undefined) c.petitioners = stringToArray(petitioners);
    if (lawyers !== undefined) c.lawyers = stringToArray(lawyers);
    if (headNote !== undefined) c.headNote = headNote;
    if (references !== undefined) c.references = references;
    if (principleLaw !== undefined) c.principleLaw = principleLaw;
    if (legalMaxim !== undefined) c.legalMaxim = legalMaxim;
    if (judgment !== undefined) c.judgment = judgment;
    if (publications !== undefined) {
      c.publications = publications;
      c.mapYearPage = buildMapYearPage(publications);
    }
    if (laws !== undefined) c.laws = normalizeLawReferences(laws);
    if (attachments !== undefined) c.attachments = attachments;

    await c.save();
    caseDetailCache.clear();
    logger.info(`[Case Updated] Case ID ${c.caseId} (SLD #${c.sldNumber}) updated.`);

    return res.status(200).json({
      success: true,
      message: 'Case law record updated successfully.',
      data: formatCaseForFrontend(c)
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCase = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = {
      $or: [
        { caseId: id },
        { case_id: id },
        { sldNumber: id },
        ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])
      ],
      isDeleted: { $ne: true }
    };

    const c = await Case.findOne(query);
    if (!c) {
      return res.status(404).json({
        success: false,
        message: 'Case law record not found.'
      });
    }

    c.isDeleted = true;
    c.deletedAt = new Date();
    await c.save();
    caseDetailCache.clear();

    logger.info(`[Case Deleted] Case ID ${c.caseId || c.sldNumber} soft-deleted.`);

    return res.status(200).json({
      success: true,
      message: `Case deleted successfully.`,
      id: c._id
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMultiple = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid array of Case IDs is required for bulk deletion.'
      });
    }

    const invalidId = ids.find(id => !mongoose.isValidObjectId(id));
    if (invalidId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid case ID format in selection. Bulk deletion requires valid case IDs.'
      });
    }

    await Case.updateMany(
      { _id: { $in: ids } },
      { 
        $set: { 
          isDeleted: true, 
          deletedAt: new Date() 
        } 
      }
    );

    caseDetailCache.clear();
    logger.info(`[Bulk Case Deleted] ${ids.length} cases soft-deleted.`);

    return res.status(200).json({
      success: true,
      message: `${ids.length} cases deleted successfully.`,
      ids
    });
  } catch (error) {
    next(error);
  }
};
export const searchCases = async (req, res, next) => {
  try {
    const filters = req.body;
    
    const hasFilter = Object.values(filters).some(val => val && val.toString().trim() !== '');
    if (!hasFilter) {
      return res.status(400).json({ success: false, message: 'Please provide at least one search criteria.' });
    }

    let andConditions = [{ isDeleted: false }];

    if (filters.subject) {
      const subject = String(filters.subject).trim();
      const citationMatch = subject.match(/^(?:([A-Za-z]+)\s+(\d{4})\s+(\d+)|(\d{4})\s+([A-Za-z]+)\s+(\d+))$/i);
      if (citationMatch) {
        const magazine = citationMatch[1] || citationMatch[5];
        const year = citationMatch[2] || citationMatch[4];
        const page = citationMatch[3] || citationMatch[6];
        andConditions.push({
          $or: [
            { mapYearPage: { $regex: `^${escapeRegex(magazine)}\\s+${year}\\s+${page}$`, $options: 'i' } },
            { publications: { $elemMatch: {
              mag: { $regex: `^${escapeRegex(magazine)}$`, $options: 'i' },
              year,
              page
            } } }
          ]
        });
      } else {
        const subjectRegex = new RegExp(escapeRegex(subject), 'i');
        andConditions.push({
          $or: [
            { caseId: subjectRegex },
            { case_id: subjectRegex },
            { sldNumber: subjectRegex },
            { mapYearPage: subjectRegex },
            { caseNumber: subjectRegex },
            { headNote: subjectRegex }
          ]
        });
      }
    }

        if (filters.yearVolume) {
      andConditions.push({
        $or: [
          { 'publications.year': { $regex: escapeRegex(filters.yearVolume), $options: 'i' } },
          { 'publications.vol': { $regex: escapeRegex(filters.yearVolume), $options: 'i' } }
        ]
      });
    }

    if (filters.magazine) {
      andConditions.push({ 'publications.mag': { $regex: `^${escapeRegex(filters.magazine)}$`, $options: 'i' } });
    }

    if (filters.page) {
      andConditions.push({ 'publications.page': { $regex: escapeRegex(filters.page), $options: 'i' } });
    }

    const lawQuery = filters.selectLaw || filters.law;
    if (lawQuery) {
      andConditions.push({
        $or: [
          { principleLaw: { $regex: escapeRegex(lawQuery), $options: 'i' } },
          { 'laws.lawStatute': { $regex: escapeRegex(lawQuery), $options: 'i' } }
        ]
      });
    }

    if (filters.number) {
      andConditions.push({
        $or: [
          { caseNumber: { $regex: escapeRegex(filters.number), $options: 'i' } },
          { sldNumber: { $regex: escapeRegex(filters.number), $options: 'i' } },
          { references: { $regex: escapeRegex(filters.number), $options: 'i' } },
          { headNote: { $regex: escapeRegex(filters.number), $options: 'i' } },
          { judgment: { $regex: escapeRegex(filters.number), $options: 'i' } }
        ]
      });
    }

    if (filters.year) {
      andConditions.push({
        $or: [
          { 'publications.year': { $regex: escapeRegex(filters.year), $options: 'i' } },
          { dated: { $regex: escapeRegex(filters.year), $options: 'i' } },
          { caseNumber: { $regex: escapeRegex(filters.year), $options: 'i' } },
          { mapYearPage: { $regex: escapeRegex(filters.year), $options: 'i' } }
        ]
      });
    }

    if (filters.section) {
      andConditions.push({
        $or: [
          { principleLaw: { $regex: escapeRegex(filters.section), $options: 'i' } },
          { 'laws.section': { $regex: escapeRegex(filters.section), $options: 'i' } }
        ]
      });
    }

    if (filters.section2) {
      andConditions.push({
        $or: [
          { principleLaw: { $regex: escapeRegex(filters.section2), $options: 'i' } },
          { 'laws.section': { $regex: escapeRegex(filters.section2), $options: 'i' } }
        ]
      });
    }

    if (filters.court) {
      andConditions.push({ court: { $regex: `^${escapeRegex(filters.court)}$`, $options: 'i' } });
    }

    if (filters.caseNumber) {
      andConditions.push({ caseNumber: { $regex: escapeRegex(filters.caseNumber), $options: 'i' } });
    }

    if (filters.date) {
      andConditions.push({ dated: { $regex: escapeRegex(filters.date), $options: 'i' } });
    }

    if (filters.fromYear || filters.toYear) {
      const fy = filters.fromYear ? String(filters.fromYear).trim() : '';
      const ty = filters.toYear ? String(filters.toYear).trim() : '';
      if (fy && ty) {
        andConditions.push({
          $or: [
            { 'publications.year': { $gte: fy, $lte: ty } },
            { dated: { $gte: `${fy}-01-01`, $lte: `${ty}-12-31` } }
          ]
        });
      } else if (fy) {
        andConditions.push({
          $or: [
            { 'publications.year': { $gte: fy } },
            { dated: { $gte: `${fy}-01-01` } }
          ]
        });
      } else if (ty) {
        andConditions.push({
          $or: [
            { 'publications.year': { $lte: ty } },
            { dated: { $lte: `${ty}-12-31` } }
          ]
        });
      }
    }

    const kw1 = filters.keywords || filters.text;
    if (kw1) {
      andConditions.push({
        $or: [
          { headNote: { $regex: escapeRegex(kw1), $options: 'i' } },
          { judgment: { $regex: escapeRegex(kw1), $options: 'i' } }
        ]
      });
    }

    const kw2 = filters.keywords2 || filters.text2;
    if (kw2) {
      andConditions.push({
        $or: [
          { headNote: { $regex: escapeRegex(kw2), $options: 'i' } },
          { judgment: { $regex: escapeRegex(kw2), $options: 'i' } }
        ]
      });
    }

    if (filters.phrase) {
      andConditions.push({
        $or: [
          { headNote: { $regex: escapeRegex(filters.phrase), $options: 'i' } },
          { judgment: { $regex: escapeRegex(filters.phrase), $options: 'i' } }
        ]
      });
    }

    if (filters.judges) {
      andConditions.push({ judges: { $regex: escapeRegex(filters.judges), $options: 'i' } });
    }

    if (filters.lawyers) {
      andConditions.push({ lawyers: { $regex: escapeRegex(filters.lawyers), $options: 'i' } });
    }

    if (filters.petitioner) {
      andConditions.push({ petitioners: { $regex: escapeRegex(filters.petitioner), $options: 'i' } });
    }

    if (filters.principleLaw) {
      andConditions.push({
        $or: [
          { principleLaw: { $regex: escapeRegex(filters.principleLaw), $options: 'i' } },
          { 'laws.lawStatute': { $regex: escapeRegex(filters.principleLaw), $options: 'i' } }
        ]
      });
    }
    const query = { $and: andConditions };
    
    // High-performance execution: limit + field projection + .lean()
    const searchLimit = filters.magazine ? 2000 : (parseInt(filters.limit, 10) || 100);
    const cases = await Case.find(query)
      .select('caseId case_id sldNumber dated court caseNumber judges lawyers petitioners mapYearPage publications laws attachments department headNote principleLaw legalMaxim')
      .sort({ sldNumberInt: -1, sldNumber: -1 })
      .limit(searchLimit)
      .lean();

    let formattedCases = cases.map(c => formatCaseForFrontend(c));
    if (req.user?.isSpammer === true) {
      formattedCases = spoofCaseList(formattedCases);
    }

    res.status(200).json({
      success: true,
      count: cases.length,
      data: formattedCases
    });
  } catch (error) {
    logger.error('Error in searchCases:', error);
    next(error);
  }
};

