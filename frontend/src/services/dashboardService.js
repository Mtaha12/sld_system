import api from './api';

export const dashboardService = {
  getPublicSummary: async () => {
    const res = await api.get('/api/dashboard/public');
    return res.data?.data || {};
  },
  getAuthenticatedSummary: async () => {
    const res = await api.get('/api/dashboard/summary');
    return res.data?.data || {};
  },
};

export default dashboardService;

