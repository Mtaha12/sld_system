import News from '../models/News.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

/**
 * Format news for frontend representation
 */
const formatNewsForFrontend = (n) => ({
  id: n.srNumber ? n.srNumber.toString() : (n.newsId || n._id.toString()),
  mongoId: n._id.toString(),
  newsId: n.newsId || n.news_id || '',
  news_id: n.news_id || n.newsId || '',
  srNumber: n.srNumber || 1,
  heading: n.heading || '',
  date: n.date || '',
  year: n.year || (n.date ? parseInt(n.date.slice(0, 4), 10) : new Date().getFullYear()),
  detail: n.detail || '',
  createdAt: n.createdAt,
  updatedAt: n.updatedAt
});

/**
 * Get all news records with optional search query
 */
export const getNews = async (req, res, next) => {
  try {
    const { query, page, limit, all } = req.query;
    const filter = { isDeleted: { $ne: true } };

    if (query) {
      const q = query.trim();
      const searchRegex = new RegExp(q, 'i');
      const numQ = Number(q);
      const orConditions = [
        { heading: searchRegex },
        { detail: searchRegex },
        { newsId: searchRegex },
        { date: searchRegex },
      ];
      if (!isNaN(numQ)) {
        orConditions.push({ year: numQ });
        orConditions.push({ srNumber: numQ });
      }
      filter.$or = orConditions;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const isAll = all === 'true';

    const safeLimit = isAll ? 1000 : Math.min(Math.max(limitNum || 25, 1), 200);
    const safePage = Math.max(pageNum || 1, 1);

    const total = await News.countDocuments(filter);
    const totalPages = Math.ceil(total / safeLimit) || 1;

    let dbQuery = News.find(filter).sort({ srNumber: -1, createdAt: -1 });

    if (!isAll) {
      dbQuery = dbQuery.skip((safePage - 1) * safeLimit).limit(safeLimit);
    }

    const newsList = await dbQuery.lean();
    const data = newsList.map(formatNewsForFrontend);

    return res.status(200).json({
      success: true,
      message: 'News retrieved successfully.',
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

/**
 * Get single news item by id (srNumber, newsId, or Mongo ID)
 */
export const getNewsById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = {
      $or: [
        { newsId: id },
        { news_id: id }
      ],
      isDeleted: { $ne: true }
    };

    if (!isNaN(Number(id))) {
      query.$or.push({ srNumber: Number(id) });
    }

    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or.push({ _id: id });
    }

    const newsItem = await News.findOne(query);

    if (!newsItem) {
      return res.status(404).json({
        success: false,
        message: `News record with identifier '${id}' not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'News item retrieved successfully.',
      data: formatNewsForFrontend(newsItem)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new news record
 */
export const createNews = async (req, res, next) => {
  try {
    const { heading, date, year, detail } = req.body;

    if (!heading || typeof heading !== 'string' || !heading.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Heading is required.'
      });
    }

    if (!date || typeof date !== 'string' || !date.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Date is required.'
      });
    }

    const parsedYear = year ? parseInt(year, 10) : (date ? parseInt(date.slice(0, 4), 10) : new Date().getFullYear());

    const newNews = new News({
      heading: heading.trim(),
      date: date.trim(),
      year: isNaN(parsedYear) ? new Date().getFullYear() : parsedYear,
      detail: detail || ''
    });

    await newNews.save();

    logger.info(`[News] Created news item ${newNews.newsId} - "${newNews.heading}"`);

    return res.status(201).json({
      success: true,
      message: 'News record created successfully.',
      data: formatNewsForFrontend(newNews)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing news record
 */
export const updateNews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { heading, date, year, detail } = req.body;

    const query = {
      $or: [
        { newsId: id },
        { news_id: id }
      ],
      isDeleted: { $ne: true }
    };

    if (!isNaN(Number(id))) {
      query.$or.push({ srNumber: Number(id) });
    }

    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or.push({ _id: id });
    }

    const newsItem = await News.findOne(query);

    if (!newsItem) {
      return res.status(404).json({
        success: false,
        message: `News record with identifier '${id}' not found.`
      });
    }

    if (heading !== undefined) newsItem.heading = heading.trim();
    if (date !== undefined) newsItem.date = date.trim();
    if (year !== undefined) {
      const parsedYear = parseInt(year, 10);
      newsItem.year = isNaN(parsedYear) ? newsItem.year : parsedYear;
    }
    if (detail !== undefined) newsItem.detail = detail;

    await newsItem.save();

    logger.info(`[News] Updated news item ${newsItem.newsId} - "${newsItem.heading}"`);

    return res.status(200).json({
      success: true,
      message: 'News record updated successfully.',
      data: formatNewsForFrontend(newsItem)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a news record (soft delete)
 */
export const deleteNews = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = {
      $or: [
        { newsId: id },
        { news_id: id }
      ],
      isDeleted: { $ne: true }
    };

    if (!isNaN(Number(id))) {
      query.$or.push({ srNumber: Number(id) });
    }

    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or.push({ _id: id });
    }

    const newsItem = await News.findOne(query);

    if (!newsItem) {
      return res.status(404).json({
        success: false,
        message: `News record with identifier '${id}' not found.`
      });
    }

    newsItem.isDeleted = true;
    newsItem.deletedAt = new Date();
    await newsItem.save();

    logger.info(`[News] Soft-deleted news item ${newsItem.newsId}`);

    return res.status(200).json({
      success: true,
      message: 'News record deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};
