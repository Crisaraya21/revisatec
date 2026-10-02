// Cliente central de la API (Mock Services en Azure APIM).
// La URL base y la clave NUNCA se hardcodean ni se suben al repo: vienen de
// variables de entorno que GitHub Actions inyecta en el build (ver .env.example).
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://apimanagementcristopherarayavega.azure-api.net/revisatec';

const API_KEY =
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
      'Ocp-Apim-Subscription-Key': API_KEY,
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

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};