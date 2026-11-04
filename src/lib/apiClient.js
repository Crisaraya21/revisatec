// Cliente central de la API - Azure API Management (APIM).
// La URL base y la clave NUNCA se hardcodean ni se suben al repo:
// vienen de variables de entorno que GitHub Actions inyecta en el build.
//
// Arquitectura de proxies en desarrollo (vite.config.js):
//   /revisatec-api  -> APIM /revisatec  (MS1: cursos, grupos, calendario)
//   /notifications  -> APIM /revisatec/notifications  (MS3: notificaciones de Cris)
//
// En produccion (Azure Static Web Apps) no hay proxy: todo va directo al APIM con CORS.

const isDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

/** Resuelve la URL absoluta para una ruta dada, usando el proxy de Vite en dev. */
function resolveUrl(path) {
  if (isDev) {
    // Las rutas de notificaciones tienen su propio proxy en Vite
    if (path.startsWith('/notifications')) {
      return path; // proxy: /notifications -> APIM /revisatec/notifications
    }
    // El resto de rutas van por el proxy de MS1
    return `/revisatec-api${path}`;
  }

  // Produccion: URL absoluta al APIM
  const base =
    import.meta.env.VITE_API_BASE_URL ||
    'https://apimanagementcristopherarayavega.azure-api.net/revisatec';
  return `${base.replace(/\/+$/, '')}${path}`;
}

const API_SUBSCRIPTION_KEY =
  import.meta.env.VITE_API_SUBSCRIPTION_KEY ||
  import.meta.env.VITE_API_KEY ||
  '';

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request(path, options = {}) {
  const url = resolveUrl(path);
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Solo adjuntar la subscription key si existe (en produccion siempre existe)
  if (API_SUBSCRIPTION_KEY) {
    headers['Ocp-Apim-Subscription-Key'] = API_SUBSCRIPTION_KEY;
  }

  const res = await fetch(url, { ...options, headers });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      body?.error || body?.message || `Error ${res.status} al llamar ${path}`;
    throw new ApiError(res.status, message, body);
  }
  return body;
}

export function buildQuery({ page, pageSize, search, courseId } = {}) {
  const params = new URLSearchParams();
  if (page !== undefined && page !== null) params.set('page', String(page));
  if (pageSize !== undefined && pageSize !== null) params.set('pageSize', String(pageSize));
  if (search !== undefined && search !== null && search.trim() !== '') params.set('search', search.trim());
  if (courseId !== undefined && courseId !== null) params.set('courseId', String(courseId));
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, data) =>
    request(path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path, data) =>
    request(path, { method: 'PUT', body: JSON.stringify(data) }),
  patch: (path, data) =>
    request(path, {
      method: 'PATCH',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
