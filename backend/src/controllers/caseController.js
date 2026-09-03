import Case from '../models/Case.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

const escapeRegex = (string) => {
  if (string == null) return '';
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    const volStr = pub.vol ? ` ${pub.vol}` : '';
    const pageStr = pub.page || '';
    const citation = `${magStr} ${yearStr}${volStr} ${pageStr}`.trim();

    if (!citation) return;

    const key = `${magStr}|${yearStr}|${pageStr}`.toLowerCase();
    const existingIndex = entries.findIndex((entry) => {
      const [entryMag, entryYear, entryPage] = entry.key.split('|');
      return entryMag === magStr.toLowerCase() && entryYear === yearStr.toLowerCase() && entryPage === pageStr.toLowerCase();
    });

    if (existingIndex === -1) {
      entries.push({ value: citation, key });
      return;
    }

    const current = entries[existingIndex];
    const currentHasVol = current.value.includes(' ') && /\d+\s+\d+$/.test(current.value) === false;
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
  } else if (mapYearPage.length > 0 && c.publications && c.publications.length > 0) {
    mapYearPage = buildMapYearPage(c.publications).length > 0
      ? buildMapYearPage(c.publications)
      : mapYearPage;
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
    const { subject, fromDate, toDate, magazine, page, limit, sortField, sortOrder } = req.query;

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

    if (magazine) {
      query.mapYearPage = new RegExp(escapeRegex(magazine.trim()), 'i');
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const allowedSortFields = ['sldNumber', 'dated', 'court', 'caseNumber', 'mapYearPage'];
    const safeSortField = allowedSortFields.includes(sortField) ? sortField : 'sldNumber';
    const safeSortOrder = sortOrder === 'asc' ? 1 : -1;
    const sortObj = { [safeSortField]: safeSortOrder };

    // Execute count + paginated query in parallel
    const [totalItems, cases] = await Promise.all([
      Case.countDocuments(query),
      Case.find(query)
        .select('caseId case_id sldNumber dated court caseNumber judges lawyers petitioners mapYearPage publications laws attachments department')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    const data = cases.map(formatCaseForFrontend);
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

export const getCaseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const citationMatch = id.trim().match(/^(?:([A-Za-z]+)\s+(\d{4})\s+(\d+)|(\d{4})\s+([A-Za-z]+)\s+(\d+))$/i);
    const citationMagazine = citationMatch?.[1] || citationMatch?.[5];
    const citationYear = citationMatch?.[2] || citationMatch?.[4];
    const citationPage = citationMatch?.[3] || citationMatch?.[6];
    const query = mongoose.isValidObjectId(id)
      ? { _id: id }
      : citationMatch
        ? {
            $or: [
              { mapYearPage: { $in: [id.trim(), id.trim().toUpperCase()] } },
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
          }
        : { $or: [{ caseId: id }, { case_id: id }, { sldNumber: id }] };

    const c = await Case.findOne({ ...query, isDeleted: { $ne: true } });

    if (!c) {
      return res.status(404).json({
        success: false,
        message: 'Case law record not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: formatCaseForFrontend(c)
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

    if (filters.selectLaw) {
      andConditions.push({
        $or: [
          { principleLaw: { $regex: escapeRegex(filters.selectLaw), $options: 'i' } },
          { 'laws.lawStatute': { $regex: escapeRegex(filters.selectLaw), $options: 'i' } }
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

    if (filters.keywords) {
      andConditions.push({
        $or: [
          { headNote: { $regex: escapeRegex(filters.keywords), $options: 'i' } },
          { judgment: { $regex: escapeRegex(filters.keywords), $options: 'i' } }
        ]
      });
    }

    if (filters.keywords2) {
      andConditions.push({
        $or: [
          { headNote: { $regex: escapeRegex(filters.keywords2), $options: 'i' } },
          { judgment: { $regex: escapeRegex(filters.keywords2), $options: 'i' } }
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
    
    // Also limit results for performance
    const cases = await Case.find(query).sort({ sldNumber: -1 }).limit(100);
    const formattedCases = cases.map(c => formatCaseForFrontend(c));

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

