import api from '../../../services/api.js';

const NOTIFICATION_CACHE_TTL_MS = 3 * 60 * 1000;
const NOTIFICATION_CACHE_MAX = 100;
const notificationQueryCache = new Map();

const attachMeta = (rows, meta) => {
  const arr = Array.isArray(rows) ? [...rows] : [];
  arr.total = meta.total;
  arr.dashboardTotal = meta.dashboardTotal;
  arr.totalPages = meta.totalPages;
  arr.currentPage = meta.currentPage;
  arr.pagination = {
    total: meta.total,
    totalPages: meta.totalPages,
    currentPage: meta.currentPage
  };
  return arr;
};

export const clearNotificationClientCache = () => {
  notificationQueryCache.clear();
};

export const notificationService = {
  /**
   * Fetches all notifications from backend with client-side caching & abort signal
   * @returns {Promise<Array>}
   */
  getNotifications: async (params = {}, options = {}) => {
    const queryParams = typeof params === 'string' ? (params ? { query: params } : {}) : (params || {});
    const cacheKey = JSON.stringify(queryParams);
    const cached = notificationQueryCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < NOTIFICATION_CACHE_TTL_MS) {
      notificationQueryCache.delete(cacheKey);
      notificationQueryCache.set(cacheKey, cached);
      return attachMeta(cached.data, cached.meta);
    }

    const response = await api.get('/api/notifications', { params: queryParams, ...options });
    const data = response.data?.data || [];
    const meta = {
      total: response.data?.total ?? data.length,
      dashboardTotal: response.data?.dashboardTotal,
      totalPages: response.data?.totalPages ?? 1,
      currentPage: response.data?.currentPage ?? 1
    };

    if (notificationQueryCache.size >= NOTIFICATION_CACHE_MAX) {
      const oldest = notificationQueryCache.keys().next().value;
      notificationQueryCache.delete(oldest);
    }
    notificationQueryCache.set(cacheKey, { ts: Date.now(), data, meta });

    return attachMeta(data, meta);
  },

  /**
   * Fetches single notification by Mongoose ID or SR Number
   * @param {string} idOrSr 
   * @returns {Promise<Object|null>}
   */
  getNotificationById: async (idOrSr) => {
    const response = await api.get(`/api/notifications/${idOrSr}`);
    return response.data.data;
  },

  /**
   * Retrieves the latest existing and next sequential Notification SR #
   * @returns {Promise<{latestSr: number, nextSr: number}>}
   */
  getNextSr: async () => {
    const response = await api.get('/api/notifications/next-sr');
    return response.data;
  },

  /**
   * Searches and filters notifications using query text
   * @param {string} query 
   * @returns {Promise<Array>}
   */
  searchNotifications: async (query = '') => {
    const response = await api.get('/api/notifications', { params: { query } });
    return response.data.data;
  },

  /**
   * Upload single attachment document for a notification
   */
  uploadAttachment: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/notifications/upload-attachment', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data?.data || response.data;
  },

  createNotification: async (newNotif) => {
    clearNotificationClientCache();
    const response = await api.post('/api/notifications', newNotif);
    return response.data;
  },

  /**
   * Updates an existing notification entry
   * @param {string} id 
   * @param {Object} updatedFields 
   * @returns {Promise<Object>}
   */
  updateNotification: async (id, updatedFields) => {
    clearNotificationClientCache();
    const response = await api.put(`/api/notifications/${id}`, updatedFields);
    return response.data;
  },

  /**
   * Soft-deletes a notification record
   * @param {string} id 
   * @returns {Promise<Object>}
   */
  deleteNotification: async (id) => {
    clearNotificationClientCache();
    const response = await api.delete(`/api/notifications/${id}`);
    return response.data;
  }
};
