import api from '../../../services/api.js';

const STATUTE_CACHE_TTL_MS = 3 * 60 * 1000;
const STATUTE_CACHE_MAX = 100;
const statuteQueryCache = new Map();
let cachedDistinctLaws = null;
let cachedDistinctLawsTs = 0;

const attachMeta = (rows, meta) => {
  const arr = Array.isArray(rows) ? [...rows] : [];
  arr.total = meta.total;
  arr.dashboardTotal = meta.dashboardTotal;
  arr.totalPages = meta.totalPages;
  arr.currentPage = meta.currentPage;
  arr.pagination = {
    total: meta.total,
    totalPages: meta.totalPages,
    currentPage: meta.currentPage
  };
  return arr;
};

const clearStatuteClientCache = () => {
  statuteQueryCache.clear();
  cachedDistinctLaws = null;
  cachedDistinctLawsTs = 0;
};

export const statuteService = {
  /**
   * Fetches all statutes from backend with fast client-side LRU caching
   * @returns {Promise<Array>}
   */
  getStatutes: async (params = {}) => {
    const queryParams = typeof params === 'string' ? (params ? { query: params } : {}) : (params || {});
    const cacheKey = JSON.stringify(queryParams);
    const cached = statuteQueryCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < STATUTE_CACHE_TTL_MS) {
      statuteQueryCache.delete(cacheKey);
      statuteQueryCache.set(cacheKey, cached);
      return attachMeta(cached.rows, cached.meta);
    }

    const response = await api.get('/api/statutes', { params: queryParams });
    const rows = response.data?.data || [];
    const meta = {
      total: response.data?.total ?? rows.length,
      dashboardTotal: response.data?.dashboardTotal,
      totalPages: response.data?.totalPages ?? 1,
      currentPage: response.data?.currentPage ?? 1
    };

    if (statuteQueryCache.size >= STATUTE_CACHE_MAX) {
      const oldest = statuteQueryCache.keys().next().value;
      statuteQueryCache.delete(oldest);
    }
    statuteQueryCache.set(cacheKey, { ts: Date.now(), rows, meta });
    return attachMeta(rows, meta);
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
   * Retrieves the latest existing and next sequential Statute SR #
   * @param {string} [law] Optional law name to get previous entry for that specific law
   * @returns {Promise<{latestSr: number, nextSr: number, lastEntry: Object}>}
   */
  getNextSr: async (law = '') => {
    const response = await api.get('/api/statutes/next-sr', {
      params: law ? { law } : {}
    });
    return response.data;
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
   * Upload single attachment document for a statute provision block
   * @param {File} file
   * @returns {Promise<{success: boolean, url: string, name: string, size: number, type: string}>}
   */
  uploadAttachment: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/statutes/upload-attachment', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  /**
   * Creates a new statute entry
   * @param {Object} newStatute 
   * @returns {Promise<Object>}
   */
  createStatute: async (newStatute) => {
    const response = await api.post('/api/statutes', newStatute);
    clearStatuteClientCache();
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
    clearStatuteClientCache();
    return response.data;
  },

  /**
   * Soft-deletes a statute record
   * @param {string} id 
   * @returns {Promise<Object>}
   */
  deleteStatute: async (id) => {
    const response = await api.delete(`/api/statutes/${id}`);
    clearStatuteClientCache();
    return response.data;
  },

  /**
   * Updates the latest fromDate of all statutes belonging to a law
   * @param {string} law
   * @param {string} date
   * @returns {Promise<Object>}
   */
  updateLawDate: async (law, date) => {
    const response = await api.post('/api/statutes/update-law-date', { law, date });
    clearStatuteClientCache();
    return response.data;
  },

  /**
   * Retrieves all distinct law names in statutes
   * @returns {Promise<Array<string>>}
   */
  getDistinctLaws: async () => {
    if (cachedDistinctLaws && Date.now() - cachedDistinctLawsTs < 10 * 60 * 1000) {
      return cachedDistinctLaws;
    }
    const response = await api.get('/api/statutes/laws');
    const res = response.data;
    const list = Array.isArray(res) ? res : (res?.data || []);
    cachedDistinctLaws = list;
    cachedDistinctLawsTs = Date.now();
    return list;
  },

  /**
   * Retrieves latest statute metadata (law, chapter, heading, department)
   * @param {string} [law]
   * @returns {Promise<Object|null>}
   */
  getLatestStatuteMeta: async (law = '') => {
    const response = await api.get('/api/statutes/latest-meta', {
      params: law ? { law } : {}
    });
    return response.data?.data || null;
  }
};
