import Case from '../models/Case.js';
import Statute from '../models/Statute.js';
import Notification from '../models/Notification.js';

/**
 * Humanizes timestamps relative to current time
 * @param {Date} date 
 */
const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return `${interval} yr${interval > 1 ? 's' : ''} ago`;
  
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return `${interval} mo${interval > 1 ? 's' : ''} ago`;
  
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `${interval} day${interval > 1 ? 's' : ''} ago`;
  
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `${interval} hour${interval > 1 ? 's' : ''} ago`;
  
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `${interval} min${interval > 1 ? 's' : ''} ago`;
  
  return 'just now';
};

let metricsCache = null;
let metricsCacheExpiresAt = 0;
let isRecalculatingMetrics = false;

const calculateMetricsData = async () => {
  const [totalCases, activeCases, totalStatutes, totalNotifications, attachmentsAggregation] = await Promise.all([
    Case.countDocuments({ isDeleted: false }),
    Case.countDocuments({ isDeleted: false, status: 'Active' }),
    Statute.countDocuments({ isDeleted: { $ne: true } }),
    Notification.countDocuments({ isDeleted: false }),
    Case.aggregate([
      { $match: { isDeleted: false } },
      { $project: { count: { $size: { $ifNull: ['$attachments', []] } } } },
      { $group: { _id: null, total: { $sum: '$count' } } }
    ])
  ]);

  const totalAttachments = attachmentsAggregation.length > 0 ? attachmentsAggregation[0].total : 0;

  return {
    totalCases: totalCases.toLocaleString(),
    activeCases: activeCases.toLocaleString(),
    totalStatutes: totalStatutes.toLocaleString(),
    totalNotifications: totalNotifications.toLocaleString(),
    totalAttachments: totalAttachments.toLocaleString()
  };
};

const refreshMetricsInBackground = () => {
  if (isRecalculatingMetrics) return;
  isRecalculatingMetrics = true;
  calculateMetricsData()
    .then(data => {
      metricsCache = data;
      metricsCacheExpiresAt = Date.now() + 300_000; // 5 min cache
    })
    .catch(err => {
      console.warn('[Dashboard Metrics] Background calculation error:', err?.message);
    })
    .finally(() => {
      isRecalculatingMetrics = false;
    });
};

/**
 * Dashboard Metrics and Activities Controller
 */
export const getMetrics = async (req, res, next) => {
  try {
    if (metricsCache) {
      if (Date.now() >= metricsCacheExpiresAt) {
        refreshMetricsInBackground();
      }
      return res.status(200).json({
        success: true,
        message: 'Dashboard metrics calculated.',
        data: metricsCache
      });
    }

    const data = await calculateMetricsData();
    metricsCache = data;
    metricsCacheExpiresAt = Date.now() + 300_000;

    return res.status(200).json({
      success: true,
      message: 'Dashboard metrics calculated.',
      data
    });
  } catch (error) {
    next(error);
  }
};

let activitiesCache = null;
let activitiesCacheExpiresAt = 0;
let isRecalculatingActivities = false;

const fetchRecentActivities = async () => {
  const [cases, statutes, notifications] = await Promise.all([
    Case.find({ isDeleted: false })
      .select('createdAt updatedAt caseNumber sldNumber court attachments status')
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean(),
    Statute.find({ isDeleted: { $ne: true } })
      .select('createdAt updatedAt blocks sectionHeading heading law section department srNumber status')
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean(),
    Notification.find({ isDeleted: false })
      .select('createdAt updatedAt subject sroNumber number department status')
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean()
  ]);

  const activities = [];

  cases.forEach(c => {
    const createdDate = c.createdAt ? new Date(c.createdAt) : new Date();
    const updatedDate = c.updatedAt ? new Date(c.updatedAt) : createdDate;
    const isNew = createdDate.getTime() === updatedDate.getTime();
    const description = Array.isArray(c.caseNumber) 
      ? c.caseNumber.join(', ') 
      : (c.caseNumber || c.sldNumber || 'Case Record');
      
    activities.push({
      id: `case_${c._id}`,
      type: 'case',
      action: isNew ? 'New case added' : 'Case updated',
      description,
      court: c.court || 'Court Portal',
      year: createdDate.getFullYear().toString(),
      time: timeAgo(updatedDate),
      rawTime: updatedDate,
      hasAttachment: Array.isArray(c.attachments) && c.attachments.length > 0,
      status: c.status?.toLowerCase() || 'active'
    });
  });

  statutes.forEach(s => {
    const createdDate = s.createdAt ? new Date(s.createdAt) : new Date();
    const updatedDate = s.updatedAt ? new Date(s.updatedAt) : createdDate;
    const isNew = createdDate.getTime() === updatedDate.getTime();
    const sectionHeading = s.blocks && s.blocks[0] ? s.blocks[0].sectionHeading : s.sectionHeading;
    
    activities.push({
      id: `statute_${s._id}`,
      type: 'statute',
      action: isNew ? 'New statute added' : 'Statute updated',
      description: `${s.law || 'Statute'} - Section ${s.section || 'General'} (${sectionHeading || s.heading || 'Details'})`,
      court: s.department || 'Tax / FBR',
      year: createdDate.getFullYear().toString(),
      time: timeAgo(updatedDate),
      rawTime: updatedDate,
      hasAttachment: false,
      status: s.status?.toLowerCase() || 'active'
    });
  });

  notifications.forEach(n => {
    const createdDate = n.createdAt ? new Date(n.createdAt) : new Date();
    const updatedDate = n.updatedAt ? new Date(n.updatedAt) : createdDate;
    const isNew = createdDate.getTime() === updatedDate.getTime();
    
    activities.push({
      id: `notification_${n._id}`,
      type: 'notification',
      action: isNew ? 'New notification' : 'Notification updated',
      description: `${n.subject || 'Notification'} (${n.sroNumber || n.number || 'N/A'})`,
      court: n.department || 'Federal Constitutional Court',
      year: createdDate.getFullYear().toString(),
      time: timeAgo(updatedDate),
      rawTime: updatedDate,
      hasAttachment: false,
      status: n.status?.toLowerCase() || 'active'
    });
  });

  activities.sort((a, b) => b.rawTime - a.rawTime);
  return activities.slice(0, 6);
};

const refreshActivitiesInBackground = () => {
  if (isRecalculatingActivities) return;
  isRecalculatingActivities = true;
  fetchRecentActivities()
    .then(data => {
      activitiesCache = data;
      activitiesCacheExpiresAt = Date.now() + 120_000; // 2 min cache
    })
    .catch(err => {
      console.warn('[Dashboard Activities] Background calculation error:', err?.message);
    })
    .finally(() => {
      isRecalculatingActivities = false;
    });
};

export const getActivities = async (req, res, next) => {
  try {
    if (activitiesCache) {
      if (Date.now() >= activitiesCacheExpiresAt) {
        refreshActivitiesInBackground();
      }
      return res.status(200).json({
        success: true,
        message: 'Recent platform activities retrieved.',
        data: activitiesCache
      });
    }

    const recentActivities = await fetchRecentActivities();
    activitiesCache = recentActivities;
    activitiesCacheExpiresAt = Date.now() + 120_000;

    return res.status(200).json({
      success: true,
      message: 'Recent activity logs retrieved.',
      data: recentActivities
    });
  } catch (error) {
    next(error);
  }
};
