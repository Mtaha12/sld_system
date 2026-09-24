import CourtSetting from '../models/CourtSetting.js';
import logger from '../utils/logger.js';

const INITIAL_COURTS = [
  { name: 'Supreme Court of Pakistan', underCourt: 'Supreme Court', ordering: 1, status: 'active' },
  { name: 'Lahore High Court', underCourt: 'High Court', ordering: 2, status: 'active' },
  { name: 'Sindh High Court', underCourt: 'High Court', ordering: 3, status: 'active' },
  { name: 'Islamabad High Court', underCourt: 'High Court', ordering: 4, status: 'active' },
  { name: 'Peshawar High Court', underCourt: 'High Court', ordering: 5, status: 'active' },
  { name: 'High Court of Balochistan', underCourt: 'High Court', ordering: 6, status: 'active' },
  { name: 'Appellate Tribunal Inland Revenue (ATIR)', underCourt: 'Tribunal', ordering: 7, status: 'active' },
  { name: 'Customs Appellate Tribunal', underCourt: 'Tribunal', ordering: 8, status: 'active' },
  { name: 'Appellate Tribunal Punjab Revenue Authority', underCourt: 'Tribunal', ordering: 9, status: 'active' },
];

export const getCourts = async (req, res, next) => {
  try {
    const { search, underCourt, status } = req.query;

    const count = await CourtSetting.countDocuments();
    if (count === 0) {
      await CourtSetting.insertMany(INITIAL_COURTS);
    }

    const query = {};
    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }
    if (underCourt && underCourt !== 'all' && underCourt !== 'Select') {
      query.underCourt = { $regex: `^${underCourt.trim()}$`, $options: 'i' };
    }
    if (status && status !== 'all') {
      query.status = { $regex: `^${status.trim()}$`, $options: 'i' };
    }

    const courts = await CourtSetting.find(query).sort({ ordering: 1, name: 1 });
    return res.status(200).json({
      success: true,
      total: courts.length,
      data: courts
    });
  } catch (error) {
    next(error);
  }
};

export const createCourt = async (req, res, next) => {
  try {
    const { name, underCourt, ordering, status } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Court Name is required.' });
    }
    if (!underCourt || underCourt === 'Select') {
      return res.status(400).json({ success: false, message: 'Under Court classification is required.' });
    }

    const existing = await CourtSetting.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Court already exists.' });
    }

    const court = await CourtSetting.create({
      name: name.trim(),
      underCourt: underCourt.trim(),
      ordering: Number(ordering) || 1,
      status: (status || 'Active').toLowerCase() === 'inactive' ? 'inactive' : 'active',
    });

    return res.status(201).json({
      success: true,
      message: 'Court added successfully',
      data: court
    });
  } catch (error) {
    next(error);
  }
};

export const updateCourt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, underCourt, ordering, status } = req.body;

    const court = await CourtSetting.findById(id);
    if (!court) {
      return res.status(404).json({ success: false, message: 'Court not found' });
    }

    if (name && name.trim()) {
      const existing = await CourtSetting.findOne({
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
        _id: { $ne: id }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Court name already taken.' });
      }
      court.name = name.trim();
    }

    if (underCourt && underCourt !== 'Select') {
      court.underCourt = underCourt.trim();
    }
    if (ordering !== undefined) {
      court.ordering = Number(ordering) || 1;
    }
    if (status !== undefined) {
      court.status = String(status).toLowerCase() === 'inactive' ? 'inactive' : 'active';
    }

    await court.save();
    return res.status(200).json({
      success: true,
      message: 'Court updated successfully',
      data: court
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCourt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const court = await CourtSetting.findByIdAndDelete(id);
    if (!court) {
      return res.status(404).json({ success: false, message: 'Court not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Court deleted successfully',
      data: { id }
    });
  } catch (error) {
    next(error);
  }
};
