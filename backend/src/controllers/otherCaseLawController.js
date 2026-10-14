import OtherCaseLaw from '../models/OtherCaseLaw.js';
import mongoose from 'mongoose';

const formatItem = (d) => ({
  id: d.srNumber ? d.srNumber.toString() : (d.otherCaseId || d._id.toString()),
  mongoId: d._id.toString(),
  otherCaseId: d.otherCaseId || d.other_case_id || '',
  srNumber: d.srNumber || 1,
  citation: d.citation || 'Nil',
  caseNo: d.caseNo || '',
  caseNoLink: d.caseNoLink || '',
  caseYear: d.caseYear || '',
  parties: d.parties || d.caseTitle || '',
  caseTitle: d.caseTitle || d.parties || '',
  orderDate: d.orderDate || d.judgmentDate || '',
  judgmentDate: d.judgmentDate || d.orderDate || '',
  headNotes: d.headNotes || d.notes || '',
  bench: d.bench || d.authorJudge || '',
  authorJudge: d.authorJudge || d.bench || '',
  apexCourt: d.apexCourt || '',
  apexStatus: d.apexStatus || '',
  downloadLink: d.downloadLink || d.caseNoLink || d.attachment || '',
  attachment: d.attachment || d.downloadLink || '',
  attachmentName: d.attachmentName || (d.caseNo ? `${d.caseNo}.pdf` : 'Certified_Order.pdf'),
  attachmentSize: d.attachmentSize || '',
  notes: d.notes || d.headNotes || '',
  orderPriority: d.orderPriority || '',
  createdAt: d.createdAt,
  updatedAt: d.updatedAt
});

