import api from './api';

export const aiChatService = {
  createSession: async (sldNumber) => {
    const response = await api.post('/api/ai-chat/sessions', { sld_number: sldNumber });
    return response.data;
  },

  getUserSessions: async () => {
    const response = await api.get('/api/ai-chat/sessions');
    return response.data;
  },

  getSession: async (sessionId) => {
    const response = await api.get('/api/ai-chat/sessions/' + sessionId);
    return response.data;
  },

  sendMessage: async (sessionId, message) => {
    const response = await api.post('/api/ai-chat/sessions/' + sessionId + '/messages', { message });
    return response.data;
  }
};
