import api from './api';

const adminCache = new Map();
const getCachedData = async (key, fetcher, ttlMs = 5 * 60 * 1000) => {
  const cached = adminCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }
  const data = await fetcher();
  adminCache.set(key, { data, expiresAt: Date.now() + ttlMs });
  return data;
};

const invalidateAdminCache = (prefix) => {
  for (const k of adminCache.keys()) {
    if (k.startsWith(prefix)) adminCache.delete(k);
  }
};

export const magazineService = {
  getMagazines: async (params = {}) => {
    const key = `magazines_${JSON.stringify(params)}`;
    return getCachedData(key, async () => {
      const res = await api.get('/api/magazines', { params });
      return res.data;
    });
  },
  createMagazine: async (data) => {
    invalidateAdminCache('magazines');
    const res = await api.post('/api/magazines', data);
    return res.data;
  },
  updateMagazine: async (id, data) => {
    invalidateAdminCache('magazines');
    const res = await api.put(`/api/magazines/${id}`, data);
    return res.data;
  },
  deleteMagazine: async (id) => {
    invalidateAdminCache('magazines');
    const res = await api.delete(`/api/magazines/${id}`);
    return res.data;
  }
};

export const courtService = {
  getCourts: async (params = {}) => {
    const key = `courts_${JSON.stringify(params)}`;
    return getCachedData(key, async () => {
      const res = await api.get('/api/courts', { params });
      return res.data;
    });
  },
  createCourt: async (data) => {
    invalidateAdminCache('courts');
    const res = await api.post('/api/courts', data);
    return res.data;
  },
  updateCourt: async (id, data) => {
    invalidateAdminCache('courts');
    const res = await api.put(`/api/courts/${id}`, data);
    return res.data;
  },
  deleteCourt: async (id) => {
    invalidateAdminCache('courts');
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
  changePassword: async (id, password) => {
    const res = await api.patch(`/api/admins/${id}/password`, { password });
    return res.data;
  },
  deleteAdmin: async (id) => {
    const res = await api.delete(`/api/admins/${id}`);
    return res.data;
  }
};
