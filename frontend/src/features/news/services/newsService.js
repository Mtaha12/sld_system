import api from '../../../services/api';

export const newsService = {
  /**
   * Fetch all news records with optional search query
   */
  getNews: async (params = {}) => {
    const queryParams = typeof params === 'string' ? (params ? { query: params } : {}) : (params || {});
    const res = await api.get('/api/news', { params: queryParams });
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
