import api from '../../../services/api.js';

export const caseService = {
  /**
   * Fetches all cases from backend
   * @returns {Promise<Array>}
   */
  getCases: async () => {
    const response = await api.get('/api/cases');
    return response.data.data;
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
    const response = await api.get('/api/cases', { params: filters });
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
