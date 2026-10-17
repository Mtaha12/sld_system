import api, { API_URL } from '../../../services/api';

/**
 * Constructs the absolute backend URL for streaming judgment documents inline in a new tab.
 * In production (Vercel), routes directly to the Hostinger VPS backend.
 */
export const getOtherCaseDocumentUrl = (targetDocId) => {
  if (!targetDocId) return null;
  const rawBase = (API_URL || '').trim().replace(/\/+$/, '');
  const base = rawBase || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/api/other-cases/view-document?id=${encodeURIComponent(targetDocId)}`;
};

export const otherCaseService = {
  getOtherCases: async (query = '', judge = '', page = 1, limit = 100, sortField = 'srNumber', sortOrder = 'asc') => {
    const params = { page, limit, sortField, sortOrder };
    if (query) params.query = query;
    if (judge) params.judge = judge;
    const res = await api.get('/api/other-cases', { params });
    return res.data;
  },
  getOtherCaseById: async (id) => {
    const res = await api.get(`/api/other-cases/${id}`);
    return res.data?.data;
  },
  getNextSr: async () => {
    const res = await api.get('/api/other-cases/next-sr');
    return res.data;
  },
  createOtherCase: async (data) => {
    const res = await api.post('/api/other-cases', data);
    return res.data?.data;
  },
  updateOtherCase: async (id, data) => {
    const res = await api.put(`/api/other-cases/${id}`, data);
    return res.data?.data;
  },
  deleteOtherCase: async (id) => {
    const res = await api.delete(`/api/other-cases/${id}`);
    return res.data;
  },
  getDocumentUrl: getOtherCaseDocumentUrl
};

export default otherCaseService;
