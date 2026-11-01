import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../notifications/useNotifications';
import { formatRelative } from '../utils/date';
import { Icons } from './Icons';
import './NotificationBell.css';

/**
 * Componente de Campana de Notificaciones accesible y responsivo.
 * Conectado con useNotifications() y WebSocket de Azure Web PubSub en tiempo real.
 */
export function NotificationBell() {
  const {
    items,
    unreadCount,
    status,
    error,
    connectionStatus,
    lastIncomingNotification,
    markAsRead,
    markAllAsRead,
    reload,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const navigate = useNavigate();

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Manejo de clic exterior y tecla Escape para accesibilidad
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose();
        if (triggerRef.current) {
          triggerRef.current.focus();
        }
      }
    };

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClose]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleItemClick = (item) => {
    markAsRead(item.id);
    handleClose();
    if (item.groupId) {
      navigate(`/groups/${item.groupId}`);
    }
  };

  const badgeDisplay = unreadCount > 9 ? '9+' : unreadCount > 0 ? unreadCount : null;

  // Renderizado del indicador de conexión
  const renderConnectionBadge = () => {
    switch (connectionStatus) {
      case 'live':
        return (
          <span className="notification-conn-status live" title="Conexión en vivo activa">
            <span className="notification-status-dot live" aria-hidden="true" />
            <span>En vivo</span>
          </span>
        );
      case 'reconnecting':
        return (
          <span className="notification-conn-status reconnecting" title="Reconectando con el servidor...">
            <span className="notification-status-dot reconnecting" aria-hidden="true" />
            <span>Reconectando...</span>
          </span>
        );
      case 'connecting':
        return (
          <span className="notification-conn-status connecting" title="Estableciendo conexión...">
            <span className="notification-status-dot connecting" aria-hidden="true" />
            <span>Conectando...</span>
          </span>
        );
      case 'offline':
      default:
        return (
          <span className="notification-conn-status offline" title="Sin conexión de tiempo real">
            <span className="notification-status-dot offline" aria-hidden="true" />
            <span>Sin conexión</span>
          </span>
        );
    }
  };

  return (
    <div className="notification-bell-container" ref={containerRef}>
      {/* Región accesible invisible para anuncios a lectores de pantalla */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {lastIncomingNotification
          ? `Nueva notificación: ${lastIncomingNotification.title}. ${lastIncomingNotification.message}`
          : ''}
      </div>

      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="notification-bell-trigger icon-circle-btn"
        aria-label={
          unreadCount > 0
            ? `Notificaciones, ${unreadCount} no leídas`
            : 'Notificaciones'
        }
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title="Notificaciones"
      >
        <Icons.Bell />
        {badgeDisplay !== null && (
          <span className="notification-badge" aria-hidden="true">
            {badgeDisplay}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="notification-popover"
          role="dialog"
          aria-label="Panel de Notificaciones"
        >
          <div className="notification-popover-header">
            <div className="notification-header-title-wrap">
              <span className="notification-header-title">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="notification-header-badge">
                  {unreadCount} nuevas
                </span>
              )}
            </div>

            <div className="notification-header-actions">
              {renderConnectionBadge()}
              <button
                type="button"
                className="notification-mark-all-btn"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                Marcar leídas
              </button>
            </div>
          </div>

          <ul className="notification-popover-list">
            {status === 'loading' && items.length === 0 ? (
              <li className="notification-empty-state">
                <span className="notification-spinner" aria-hidden="true" />
                <span>Cargando notificaciones...</span>
              </li>
            ) : status === 'error' && items.length === 0 ? (
              <li className="notification-empty-state error">
                <Icons.AlertTriangle />
                <span>{error || 'Error al cargar notificaciones'}</span>
                <button
                  type="button"
                  className="notification-retry-btn"
                  onClick={reload}
                >
                  Reintentar
                </button>
              </li>
            ) : items.length === 0 ? (
              <li className="notification-empty-state">
                <Icons.Bell />
                <span>No tienes notificaciones</span>
              </li>
            ) : (
              items.map((item) => {
                const isFeedback = item.type === 'FEEDBACK_PUBLISHED';
                return (
                  <li
                    key={item.id}
                    className={`notification-item ${item.read ? 'read' : 'unread'}`}
                    onClick={() => handleItemClick(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleItemClick(item);
                      }
                    }}
                  >
                    <div
                      className={`notification-item-icon-wrap ${
                        isFeedback ? 'feedback' : 'issue'
                      }`}
                      aria-hidden="true"
                    >
                      {isFeedback ? <Icons.Sparkles /> : <Icons.AlertTriangle />}
                    </div>

                    <div className="notification-item-content">
                      <div className="notification-item-top">
                        <span className="notification-item-title">{item.title}</span>
                        {!item.read && <span className="notification-unread-dot" />}
                      </div>
                      <p className="notification-item-msg">{item.message}</p>
                      <time className="notification-item-time">
                        {formatRelative(item.createdAt)}
                      </time>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
