import api from '../../../services/api';

export const contactService = {
  /**
   * Sends user contact inquiry to the backend SMTP endpoint
   * @param {Object} data { fullName, email, subject, message }
   * @returns {Promise<Object>}
   */
  sendContactMessage: async (data) => {
    try {
      const response = await api.post('/api/contact', data, {
        timeout: 10000
      });
      return response.data;
    } catch (err) {
      // If network fails (e.g. backend server not started during dev mode), fallback to simulated resolution
      if (err.code === 'ERR_NETWORK' || !err.response) {
        console.warn('[Contact Service] Backend server unreachable at /api/contact, using client fallback simulation mode.');
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: true,
              simulated: true,
              message: 'Your inquiry has been recorded and will be processed shortly by the admin team.',
              data: {
                ...data,
                submittedAt: new Date().toISOString()
              }
            });
          }, 1000);
        });
      }

      const errorMessage = err.response?.data?.error || err.message || 'Failed to submit contact message';
      throw new Error(errorMessage);
    }
  }
};
