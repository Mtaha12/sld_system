import api from '../../../services/api';

export const dictionaryService = {
  getDictionary: async (params = {}) => {
    const queryParams = typeof params === 'string' ? (params ? { query: params } : {}) : (params || {});
    const res = await api.get('/api/dictionary', { params: queryParams });
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
  getDictionaryById: async (id) => {
    const res = await api.get(`/api/dictionary/${id}`);
    return res.data?.data;
  },
  createDictionary: async (data) => {
    const res = await api.post('/api/dictionary', data);
    return res.data?.data;
  },
  updateDictionary: async (id, data) => {
    const res = await api.put(`/api/dictionary/${id}`, data);
    return res.data?.data;
  },
  deleteDictionary: async (id) => {
    const res = await api.delete(`/api/dictionary/${id}`);
    return res.data;
  }
};

export default dictionaryService;
