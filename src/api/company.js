import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api/v1/company',
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
  createCompany: data => api.post('/', data),
  getCompanies: ({ page = 1, limit = 10, search = '' } = {}) =>
    api.get('/', {
      params: { page, limit, search }
    }),
  updateCompany: (id, data) => api.put('/' + id, data),
  deleteCompany: (id) => api.delete('/' + id),
};