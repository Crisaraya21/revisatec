import { api, buildQuery } from '../lib/apiClient';

export const coursesApi = {
  list: (params) => api.get(`/courses${buildQuery(params)}`),
  get: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  remove: (id) => api.delete(`/courses/${id}`),
};
