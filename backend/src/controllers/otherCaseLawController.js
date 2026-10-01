import OtherCaseLaw from '../models/OtherCaseLaw.js';
import mongoose from 'mongoose';

const formatItem = (d) => ({
  id: d.srNumber ? d.srNumber.toString() : (d.otherCaseId || d._id.toString()),
  mongoId: d._id.toString(),
  otherCaseId: d.otherCaseId || d.other_case_id || '',
  srNumber: d.srNumber || 1,
  citation: d.citation || '',
  scCitation: d.scCitation || '',
  caseNo: d.caseNo || '',
  caseTitle: d.caseTitle || '',
  judgmentDate: d.judgmentDate || '',
  orderPriority: d.orderPriority || '',
  authorJudge: d.authorJudge || '',
  attachment: d.attachment || '',
  attachmentName: d.attachmentName || '',
  attachmentSize: d.attachmentSize || '',
  notes: d.notes || '',
  createdAt: d.createdAt,
  updatedAt: d.updatedAt
});

export const getOtherCaseLaws = async (req, res, next) => {
  try {
    const { query, judge } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (judge) {
      filter.authorJudge = new RegExp(judge.trim(), 'i');
    }

    if (query) {
      const q = query.trim();
      const searchRegex = new RegExp(q, 'i');
      const numQ = Number(q);
      const orConditions = [
        { caseNo: searchRegex },
        { caseTitle: searchRegex },
        { scCitation: searchRegex },
        { citation: searchRegex },
        { authorJudge: searchRegex },
        { otherCaseId: searchRegex },
        { judgmentDate: searchRegex }
      ];
      if (!isNaN(numQ)) {
        orConditions.push({ srNumber: numQ });
      }
      filter.$or = orConditions;
    }

    const items = await OtherCaseLaw.find(filter).sort({ srNumber: -1, createdAt: -1 });
    const data = items.map(formatItem);

    return res.status(200).json({
      success: true,
      message: 'Other case laws retrieved successfully.',
      count: data.length,
      data
    });
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
      citation,
      scCitation,
      caseNo,
      caseTitle,
      judgmentDate,
      orderPriority,
      authorJudge,
      attachment,
      attachmentName,
      attachmentSize,
      notes
    } = req.body;

    if (!caseNo?.trim()) {
      return res.status(400).json({ success: false, message: 'Case No is required.' });
    }
    if (!caseTitle?.trim()) {
      return res.status(400).json({ success: false, message: 'Case Title is required.' });
    }
    if (!judgmentDate?.trim()) {
      return res.status(400).json({ success: false, message: 'Judgment Date is required.' });
    }

    const item = new OtherCaseLaw({
      citation: citation?.trim() || '',
      scCitation: scCitation?.trim() || '',
      caseNo: caseNo.trim(),
      caseTitle: caseTitle.trim(),
      judgmentDate: judgmentDate.trim(),
      orderPriority: orderPriority?.toString().trim() || '',
      authorJudge: authorJudge?.trim() || '',
      attachment: attachment || '',
      attachmentName: attachmentName || '',
      attachmentSize: attachmentSize || '',
      notes: notes || ''
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
      citation,
      scCitation,
      caseNo,
      caseTitle,
      judgmentDate,
      orderPriority,
      authorJudge,
      attachment,
      attachmentName,
      attachmentSize,
      notes
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

    if (citation !== undefined) item.citation = citation.trim();
    if (scCitation !== undefined) item.scCitation = scCitation.trim();
    if (caseNo !== undefined) item.caseNo = caseNo.trim();
    if (caseTitle !== undefined) item.caseTitle = caseTitle.trim();
    if (judgmentDate !== undefined) item.judgmentDate = judgmentDate.trim();
    if (orderPriority !== undefined) item.orderPriority = orderPriority.toString().trim();
    if (authorJudge !== undefined) item.authorJudge = authorJudge.trim();
    if (attachment !== undefined) item.attachment = attachment;
    if (attachmentName !== undefined) item.attachmentName = attachmentName;
    if (attachmentSize !== undefined) item.attachmentSize = attachmentSize;
    if (notes !== undefined) item.notes = notes;

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
