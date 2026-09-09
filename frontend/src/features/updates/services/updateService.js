import api from '../../../services/api';

export const updateService = {
  getUpdates: async (query = '') => {
    const params = query ? { query } : {};
    const res = await api.get('/api/updates', { params });
    return res.data?.data || [];
  },
  getUpdateById: async (id) => {
    const res = await api.get(`/api/updates/${id}`);
    return res.data?.data;
  },
  createUpdate: async (data) => {
    const res = await api.post('/api/updates', data);
    return res.data?.data;
  },
  updateUpdate: async (id, data) => {
    const res = await api.put(`/api/updates/${id}`, data);
    return res.data?.data;
  },
  deleteUpdate: async (id) => {
    const res = await api.delete(`/api/updates/${id}`);
    return res.data;
  }
};

export default updateService;
