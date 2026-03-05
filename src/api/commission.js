import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api/v1/commissions',
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
  createCommission: (data) => api.post(`/`, data),
  updateCommission: (technicianId, productId, data) => api.put(`/${technicianId}/${productId}`, data),
  getCommissions: (params = {}) =>
    api.get('/', { params }),
  deleteCommission: (id) =>
    api.delete(`/${id}`)
};