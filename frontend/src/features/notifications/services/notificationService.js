import api from '../../../services/api.js';

export const notificationService = {
  /**
   * Fetches all notifications from backend
   * @returns {Promise<Array>}
   */
  getNotifications: async () => {
    const response = await api.get('/api/notifications');
    return response.data.data;
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
   * Searches and filters notifications using query text
   * @param {string} query 
   * @returns {Promise<Array>}
   */
  searchNotifications: async (query = '') => {
    const response = await api.get('/api/notifications', { params: { query } });
    return response.data.data;
  },

  /**
   * Creates a new notification entry
   * @param {Object} newNotif 
   * @returns {Promise<Object>}
   */
  createNotification: async (newNotif) => {
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
    const response = await api.put(`/api/notifications/${id}`, updatedFields);
    return response.data;
  },

  /**
   * Soft-deletes a notification record
   * @param {string} id 
   * @returns {Promise<Object>}
   */
  deleteNotification: async (id) => {
    const response = await api.delete(`/api/notifications/${id}`);
    return response.data;
  }
};
