import { api, buildQuery } from '../lib/apiClient';

export const notificationsApi = {
  list: (params) => api.get(`/notifications${buildQuery(params)}`),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
};
