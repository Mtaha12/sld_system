import api from '../../../services/api';

export const newsletterService = {
  getNewsletters: async (query = '', category = '') => {
    const params = {};
    if (query) params.query = query;
    if (category) params.category = category;
    const res = await api.get('/api/newsletters', { params });
    return res.data?.data || [];
  },
  getNewsletterById: async (id) => {
    const res = await api.get(`/api/newsletters/${id}`);
    return res.data?.data;
  },
  createNewsletter: async (data) => {
    const res = await api.post('/api/newsletters', data);
    return res.data?.data;
  },
  updateNewsletter: async (id, data) => {
    const res = await api.put(`/api/newsletters/${id}`, data);
    return res.data?.data;
  },
  deleteNewsletter: async (id) => {
    const res = await api.delete(`/api/newsletters/${id}`);
    return res.data;
  }
};

export default newsletterService;
