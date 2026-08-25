import { MOCK_NOTIFICATIONS } from '../data/notificationsMockData.js';

let notificationsData = [...MOCK_NOTIFICATIONS];

export const notificationService = {
  getNotifications: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...notificationsData]);
      }, 50);
    });
  },

  getNotificationById: async (idOrSr) => {
    return new Promise((resolve) => {
      const clean = idOrSr?.toString().toLowerCase().replace(/^sr\s*#?/i, '').replace(/^sro\s*#?/i, '').trim();
      const found = notificationsData.find(n => 
        n.srNumber?.toString().toLowerCase() === clean ||
        n.number?.toString().toLowerCase() === clean ||
        n.id?.toString() === clean ||
        n.sroNumber?.toLowerCase().includes(clean)
      );
      setTimeout(() => {
        resolve(found || null);
      }, 50);
    });
  },

  searchNotifications: async (query = '') => {
    return new Promise((resolve) => {
      if (!query) {
        resolve([...notificationsData]);
        return;
      }
      const q = query.toLowerCase().trim();
      const results = notificationsData.filter(item => {
        const srMatch = item.srNumber?.toString().includes(q);
        const numMatch = item.number?.toString().includes(q);
        const yearMatch = item.year?.toString().includes(q);
        const dateMatch = item.lawDate?.toLowerCase().includes(q);
        const sroMatch = item.sroNumber?.toLowerCase().includes(q);
        const subjectMatch = item.subject?.toLowerCase().includes(q);
        const deptMatch = item.department?.toLowerCase().includes(q);
        const statuteMatch = item.lawStatute?.toLowerCase().includes(q);
        const sectionMatch = item.section?.toLowerCase().includes(q);
        return srMatch || numMatch || yearMatch || dateMatch || sroMatch || subjectMatch || deptMatch || statuteMatch || sectionMatch;
      });
      setTimeout(() => {
        resolve(results);
      }, 50);
    });
  },

  createNotification: async (newNotif) => {
    return new Promise((resolve) => {
      const record = {
        ...newNotif,
        id: newNotif.id || Date.now(),
      };
      notificationsData = [record, ...notificationsData];
      setTimeout(() => {
        resolve({ success: true, data: record });
      }, 100);
    });
  },

  updateNotification: async (id, updatedFields) => {
    return new Promise((resolve) => {
      notificationsData = notificationsData.map(n => n.id === id ? { ...n, ...updatedFields } : n);
      const updated = notificationsData.find(n => n.id === id);
      setTimeout(() => {
        resolve({ success: true, data: updated });
      }, 100);
    });
  },

  deleteNotification: async (id) => {
    return new Promise((resolve) => {
      notificationsData = notificationsData.filter(n => n.id !== id);
      setTimeout(() => {
        resolve({ success: true, id });
      }, 100);
    });
  }
};
