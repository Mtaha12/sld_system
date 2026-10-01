import api from '../../../services/api';

export const taxCardService = {
  getTaxCards: async (query = '') => {
    const params = {};
    if (query) params.query = query;
    const res = await api.get('/api/tax-cards', { params });
    return res.data?.data || [];
  },
  getTaxCardById: async (id) => {
    const res = await api.get(`/api/tax-cards/${id}`);
    return res.data?.data;
  },
  createTaxCard: async (data) => {
    const res = await api.post('/api/tax-cards', data);
    return res.data?.data;
  },
  updateTaxCard: async (id, data) => {
    const res = await api.put(`/api/tax-cards/${id}`, data);
    return res.data?.data;
  },
  deleteTaxCard: async (id) => {
    const res = await api.delete(`/api/tax-cards/${id}`);
    return res.data;
  }
};

export default taxCardService;
