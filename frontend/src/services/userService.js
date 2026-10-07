import api from './api';

export const userService = {
  getUsers: async (params = {}) => {
    const res = await api.get('/api/users', { params });
    return res.data;
  },

  getUserById: async (id) => {
    const res = await api.get(`/api/users/${id}`);
    return res.data;
  },

  createUser: async (userData) => {
    const res = await api.post('/api/users', userData);
    return res.data;
  },

  updateUser: async (id, userData) => {
    const res = await api.put(`/api/users/${id}`, userData);
    return res.data;
  },

  changePassword: async (id, password) => {
    const res = await api.patch(`/api/users/${id}/password`, { password });
    return res.data;
  },

  deleteUser: async (id) => {
    const res = await api.delete(`/api/users/${id}`);
    return res.data;
  },

  toggleSpammer: async (id) => {
    const res = await api.patch(`/api/users/${id}/spammer`);
    return res.data;
  }
};
