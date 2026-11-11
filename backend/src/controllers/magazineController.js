import Magazine from '../models/Magazine.js';
import logger from '../utils/logger.js';
import { PRIORITY_MAGAZINES, sortMagazineDocsWithPriority } from '../utils/priorityOrdering.js';

const EXTRA_DEFAULT_MAGAZINES = ['CTR', 'YLR', 'MLD', 'SLJ', 'PSC'];
const INITIAL_MAGAZINES = [
  ...PRIORITY_MAGAZINES,
  ...EXTRA_DEFAULT_MAGAZINES
].map((name, idx) => ({ name, ordering: idx + 1, status: 'active' }));

export const getMagazines = async (req, res, next) => {
  try {
    const { search, status } = req.query;

    const count = await Magazine.countDocuments();
    if (count === 0) {
      await Magazine.insertMany(INITIAL_MAGAZINES);
    }

    const query = {};
    if (search && search.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.name = { $regex: safeSearch, $options: 'i' };
    }
    if (status && status !== 'all') {
      const safeStatus = status.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.status = { $regex: `^${safeStatus}$`, $options: 'i' };
    }

    const rawMagazines = await Magazine.find(query).sort({ ordering: 1, name: 1 }).lean();
    const magazines = sortMagazineDocsWithPriority(rawMagazines);
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
