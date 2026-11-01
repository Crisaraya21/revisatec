/**
 * Cliente de tiempo real para Azure Web PubSub utilizando WebSocket nativo del navegador.
 *
 * Estados de conexión posibles:
 * - 'connecting'   : Solicitando token y abriendo socket inicial.
 * - 'live'         : Conectado y escuchando eventos en vivo.
 * - 'reconnecting' : Conexión perdida, reintentando con backoff exponencial y token nuevo.
 * - 'offline'      : Conexión cerrada intencionalmente o servicio no disponible.
 */

const BASE_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

/**
 * Inicia la conexión de tiempo real.
 *
 * @param {object} options
 * @param {() => Promise<{ url: string, expiresAt: number }>} options.getUrl - Función para obtener URL y token fresco
 * @param {(message: object) => void} options.onMessage - Manejador de eventos entrantes
 * @param {(status: 'connecting' | 'live' | 'reconnecting' | 'offline') => void} options.onStatus - Manejador de cambio de estado
 * @returns {{ close: () => void }} Objeto para cancelar y cerrar la conexión
 */
export function connectRealtime({ getUrl, onMessage, onStatus }) {
  let ws = null;
  let isClosed = false;
  let reconnectTimer = null;
  let reconnectAttempt = 0;

  function updateStatus(status) {
    if (typeof onStatus === 'function') {
      onStatus(status);
    }
  }

  function scheduleReconnect() {
    if (isClosed) return;

    updateStatus('reconnecting');

    // Backoff exponencial con jitter: min(1000 * 2^attempt, 30000) + random(0..1000)
    const factor = Math.min(Math.pow(2, reconnectAttempt), 30);
    const delay = Math.min(BASE_RECONNECT_MS * factor, MAX_RECONNECT_MS) + Math.random() * 1000;
    reconnectAttempt += 1;

    reconnectTimer = setTimeout(() => {
      if (!isClosed) {
        attemptConnection();
      }
    }, delay);
  }

  async function attemptConnection() {
    if (isClosed) return;

    if (reconnectAttempt === 0) {
      updateStatus('connecting');
    }

    let tokenData;
    try {
      tokenData = await getUrl();
    } catch {
      // Si falla obtener el token (ej. 503 servicio apagado o sin red), reintentar
      scheduleReconnect();
      return;
    }

    if (isClosed) return;

    const wsUrl = tokenData?.url;
    if (!wsUrl || typeof wsUrl !== 'string') {
      scheduleReconnect();
      return;
    }

    try {
      ws = new WebSocket(wsUrl);
    } catch {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      if (isClosed) {
        ws.close();
        return;
      }
      reconnectAttempt = 0;
      updateStatus('live');
    };

    ws.onmessage = (event) => {
      if (isClosed) return;
      try {
        const parsed = JSON.parse(event.data);
        // Validar que sea un evento reconocido
        if (parsed && parsed.event === 'notification.created' && parsed.data) {
          if (typeof onMessage === 'function') {
            onMessage(parsed);
          }
        }
      } catch {
        // Descartar mensajes corruptos o no JSON sin lanzar excepciones
      }
    };

    ws.onerror = () => {
      // El navegador dispara onerror seguido de onclose
    };

    ws.onclose = () => {
      ws = null;
      if (!isClosed) {
        scheduleReconnect();
      } else {
        updateStatus('offline');
      }
    };
  }

  // Iniciar primer intento de conexión
  attemptConnection();

  return {
    close: () => {
      isClosed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        try {
          ws.close();
        } catch {
          // Ignorar errores al forzar cierre
        }
        ws = null;
      }
      updateStatus('offline');
    },
  };
}
