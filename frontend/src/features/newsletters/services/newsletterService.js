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
  getPublicNewsletter: async (id) => {
    const res = await api.get(`/api/newsletters/public/${id}`);
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
  },
  uploadAttachment: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/api/newsletters/upload-attachment', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data?.data || res.data;
  },
  uploadAttachments: async (files) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const res = await api.post('/api/newsletters/upload-attachment', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data?.files || res.data?.data || res.data;
  }
};

export default newsletterService;
