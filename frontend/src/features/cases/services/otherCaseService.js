import api from '../../../services/api';

export const otherCaseService = {
  getOtherCases: async (query = '', judge = '', page = 1, limit = 25, sortField = 'srNumber', sortOrder = 'asc') => {
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
  }
};

export default otherCaseService;
