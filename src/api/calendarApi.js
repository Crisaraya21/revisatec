import { api, buildQuery } from '../lib/apiClient';

export const calendarApi = {
  listEvents: (params) => api.get(`/calendar/events${buildQuery(params)}`),
  createEvent: (data) => api.post('/calendar/events', data),
  updateEvent: (id, data) => api.put(`/calendar/events/${id}`, data),
  removeEvent: (id) => api.delete(`/calendar/events/${id}`),
};
