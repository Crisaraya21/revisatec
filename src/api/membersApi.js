import { api } from '../lib/apiClient';

/**
 * Integrantes de grupo (MS1). Todas las rutas entran por Azure APIM.
 */
export const membersApi = {
  /** GET /groups/{groupId}/members -> { groupId, totalRecords, members } */
  list: (groupId) => api.get(`/groups/${groupId}/members`),
  /** POST /groups/{groupId}/members -> integrante creado (201) */
  add: (groupId, data) => api.post(`/groups/${groupId}/members`, data),
  /** DELETE /groups/{groupId}/members/{memberId} */
  remove: (groupId, memberId) => api.delete(`/groups/${groupId}/members/${memberId}`),
  /** GET /members/me?email=&courseId= -> { member, group } (404 si no está asignado) */
  findMine: (email, courseId) =>
    api.get(`/members/me?${new URLSearchParams({ email, courseId: String(courseId) })}`),
};
