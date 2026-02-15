import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api/v1/orders',
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
  // Create Draft Order
  createDraftOrder: (data) => api.post('/drafts', data),

  updateDraftOrder: (id, data) => api.patch(`/drafts/${id}`, data),

  // Complete Order
  completeOrder: (id, data) => api.put(`/${id}/complete`, data),

  // Approve Discount with Split
  approveDiscount: (id, data) => api.patch(`/${id}/approve-discount`, data),

  // Reject Discount
  rejectDiscount: (id) => api.patch(`/${id}/reject-discount`),


// Get Draft Orders with pagination
getDraftOrders: ({ 
  page = 1, 
  limit = 10
} = {}) => api.get('/drafts', {
  params: {
    page,
    limit
  }
}),

// Export Orders by Date Range (for Excel)
exportOrders: ({ startDate, endDate }) =>
  api.get('/export', {
    params: {
      startDate,
      endDate
    },
    responseType: "blob"
  }),


  // Get Single Order
  getOrder: (id) => api.get(`/${id}`),

  // Update Order (for draft modifications)
  updateOrder: (id, data) => api.put(`/${id}`, data),
  
  // Optional: Delete Draft Order
  deleteDraft: (id) => api.delete(`/${id}`)
};