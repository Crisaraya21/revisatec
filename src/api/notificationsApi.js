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
   */
  list: async (params = {}) => {
    const queryString = buildQuery(params);
    const path = `/notifications${queryString}`;
    if (customBaseUrl) return requestDirect(path, { method: 'GET' });
    return api.get(path);
  },

  /**
   * Marca una notificacion individual como leida (PATCH /notifications/{id}/read).
   */
  markAsRead: async (id) => {
    const path = `/notifications/${id}/read`;
    if (customBaseUrl) return requestDirect(path, { method: 'PATCH' });
    return api.patch(path);
  },

  /**
   * Marca todas las notificaciones como leidas (PATCH /notifications/read-all).
   */
  markAllAsRead: async () => {
    const path = '/notifications/read-all';
    if (customBaseUrl) return requestDirect(path, { method: 'PATCH' });
    return api.patch(path);
  },

  /**
   * Obtiene la URL con token de Azure Web PubSub (GET /notifications/realtime-token).
   * Usada por realtimeClient.js para abrir la conexion WebSocket.
   */
  getRealtimeToken: async () => {
    const path = '/notifications/realtime-token';
    if (customBaseUrl) return requestDirect(path, { method: 'GET' });
    return api.get(path);
  },
};
