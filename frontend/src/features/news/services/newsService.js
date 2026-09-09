import api from '../../../services/api';

export const newsService = {
  /**
   * Fetch all news records with optional search query
   */
  getNews: async (query = '') => {
    const params = query ? { query } : {};
    const res = await api.get('/api/news', { params });
    return res.data?.data || [];
  },

  /**
   * Fetch a single news record by ID
   */
  getNewsById: async (id) => {
    const res = await api.get(`/api/news/${id}`);
    return res.data?.data;
  },

  /**
   * Create a new news record
   */
  createNews: async (data) => {
    const res = await api.post('/api/news', data);
    return res.data?.data;
  },

  /**
   * Update an existing news record
   */
  updateNews: async (id, data) => {
    const res = await api.put(`/api/news/${id}`, data);
    return res.data?.data;
  },

  /**
   * Delete a news record
   */
  deleteNews: async (id) => {
    const res = await api.delete(`/api/news/${id}`);
    return res.data;
  }
};

export default newsService;
