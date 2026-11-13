import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { INITIAL_MOCK_NOTIFICATIONS } from './mockNotifications';
import { notificationsApi } from '../api/notificationsApi';
import { connectRealtime } from './realtimeClient';
import { useAuth } from '../context/AuthContext';

const dataSource = import.meta.env.VITE_NOTIFICATIONS_SOURCE || 'api';

/**
 * Hook central para la gestión de notificaciones en tiempo real del frontend.
 * Segmenta la carga de eventos según la identidad del usuario (estudiante o profesor).
 */
export function useNotifications() {
  const isMock = dataSource === 'mock';
  const { user, isStudent, isProfessor } = useAuth();

  const userEmail = user?.email || '';

  // Cursos asignados (profesor) o matriculados (estudiante)
  const courseIds = useMemo(() => {
    if (!user) return '';
    if (isProfessor) {
      return (user.courses || []).map((c) => c.id).filter(Boolean).join(',');
    }
    return (user.memberships || [])
      .map((m) => m.course?.id || m.courseId)
      .filter(Boolean)
      .join(',');
  }, [user, isProfessor]);

  // Grupos a los que pertenece el usuario (solo estudiantes)
  const groupIds = useMemo(() => {
    if (!user || !isStudent) return '';
    return (user.memberships || [])
      .map((m) => m.group?.id || m.groupId)
      .filter(Boolean)
      .join(',');
  }, [user, isStudent]);

  const [items, setItems] = useState(() => (isMock ? [...INITIAL_MOCK_NOTIFICATIONS] : []));
  const [status, setStatus] = useState(isMock ? 'success' : 'loading');
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(isMock ? 'live' : 'connecting');
  const [lastIncomingNotification, setLastIncomingNotification] = useState(null);

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.read).length,
    [items]
  );

  /**
   * Recarga los datos desde la API filtrando según el usuario actual.
   */
  const reload = useCallback(async () => {
    if (isMock) {
      setError(null);
      try {
        await new Promise((resolve) => setTimeout(resolve, 150));
        setItems([...INITIAL_MOCK_NOTIFICATIONS]);
        setStatus('success');
      } catch (err) {
        setError(err?.message || 'Error al recargar notificaciones simuladas');
        setStatus('error');
      }
      return;
    }

    setError(null);
    try {
      const params = { page: 1, pageSize: 50 };
      if (userEmail) params.userEmail = userEmail;
      if (courseIds) params.courseIds = courseIds;
      if (groupIds) params.groupIds = groupIds;

      const response = await notificationsApi.list(params);
      const loaded = response?.items || response?.data || (Array.isArray(response) ? response : []);

      const sorted = [...loaded].sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      setItems(sorted);
      setStatus('success');
    } catch (err) {
      console.error('[Notifications] Error al cargar notificaciones:', err);
      setError(err?.message || 'No se pudieron cargar las notificaciones');
      setStatus('error');
    }
  }, [isMock, userEmail, courseIds, groupIds]);

  // Conexión de tiempo real cuando la fuente es 'api'
  useEffect(() => {
    if (isMock) {
      return;
    }

    let isMounted = true;

    async function fetchInitial() {
      try {
        const params = { page: 1, pageSize: 50 };
        if (userEmail) params.userEmail = userEmail;
        if (courseIds) params.courseIds = courseIds;
        if (groupIds) params.groupIds = groupIds;

        const response = await notificationsApi.list(params);
        if (!isMounted) return;
        const loaded = response?.items || response?.data || (Array.isArray(response) ? response : []);
        const sorted = [...loaded].sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
        setItems(sorted);
        setStatus('success');
      } catch (err) {
        if (!isMounted) return;
        console.error('[Notifications] Error al cargar notificaciones:', err);
        setError(err?.message || 'No se pudieron cargar las notificaciones');
        setStatus('error');
      }
    }

    fetchInitial();

    const client = connectRealtime({
      getUrl: () =>
        notificationsApi.getRealtimeToken({
          userEmail,
          courseIds,
          groupIds,
        }),
      onMessage: (message) => {
        if (!isMounted) return;
        if (message && message.data) {
          const newNotification = message.data;

          // Si el usuario es estudiante, verificar que pertenezca a su grupo
          if (isStudent && groupIds) {
            const studentGroupList = groupIds.split(',').map((id) => parseInt(id.trim(), 10));
            if (!studentGroupList.includes(Number(newNotification.groupId))) {
              return;
            }
          }

          // Si el usuario es profesor, verificar que pertenezca a sus cursos
          if (isProfessor && courseIds) {
            const profCourseList = courseIds.split(',').map((id) => parseInt(id.trim(), 10));
            if (!profCourseList.includes(Number(newNotification.courseId))) {
              return;
            }
          }

          setLastIncomingNotification(newNotification);

          setItems((prev) => {
            if (prev.some((item) => item.id === newNotification.id)) {
              return prev;
            }
            const updated = [newNotification, ...prev];
            updated.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
            return updated;
          });
        }
      },
      onStatus: (newStatus) => {
        if (!isMounted) return;
        setConnectionStatus(newStatus);
        if (newStatus === 'live') {
          reload();
        }
      },
    });

    return () => {
      isMounted = false;
      client.close();
    };
  }, [isMock, reload, userEmail, courseIds, groupIds, isStudent, isProfessor]);

  /**
   * Marca una notificación como leída con actualización optimista y vinculada al usuario.
   */
  const markAsRead = useCallback(
    async (id) => {
      const previousItems = itemsRef.current;

      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item))
      );

      if (isMock) return;

      try {
        await notificationsApi.markAsRead(id, { userEmail });
      } catch (err) {
        console.error(`[Notifications] Error al marcar leída #${id}:`, err);
        setItems(previousItems);
        setError('No se pudo actualizar el estado de la notificación');
      }
    },
    [isMock, userEmail]
  );

  /**
   * Marca todas las notificaciones como leídas con actualización optimista.
   */
  const markAllAsRead = useCallback(async () => {
    const previousItems = itemsRef.current;

    setItems((prev) =>
      prev.map((item) => (item.read ? item : { ...item, read: true }))
    );

    if (isMock) return;

    try {
      await notificationsApi.markAllAsRead({ userEmail, courseIds, groupIds });
    } catch (err) {
      console.error('[Notifications] Error al marcar todas como leídas:', err);
      setItems(previousItems);
      setError('No se pudieron marcar todas las notificaciones');
    }
  }, [isMock, userEmail, courseIds, groupIds]);

  return {
    items,
    unreadCount,
    status,
    error,
    connectionStatus,
    lastIncomingNotification,
    markAsRead,
    markAllAsRead,
    reload,
  };
}
