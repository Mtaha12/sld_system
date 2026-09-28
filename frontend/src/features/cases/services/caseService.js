import api from '../../../services/api.js';

const clientCaseCache = new Map();
const MAX_CLIENT_CACHE = 150;

const setClientCache = (key, data) => {
  if (clientCaseCache.size >= MAX_CLIENT_CACHE) {
    const oldest = clientCaseCache.keys().next().value;
    clientCaseCache.delete(oldest);
  }
  clientCaseCache.set(key, data);
};

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
    const key = `id_${String(idOrSld).trim().toLowerCase()}`;
    if (clientCaseCache.has(key)) return clientCaseCache.get(key);

    const response = await api.get(`/api/cases/${idOrSld}`);
    const data = response.data.data;
    if (data) {
      setClientCache(key, data);
      if (data.sldNumber) setClientCache(`sld_${String(data.sldNumber).toLowerCase()}`, data);
      if (data.id) setClientCache(`id_${String(data.id).toLowerCase()}`, data);
    }
    return data;
  },

  /**
   * Fetches single case directly by SLD Number
   * @param {string|number} sldNumber 
   * @returns {Promise<Object|null>}
   */
  getCaseBySld: async (sldNumber) => {
    const key = `sld_${String(sldNumber).trim().toLowerCase()}`;
    if (clientCaseCache.has(key)) return clientCaseCache.get(key);

    const response = await api.get(`/api/cases/sld/${encodeURIComponent(sldNumber)}`);
    const data = response.data.data;
    if (data) {
      setClientCache(key, data);
      if (data.sldNumber) setClientCache(`sld_${String(data.sldNumber).toLowerCase()}`, data);
      if (data.id) setClientCache(`id_${String(data.id).toLowerCase()}`, data);
    }
    return data;
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
    clientCaseCache.clear();
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
    clientCaseCache.clear();
    const response = await api.put(`/api/cases/${id}`, updatedFields);
    return response.data;
  },

  /**
   * Soft-deletes a single case law record
   * @param {string} id 
   * @returns {Promise<Object>}
   */
  deleteCase: async (id) => {
    clientCaseCache.clear();
    const response = await api.delete(`/api/cases/${id}`);
    return response.data;
  },

  /**
   * Bulk soft-deletes a list of case records
   * @param {Array<string>} ids 
   * @returns {Promise<Object>}
   */
  deleteCases: async (ids) => {
    clientCaseCache.clear();
    const response = await api.post('/api/cases/delete-multiple', { ids });
    return response.data;
  },

  /**
   * Returns the highest page number for a given year + magazine combination.
   * Used to auto-suggest the next page number when adding a publication.
   * @param {string} year  e.g. "2026"
   * @param {string} mag   e.g. "sld"
   * @returns {Promise<number|null>}  the max page number, or null if none found
   */
  getMaxPage: async (year, mag) => {
    const response = await api.get(`/api/cases/max-page?year=${encodeURIComponent(year)}&mag=${encodeURIComponent(mag)}`);
    return response.data.maxPage ?? null;
  }
};
