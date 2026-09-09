import api from '../../../services/api';

export const downloadService = {
  getDownloads: async (query = '', category = '') => {
    const params = {};
    if (query) params.query = query;
    if (category) params.category = category;
    const res = await api.get('/api/downloads', { params });
    return res.data?.data || [];
  },
  getDownloadById: async (id) => {
    const res = await api.get(`/api/downloads/${id}`);
    return res.data?.data;
  },
  createDownload: async (data) => {
    const res = await api.post('/api/downloads', data);
    return res.data?.data;
  },
  updateDownload: async (id, data) => {
    const res = await api.put(`/api/downloads/${id}`, data);
    return res.data?.data;
  },
  deleteDownload: async (id) => {
    const res = await api.delete(`/api/downloads/${id}`);
    return res.data;
  }
};

export default downloadService;
