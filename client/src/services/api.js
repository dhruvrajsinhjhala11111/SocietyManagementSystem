import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),
  uploadAvatar: (formData) => api.post('/auth/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  selectFlat: (data) => api.put('/auth/select-flat', data),
  getPendingUsers: () => api.get('/auth/pending-users'),
  verifyUser: (userId, data) => api.put(`/auth/verify/${userId}`, data),
  getAllUsers: (params) => api.get('/auth/users', { params }),
  createUser: (data) => api.post('/auth/users', data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
  getEmailLogs: () => api.get('/auth/email-logs'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  oauthLogin: (data) => api.post('/auth/oauth/login', data),
  bindOAuth: (data) => api.post('/auth/oauth/bind', data),
  unbindOAuth: (provider) => api.delete(`/auth/oauth/unbind/${provider}`),
  addFamily: (data) => api.post('/auth/family', data),
  removeFamily: (id) => api.delete(`/auth/family/${id}`),
};

// Properties
export const propertyAPI = {
  getAll: (params) => api.get('/properties', { params }),
  getOne: (id) => api.get(`/properties/${id}`),
  create: (data) => api.post('/properties', data),
  bulkCreate: (data) => api.post('/properties/bulk', data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  delete: (id) => api.delete(`/properties/${id}`),
  getVacant: () => api.get('/properties/vacant'),
  getStats: () => api.get('/properties/stats'),
};

// Visitors
export const visitorAPI = {
  createPass: (data) => api.post('/visitors', data),
  verifyCode: (data) => api.post('/visitors/verify', data),
  checkIn: (id) => api.put(`/visitors/${id}/checkin`),
  checkOut: (id) => api.put(`/visitors/${id}/checkout`),
  requestApproval: (data) => api.post('/visitors/request-approval', data),
  respond: (id, data) => api.put(`/visitors/${id}/respond`, data),
  getAll: (params) => api.get('/visitors', { params }),
  getActive: () => api.get('/visitors/active'),
};

// Billing
export const billingAPI = {
  generate: (data) => api.post('/billing/generate', data),
  createCustom: (data) => api.post('/billing/custom', data),
  getAll: (params) => api.get('/billing', { params }),
  getMyBills: () => api.get('/billing/my-bills'),
  getPaymentConfig: () => api.get('/billing/payment-config'),
  updatePaymentConfig: (data) => api.post('/billing/payment-config', data),
  resetPaymentConfig: () => api.post('/billing/reset-payment-config'),
  validateUPI: (data) => api.post('/billing/validate-upi', data),
  validateCard: (data) => api.post('/billing/validate-card', data),
  createRazorpayOrder: (id) => api.post(`/billing/${id}/create-razorpay-order`),
  verifyPayment: (id, data) => api.post(`/billing/${id}/verify-payment`, data),
  pay: (id, data) => api.post(`/billing/${id}/pay`, data),
  getStats: (params) => api.get('/billing/stats', { params }),
  sendReminder: (id) => api.post(`/billing/${id}/remind`),
  markOverdue: () => api.post('/billing/mark-overdue'),
};

// Tickets
export const ticketAPI = {
  create: (data) => api.post('/tickets', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAll: (params) => api.get('/tickets', { params }),
  getOne: (id) => api.get(`/tickets/${id}`),
  assign: (id, data) => api.put(`/tickets/${id}/assign`, data),
  updateStatus: (id, data) => api.put(`/tickets/${id}/status`, data),
  rate: (id, data) => api.put(`/tickets/${id}/rate`, data),
  getStats: () => api.get('/tickets/stats'),
};

// Notices
export const noticeAPI = {
  create: (data) => api.post('/notices', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAll: (params) => api.get('/notices', { params }),
  getOne: (id) => api.get(`/notices/${id}`),
  update: (id, data) => api.put(`/notices/${id}`, data),
  delete: (id) => api.delete(`/notices/${id}`),
};

// Bookings
export const bookingAPI = {
  createFacility: (data) => api.post('/bookings/facilities', data),
  getFacilities: () => api.get('/bookings/facilities'),
  updateFacility: (id, data) => api.put(`/bookings/facilities/${id}`, data),
  getAvailability: (facilityId, params) => api.get(`/bookings/availability/${facilityId}`, { params }),
  create: (data) => api.post('/bookings', data),
  getAll: (params) => api.get('/bookings', { params }),
  cancel: (id) => api.put(`/bookings/${id}/cancel`),
  pay: (id) => api.post(`/bookings/${id}/pay`),
};

// Notifications
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// Seed
export const seedAPI = {
  seed: () => api.post('/seed'),
};

export default api;
