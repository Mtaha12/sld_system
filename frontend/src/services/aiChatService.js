import api from './api';

export const aiChatService = {
  createSession: async (sldNumber, title) => {
    const response = await api.post('/api/ai-chat/sessions', { sld_number: sldNumber, title });
    return response.data?.data;
  },

  getUserSessions: async () => {
    const response = await api.get('/api/ai-chat/sessions');
    return response.data?.data || [];
  },

  getSession: async (sessionId) => {
    const response = await api.get(`/api/ai-chat/sessions/${sessionId}`);
    return response.data?.data;
  },

  sendMessage: async (sessionId, message, focusNode = null) => {
    const response = await api.post(`/api/ai-chat/sessions/${sessionId}/messages`, { 
      message,
      focusNode 
    });
    return response.data?.data;
  },

  queryLegalCore: async (query, focusNode = null) => {
    const response = await api.post('/api/ai-chat/query', { 
      query,
      focusNode 
    });
    return response.data?.data;
  },

  clearSession: async (sessionId) => {
    const response = await api.post(`/api/ai-chat/sessions/${sessionId}/clear`);
    return response.data?.data;
  }
};

export default aiChatService;
