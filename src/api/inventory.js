import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api/v1/inventory',
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
  createAllocation: data => api.post('/allocate', data),
  getAllocationLogs: ({ page = 1, limit = 10 } = {}) => 
    api.get('/logs', { 
      params: { page, limit } // Pass as query parameters [[8]]
    }),
};