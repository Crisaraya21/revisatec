import { api } from '../lib/apiClient';

/**
 * Identidad y rol (MS1). Cuando APIM valide el token de Google (validate-jwt),
 * MS1 tomará el correo del encabezado X-User-Email que coloca APIM y el
 * parámetro email quedará solo como respaldo.
 */
export const identityApi = {
  /** GET /me?email= -> { role, name, email, courses, memberships } (404 si no está registrado) */
  me: (email) => api.get(`/me?${new URLSearchParams({ email })}`),
};
