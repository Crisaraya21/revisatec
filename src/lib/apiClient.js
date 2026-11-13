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

export function buildQuery(queryObj = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(queryObj)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value).trim());
    }
  }
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export const api = {
  get: (path, options = {}) => request(path, { method: 'GET', ...options }),
  post: (path, data, options = {}) =>
    request(path, { method: 'POST', body: JSON.stringify(data), ...options }),
  put: (path, data, options = {}) =>
    request(path, { method: 'PUT', body: JSON.stringify(data), ...options }),
  patch: (path, data, options = {}) =>
    request(path, {
      method: 'PATCH',
      body: data !== undefined ? JSON.stringify(data) : undefined,
      ...options,
    }),
  delete: (path, options = {}) => request(path, { method: 'DELETE', ...options }),
};
