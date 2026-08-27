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

/**
 * Dashboard Metrics and Activities Controller
 */
export const getMetrics = async (req, res, next) => {
  try {
    const totalCases = await Case.countDocuments({ isDeleted: { $ne: true } });
    const activeCases = await Case.countDocuments({ status: 'Active', isDeleted: { $ne: true } });
    const totalStatutes = await Statute.countDocuments({ isDeleted: { $ne: true } });
    const totalNotifications = await Notification.countDocuments({ isDeleted: { $ne: true } });

    // Aggregate attachments across all cases
    const attachmentsAggregation = await Case.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $project: { count: { $size: { $ifNull: ['$attachments', []] } } } },
      { $group: { _id: null, total: { $sum: '$count' } } }
    ]);
    const totalAttachments = attachmentsAggregation.length > 0 ? attachmentsAggregation[0].total : 0;

    return res.status(200).json({
      success: true,
      message: 'Dashboard metrics calculated.',
      data: {
        totalCases: totalCases.toLocaleString(),
        activeCases: activeCases.toLocaleString(),
        totalStatutes: totalStatutes.toLocaleString(),
        totalNotifications: totalNotifications.toLocaleString(),
        totalAttachments: totalAttachments.toLocaleString()
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getActivities = async (req, res, next) => {
  try {
    // Retrieve the latest 5 cases, statutes, and notifications
    const cases = await Case.find({ isDeleted: { $ne: true } })
      .sort({ updatedAt: -1 })
      .limit(5);

    const statutes = await Statute.find({ isDeleted: { $ne: true } })
      .sort({ updatedAt: -1 })
      .limit(5);

    const notifications = await Notification.find({ isDeleted: { $ne: true } })
      .sort({ updatedAt: -1 })
      .limit(5);

    const activities = [];

    // Map cases to activity structures
    cases.forEach(c => {
      const isNew = c.createdAt.getTime() === c.updatedAt.getTime();
      const description = c.caseNumber && c.caseNumber.length > 0 
        ? c.caseNumber.join(', ') 
        : c.sldNumber;
        
      activities.push({
        id: `case_${c._id}`,
        type: 'case',
        action: isNew ? 'New case added' : 'Case updated',
        description,
        court: c.court || 'Court Portal',
        year: c.createdAt.getFullYear().toString(),
        time: timeAgo(c.updatedAt),
        rawTime: c.updatedAt,
        hasAttachment: c.attachments && c.attachments.length > 0,
        status: c.status?.toLowerCase() || 'active'
      });
    });

    // Map statutes to activity structures
    statutes.forEach(s => {
      const isNew = s.createdAt.getTime() === s.updatedAt.getTime();
      const sectionHeading = s.blocks && s.blocks[0] ? s.blocks[0].sectionHeading : s.sectionHeading;
      
      activities.push({
        id: `statute_${s._id}`,
        type: 'statute',
        action: isNew ? 'New statute added' : 'Statute updated',
        description: `${s.law} - Section ${s.section} (${sectionHeading || s.heading || 'Details'})`,
        court: s.department || 'Tax / FBR',
        year: s.createdAt.getFullYear().toString(),
        time: timeAgo(s.updatedAt),
        rawTime: s.updatedAt,
        hasAttachment: false,
        status: s.status?.toLowerCase() || 'active'
      });
    });

    // Map notifications to activity structures
    notifications.forEach(n => {
      const isNew = n.createdAt.getTime() === n.updatedAt.getTime();
      
      activities.push({
        id: `notification_${n._id}`,
        type: 'notification',
        action: isNew ? 'New notification' : 'Notification updated',
        description: `${n.subject} (${n.sroNumber || n.number})`,
        court: n.department || 'Federal Constitutional Court',
        year: n.createdAt.getFullYear().toString(),
        time: timeAgo(n.updatedAt),
        rawTime: n.updatedAt,
        hasAttachment: false,
        status: n.status?.toLowerCase() || 'active'
      });
    });

    // Sort combined activities by rawTime desc
    activities.sort((a, b) => b.rawTime - a.rawTime);

    // Limit to top 6
    const recentActivities = activities.slice(0, 6);

    return res.status(200).json({
      success: true,
      message: 'Recent activity logs retrieved.',
      data: recentActivities
    });
  } catch (error) {
    next(error);
  }
};
