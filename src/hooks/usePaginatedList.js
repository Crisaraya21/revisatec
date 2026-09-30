import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '../lib/apiClient';

// Sirve para CUALQUIER pantalla de listado (Grupos, Inconvenientes, etc.)
// porque todos los mocks del equipo deben responder con la misma forma:
// { items: [...], totalRecords, page, pageSize }
export function usePaginatedList(endpoint, { pageSize = 5 } = {}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [data, setData] = useState({ items: [], totalRecords: 0 });
  const [status, setStatus] = useState('idle'); // idle | loading | error | success
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const params = new URLSearchParams({ page, pageSize, search });
      const result = await api.get(`${endpoint}?${params}`);
      setData(result);
      setStatus('success');
    } catch (err) {
      // Aquí es donde se conectan los casos 400/404 de los mocks
      // con una alerta visible en la interfaz.
      setStatus('error');
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }, [endpoint, page, pageSize, search]);

  useEffect(() => { load(); }, [load]);

  // Buscar siempre regresa a la página 1
  const updateSearch = (value) => { setSearch(value); setPage(1); };

  return {
    items: data.items,
    totalRecords: data.totalRecords,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(data.totalRecords / pageSize)),
    search,
    status,
    error,
    setPage,
    setSearch: updateSearch,
    reload: load,
  };
}
