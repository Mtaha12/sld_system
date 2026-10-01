import api from '../../../services/api';

export const invoiceService = {
  getInvoices: async (query = '') => {
    const params = {};
    if (query) params.query = query;
    const res = await api.get('/api/invoices', { params });
    return res.data?.data || [];
  },
  getInvoiceById: async (id) => {
    const res = await api.get(`/api/invoices/${id}`);
    return res.data?.data;
  },
  createInvoice: async (data) => {
    const res = await api.post('/api/invoices', data);
    return res.data?.data;
  },
  updateInvoice: async (id, data) => {
    const res = await api.put(`/api/invoices/${id}`, data);
    return res.data?.data;
  },
  deleteInvoice: async (id) => {
    const res = await api.delete(`/api/invoices/${id}`);
    return res.data;
  }
};

export default invoiceService;
