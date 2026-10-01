import api from '../../../services/api';

export const customTariffService = {
  getCustomTariffs: async (query = '') => {
    const params = {};
    if (query) params.query = query;
    const res = await api.get('/api/custom-tariffs', { params });
    return res.data?.data || [];
  },
  getCustomTariffById: async (id) => {
    const res = await api.get(`/api/custom-tariffs/${id}`);
    return res.data?.data;
  },
  createCustomTariff: async (data) => {
    const res = await api.post('/api/custom-tariffs', data);
    return res.data?.data;
  },
  updateCustomTariff: async (id, data) => {
    const res = await api.put(`/api/custom-tariffs/${id}`, data);
    return res.data?.data;
  },
  deleteCustomTariff: async (id) => {
    const res = await api.delete(`/api/custom-tariffs/${id}`);
    return res.data;
  }
};

export default customTariffService;
