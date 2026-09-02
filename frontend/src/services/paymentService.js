import api from './api.js';

export const paymentService = {
  /**
   * Fetches dynamic payment instructions & accounts configuration
   */
  getPaymentInstructions: async () => {
    const response = await api.get('/api/payment/instructions');
    return response.data;
  },

  /**
   * Fetches the user's current payment and approval status
   * @param {string} email 
   */
  getPaymentStatus: async (email) => {
    const response = await api.get('/api/payment/status', {
      params: { email }
    });
    return response.data;
  },

  /**
   * Uploads payment proof file (multipart/form-data)
   * @param {FormData} formData 
   */
  uploadPaymentProof: async (formData) => {
    const response = await api.post('/api/payment/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * Retrieves review token details for the owner email review page
   * @param {string} token 
   */
  getReviewTokenInfo: async (token) => {
    const response = await api.get(`/api/payment/review/token-info/${token}`);
    return response.data;
  },

  /**
   * Approves a payment submission via single-use token
   * @param {string} token 
   */
  approveSubmission: async (token) => {
    const response = await api.post(`/api/payment/review/approve/${token}`);
    return response.data;
  },

  /**
   * Rejects a payment submission via single-use token with reason
   * @param {string} token 
   * @param {string} reason 
   */
  rejectSubmission: async (token, reason) => {
    const response = await api.post(`/api/payment/review/reject/${token}`, {
      reason
    });
    return response.data;
  }
};

export default paymentService;
