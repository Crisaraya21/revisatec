import { api, buildQuery } from '../lib/apiClient';

export const groupsApi = {
  list: (params) => api.get(`/groups${buildQuery(params)}`),
  get: (id) => api.get(`/groups/${id}`),
  create: (data) => api.post('/groups', data),
  update: (id, data) => api.put(`/groups/${id}`, data),
  remove: (id) => api.delete(`/groups/${id}`),
};
