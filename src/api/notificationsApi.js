import { api, buildQuery, ApiError } from '../lib/apiClient';

// Si se define VITE_NOTIFICATIONS_BASE_URL, se conecta directamente a MS3 local
// (sin pasar por APIM). Si no, todas las peticiones van por el apiClient central (APIM).
const customBaseUrl = import.meta.env.VITE_NOTIFICATIONS_BASE_URL?.replace(/\/+$/, '') || '';

/**
 * Funcion interna para peticiones directas a MS3 (solo cuando customBaseUrl esta definido).
 * En produccion y en desarrollo normal, se usa api.* del cliente central (APIM).
 */
async function requestDirect(path, options = {}) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${customBaseUrl}${cleanPath}`;

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.error || body?.message || `Error ${res.status} al solicitar ${cleanPath}`;
    throw new ApiError(res.status, message, body);
  }

  return body;
}

export const notificationsApi = {
  /**
   * Obtiene la lista paginada de notificaciones desde APIM (GET /notifications).
   * Soporta filtros segmentados por usuario: courseIds, groupIds y userEmail.
   */
  list: async (params = {}) => {
    const { userEmail, ...rest } = params;
    const queryParams = { ...rest };
    if (userEmail) {
      queryParams.userEmail = userEmail;
    }
    const queryString = buildQuery(queryParams);
    const path = `/notifications${queryString}`;
    const headers = {};
    if (userEmail) {
      headers['X-User-Email'] = userEmail;
    }

    if (customBaseUrl) return requestDirect(path, { method: 'GET', headers });
    return api.get(path, { headers });
  },

  /**
   * Marca una notificacion individual como leida (PATCH /notifications/{id}/read).
   * Asocia la lectura a la identidad del usuario para no marcarla a otros usuarios.
   */
  markAsRead: async (id, options = {}) => {
    const userEmail = typeof options === 'string' ? options : options.userEmail;
    const path = `/notifications/${id}/read`;
    const headers = {};
    if (userEmail) {
      headers['X-User-Email'] = userEmail;
    }

    if (customBaseUrl) return requestDirect(path, { method: 'PATCH', headers });
    return api.patch(path, undefined, { headers });
  },

  /**
   * Marca todas las notificaciones visibles para el usuario como leidas (PATCH /notifications/read-all).
   */
  markAllAsRead: async (options = {}) => {
    const { userEmail, courseIds, groupIds } = options;
    const queryString = buildQuery({ courseIds, groupIds });
    const path = `/notifications/read-all${queryString}`;
    const headers = {};
    if (userEmail) {
      headers['X-User-Email'] = userEmail;
    }

    if (customBaseUrl) return requestDirect(path, { method: 'PATCH', headers });
    return api.patch(path, undefined, { headers });
  },

  /**
   * Obtiene la URL con token de Azure Web PubSub (GET /notifications/realtime-token).
   * Pasa el rol/grupos e identidad del usuario para suscribirlo solo a sus cursos y grupo.
   */
  getRealtimeToken: async (params = {}) => {
    const queryString = buildQuery(params);
    const path = `/notifications/realtime-token${queryString}`;
    const headers = {};
    if (params.userEmail) {
      headers['X-User-Email'] = params.userEmail;
    }

    if (customBaseUrl) return requestDirect(path, { method: 'GET', headers });
    return api.get(path, { headers });
  },
};
