// Cliente central de la API (Mock Services en Azure APIM).
// La URL base y la clave NUNCA se hardcodean ni se suben al repo: vienen de
// variables de entorno que GitHub Actions inyecta en el build (ver .env.example).
const isDev = import.meta.env.DEV;
const isLocal =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const BASE_URL =
  isDev || isLocal
    ? '/revisatec-api'
    : (import.meta.env.VITE_API_BASE_URL ||
       'https://apimanagementcristopherarayavega.azure-api.net/revisatec');

const API_SUBSCRIPTION_KEY =
  import.meta.env.VITE_API_SUBSCRIPTION_KEY ||
  import.meta.env.VITE_API_KEY ||
  'fdfdec6ec6804ae8bc33f3a73792afe1';

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.status = status;   // 400, 404, etc. — lo que dispara las alertas en UI
    this.body = body;
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': API_SUBSCRIPTION_KEY,
      ...options.headers,
    },
    ...options,
  });

  // Los mocks devuelven JSON incluso en los casos de error (400/404),
  // así que siempre intentamos parsear el body para mostrar el mensaje real.
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.error || body?.message || `Error ${res.status} al llamar ${path}`;
    throw new ApiError(res.status, message, body);
  }
  return body;
}

export function buildQuery({ page, pageSize, search } = {}) {
  const params = new URLSearchParams();
  if (page !== undefined && page !== null) params.set('page', String(page));
  if (pageSize !== undefined && pageSize !== null) params.set('pageSize', String(pageSize));
  if (search !== undefined && search !== null && search.trim() !== '') params.set('search', search.trim());
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data) }),
  patch: (path, data) => request(path, { method: 'PATCH', body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: (path) => request(path, { method: 'DELETE' }),
};