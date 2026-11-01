import { api, buildQuery, ApiError } from '../lib/apiClient';

const customBaseUrl = import.meta.env.VITE_NOTIFICATIONS_BASE_URL;

/**
 * Función interna para despachar peticiones a MS3.
 * Si se define VITE_NOTIFICATIONS_BASE_URL (desarrollo local directo contra MS3),
 * se conecta a esa URL; de lo contrario, utiliza el cliente central con Azure APIM.
 */
async function requestNotifications(path, options = {}) {
  if (!customBaseUrl) {
    return path.startsWith('/') ? path : `/${path}`;
  }

  const cleanBase = customBaseUrl.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${cleanBase}${cleanPath}`;

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
   * Obtiene la lista paginada de notificaciones.
   * @param {{ page?: number, pageSize?: number, search?: string }} params
   */
  list: async (params = {}) => {
    const queryString = buildQuery(params);
    const path = `/notifications${queryString}`;

    if (customBaseUrl) {
      return requestNotifications(path, { method: 'GET' });
    }
    return api.get(path);
  },

  /**
   * Marca una notificación individual como leída.
   * @param {string} id
   */
  markAsRead: async (id) => {
    const path = `/notifications/${id}/read`;
    if (customBaseUrl) {
      return requestNotifications(path, { method: 'PATCH' });
    }
    return api.patch(path);
  },

  /**
   * Marca masivamente todas las notificaciones pendientes como leídas.
   */
  markAllAsRead: async () => {
    const path = '/notifications/read-all';
    if (customBaseUrl) {
      return requestNotifications(path, { method: 'PATCH' });
    }
    return api.patch(path);
  },

  /**
   * Obtiene la URL con token temporal de acceso para Azure Web PubSub.
   * @returns {Promise<{ url: string, expiresAt: number }>}
   */
  getRealtimeToken: async () => {
    const path = '/notifications/realtime-token';
    if (customBaseUrl) {
      return requestNotifications(path, { method: 'GET' });
    }
    return api.get(path);
  },
};
