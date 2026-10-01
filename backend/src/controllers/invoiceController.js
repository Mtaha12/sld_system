import Invoice from '../models/Invoice.js';
import mongoose from 'mongoose';

const formatItem = (d) => ({
  id: d.srNumber ? d.srNumber.toString() : (d.invoiceId || d._id.toString()),
  mongoId: d._id.toString(),
  invoiceId: d.invoiceId || d.invoice_id || '',
  srNumber: d.srNumber || 1,
  date: d.date || '',
  userId: d.userId ? d.userId.toString() : null,
  name: d.name || '',
  address: d.address || '',
  items: d.items || [],
  totalBillAmount: Number(d.totalBillAmount || 0),
  deductionPercent: Number(d.deductionPercent || 0),
  deductionAmount: Number(d.deductionAmount || 0),
  totalReceivable: Number(d.totalReceivable || 0),
  createdAt: d.createdAt,
  updatedAt: d.updatedAt
});

export const getInvoices = async (req, res, next) => {
  try {
    const { query } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (query) {
      const q = query.trim();
      const searchRegex = new RegExp(q, 'i');
      const numQ = Number(q);
      const orConditions = [
        { name: searchRegex },
        { invoiceId: searchRegex },
        { address: searchRegex },
        { date: searchRegex },
        { 'items.details': searchRegex }
      ];
      if (!isNaN(numQ)) {
        orConditions.push({ srNumber: numQ });
        orConditions.push({ totalBillAmount: numQ });
        orConditions.push({ totalReceivable: numQ });
      }
      filter.$or = orConditions;
    }

    const items = await Invoice.find(filter).sort({ srNumber: -1, createdAt: -1 });
    const data = items.map(formatItem);

    return res.status(200).json({
      success: true,
      message: 'Invoices retrieved successfully.',
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [{ invoiceId: id }, { invoice_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const item = await Invoice.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: `Invoice '${id}' not found.` });
    }
    return res.status(200).json({ success: true, data: formatItem(item) });
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req, res, next) => {
  try {
    const { date, userId, name, address, items, deductionPercent } = req.body;

    if (!date?.trim()) {
      return res.status(400).json({ success: false, message: 'Date is required.' });
    }

    const validUserId = mongoose.Types.ObjectId.isValid(userId) ? userId : null;

    const invoice = new Invoice({
      date: date.trim(),
      userId: validUserId,
      name: name?.trim() || '',
      address: address?.trim() || '',
      items: Array.isArray(items) ? items : [],
      deductionPercent: Number(deductionPercent) || 0,
    });

    await invoice.save();
    return res.status(201).json({ success: true, message: 'Invoice record created.', data: formatItem(invoice) });
  } catch (error) {
    next(error);
  }
};

export const updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, userId, name, address, items, deductionPercent } = req.body;

    const query = {
      $or: [{ invoiceId: id }, { invoice_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const invoice = await Invoice.findOne(query);
    if (!invoice) {
      return res.status(404).json({ success: false, message: `Invoice '${id}' not found.` });
    }

    if (date !== undefined) invoice.date = date.trim();
    if (userId !== undefined) {
      invoice.userId = mongoose.Types.ObjectId.isValid(userId) ? userId : null;
    }
    if (name !== undefined) invoice.name = name.trim();
    if (address !== undefined) invoice.address = address.trim();
    if (items !== undefined && Array.isArray(items)) invoice.items = items;
    if (deductionPercent !== undefined) invoice.deductionPercent = Number(deductionPercent) || 0;

    await invoice.save();
    return res.status(200).json({ success: true, message: 'Invoice record updated.', data: formatItem(invoice) });
  } catch (error) {
    next(error);
  }
};

export const deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {
      $or: [{ invoiceId: id }, { invoice_id: id }],
      isDeleted: { $ne: true }
    };
    if (!isNaN(Number(id))) query.$or.push({ srNumber: Number(id) });
    if (mongoose.Types.ObjectId.isValid(id)) query.$or.push({ _id: id });

    const invoice = await Invoice.findOne(query);
    if (!invoice) {
      return res.status(404).json({ success: false, message: `Invoice '${id}' not found.` });
    }

    invoice.isDeleted = true;
    invoice.deletedAt = new Date();
    await invoice.save();
    return res.status(200).json({ success: true, message: 'Invoice record deleted.' });
  } catch (error) {
    next(error);
  }
};
