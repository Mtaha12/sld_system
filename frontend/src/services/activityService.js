import api from './api';

export const activityService = {
  getActivities: async (params = {}) => {
    const res = await api.get('/api/activities', { params });
    return res.data;
  },

  logActivity: async (activityData) => {
    try {
      const res = await api.post('/api/activities/log', activityData);
      return res.data;
    } catch {
      // Non-blocking
      return null;
    }
  }
};
