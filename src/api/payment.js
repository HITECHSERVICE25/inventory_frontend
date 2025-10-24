import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api/v1/payments',
});

// Add request interceptor to include token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


const paymentApi = {
  /**
   * Record a payment for a technician
   */
  recordPayment: (technicianId, paymentData) => 
    api.post(`/technicians/${technicianId}/payments`, paymentData),

  /**
   * Get outstanding balance for a technician
   */
  getTechnicianBalance: (technicianId) => 
    api.get(`/technicians/${technicianId}/balance`),

  /**
   * Get payment history for a specific technician
   */
  getTechnicianPaymentHistory: (technicianId, params = {}) => {
    const { page = 1, limit = 10, ...otherParams } = params;
    return api.get(`/technicians/${technicianId}/payments`, { 
      params: { page, limit, ...otherParams } 
    });
  },

  /**
   * Get all technicians with their outstanding balances
   */
  getTechniciansWithBalances: (params = {}) => {
    const { page = 1, limit = 20, ...filters } = params;
    return api.get('/technicians/balances', { 
      params: { page, limit, ...filters } 
    });
  },

  /**
   * Get all payments with advanced filtering
   */
  getPayments: (params = {}) => {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'collectedAt', 
      sortOrder = 'desc',
      ...filters 
    } = params;
    
    return api.get('/payments', { 
      params: { page, limit, sortBy, sortOrder, ...filters } 
    });
  },

  /**
   * Get detailed information for a specific payment
   */
  getPaymentDetails: (paymentId) => 
    api.get(`/${paymentId}`),

  /**
   * Generate comprehensive payment reports
   */
  generatePaymentReport: (params = {}) => {
    const { groupBy = 'day', ...dateParams } = params;
    return api.get('/payments/reports/analytics', { 
      params: { groupBy, ...dateParams } 
    });
  },

  /**
   * Utility method to get payment methods (static data)
   */
  getPaymentMethods: () => [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'check', label: 'Check' },
    { value: 'digital_wallet', label: 'Digital Wallet' }
  ]
};

export default paymentApi;