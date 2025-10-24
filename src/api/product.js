import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api/v1/products',
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
  createProduct: data => api.post('/', data),
  updateProduct: (id, data) => api.put('/' + id, data),
  getProducts: ({ page = 1, limit = 10 } = {}) => 
    api.get('/', { 
      params: { page, limit } // Pass as query parameters [[8]]
    }),
    deleteProduct: (id) => api.delete('/' + id)
};