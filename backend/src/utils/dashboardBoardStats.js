import Counter from '../models/Counter.js';
import Statute from '../models/Statute.js';
import Notification from '../models/Notification.js';

export const STATUTE_BOARD_BASELINE_COUNTER = 'dashboard_statute_baseline_v1';
export const NOTIFICATION_BOARD_BASELINE_COUNTER = 'dashboard_notification_baseline_v1';
export const STATUTE_BOARD_FIXED_BASE = 3000;
export const NOTIFICATION_BOARD_FIXED_BASE = 30000;

let cachedBoardStats = null;
let cachedBoardStatsExpiresAt = 0;

export const invalidateBoardCountsCache = () => {
  cachedBoardStats = null;
  cachedBoardStatsExpiresAt = 0;
};

/**
 * Ensures Dashboard Statutes baseline = 3,000 and Notifications baseline = 30,000,
 * automatically incrementing whenever new Statute or Notification records are added.
 */
export const getBoardStatuteAndNotificationCounts = async ({
  liveStatutes = null,
  liveNotifications = null,
  forceResetBaselines = false
} = {}) => {
  const now = Date.now();
  if (
    !forceResetBaselines &&
    liveStatutes === null &&
    liveNotifications === null &&
    cachedBoardStats &&
    now < cachedBoardStatsExpiresAt
  ) {
    return cachedBoardStats;
  }

  const [currentStatutes, currentNotifications, counterDocs] = await Promise.all([
    liveStatutes !== null ? liveStatutes : Statute.countDocuments({ isDeleted: { $ne: true } }),
    liveNotifications !== null ? liveNotifications : Notification.countDocuments({ isDeleted: false }),
    Counter.find({
      _id: { $in: [STATUTE_BOARD_BASELINE_COUNTER, NOTIFICATION_BOARD_BASELINE_COUNTER] }
    }).lean()
  ]);

  const statuteDoc = counterDocs.find((c) => c._id === STATUTE_BOARD_BASELINE_COUNTER);
  const notifDoc = counterDocs.find((c) => c._id === NOTIFICATION_BOARD_BASELINE_COUNTER);

  let baseStatutes = statuteDoc ? Number(statuteDoc.seq) : null;
  let baseNotifs = notifDoc ? Number(notifDoc.seq) : null;

  if (forceResetBaselines || baseStatutes === null || !Number.isFinite(baseStatutes)) {
    baseStatutes = currentStatutes;
    await Counter.findByIdAndUpdate(
      STATUTE_BOARD_BASELINE_COUNTER,
      { $set: { seq: baseStatutes } },
      { upsert: true }
    ).catch(() => {});
  }

  if (forceResetBaselines || baseNotifs === null || !Number.isFinite(baseNotifs)) {
    baseNotifs = currentNotifications;
    await Counter.findByIdAndUpdate(
      NOTIFICATION_BOARD_BASELINE_COUNTER,
      { $set: { seq: baseNotifs } },
      { upsert: true }
    ).catch(() => {});
  }

  const boardStatutes = STATUTE_BOARD_FIXED_BASE + Math.max(0, currentStatutes - baseStatutes);
  const boardNotifications = NOTIFICATION_BOARD_FIXED_BASE + Math.max(0, currentNotifications - baseNotifs);

  const result = {
    boardStatutes,
    boardNotifications,
    liveStatutes: currentStatutes,
    liveNotifications: currentNotifications,
    baseStatutes,
    baseNotifications: baseNotifs
  };

  if (liveStatutes === null && liveNotifications === null) {
    cachedBoardStats = result;
    cachedBoardStatsExpiresAt = now + 30_000; // 30s micro-cache (invalidated on write)
  }

  return result;
};

