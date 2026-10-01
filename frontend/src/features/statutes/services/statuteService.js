import api from '../../../services/api.js';

export const statuteService = {
  /**
   * Fetches all statutes from backend
   * @returns {Promise<Array>}
   */
  getStatutes: async (params = {}) => {
    const queryParams = typeof params === 'string' ? (params ? { query: params } : {}) : (params || {});
    const response = await api.get('/api/statutes', { params: queryParams });
    const data = response.data?.data || [];
    data.total = response.data?.total ?? data.length;
    data.totalPages = response.data?.totalPages ?? 1;
    data.currentPage = response.data?.currentPage ?? 1;
    data.pagination = {
      total: data.total,
      totalPages: data.totalPages,
      currentPage: data.currentPage
    };
    return data;
  },

  /**
   * Fetches single statute record by Mongoose ID or SR Number
   * @param {string} idOrQuery 
   * @returns {Promise<Object|null>}
   */
  getStatuteById: async (idOrQuery) => {
    const response = await api.get(`/api/statutes/${idOrQuery}`);
    return response.data.data;
  },

  /**
   * Searches statutes using query text
   * @param {string} query 
   * @returns {Promise<Array>}
   */
  searchStatutes: async (query = '') => {
    const response = await api.get('/api/statutes', { params: { query } });
    return response.data.data;
  },

  /**
   * Creates a new statute entry
   * @param {Object} newStatute 
   * @returns {Promise<Object>}
   */
  createStatute: async (newStatute) => {
    const response = await api.post('/api/statutes', newStatute);
    return response.data;
  },

  /**
   * Updates an existing statute entry
   * @param {string} id 
   * @param {Object} updatedFields 
   * @returns {Promise<Object>}
   */
  updateStatute: async (id, updatedFields) => {
    const response = await api.put(`/api/statutes/${id}`, updatedFields);
    return response.data;
  },

  /**
   * Soft-deletes a statute record
   * @param {string} id 
   * @returns {Promise<Object>}
   */
  deleteStatute: async (id) => {
    const response = await api.delete(`/api/statutes/${id}`);
    return response.data;
  }
};
