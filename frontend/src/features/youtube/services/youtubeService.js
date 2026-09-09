import api from '../../../services/api';

export const youtubeService = {
  getYoutubeUpdates: async (query = '') => {
    const params = query ? { query } : {};
    const res = await api.get('/api/youtube-updates', { params });
    return res.data?.data || [];
  },
  getYoutubeUpdateById: async (id) => {
    const res = await api.get(`/api/youtube-updates/${id}`);
    return res.data?.data;
  },
  createYoutubeUpdate: async (data) => {
    const res = await api.post('/api/youtube-updates', data);
    return res.data?.data;
  },
  updateYoutubeUpdate: async (id, data) => {
    const res = await api.put(`/api/youtube-updates/${id}`, data);
    return res.data?.data;
  },
  deleteYoutubeUpdate: async (id) => {
    const res = await api.delete(`/api/youtube-updates/${id}`);
    return res.data;
  }
};

export default youtubeService;
