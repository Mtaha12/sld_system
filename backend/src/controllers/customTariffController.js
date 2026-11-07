import CustomTariff from '../models/CustomTariff.js';
import mongoose from 'mongoose';
import { adjustSrOnDelete } from '../utils/resequenceSr.js';

const escapeRegex = (string) => {
  if (string == null) return '';
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const formatItem = (d) => ({
  id: d.srNumber ? d.srNumber.toString() : (d.customTariffId || d._id.toString()),
  mongoId: d._id.toString(),
  customTariffId: d.customTariffId || d.custom_tariff_id || '',
  srNumber: d.srNumber || 1,
  sldNumber: d.sldNumber || '',
  dated: d.dated || '',
  fromYear: d.fromYear || '',
  toYear: d.toYear || '',
  status: d.status || 'Active',
  heading: d.heading || '',
  attachment: d.attachment || '',
  attachmentName: d.attachmentName || '',
  detail: d.detail || '',
  items: d.items || [],
  createdAt: d.createdAt,
  updatedAt: d.updatedAt
});

export const getCustomTariffs = async (req, res, next) => {
  try {
    const { query } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (query) {
      const q = query.trim();
      const searchRegex = new RegExp(escapeRegex(q), 'i');
      const numQ = Number(q);
      const orConditions = [
        { heading: searchRegex },
        { sldNumber: searchRegex },
        { customTariffId: searchRegex },
        { dated: searchRegex },
        { fromYear: searchRegex },
        { toYear: searchRegex },
        { detail: searchRegex },
        { 'items.pctCode': searchRegex },
        { 'items.description': searchRegex }
      ];
      if (!isNaN(numQ)) {
        orConditions.push({ srNumber: numQ });
      }
      filter.$or = orConditions;
    }

    const items = await CustomTariff.find(filter).sort({ srNumber: -1, createdAt: -1 }).lean();
    const data = items.map(formatItem);

    return res.status(200).json({
      success: true,
      message: 'Custom tariffs retrieved successfully.',
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomTariffById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [{ customTariffId: id }, { custom_tariff_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await CustomTariff.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Custom Tariff '${id}' not found.` });
    }
    return res.status(200).json({ success: true, data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const getNextCustomTariffSld = async (req, res, next) => {
  try {
    const latest = await CustomTariff.findOne({ isDeleted: { $ne: true } })
      .sort({ srNumber: -1, createdAt: -1 })
      .select('sldNumber srNumber');

    let nextSld = '10001';
    let nextSr = 1;
    if (latest) {
      nextSr = (Number(latest.srNumber) || 0) + 1;
      const rawSld = String(latest.sldNumber || '').trim();
      const numMatch = rawSld.match(/\d+/);
      if (numMatch) {
        const num = parseInt(numMatch[0], 10) + 1;
        const prefix = rawSld.replace(/\d+.*$/, '');
        nextSld = prefix ? `${prefix}${num}` : String(num);
      } else if (latest.srNumber) {
        nextSld = String((Number(latest.srNumber) || 0) + 1);
      }
    }
    return res.status(200).json({ success: true, nextSld, nextSr });
  } catch (error) {
    next(error);
  }
};

export const createCustomTariff = async (req, res, next) => {
  try {
    const { sldNumber, dated, fromYear, toYear, status, heading, attachment, attachmentName, detail, items } = req.body;

    let finalSld = (sldNumber || '').trim();
    if (!finalSld) {
      const latest = await CustomTariff.findOne({ isDeleted: { $ne: true } }).sort({ srNumber: -1, createdAt: -1 });
      if (latest && latest.sldNumber) {
        const numMatch = String(latest.sldNumber).match(/\d+/);
        if (numMatch) {
          const num = parseInt(numMatch[0], 10) + 1;
          const prefix = String(latest.sldNumber).replace(/\d+.*$/, '');
          finalSld = prefix ? `${prefix}${num}` : String(num);
        } else {
          finalSld = String((latest.srNumber || 0) + 1);
        }
      } else {
        finalSld = '10001';
      }
    }

    if (!dated?.trim()) {
      return res.status(400).json({ success: false, message: 'Dated is required.' });
    }
    if (!fromYear?.toString().trim()) {
      return res.status(400).json({ success: false, message: 'From Year is required.' });
    }
    if (!heading?.trim()) {
      return res.status(400).json({ success: false, message: 'Heading is required.' });
    }

    const customTariff = new CustomTariff({
      sldNumber: finalSld,
      dated: dated.trim(),
      fromYear: fromYear.toString().trim(),
      toYear: toYear ? toYear.toString().trim() : '',
      status: status === 'Inactive' ? 'Inactive' : 'Active',
      heading: heading.trim(),
      attachment: attachment || '',
      attachmentName: attachmentName || '',
      detail: detail || '',
      items: Array.isArray(items) ? items : []
    });

    await customTariff.save();
    return res.status(201).json({ success: true, message: 'Custom Tariff record created.', data: formatItem(customTariff) });
  } catch (error) {
    next(error);
  }
};

export const updateCustomTariff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sldNumber, dated, fromYear, toYear, status, heading, attachment, attachmentName, detail, items } = req.body;

    const query = {
      $or: [{ customTariffId: id }, { custom_tariff_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await CustomTariff.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Custom Tariff '${id}' not found.` });
    }

    if (sldNumber !== undefined) item.sldNumber = sldNumber.trim();
    if (dated !== undefined) item.dated = dated.trim();
    if (fromYear !== undefined) item.fromYear = fromYear.toString().trim();
    if (toYear !== undefined) item.toYear = toYear.toString().trim();
    if (status !== undefined) item.status = status === 'Inactive' ? 'Inactive' : 'Active';
    if (heading !== undefined) item.heading = heading.trim();
    if (attachment !== undefined) item.attachment = attachment;
    if (attachmentName !== undefined) item.attachmentName = attachmentName;
    if (detail !== undefined) item.detail = detail;
    if (items !== undefined && Array.isArray(items)) item.items = items;

    await item.save();
    return res.status(200).json({ success: true, message: 'Custom Tariff record updated.', data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomTariff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [{ customTariffId: id }, { custom_tariff_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await CustomTariff.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Custom Tariff '${id}' not found.` });
    }

    item.isDeleted = true;
    item.deletedAt = new Date();
    await item.save();

    await adjustSrOnDelete(CustomTariff, item, { srField: 'srNumber', counterName: 'custom_tariff' });

    return res.status(200).json({ success: true, message: 'Custom Tariff record deleted and SR# auto-adjusted.' });
  } catch (error) {
    next(error);
  }
};
