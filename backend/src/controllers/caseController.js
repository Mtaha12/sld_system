import Case from '../models/Case.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

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

/**
 * Helper to format case model for frontend compatibility
 */
const formatCaseForFrontend = (c) => {
  // If mapYearPage is empty, attempt to generate it from publications
  let mapYearPage = c.mapYearPage || [];
  if (mapYearPage.length === 0 && c.publications && c.publications.length > 0) {
    mapYearPage = c.publications.map(pub => {
      const magStr = (pub.mag || 'SLD').toUpperCase();
      const volStr = pub.vol ? ` ${pub.vol}` : '';
      return `${magStr} ${pub.year}${volStr} ${pub.page}`.trim();
    });
  }

  // Get month name from publications or dated
  let month = 'May';
  if (c.publications && c.publications[0] && c.publications[0].month) {
    const m = c.publications[0].month;
    month = m.charAt(0).toUpperCase() + m.slice(1);
  } else if (c.dated) {
    const d = new Date(c.dated);
    if (!isNaN(d.getTime())) {
      month = d.toLocaleString('en-US', { month: 'long' });
    }
  }

  return {
    id: c._id.toString(),
    sldNumber: c.sldNumber,
    dated: c.dated || '',
    department: c.department || 'tax',
    status: c.status || 'Active',
    court: c.court || '',
    caseNumber: c.caseNumber || [],
    judges: c.judges || [],
    petitioners: c.petitioners || [],
    lawyers: c.lawyers || [],
    headNote: c.headNote || '',
    references: c.references || '',
    principleLaw: c.principleLaw || '',
    judgment: c.judgment || '',
    publications: c.publications || [],
    laws: c.laws || [],
    attachments: c.attachments ? c.attachments.length : 0,
    attachmentsData: c.attachments || [],
    mapYearPage,
    month
  };
};

/**
 * Case Laws API Controllers
 */
export const getCases = async (req, res, next) => {
  try {
    const { subject, fromDate, toDate, magazine } = req.query;

    const query = { isDeleted: { $ne: true } };

    // Apply filters
    if (subject) {
      const q = subject.trim();
      const searchRegex = new RegExp(q, 'i');
      query.$or = [
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

    if (fromDate) {
      query.dated = { ...query.dated, $gte: fromDate };
    }

    if (toDate) {
      query.dated = { ...query.dated, $lte: toDate };
    }

    if (magazine) {
      query.mapYearPage = new RegExp(magazine.trim(), 'i');
    }

    // Retrieve all matches (Frontend paginates/filters locally, so we return all matches)
    const cases = await Case.find(query).sort({ sldNumber: -1 });

    const data = cases.map(formatCaseForFrontend);

    return res.status(200).json({
      success: true,
      message: 'Cases retrieved successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getCaseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = mongoose.isValidObjectId(id) 
      ? { _id: id } 
      : { sldNumber: id };

    const c = await Case.findOne({ ...query, isDeleted: { $ne: true } });

    if (!c) {
      return res.status(404).json({
        success: false,
        message: 'Case law record not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: c._id.toString()
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createCase = async (req, res, next) => {
  try {
    const { 
      srNumber, dated, department, status, court, 
      caseNumber, judges, petitioners, lawyers, 
      headNote, references, principleLaw, judgment, 
      publications, laws, attachments 
    } = req.body;

    if (!srNumber) {
      return res.status(400).json({
        success: false,
        message: 'SR # (SLD Number) is required.'
      });
    }

    // Check unique SLD
    const exist = await Case.findOne({ sldNumber: srNumber });
    if (exist) {
      return res.status(400).json({
        success: false,
        message: `Case law with SLD/SR #${srNumber} already exists.`
      });
    }

    // Map publications to generate mapYearPage array
    const pubs = publications || [];
    const mapYearPage = pubs.map(pub => {
      const magStr = (pub.mag || 'SLD').toUpperCase();
      const volStr = pub.vol ? ` ${pub.vol}` : '';
      return `${magStr} ${pub.year}${volStr} ${pub.page}`.trim();
    });

    const newCase = new Case({
      sldNumber: srNumber,
      dated: dated || null,
      department: department || 'tax',
      status: status || 'Active',
      court: court || '',
      caseNumber: stringToArray(caseNumber),
      judges: stringToArray(judges),
      petitioners: stringToArray(petitioners),
      lawyers: stringToArray(lawyers),
      headNote: headNote || '',
      references: references || '',
      principleLaw: principleLaw || '',
      judgment: judgment || '',
      publications: pubs,
      laws: laws || [],
      attachments: attachments || [],
      mapYearPage
    });

    await newCase.save();
    logger.info(`[Case Created] SLD #${newCase.sldNumber} added.`);

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

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid case ID format. Modifications require a valid case ID.'
      });
    }

    const { 
      srNumber, dated, department, status, court, 
      caseNumber, judges, petitioners, lawyers, 
      headNote, references, principleLaw, judgment, 
      publications, laws, attachments 
    } = req.body;

    const c = await Case.findById(id);
    if (!c) {
      return res.status(404).json({
        success: false,
        message: 'Case law record not found.'
      });
    }

    if (srNumber && srNumber !== c.sldNumber) {
      const exist = await Case.findOne({ sldNumber: srNumber });
      if (exist) {
        return res.status(400).json({
          success: false,
          message: `Case law with SLD/SR #${srNumber} already exists.`
        });
      }
      c.sldNumber = srNumber;
    }

    if (dated !== undefined) c.dated = dated;
    if (department !== undefined) c.department = department;
    if (status !== undefined) c.status = status;
    if (court !== undefined) c.court = court;
    if (caseNumber !== undefined) c.caseNumber = stringToArray(caseNumber);
    if (judges !== undefined) c.judges = stringToArray(judges);
    if (petitioners !== undefined) c.petitioners = stringToArray(petitioners);
    if (lawyers !== undefined) c.lawyers = stringToArray(lawyers);
    if (headNote !== undefined) c.headNote = headNote;
    if (references !== undefined) c.references = references;
    if (principleLaw !== undefined) c.principleLaw = principleLaw;
    if (judgment !== undefined) c.judgment = judgment;
    if (publications !== undefined) {
      c.publications = publications;
      c.mapYearPage = publications.map(pub => {
        const magStr = (pub.mag || 'SLD').toUpperCase();
        const volStr = pub.vol ? ` ${pub.vol}` : '';
        return `${magStr} ${pub.year}${volStr} ${pub.page}`.trim();
      });
    }
    if (laws !== undefined) c.laws = laws;
    if (attachments !== undefined) c.attachments = attachments;

    await c.save();
    logger.info(`[Case Updated] SLD #${c.sldNumber} updated.`);

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

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid case ID format. Deletion requires a valid case ID.'
      });
    }

    const c = await Case.findById(id);
    if (!c) {
      return res.status(404).json({
        success: false,
        message: 'Case law record not found.'
      });
    }

    c.isDeleted = true;
    c.deletedAt = new Date();
    await c.save();

    logger.info(`[Case Deleted] SLD #${c.sldNumber} soft-deleted.`);

    return res.status(200).json({
      success: true,
      message: `Case SLD #${c.sldNumber} deleted successfully.`,
      id
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
