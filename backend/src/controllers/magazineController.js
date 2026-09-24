import Magazine from '../models/Magazine.js';
import logger from '../utils/logger.js';

const INITIAL_MAGAZINES = [
  { name: 'SLD', ordering: 1, status: 'active' },
  { name: 'PTD', ordering: 2, status: 'active' },
  { name: 'TAX', ordering: 3, status: 'active' },
  { name: 'CTR', ordering: 4, status: 'active' },
  { name: 'PTCL', ordering: 5, status: 'active' },
  { name: 'SCMR', ordering: 6, status: 'active' },
  { name: 'CLD', ordering: 7, status: 'active' },
  { name: 'PLD', ordering: 8, status: 'active' },
  { name: 'PLC', ordering: 9, status: 'active' },
  { name: 'PCRLJ', ordering: 10, status: 'active' },
  { name: 'MLD', ordering: 11, status: 'active' },
  { name: 'CLC', ordering: 12, status: 'active' },
  { name: 'PLJ', ordering: 13, status: 'active' },
  { name: 'ITR', ordering: 14, status: 'active' },
  { name: 'AIR', ordering: 15, status: 'active' },
  { name: 'SCC', ordering: 16, status: 'active' },
  { name: 'YLR', ordering: 17, status: 'active' },
  { name: 'NLR', ordering: 18, status: 'active' },
  { name: 'KLR', ordering: 19, status: 'active' },
  { name: 'TAXMAN', ordering: 20, status: 'active' },
  { name: 'SBLR', ordering: 21, status: 'active' },
  { name: 'PTR', ordering: 22, status: 'active' },
];

export const getMagazines = async (req, res, next) => {
  try {
    const { search, status } = req.query;

    const count = await Magazine.countDocuments();
    if (count === 0) {
      await Magazine.insertMany(INITIAL_MAGAZINES);
    }

    const query = {};
    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }
    if (status && status !== 'all') {
      query.status = { $regex: `^${status.trim()}$`, $options: 'i' };
    }

    const magazines = await Magazine.find(query).sort({ ordering: 1, name: 1 });
    return res.status(200).json({
      success: true,
      total: magazines.length,
      data: magazines
    });
  } catch (error) {
    next(error);
  }
};

export const createMagazine = async (req, res, next) => {
  try {
    const { name, ordering, status } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Magazine Name is required' });
    }

    const existing = await Magazine.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Magazine already exists.' });
    }

    const magazine = await Magazine.create({
      name: name.trim(),
      ordering: Number(ordering) || 1,
      status: (status || 'Active').toLowerCase() === 'inactive' ? 'inactive' : 'active',
    });

    return res.status(201).json({
      success: true,
      message: 'Magazine added successfully',
      data: magazine
    });
  } catch (error) {
    next(error);
  }
};

export const updateMagazine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, ordering, status } = req.body;

    const magazine = await Magazine.findById(id);
    if (!magazine) {
      return res.status(404).json({ success: false, message: 'Magazine not found' });
    }

    if (name && name.trim()) {
      const existing = await Magazine.findOne({
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
        _id: { $ne: id }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Magazine name already taken.' });
      }
      magazine.name = name.trim();
    }

    if (ordering !== undefined) {
      magazine.ordering = Number(ordering) || 1;
    }
    if (status !== undefined) {
      magazine.status = String(status).toLowerCase() === 'inactive' ? 'inactive' : 'active';
    }

    await magazine.save();
    return res.status(200).json({
      success: true,
      message: 'Magazine updated successfully',
      data: magazine
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMagazine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const magazine = await Magazine.findByIdAndDelete(id);
    if (!magazine) {
      return res.status(404).json({ success: false, message: 'Magazine not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Magazine deleted successfully',
      data: { id }
    });
  } catch (error) {
    next(error);
  }
};
