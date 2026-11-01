import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { INITIAL_MOCK_NOTIFICATIONS } from './mockNotifications';
import { notificationsApi } from '../api/notificationsApi';
import { connectRealtime } from './realtimeClient';

const dataSource = import.meta.env.VITE_NOTIFICATIONS_SOURCE || 'api';

/**
 * Hook central para la gestión de notificaciones en tiempo real del frontend.
 * Soporta fuentes de datos 'api' (con WebSocket de Web PubSub) y 'mock'.
 *
 * @returns {{
 *   items: Array<object>,
 *   unreadCount: number,
 *   status: 'idle' | 'loading' | 'success' | 'error',
 *   error: string | null,
 *   connectionStatus: 'connecting' | 'live' | 'reconnecting' | 'offline',
 *   lastIncomingNotification: object | null,
 *   markAsRead: (id: string) => Promise<void>,
 *   markAllAsRead: () => Promise<void>,
 *   reload: () => Promise<void>
 * }}
 */
export function useNotifications() {
  const isMock = dataSource === 'mock';

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
   * Recarga los datos desde la API o mock.
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
      const response = await notificationsApi.list({ page: 1, pageSize: 50 });
      const loaded = response?.data || response?.items || (Array.isArray(response) ? response : []);

      const sorted = [...loaded].sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      setItems(sorted);
      setStatus('success');
    } catch (err) {
      console.error('[Notifications] Error al cargar notificaciones:', err);
      setError(err?.message || 'No se pudieron cargar las notificaciones');
      setStatus('error');
    }
  }, [isMock]);

  // Conexión de tiempo real cuando la fuente es 'api'
  useEffect(() => {
    if (isMock) {
      return;
    }

    let isMounted = true;

    async function fetchInitial() {
      try {
        const response = await notificationsApi.list({ page: 1, pageSize: 50 });
        if (!isMounted) return;
        const loaded = response?.data || response?.items || (Array.isArray(response) ? response : []);
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
      getUrl: () => notificationsApi.getRealtimeToken(),
      onMessage: (message) => {
        if (!isMounted) return;
        if (message && message.data) {
          const newNotification = message.data;
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
  }, [isMock, reload]);

  /**
   * Marca una notificación como leída con actualización optimista.
   */
  const markAsRead = useCallback(async (id) => {
    const previousItems = itemsRef.current;

    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );

    if (isMock) return;

    try {
      await notificationsApi.markAsRead(id);
    } catch (err) {
      console.error(`[Notifications] Error al marcar leída #${id}:`, err);
      setItems(previousItems);
      setError('No se pudo actualizar el estado de la notificación');
    }
  }, [isMock]);

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
      await notificationsApi.markAllAsRead();
    } catch (err) {
      console.error('[Notifications] Error al marcar todas como leídas:', err);
      setItems(previousItems);
      setError('No se pudieron marcar todas las notificaciones');
    }
  }, [isMock]);

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
