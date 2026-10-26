import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../notifications/useNotifications';
import { formatRelative } from '../utils/date';
import { Icons } from './Icons';
import './NotificationBell.css';

/**
 * Componente de Campana de Notificaciones accesible y responsivo.
 * Conectado con useNotifications() y utilidades Epoch en src/utils/date.js.
 *
 * Casos de prueba cubiertos:
 * 1. Badge numérico: Oculto cuando unreadCount === 0; muestra el número exacto (1..9) o "9+" si > 9.
 * 2. Apertura/Cierre del popover: Toggle con clic en la campana; cierre con clic exterior; cierre con tecla Escape devolviendo el foco al disparador.
 * 3. Marcar una como leída: Clic en notificación marca el elemento como leído, decrementa el badge y redirige a la vista del grupo asociado.
 * 4. Marcar todas como leídas: Clic en el botón superior marca todos los elementos como leídos y desactiva el botón.
 * 5. Accesibilidad: Disparador con aria-label dinámico, aria-haspopup="dialog" y aria-expanded según el estado.
 */
export function NotificationBell() {
  const { items, unreadCount, markAsRead, markAllAsRead } = useNotifications();
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

  return (
    <div className="notification-bell-container" ref={containerRef}>
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
            <button
              type="button"
              className="notification-mark-all-btn"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Marcar todas como leídas
            </button>
          </div>

          <ul className="notification-popover-list">
            {items.length === 0 ? (
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
