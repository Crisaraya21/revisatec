import { useEffect, useState, useCallback, useRef } from 'react';
import { api, ApiError, buildQuery } from '../lib/apiClient';

// Sirve para CUALQUIER pantalla de listado (Grupos, Inconvenientes, etc.)
// porque todos los mocks del equipo deben responder con la misma forma:
// { items: [...], totalRecords, page, pageSize }
export function usePaginatedList(endpoint, { pageSize = 5, courseId } = {}) {
  const [pagination, setPagination] = useState(() => ({ courseId, page: 1 }));
  const page = Object.is(pagination.courseId, courseId) ? pagination.page : 1;
  const [search, setSearch] = useState('');
  const [data, setData] = useState({ items: [], totalRecords: 0 });
  const [loadedCourseId, setLoadedCourseId] = useState(courseId);
  const [status, setStatus] = useState('idle'); // idle | loading | error | success
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setStatus('loading');
    setError(null);
    try {
      const result = await api.get(`${endpoint}${buildQuery({ page, pageSize, search, courseId })}`);
      if (requestId !== requestIdRef.current) return;
      setData(result);
      setLoadedCourseId(courseId);
      setStatus('success');
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      // Aquí es donde se conectan los casos 400/404 de los mocks
      // con una alerta visible en la interfaz.
      setLoadedCourseId(courseId);
      setStatus('error');
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }, [endpoint, page, pageSize, search, courseId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // Buscar siempre regresa a la página 1
  const updateSearch = (value) => {
    setSearch(value);
    setPagination({ courseId, page: 1 });
  };
  const updatePage = (nextPage) => {
    setPagination((previous) => {
      const currentPage = Object.is(previous.courseId, courseId) ? previous.page : 1;
      return {
        courseId,
        page: typeof nextPage === 'function' ? nextPage(currentPage) : nextPage,
      };
    });
  };

  const isCurrentCourse = Object.is(loadedCourseId, courseId);
  const currentData = isCurrentCourse ? data : { items: [], totalRecords: 0 };
  const itemsList = Array.isArray(currentData?.content)
    ? currentData.content
    : Array.isArray(currentData?.items)
    ? currentData.items
    : [];
  const total =
    currentData?.totalElements ?? currentData?.totalRecords ?? itemsList.length;
  const calculatedTotalPages =
    currentData?.totalPages ?? Math.max(1, Math.ceil(total / pageSize));

  return {
    items: itemsList,
    totalRecords: total,
    page,
    pageSize,
    totalPages: calculatedTotalPages,
    search,
    status: isCurrentCourse ? status : 'loading',
    error: isCurrentCourse ? error : null,
    setPage: updatePage,
    setSearch: updateSearch,
    reload: load,
  };
}
