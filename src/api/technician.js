import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api/v1/technicians',
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
  createTechnician: data => api.post('/', data),
  updateTechnician: (id, data) => api.put('/' + id, data),
 getTechnicians: ({ page = 1, limit = 10, companyId, isBlocked } = {}) =>
  api.get('/', {
    params: {
      page,
      limit,
      ...(companyId && { companies: companyId }),
      ...(isBlocked !== undefined && { isBlocked }) // ensures false is also sent
    }
  }),

  updateBlockedStatus: (id, data) => api.patch('/' + id + '/block', data)
};