import OtherCaseLaw from '../models/OtherCaseLaw.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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
    const filter = { isDeleted: false };

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
    const lastDoc = await OtherCaseLaw.findOne({ isDeleted: false, srNumber: { $ne: null } })
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
  let targetUrl = null;
  let caseTitle = 'Case_Document';
  try {
    const { id, url } = req.query;
    targetUrl = url ? decodeURIComponent(url) : null;

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
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Document Not Found</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; box-sizing: border-box; }
              .card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
              .btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 20px; font-size: 13px; font-weight: 600; border-radius: 8px; border: none; cursor: pointer; text-decoration: none; margin: 6px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div style="font-size: 40px; margin-bottom: 12px;">📁</div>
              <h2 style="color: #e55c41; margin: 0 0 8px 0; font-size: 19px;">No Document Link Available</h2>
              <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 20px 0;">No external certified judgment URL is recorded for this case in the database archives.</p>
              <button onclick="window.close()" class="btn" style="background: #e2e8f0; color: #334155;">Close Tab</button>
            </div>
          </body>
        </html>
      `);
    }

    // Check disk cache first for instant response without court latency
    const cacheDir = path.join(process.cwd(), 'uploads', 'court_cache');
    if (!fs.existsSync(cacheDir)) {
      try { fs.mkdirSync(cacheDir, { recursive: true }); } catch (e) {}
    }
    const urlHash = crypto.createHash('md5').update(targetUrl).digest('hex');
    const cacheFilePath = path.join(cacheDir, `${urlHash}.pdf`);

    if (fs.existsSync(cacheFilePath)) {
      try {
        const stats = fs.statSync(cacheFilePath);
        if (stats.size > 1000) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${caseTitle}.pdf"`);
          res.setHeader('Content-Length', stats.size);
          res.setHeader('Cache-Control', 'public, max-age=604800');
          const stream = fs.createReadStream(cacheFilePath);
          return stream.pipe(res);
        }
      } catch (err) {
        console.warn('[viewOtherCaseDocument] Cache read failed, fetching fresh:', err.message);
      }
    }

    // Derive court Referer from targetUrl so Cloudflare/Origin server allows the download
    let referer = 'https://caselaw.shc.gov.pk/caselaw/';
    try {
      const urlObj = new URL(targetUrl);
      const pathDir = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
      referer = `${urlObj.origin}${pathDir || '/'}`;
    } catch (e) {}

    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': referer,
      'Accept': 'application/pdf,application/octet-stream,text/html,*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin'
    };

    // Fetch remote PDF from the High Court server with retry and generous timeout
    let response = null;
    let lastError = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        response = await fetch(targetUrl, {
          headers: fetchHeaders,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) break;
      } catch (err) {
        lastError = err;
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    }

    if (!response || !response.ok) {
      if (lastError && !response) throw lastError;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(502).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Court Server Busy</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; box-sizing: border-box; }
              .card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; max-width: 500px; width: 100%; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
              .btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 18px; font-size: 13px; font-weight: 600; border-radius: 8px; border: none; cursor: pointer; text-decoration: none; margin: 6px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div style="font-size: 40px; margin-bottom: 12px;">⚖️</div>
              <h2 style="color: #e55c41; margin: 0 0 8px 0; font-size: 19px;">High Court Server Temporarily Busy</h2>
              <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 20px 0;">The High Court caselaw server responded with status <strong>${response?.status || '502'}</strong>. High traffic spikes on the court portal are temporary.</p>
              <div>
                <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="btn" style="background: #e55c41; color: white;">Download Directly from Court</a>
                <button onclick="location.reload()" class="btn" style="background: #0ea5e9; color: white;">Retry Document</button>
                <button onclick="window.close()" class="btn" style="background: #e2e8f0; color: #334155;">Close Tab</button>
              </div>
            </div>
          </body>
        </html>
      `);
    }

    const contentType = response.headers.get('content-type') || 'application/pdf';
    const buffer = Buffer.from(await response.arrayBuffer());

    // Save to disk cache if valid PDF
    if (buffer.length > 500) {
      try {
        fs.writeFile(cacheFilePath, buffer, (err) => {
          if (err) console.warn('[viewOtherCaseDocument] Cache write failed:', err.message);
        });
      } catch (err) {}
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', contentType.includes('pdf') ? 'application/pdf' : contentType);
    res.setHeader('Content-Disposition', `inline; filename="${caseTitle}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=604800');
    return res.end(buffer);
  } catch (err) {
    const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout') || err.message?.includes('aborted');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(504).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Court Document Notice</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; box-sizing: border-box; }
            .card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; max-width: 500px; width: 100%; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
            .btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 18px; font-size: 13px; font-weight: 600; border-radius: 8px; border: none; cursor: pointer; text-decoration: none; margin: 6px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div style="font-size: 40px; margin-bottom: 12px;">⌛</div>
            <h2 style="color: #e55c41; margin: 0 0 8px 0; font-size: 19px;">Court Server Response Delay</h2>
            <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 20px 0;">
              ${isTimeout
                ? 'The official High Court caselaw server is taking longer than usual to generate and transmit this certified judgment order.'
                : (err.message || 'Unable to stream remote case document.')}
            </p>
            <div>
              ${targetUrl ? `<a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="btn" style="background: #e55c41; color: white;">Open Direct Court Source</a>` : ''}
              <button onclick="location.reload()" class="btn" style="background: #0ea5e9; color: white;">Retry Loading</button>
              <button onclick="window.close()" class="btn" style="background: #e2e8f0; color: #334155;">Close Tab</button>
            </div>
          </div>
        </body>
      </html>
    `);
  }
};
