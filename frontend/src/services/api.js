import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

// Response interceptor for unified error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Network Error';
    return Promise.reject(new Error(message));
  }
);

export const ConversationAPI = {
  list: (params) => api.get('/conversations', { params }),
  get: (id) => api.get(`/conversations/${id}`),
  override: (id, payload) => api.patch(`/conversations/${id}/override`, payload),
  resetField: (id, payload) => api.post(`/conversations/${id}/reset-field`, payload),
  reanalyze: (id) => api.post(`/conversations/${id}/reanalyze`),
  bulk: (payload) => api.post('/conversations/bulk', payload)
};

export const MetricsAPI = {
  getDashboard: (params) => api.get('/metrics/dashboard', { params })
};

export const ImportAPI = {
  preview: (formData) => api.post('/imports/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  previewJson: (jsonData) => api.post('/imports/preview', { jsonData }),
  commit: (payload) => api.post('/imports/commit', payload),
  getBatches: () => api.get('/imports/batches'),
  getBatchDetails: (id) => api.get(`/imports/batches/${id}`)
};

export const RoutingAPI = {
  getAudit: (params) => api.get('/routing/audit', { params }),
  getRules: () => api.get('/routing/rules'),
  updateRule: (ruleId, payload) => api.patch(`/routing/rules/${ruleId}`, payload)
};

export const FindingsAPI = {
  getFindings: () => api.get('/findings')
};

export const FollowUpAPI = {
  list: (params) => api.get('/follow-ups', { params }),
  update: (id, payload) => api.patch(`/follow-ups/${id}`, payload)
};

export const ExportAPI = {
  generate: (filters) => api.post('/exports/generate', { filters }),
  getJobs: () => api.get('/exports/jobs'),
  getDownloadUrl: (exportId, filename) => `/api/exports/${exportId}/download/${filename}`,
  getZipDownloadUrl: (exportId) => `/api/exports/${exportId}/download-zip`
};

export const SystemAPI = {
  health: () => api.get('/health'),
  seed: () => api.post('/admin/seed')
};

export default api;
