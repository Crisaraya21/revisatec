import { useState, useMemo, useCallback } from 'react';
import { INITIAL_MOCK_NOTIFICATIONS } from './mockNotifications';

/**
 * Hook para la gestión de notificaciones en el cliente (Fase A).
 * Inicializado con datos simulados alineados al contrato de MS3.
 *
 * Casos de prueba cubiertos:
 * 1. Inicialización: Carga inicial de items simulados, estado 'success' y conteo correcto de no leídas.
 * 2. markAsRead(id): Marca como leída una notificación específica y decrementa unreadCount sin mutar el arreglo original.
 * 3. markAllAsRead(): Marca todas las notificaciones como leídas, dejando unreadCount en 0.
 * 4. reload(): Simula recarga y refresco de estado para reconexión con MS3 en Fase B.
 *
 * @returns {{
 *   items: Array<object>,
 *   unreadCount: number,
 *   status: 'idle' | 'loading' | 'success' | 'error',
 *   error: string | null,
 *   markAsRead: (id: string) => void,
 *   markAllAsRead: () => void,
 *   reload: () => Promise<void>
 * }}
 */
export function useNotifications() {
  const [items, setItems] = useState(() => [...INITIAL_MOCK_NOTIFICATIONS]);
  const [status, setStatus] = useState('success');
  const [error, setError] = useState(null);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.read).length,
    [items]
  );

  const markAsRead = useCallback((id) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, read: true } : item
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setItems((prevItems) =>
      prevItems.map((item) => (item.read ? item : { ...item, read: true }))
    );
  }, []);

  const reload = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      // Simulación de carga asíncrona; en Fase B se conectará con notificationsApi.list()
      await new Promise((resolve) => setTimeout(resolve, 200));
      setItems([...INITIAL_MOCK_NOTIFICATIONS]);
      setStatus('success');
    } catch (err) {
      setError(err?.message || 'Error al recargar notificaciones');
      setStatus('error');
    }
  }, []);

  return {
    items,
    unreadCount,
    status,
    error,
    markAsRead,
    markAllAsRead,
    reload,
  };
}
