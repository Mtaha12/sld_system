import { MOCK_STATUTES } from '../data/statutesMockData.js';

let statutesData = [...MOCK_STATUTES];

export const statuteService = {
  getStatutes: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...statutesData]);
      }, 50);
    });
  },

  getStatuteById: async (idOrQuery) => {
    return new Promise((resolve) => {
      const clean = idOrQuery?.toString().toLowerCase().replace(/^statute\s*#?/i, '').replace(/^id\s*#?/i, '').trim();
      const found = statutesData.find(s => 
        s.id?.toString().toLowerCase() === clean ||
        s.law?.toLowerCase().includes(clean) ||
        s.section?.toLowerCase() === clean
      );
      setTimeout(() => {
        resolve(found || null);
      }, 50);
    });
  },

  searchStatutes: async (query = '') => {
    return new Promise((resolve) => {
      if (!query) {
        resolve([...statutesData]);
        return;
      }
      const q = query.toLowerCase().trim();
      const results = statutesData.filter(item => {
        const idMatch = item.id?.toString().includes(q);
        const lawMatch = item.law?.toLowerCase().includes(q);
        const chapMatch = item.chapter?.toLowerCase().includes(q);
        const secMatch = item.section?.toLowerCase().includes(q);
        const secHeadMatch = item.sectionHeading?.toLowerCase().includes(q);
        const deptMatch = item.department?.toLowerCase().includes(q);
        const headMatch = item.heading?.toLowerCase().includes(q);
        return idMatch || lawMatch || chapMatch || secMatch || secHeadMatch || deptMatch || headMatch;
      });
      setTimeout(() => {
        resolve(results);
      }, 50);
    });
  },

  createStatute: async (newStatute) => {
    return new Promise((resolve) => {
      const record = {
        ...newStatute,
        id: newStatute.id || Date.now(),
      };
      statutesData = [record, ...statutesData];
      setTimeout(() => {
        resolve({ success: true, data: record });
      }, 100);
    });
  },

  updateStatute: async (id, updatedFields) => {
    return new Promise((resolve) => {
      statutesData = statutesData.map(s => s.id === id ? { ...s, ...updatedFields } : s);
      const updated = statutesData.find(s => s.id === id);
      setTimeout(() => {
        resolve({ success: true, data: updated });
      }, 100);
    });
  },

  deleteStatute: async (id) => {
    return new Promise((resolve) => {
      statutesData = statutesData.filter(s => s.id !== id);
      setTimeout(() => {
        resolve({ success: true, id });
      }, 100);
    });
  }
};