export const getOtherCaseLaws = async (req, res, next) => {
  try {
    const { query, judge, page, limit, sortField = 'otherCaseId', sortOrder = 'asc' } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (judge) {
      filter.$or = [
        { bench: new RegExp(judge.trim(), 'i') },
        { authorJudge: new RegExp(judge.trim(), 'i') }
      ];
    }

    if (query) {
      const q = query.trim();
      const searchRegex = new RegExp(q, 'i');
      const numQ = Number(q);
      const orConditions = [
        { caseNo: searchRegex },
        { parties: searchRegex },
        { caseTitle: searchRegex },
        { bench: searchRegex },
        { authorJudge: searchRegex },
        { citation: searchRegex },
        { headNotes: searchRegex },
        { otherCaseId: searchRegex },
        { orderDate: searchRegex }
      ];
      if (!isNaN(numQ)) {
        orConditions.push({ srNumber: numQ }, { caseYear: numQ });
      }
      filter.$or = orConditions;
    }

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(1000, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (safePage - 1) * safeLimit;

    const sortDir = sortOrder === 'desc' ? -1 : 1;
    const sortObj = {};
    sortObj[sortField] = sortDir;

    const total = await OtherCaseLaw.countDocuments(filter);
    const totalPages = Math.ceil(total / safeLimit) || 1;

    const items = await OtherCaseLaw.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(safeLimit)
      .lean();

    const data = items.map(formatItem);

    return res.status(200).json({
      success: true,
      message: 'Other case laws retrieved successfully.',
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

export const getNextOtherCaseSr = async (req, res, next) => {
  try {
    const lastDoc = await OtherCaseLaw.findOne({ isDeleted: { $ne: true }, srNumber: { $ne: null } })
      .sort({ srNumber: -1 })
      .select('srNumber')
      .lean();
    const latestSr = lastDoc?.srNumber || 0;
    const nextSr = latestSr + 1;
    return res.status(200).json({ success: true, latestSr, nextSr });
  } catch (error) {
    next(error);
  }
};

export const getOtherCaseLawById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [{ otherCaseId: id }, { other_case_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await OtherCaseLaw.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Record '${id}' not found.` });
    }
    return res.status(200).json({ success: true, data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const createOtherCaseLaw = async (req, res, next) => {
  try {
    const {
      srNumber,
      citation,
      scCitation,
      caseNo,
      caseYear,
      parties,
      caseTitle,
      orderDate,
      judgmentDate,
      headNotes,
      notes,
      bench,
      authorJudge,
      apexCourt,
      apexStatus,
      downloadLink,
      orderPriority,
      attachment,
      attachmentName,
      attachmentSize
    } = req.body;

    const resolvedCaseNo = (caseNo || '').trim();
    const resolvedTitle = (parties || caseTitle || '').trim();
    const resolvedDate = (orderDate || judgmentDate || '').trim();

    if (!resolvedCaseNo) {
      return res.status(400).json({ success: false, message: 'Case No is required.' });
    }
    if (!resolvedTitle) {
      return res.status(400).json({ success: false, message: 'Parties / Case Title is required.' });
    }

    const item = new OtherCaseLaw({
      ...(srNumber && !isNaN(Number(srNumber)) ? { srNumber: Number(srNumber) } : {}),
      citation: citation?.trim() || '',
      scCitation: scCitation?.trim() || '',
      caseNo: resolvedCaseNo,
      caseYear: caseYear && !isNaN(Number(caseYear)) ? Number(caseYear) : (resolvedDate ? new Date(resolvedDate).getFullYear() || undefined : undefined),
      parties: resolvedTitle,
      caseTitle: resolvedTitle,
      orderDate: resolvedDate,
      judgmentDate: resolvedDate,
      headNotes: headNotes?.trim() || notes?.trim() || '',
      notes: notes?.trim() || headNotes?.trim() || '',
      bench: bench?.trim() || authorJudge?.trim() || '',
      authorJudge: authorJudge?.trim() || bench?.trim() || '',
      apexCourt: apexCourt?.trim() || '',
      apexStatus: apexStatus?.trim() || '',
      downloadLink: downloadLink?.trim() || '',
      orderPriority: orderPriority?.toString().trim() || '',
      attachment: attachment || '',
      attachmentName: attachmentName || '',
      attachmentSize: attachmentSize || ''
    });

    await item.save();
    return res.status(201).json({ success: true, message: 'Other Case Law record added.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const updateOtherCaseLaw = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      srNumber,
      citation,
      scCitation,
      caseNo,
      caseYear,
      parties,
      caseTitle,
      orderDate,
      judgmentDate,
      headNotes,
      notes,
      bench,
      authorJudge,
      apexCourt,
      apexStatus,
      downloadLink,
      orderPriority,
      attachment,
      attachmentName,
      attachmentSize
    } = req.body;

    const query = {
      $or: [{ otherCaseId: id }, { other_case_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await OtherCaseLaw.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Record '${id}' not found.` });
    }

    if (srNumber !== undefined && !isNaN(Number(srNumber))) item.srNumber = Number(srNumber);
    if (citation !== undefined) item.citation = citation.trim();
    if (scCitation !== undefined) item.scCitation = scCitation.trim();
    if (caseNo !== undefined) item.caseNo = caseNo.trim();
    if (caseYear !== undefined && !isNaN(Number(caseYear))) item.caseYear = Number(caseYear);
    if (parties !== undefined || caseTitle !== undefined) {
      const p = (parties !== undefined ? parties : caseTitle).trim();
      item.parties = p;
      item.caseTitle = p;
    }
    if (orderDate !== undefined || judgmentDate !== undefined) {
      const d = (orderDate !== undefined ? orderDate : judgmentDate).trim();
      item.orderDate = d;
      item.judgmentDate = d;
    }
    if (headNotes !== undefined || notes !== undefined) {
      const hn = (headNotes !== undefined ? headNotes : notes).trim();
      item.headNotes = hn;
      item.notes = hn;
    }
    if (bench !== undefined || authorJudge !== undefined) {
      const b = (bench !== undefined ? bench : authorJudge).trim();
      item.bench = b;
      item.authorJudge = b;
    }
    if (apexCourt !== undefined) item.apexCourt = apexCourt.trim();
    if (apexStatus !== undefined) item.apexStatus = apexStatus.trim();
    if (downloadLink !== undefined) item.downloadLink = downloadLink.trim();
    if (orderPriority !== undefined) item.orderPriority = orderPriority.toString().trim();
    if (attachment !== undefined) item.attachment = attachment;
    if (attachmentName !== undefined) item.attachmentName = attachmentName;
    if (attachmentSize !== undefined) item.attachmentSize = attachmentSize;

    await item.save();
    return res.status(200).json({ success: true, message: 'Record updated successfully.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const deleteOtherCaseLaw = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [{ otherCaseId: id }, { other_case_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await OtherCaseLaw.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Record '${id}' not found.` });
    }

    item.isDeleted = true;
    item.deletedAt = new Date();
    await item.save();
    return res.status(200).json({ success: true, message: 'Record deleted.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Streams the original judgment document inline so the browser displays it in the tab WITHOUT downloading
 */
export const viewOtherCaseDocument = async (req, res, next) => {
  try {
    const { id, url } = req.query;
    let targetUrl = url ? decodeURIComponent(url) : null;
    let caseTitle = 'Case_Document';

    if (id) {
      let doc = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        doc = await OtherCaseLaw.findById(id).lean();
      }
      if (!doc) {
        doc = await OtherCaseLaw.findOne({
          $or: [{ srNumber: Number(id) || -1 }, { otherCaseId: String(id) }, { other_case_id: String(id) }]
        }).lean();
      }
      if (doc) {
        targetUrl = doc.caseNoLink || doc.downloadLink || doc.attachment;
        if (doc.caseNo) caseTitle = doc.caseNo.replace(/[^a-zA-Z0-9_\-]/g, '_');
      }
    }

    if (!targetUrl || targetUrl === 'Nil') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Document Not Found</title></head>
          <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f9fafb; color: #374151;">
            <div style="text-align: center; max-width: 480px; padding: 32px; background: white; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
              <h2 style="color: #e55c41; margin-top: 0; font-size: 20px;">No Document Available</h2>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">No external certified judgment URL is recorded for this case in the database archives.</p>
              <button onclick="window.close()" style="background: #e55c41; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; margin-top: 12px;">Close Tab</button>
            </div>
          </body>
        </html>
      `);
    }

    // Fetch the remote PDF from the High Court / portal server
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(502).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Court Server Busy</title></head>
          <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f9fafb; color: #374151;">
            <div style="text-align: center; max-width: 480px; padding: 32px; background: white; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
              <h2 style="color: #e55c41; margin-top: 0; font-size: 20px;">Court Server Temporarily Busy</h2>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">The High Court caselaw server returned status ${response.status}. Spikes are temporary—please try again.</p>
              <div style="display: flex; gap: 8px; justify-content: center; margin-top: 16px;">
                <button onclick="location.reload()" style="background: #e55c41; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px;">Retry Document</button>
                <button onclick="window.close()" style="background: #e5e7eb; color: #374151; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px;">Close Tab</button>
              </div>
            </div>
          </body>
        </html>
      `);
    }

    const contentType = response.headers.get('content-type') || 'application/pdf';
    const buffer = Buffer.from(await response.arrayBuffer());

    // CRITICAL: Content-Disposition must be "inline" so browser opens and views in tab WITHOUT downloading!
    res.setHeader('Content-Type', contentType.includes('pdf') ? 'application/pdf' : contentType);
    res.setHeader('Content-Disposition', `inline; filename="${caseTitle}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.end(buffer);
  } catch (err) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Document Load Notice</title></head>
        <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f9fafb; color: #374151;">
          <div style="text-align: center; max-width: 480px; padding: 32px; background: white; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
            <h2 style="color: #e55c41; margin-top: 0; font-size: 20px;">Document Load Notice</h2>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">${err.message || 'Unable to stream remote case document.'}</p>
            <button onclick="window.close()" style="background: #6b7280; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; margin-top: 12px;">Close Tab</button>
          </div>
        </body>
      </html>
    `);
  }
};
