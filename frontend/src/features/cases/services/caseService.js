import api from '../../../services/api.js';

export const caseService = {
  /**
   * Fetches paginated cases from backend
   * @param {Object} params - { page, limit, subject, fromDate, toDate, magazine, sortField, sortOrder }
   * @returns {Promise<{ data: Array, pagination: Object }>}
   */
  getCases: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    if (params.subject) query.set('subject', params.subject);
    if (params.fromDate) query.set('fromDate', params.fromDate);
    if (params.toDate) query.set('toDate', params.toDate);
    if (params.magazine) query.set('magazine', params.magazine);
    if (params.sortField) query.set('sortField', params.sortField);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);
    const qs = query.toString();
    const response = await api.get(`/api/cases${qs ? `?${qs}` : ''}`);
    return response.data;
  },

  /**
   * Fetches single case by Mongoose ID or SLD Number
   * @param {string} idOrSld 
   * @returns {Promise<Object|null>}
   */
  getCaseById: async (idOrSld) => {
    const response = await api.get(`/api/cases/${idOrSld}`);
    return response.data.data;
  },

  /**
   * Searches and filters cases using query parameters
   * @param {Object} filters { subject, fromDate, toDate, magazine }
   * @returns {Promise<Array>}
   */
  searchCases: async (filters = {}) => {
    const response = await api.post('/api/cases/search', filters);
    return response.data.data;
  },

  /**
   * Creates a new case report
   * @param {Object} newCase 
   * @returns {Promise<Object>}
   */
  createCase: async (newCase) => {
    const response = await api.post('/api/cases', newCase);
    return response.data;
  },

  /**
   * Updates an existing case report
   * @param {string} id 
   * @param {Object} updatedFields 
   * @returns {Promise<Object>}
   */
  updateCase: async (id, updatedFields) => {
    const response = await api.put(`/api/cases/${id}`, updatedFields);
    return response.data;
  },

  /**
   * Soft-deletes a single case law record
   * @param {string} id 
   * @returns {Promise<Object>}
   */
  deleteCase: async (id) => {
    const response = await api.delete(`/api/cases/${id}`);
    return response.data;
  },

  /**
   * Bulk soft-deletes a list of case records
   * @param {Array<string>} ids 
   * @returns {Promise<Object>}
   */
  deleteCases: async (ids) => {
    const response = await api.post('/api/cases/delete-multiple', { ids });
    return response.data;
  }
};
