import api from './api';

export const settingService = {
  // ============================
  // CITIES
  // ============================
  getCities: async (params = {}) => {
    const response = await api.get('/api/settings/cities', { params });
    return response.data;
  },

  createCity: async (data) => {
    const response = await api.post('/api/settings/cities', data);
    return response.data;
  },

  updateCity: async (id, data) => {
    const response = await api.put(`/api/settings/cities/${id}`, data);
    return response.data;
  },

  deleteCity: async (id) => {
    const response = await api.delete(`/api/settings/cities/${id}`);
    return response.data;
  },

  // ============================
  // PRINCIPLE OF LAWS
  // ============================
  getPrinciples: async (params = {}) => {
    const response = await api.get('/api/settings/principles', { params });
    return response.data;
  },

  createPrinciple: async (data) => {
    const response = await api.post('/api/settings/principles', data);
    return response.data;
  },

  updatePrinciple: async (id, data) => {
    const response = await api.put(`/api/settings/principles/${id}`, data);
    return response.data;
  },

  deletePrinciple: async (id) => {
    const response = await api.delete(`/api/settings/principles/${id}`);
    return response.data;
  },

  // ============================
  // LAWS / STATUTES
  // ============================
  getLaws: async (params = {}) => {
    const response = await api.get('/api/settings/laws', { params });
    return response.data;
  },

  createLaw: async (data) => {
    const response = await api.post('/api/settings/laws', data);
    return response.data;
  },

  updateLaw: async (id, data) => {
    const response = await api.put(`/api/settings/laws/${id}`, data);
    return response.data;
  },

  deleteLaw: async (id) => {
    const response = await api.delete(`/api/settings/laws/${id}`);
    return response.data;
  },

  swapLaws: async (lawId1, lawId2) => {
    const response = await api.post('/api/settings/laws/swap', { lawId1, lawId2 });
    return response.data;
  },
};

export default settingService;
