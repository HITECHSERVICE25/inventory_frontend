import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api/v1/auth',
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
  login: credentials => api.post('/login', credentials),
  register: userData => api.post('/register', userData),
  getMe: () => api.get('/me'),
  forgotPassword: email => api.post('/forgotpassword', { email }),
  resetPassword: (token, password) => api.put(`/resetpassword/${token}`, { password }),
  getUsers: ({ page = 1, limit = 25, search = '' } = {}) =>
    api.get('/users', {
      params: { page, limit, search }
    }),
  updateUser: (userId, userData) => api.put(`/users/${userId}`, userData),
};