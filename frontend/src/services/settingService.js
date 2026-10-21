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
  // LEGAL MAXIMS
  // ============================
  getLegalMaxims: async (params = {}) => {
    const response = await api.get('/api/settings/legal-maxims', { params });
    return response.data;
  },

  createLegalMaxim: async (data) => {
    const response = await api.post('/api/settings/legal-maxims', data);
    return response.data;
  },

  updateLegalMaxim: async (id, data) => {
    const response = await api.put(`/api/settings/legal-maxims/${id}`, data);
    return response.data;
  },

  deleteLegalMaxim: async (id) => {
    const response = await api.delete(`/api/settings/legal-maxims/${id}`);
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

  // ============================
  // SECTIONS
  // ============================
  getSections: async (params = {}) => {
    const response = await api.get('/api/settings/sections', { params });
    return response.data;
  },

  createSection: async (data) => {
    const response = await api.post('/api/settings/sections', data);
    return response.data;
  },

  updateSection: async (id, data) => {
    const response = await api.put(`/api/settings/sections/${id}`, data);
    return response.data;
  },

  deleteSection: async (id) => {
    const response = await api.delete(`/api/settings/sections/${id}`);
    return response.data;
  },

  swapSections: async (sectionId1, sectionId2) => {
    const response = await api.post('/api/settings/sections/swap', { sectionId1, sectionId2 });
    return response.data;
  },

  // ============================
  // ARTICLES
  // ============================
  getArticles: async (params = {}) => {
    const response = await api.get('/api/settings/articles', { params });
    return response.data;
  },
  createArticle: async (data) => {
    const response = await api.post('/api/settings/articles', data);
    return response.data;
  },
  updateArticle: async (id, data) => {
    const response = await api.put(`/api/settings/articles/${id}`, data);
    return response.data;
  },
  deleteArticle: async (id) => {
    const response = await api.delete(`/api/settings/articles/${id}`);
    return response.data;
  },

  // ============================
  // TOPICS
  // ============================
  getTopics: async (params = {}) => {
    const response = await api.get('/api/settings/topics', { params });
    return response.data;
  },
  createTopic: async (data) => {
    const response = await api.post('/api/settings/topics', data);
    return response.data;
  },
  updateTopic: async (id, data) => {
    const response = await api.put(`/api/settings/topics/${id}`, data);
    return response.data;
  },
  deleteTopic: async (id) => {
    const response = await api.delete(`/api/settings/topics/${id}`);
    return response.data;
  },

  // ============================
  // WORDS & PHRASES
  // ============================
  getWordsPhrases: async (params = {}) => {
    const response = await api.get('/api/settings/words-phrases', { params });
    return response.data;
  },
  createWordPhrase: async (data) => {
    const response = await api.post('/api/settings/words-phrases', data);
    return response.data;
  },
  updateWordPhrase: async (id, data) => {
    const response = await api.put(`/api/settings/words-phrases/${id}`, data);
    return response.data;
  },
  deleteWordPhrase: async (id) => {
    const response = await api.delete(`/api/settings/words-phrases/${id}`);
    return response.data;
  },

  // ============================
  // LEGAL TERMS
  // ============================
  getLegalTerms: async (params = {}) => {
    const response = await api.get('/api/settings/legal-terms', { params });
    return response.data;
  },
  createLegalTerm: async (data) => {
    const response = await api.post('/api/settings/legal-terms', data);
    return response.data;
  },
  updateLegalTerm: async (id, data) => {
    const response = await api.put(`/api/settings/legal-terms/${id}`, data);
    return response.data;
  },
  deleteLegalTerm: async (id) => {
    const response = await api.delete(`/api/settings/legal-terms/${id}`);
    return response.data;
  },

  // ============================
  // REFERENCE VIEW ATTACHMENTS
  // ============================
  uploadReferenceView: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/settings/upload-reference-view', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default settingService;
