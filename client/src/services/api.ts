import axios from 'axios';

const BASE = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || '/api';

const api = axios.create({ baseURL: BASE, timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('insightbi_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('insightbi_token');
      localStorage.removeItem('insightbi_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Unauthenticated axios instance — no 401-redirect, no JWT header.
// Used by public report viewer and embed pages to fetch chart data.
export const publicApi = axios.create({ baseURL: BASE, timeout: 30000 });

// Auth
export const authAPI = {
  register: (data: { name: string; email: string; password: string }) => api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data: { name?: string; avatarUrl?: string }) => api.put('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.put('/auth/change-password', data),
};

// Workspaces
export const workspaceAPI = {
  list: () => api.get('/workspaces'),
  create: (data: { name: string; description?: string }) => api.post('/workspaces', data),
  get: (id: string) => api.get(`/workspaces/${id}`),
  update: (id: string, data: { name?: string; description?: string }) => api.put(`/workspaces/${id}`, data),
  delete: (id: string) => api.delete(`/workspaces/${id}`),
  inviteMember: (id: string, data: { email: string; role: string }) => api.post(`/workspaces/${id}/members`, data),
};

// Datasets
export const datasetAPI = {
  upload: (formData: FormData) => api.post('/datasets/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  list: (workspaceId?: string) => api.get('/datasets', { params: { workspaceId } }),
  get: (id: string) => api.get(`/datasets/${id}`),
  preview: (id: string, page = 1, limit = 50) => api.get(`/datasets/${id}/preview`, { params: { page, limit } }),
  rows: (id: string, params?: Record<string, unknown>) => api.get(`/datasets/${id}/rows`, { params }),
  delete: (id: string) => api.delete(`/datasets/${id}`),
  exportCsv: (id: string) => api.get(`/datasets/${id}/export/csv`, { responseType: 'blob' }),
};

// Transformations
export const transformAPI = {
  save: (id: string, data: { steps: unknown[]; name?: string }) => api.post(`/datasets/${id}/transform`, data),
  preview: (id: string, data: { steps: unknown[] }) => api.post(`/datasets/${id}/transform/preview`, data),
  apply: (id: string, data: { steps: unknown[] }) => api.post(`/datasets/${id}/transform/apply`, data),
  list: (id: string) => api.get(`/datasets/${id}/transformations`),
};

// Reports
export const reportAPI = {
  list: (workspaceId?: string) => api.get('/reports', { params: { workspaceId } }),
  create: (data: Record<string, unknown>) => api.post('/reports', data),
  get: (id: string) => api.get(`/reports/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.put(`/reports/${id}`, data),
  delete: (id: string) => api.delete(`/reports/${id}`),
  duplicate: (id: string) => api.post(`/reports/${id}/duplicate`),
  exportJson: (id: string) => api.get(`/reports/${id}/export/json`, { responseType: 'blob' }),
};

// Sharing
export const shareAPI = {
  share: (id: string, data: { email?: string; permission?: string }) => api.post(`/reports/${id}/share`, data),
  getShared: () => api.get('/shared'),
  getPublic: (token: string) => api.get(`/public/${token}`),
  disable: (id: string) => api.patch(`/share/${id}/disable`),
};

// Data Model
export const dataModelAPI = {
  get: (workspaceId: string) => api.get('/data-model', { params: { workspaceId } }),
  createRelationship: (data: Record<string, unknown>) => api.post('/data-model/relationships', data),
  deleteRelationship: (id: string) => api.delete(`/data-model/relationships/${id}`),
};

// Admin
export const adminAPI = {
  stats: () => api.get('/admin/stats'),
  users: (page = 1) => api.get('/admin/users', { params: { page } }),
  activity: (page = 1) => api.get('/admin/activity', { params: { page } }),
  updateUserRole: (id: string, role: string) => api.put(`/admin/users/${id}/role`, { role }),
  workspaces: () => api.get('/admin/workspaces'),
  reports:    () => api.get('/admin/reports'),
  datasets:   () => api.get('/admin/datasets'),
};

// Measures
export const measureAPI = {
  list: (workspaceId: string) => api.get('/measures', { params: { workspaceId } }),
  create: (data: Record<string, unknown>) => api.post('/measures', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/measures/${id}`, data),
  delete: (id: string) => api.delete(`/measures/${id}`),
  validate: (data: { expression: string; datasetId?: string }) => api.post('/measures/validate', data),
  preview: (data: { expression: string; datasetId: string }) => api.post('/measures/preview', data),
};

// Semantic Model
export const semanticModelAPI = {
  get: (workspaceId: string) => api.get('/semantic-model', { params: { workspaceId } }),
  query: (workspaceId: string, query: Record<string, unknown>) => api.post('/semantic-model/query', { workspaceId, query }),
  validateQuery: (workspaceId: string, query: Record<string, unknown>) => api.post('/semantic-model/validate-query', { workspaceId, query }),
};

// Embed
export const embedAPI = {
  createToken: (reportId: string, data?: Record<string, unknown>) => api.post(`/reports/${reportId}/embed-token`, data || {}),
  getReport: (token: string) => api.get(`/embed/reports/${token}`),
  getData: (token: string, params: Record<string, unknown>) => api.get(`/embed/reports/${token}/data`, { params }),
};

// Public (unauthenticated) data endpoints — used by PublicReportPage and EmbedReportPage
export const publicDataAPI = {
  /** Fetch report metadata via share-link token (no auth required) */
  getReport: (token: string) => publicApi.get(`/public/${token}`),
  /** Fetch chart data via share-link token (no auth required) */
  getRows: (token: string, params: Record<string, unknown>) =>
    publicApi.get(`/public/${token}/data`, { params }),
  /** Fetch report metadata via embed token (no auth required) */
  getEmbedReport: (token: string) => publicApi.get(`/embed/reports/${token}`),
  /** Fetch chart data via embed token (no auth required) */
  getEmbedRows: (token: string, params: Record<string, unknown>) =>
    publicApi.get(`/embed/reports/${token}/data`, { params }),
};

// Activity
export const activityAPI = {
  mine: () => api.get('/activity/mine'),
};

// Connections
export const connectionAPI = {
  list: (workspaceId: string) => api.get('/connections', { params: { workspaceId } }),
  test: (data: Record<string, unknown>) => api.post('/connections/test', data),
  create: (data: Record<string, unknown>) => api.post('/connections', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/connections/${id}`, data),
  delete: (id: string) => api.delete(`/connections/${id}`),
  getSchema: (id: string) => api.get(`/connections/${id}/schema`),
  importTable: (id: string, data: { tableName: string; workspaceId: string }) => api.post(`/connections/${id}/import-table`, data),
  queryPreview: (id: string) => api.post(`/connections/${id}/query-preview`, {}),
};
