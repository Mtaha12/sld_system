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
   * Downloads Excel file of all cases with missing/empty headnotes
   */
  exportMissingHeadnotes: async () => {
    const response = await api.get('/api/cases/export-missing-headnotes', {
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Missing_Headnotes_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Fetches paginated cases from backend
   * @param {Object} params - { page, limit, subject, fromDate, toDate, magazine, sortField, sortOrder }
   * @returns {Promise<{ data: Array, pagination: Object }>}
   */
  getCases: async (params = {}, options = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.set(key, String(val).trim());
      }
    });
    const qs = query.toString();
    const response = await api.get(`/api/cases${qs ? `?${qs}` : ''}`, options);
    return response.data;
  },

  /**
   * Fetches total database statistics (total citations + other case laws)
   * @returns {Promise<Object>}
   */
  getDatabaseCounts: async () => {
    const response = await api.get('/api/cases/database-counts');
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
  searchCases: async (filters = {}, options = {}) => {
    const response = await api.post('/api/cases/search', filters, options);
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
   * Updates or deletes attachments for a case directly without editing the entire case
   * @param {string} id
   * @param {Array} attachments
   * @returns {Promise<Object>}
   */
  updateCaseAttachments: async (id, attachments) => {
    clientCaseCache.clear();
    const response = await api.patch(`/api/cases/${id}/attachments`, { attachments });
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
   * Returns the highest and next page number for a given year + magazine combination.
   * Used to auto-suggest the next page number when adding a publication.
   * @param {string} year  e.g. "2026"
   * @param {string} mag   e.g. "sld"
   * @returns {Promise<{maxPage: number|null, nextPage: number}>}
   */
  getMaxPage: async (year, mag) => {
    const response = await api.get(`/api/cases/max-page?year=${encodeURIComponent(year)}&mag=${encodeURIComponent(mag)}`);
    const maxPage = response.data?.maxPage ?? null;
    const nextPage = response.data?.nextPage ?? (maxPage != null ? maxPage + 1 : 1);
    return { maxPage, nextPage };
  },

  /**
   * Retrieves the latest existing SLD and next sequential SLD
   * @returns {Promise<{latestSld: number, nextSld: number}>}
   */
  getNextSld: async () => {
    const response = await api.get('/api/cases/next-sld');
    return response.data;
  },

  /**
   * Uploads an attachment file (PDF, Word, Image) for a case law record
   * @param {File} file
   * @returns {Promise<{name: string, url: string, size: string, type: string}>}
   */
  uploadAttachment: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/cases/upload-attachment', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data?.data;
  }
};
