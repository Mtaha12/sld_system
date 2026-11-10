import api from '../../../services/api';

const NEWSLETTER_CACHE_TTL_MS = 2 * 60 * 1000;
const newsletterClientCache = new Map();

const invalidateClientNewsletterCache = () => {
  newsletterClientCache.clear();
};

export const newsletterService = {
  getNewsletters: async (query = '', category = '') => {
    const cacheKey = JSON.stringify({ query: query || '', category: category || '' });
    const cached = newsletterClientCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < NEWSLETTER_CACHE_TTL_MS) {
      return cached.data;
    }

    const params = {};
    if (query) params.query = query;
    if (category) params.category = category;
    const res = await api.get('/api/newsletters', { params });
    const data = res.data?.data || [];

    if (newsletterClientCache.size >= 40) {
      const oldest = newsletterClientCache.keys().next().value;
      newsletterClientCache.delete(oldest);
    }
    newsletterClientCache.set(cacheKey, { ts: Date.now(), data });
    return data;
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
    invalidateClientNewsletterCache();
    const res = await api.post('/api/newsletters', data);
    return res.data?.data;
  },
  updateNewsletter: async (id, data) => {
    invalidateClientNewsletterCache();
    const res = await api.put(`/api/newsletters/${id}`, data);
    return res.data?.data;
  },
  updateNewsletterLinks: async (id, payload) => {
    invalidateClientNewsletterCache();
    try {
      const res = await api.patch(`/api/newsletters/${encodeURIComponent(id)}/links`, payload);
      return res.data?.data;
    } catch (patchErr) {
      const res = await api.put(`/api/newsletters/${encodeURIComponent(id)}/links`, payload);
      return res.data?.data;
    }
  },
  deleteNewsletter: async (id) => {
    invalidateClientNewsletterCache();
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
