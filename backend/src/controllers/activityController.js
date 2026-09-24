import UserActivity from '../models/UserActivity.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

// Realistic initial sample activities (matching screenshot image 4)
const SAMPLE_ACTIVITIES = [
  {
    activityType: 'case',
    loginId: 'Zulfiqar Ahmad1',
    fullName: 'Zulfiqar Ahmad & Nadeem As',
    agency: 'Haroon',
    documentNumber: '162273',
    documentId: '162273',
    documentTitle: 'Commissioner Inland Revenue vs M/s Textile Mills',
    ipAddress: '103.152.101.7',
    dated: new Date('2026-09-10T12:45:27Z')
  },
  {
    activityType: 'case',
    loginId: 'Zulfiqar Ahmad1',
    fullName: 'Zulfiqar Ahmad & Nadeem As',
    agency: 'Haroon',
    documentNumber: '163279',
    documentId: '163279',
    documentTitle: 'Tax Reference Application No. 441 of 2025',
    ipAddress: '103.152.101.7',
    dated: new Date('2026-09-10T12:44:52Z')
  },
  {
    activityType: 'case',
    loginId: 'TipuSN',
    fullName: 'Tipu Associates 43717',
    agency: 'Haroon',
    documentNumber: '10510',
    documentId: '10510',
    documentTitle: 'Income Tax Appeal No. 981/LB/2024',
    ipAddress: '202.163.76.45',
    dated: new Date('2026-09-10T12:41:08Z')
  },
  {
    activityType: 'case',
    loginId: 'naeem',
    fullName: 'Ch. Naeem Ul Haq 123456',
    agency: 'Haroon',
    documentNumber: '148665',
    documentId: '148665',
    documentTitle: 'Sales Tax Ref No. 209/2026',
    ipAddress: '58.65.168.198',
    dated: new Date('2026-09-10T12:41:01Z')
  },
  {
    activityType: 'case',
    loginId: 'TipuSN',
    fullName: 'Tipu Associates 43717',
    agency: 'Haroon',
    documentNumber: '10345',
    documentId: '10345',
    documentTitle: 'Civil Petition No. 512-K of 2023',
    ipAddress: '202.163.76.45',
    dated: new Date('2026-09-10T12:38:43Z')
  },
  {
    activityType: 'case',
    loginId: 'TipuSN',
    fullName: 'Tipu Associates 43717',
    agency: 'Haroon',
    documentNumber: '27326',
    documentId: '27326',
    documentTitle: 'Writ Petition No. 8921/2024',
    ipAddress: '202.163.76.45',
    dated: new Date('2026-09-10T12:36:11Z')
  },
  {
    activityType: 'case',
    loginId: 'TipuSN',
    fullName: 'Tipu Associates 43717',
    agency: 'Haroon',
    documentNumber: '10345',
    documentId: '10345',
    documentTitle: 'Customs Appeal No. 110/2024',
    ipAddress: '202.163.76.45',
    dated: new Date('2026-09-10T12:36:00Z')
  },
  {
    activityType: 'case',
    loginId: 'TipuSN',
    fullName: 'Tipu Associates 43717',
    agency: 'Haroon',
    documentNumber: '159678',
    documentId: '159678',
    documentTitle: 'Special Sales Tax Reference No. 77/2025',
    ipAddress: '202.163.76.45',
    dated: new Date('2026-09-10T12:32:45Z')
  },
  {
    activityType: 'case',
    loginId: 'PGOC',
    fullName: 'TANVEER',
    agency: 'Tanveer',
    documentNumber: '161704',
    documentId: '161704',
    documentTitle: 'Federation of Pakistan vs Oil Refinery Ltd',
    ipAddress: '2407:d000:17:228b:4c80:5ab3:e5',
    dated: new Date('2026-09-10T12:30:57Z')
  },
  // Notification activities
  {
    activityType: 'notification',
    loginId: 'Zulfiqar Ahmad1',
    fullName: 'Zulfiqar Ahmad & Nadeem As',
    agency: 'Haroon',
    documentNumber: 'S.R.O. 1202(I)/2026',
    documentId: 'NOTIF-00001',
    documentTitle: 'Exemption of Sales Tax on Agricultural Implements',
    ipAddress: '103.152.101.7',
    dated: new Date('2026-09-10T11:22:15Z')
  },
  {
    activityType: 'notification',
    loginId: 'PGOC',
    fullName: 'TANVEER',
    agency: 'Tanveer',
    documentNumber: 'S.R.O. 981(I)/2025',
    documentId: 'NOTIF-00002',
    documentTitle: 'Withholding Tax Rates Update',
    ipAddress: '2407:d000:17:228b:4c80:5ab3:e5',
    dated: new Date('2026-09-10T11:15:30Z')
  },
  // Statute activities
  {
    activityType: 'statute',
    loginId: 'TipuSN',
    fullName: 'Tipu Associates 43717',
    agency: 'Haroon',
    documentNumber: 'Section 122',
    documentId: 'STAT-00001',
    documentTitle: 'Income Tax Ordinance, 2001 - Amendment of Assessments',
    ipAddress: '202.163.76.45',
    dated: new Date('2026-09-10T10:45:10Z')
  },
  {
    activityType: 'statute',
    loginId: 'naeem',
    fullName: 'Ch. Naeem Ul Haq 123456',
    agency: 'Haroon',
    documentNumber: 'Section 3',
    documentId: 'STAT-00002',
    documentTitle: 'Sales Tax Act, 1990 - Scope of Tax',
    ipAddress: '58.65.168.198',
    dated: new Date('2026-09-10T10:30:22Z')
  }
];

export const getActivities = async (req, res, next) => {
  try {
    const { type = 'case', search, page = 1, limit = 50 } = req.query;

    const count = await UserActivity.countDocuments();
    if (count === 0) {
      await UserActivity.insertMany(SAMPLE_ACTIVITIES);
    }

    const query = {};
    if (type) {
      query.activityType = type.toLowerCase();
    }

    if (search && search.trim()) {
      const sRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { loginId: sRegex },
        { fullName: sRegex },
        { documentNumber: sRegex },
        { agency: sRegex },
        { ipAddress: sRegex },
        { documentTitle: sRegex }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [total, activities] = await Promise.all([
      UserActivity.countDocuments(query),
      UserActivity.find(query)
        .sort({ dated: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    return res.status(200).json({
      success: true,
      message: 'User activity records retrieved successfully',
      data: activities,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems: total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const logActivity = async (req, res, next) => {
  try {
    const { activityType, documentId, documentNumber, documentTitle, details } = req.body;

    const user = req.user;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';

    const cleanIp = String(ipAddress).split(',')[0].trim().replace(/^::ffff:/, '');

    const activity = new UserActivity({
      activityType: activityType || 'case',
      userId: user?._id || null,
      loginId: user?.loginId || user?.username || user?.email || 'Anonymous',
      fullName: user?.fullName || user?.name || 'Visitor',
      agency: user?.agencyName || 'General',
      documentId: String(documentId || ''),
      documentNumber: String(documentNumber || documentId || ''),
      documentTitle: String(documentTitle || ''),
      ipAddress: cleanIp,
      dated: new Date(),
      details: details || {}
    });

    await activity.save();

    return res.status(201).json({
      success: true,
      message: 'Activity logged successfully',
      data: activity
    });
  } catch (error) {
    logger.error(`[Activity Log Error]: ${error.message}`);
    // Non-blocking
    return res.status(200).json({ success: false, message: 'Could not log activity' });
  }
};
