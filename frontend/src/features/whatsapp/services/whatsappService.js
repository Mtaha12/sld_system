import api from '../../../services/api';

export const whatsappService = {
  getUpdates: async (params = {}) => {
    const queryParams = typeof params === 'string' ? (params ? { query: params } : {}) : (params || {});
    const res = await api.get('/api/whatsapp-updates', { params: queryParams });
    const data = res.data?.data || [];
    data.total = res.data?.total ?? data.length;
    data.totalPages = res.data?.totalPages ?? 1;
    data.currentPage = res.data?.currentPage ?? 1;
    data.pagination = {
      total: data.total,
      totalPages: data.totalPages,
      currentPage: data.currentPage
    };
    return data;
  },
  getUpdateById: async (id) => {
    const res = await api.get(`/api/whatsapp-updates/${id}`);
    return res.data?.data;
  },
  createUpdate: async (data) => {
    const res = await api.post('/api/whatsapp-updates', data);
    return res.data?.data;
  },
  updateUpdate: async (id, data) => {
    const res = await api.put(`/api/whatsapp-updates/${id}`, data);
    return res.data?.data;
  },
  deleteUpdate: async (id) => {
    const res = await api.delete(`/api/whatsapp-updates/${id}`);
    return res.data;
  }
};

export default whatsappService;
