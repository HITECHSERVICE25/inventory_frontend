import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api/v1/dashboard',
});

// Add request interceptor to include token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default {
  /**
   * Get Dashboard Data
   * Optional params:
   * { startDate: '2026-02-01', endDate: '2026-02-28' }
   */
  getDashboard: (params) => api.get('/', { params }),
};