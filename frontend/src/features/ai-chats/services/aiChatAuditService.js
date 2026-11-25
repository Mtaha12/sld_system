import api from '../../../services/api';

export const aiChatAuditService = {
  getLogs: async ({ page = 1, limit = 20, search = '', startDate = '', endDate = '' } = {}) => {
    const params = { page, limit };
    if (search) params.search = search;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const res = await api.get('/api/ai-chat/admin/logs', { params });
    return res.data;
  },

  getStats: async () => {
    const res = await api.get('/api/ai-chat/admin/stats');
    return res.data?.stats || {};
  },

  deleteLog: async (id) => {
    const res = await api.delete(`/api/ai-chat/admin/logs/${id}`);
    return res.data;
  },

  clearAll: async () => {
    const res = await api.delete('/api/ai-chat/admin/logs');
    return res.data;
  }
};
