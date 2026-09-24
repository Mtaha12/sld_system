import api from './api';

export const magazineService = {
  getMagazines: async (params = {}) => {
    const res = await api.get('/api/magazines', { params });
    return res.data;
  },
  createMagazine: async (data) => {
    const res = await api.post('/api/magazines', data);
    return res.data;
  },
  updateMagazine: async (id, data) => {
    const res = await api.put(`/api/magazines/${id}`, data);
    return res.data;
  },
  deleteMagazine: async (id) => {
    const res = await api.delete(`/api/magazines/${id}`);
    return res.data;
  }
};

export const courtService = {
  getCourts: async (params = {}) => {
    const res = await api.get('/api/courts', { params });
    return res.data;
  },
  createCourt: async (data) => {
    const res = await api.post('/api/courts', data);
    return res.data;
  },
  updateCourt: async (id, data) => {
    const res = await api.put(`/api/courts/${id}`, data);
    return res.data;
  },
  deleteCourt: async (id) => {
    const res = await api.delete(`/api/courts/${id}`);
    return res.data;
  }
};

export const ipBlockService = {
  getIpBlocks: async (params = {}) => {
    const res = await api.get('/api/ip-blocks', { params });
    return res.data;
  },
  createIpBlock: async (data) => {
    const res = await api.post('/api/ip-blocks', data);
    return res.data;
  },
  deleteIpBlock: async (id) => {
    const res = await api.delete(`/api/ip-blocks/${id}`);
    return res.data;
  }
};

export const replacementService = {
  executeReplacement: async (data) => {
    const res = await api.post('/api/replacement/execute', data);
    return res.data;
  },
  getHistory: async () => {
    const res = await api.get('/api/replacement/history');
    return res.data;
  }
};

export const adminService = {
  getAdmins: async (params = {}) => {
    const res = await api.get('/api/admins', { params });
    return res.data;
  },
  createAdmin: async (data) => {
    const res = await api.post('/api/admins', data);
    return res.data;
  },
  updateAdmin: async (id, data) => {
    const res = await api.put(`/api/admins/${id}`, data);
    return res.data;
  },
  deleteAdmin: async (id) => {
    const res = await api.delete(`/api/admins/${id}`);
    return res.data;
  }
};
