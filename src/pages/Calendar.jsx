import { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './Calendar.css';

export default function Calendar() {
  const [events, setEvents] = useState([]);

  // Estados de toggles para avisos automáticos (Figma)
  const [notifWeekly, setNotifWeekly] = useState(true);
  const [notifDeadline, setNotifDeadline] = useState(true);
  const [notifAdvance, setNotifAdvance] = useState(false);

  // Modal para agregar nuevo hito
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('2026-10-15');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [apiError, setApiError] = useState(null);

  // Cargar eventos desde Azure APIM (/calendar/events)
  useEffect(() => {
    async function loadEvents() {
      try {
        setApiError(null);
        const res = await api.get('/calendar/events');
        if (res?.items?.length > 0) {
          const apiEvents = res.items.map((item, index) => ({
            id: item.id || index + 10,
            title: item.title,
            date: item.date,
            type: index % 2 === 0 ? 'blue' : 'green',
          }));
          setEvents(apiEvents);
        }
      } catch (err) {
        console.error('Error al cargar eventos de Azure APIM:', err);
        setApiError('Error de conexion con Azure APIM (/calendar/events): El servicio no responde o se interrumpio la conexion.');
        setEvents([]);
      }
    }
    loadEvents();
  }, []);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await api.post('/calendar/events', {
        title: newTitle.trim(),
        date: newDate,
      });
      setEvents((prev) => [
        ...prev,
        { id: Date.now(), title: newTitle.trim(), date: newDate, type: 'blue' },
      ]);
      setNewTitle('');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error al crear evento:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cuadrícula de 35 celdas para Octubre 2026 (según Figma)
  const monthDays = [
    { day: 28, isOther: true, events: [] },
    { day: 29, isOther: true, events: [] },
    { day: 30, isOther: true, events: [{ title: 'Avance 1', type: 'green' }] },
    { day: 1, isOther: false, events: [] },
    { day: 2, isOther: false, events: [{ title: 'Entrega 2', type: 'blue' }] },
    { day: 3, isOther: false, events: [] },
    { day: 4, isOther: false, events: [] },

    { day: 5, isOther: false, events: [] },
    { day: 6, isOther: false, events: [] },
    { day: 7, isOther: false, events: [{ title: 'Avance repo.', type: 'blue' }] },
    { day: 8, isOther: false, events: [] },
    { day: 9, isOther: false, events: [] },
    { day: 10, isOther: false, events: [] },
    { day: 11, isOther: false, events: [] },

    { day: 12, isOther: false, events: [] },
    { day: 13, isOther: false, events: [] },
    { day: 14, isOther: false, events: [] },
    { day: 15, isOther: false, events: [] },
    { day: 16, isOther: false, events: [{ title: 'Presentación', type: 'blue' }] },
    { day: 17, isOther: false, events: [] },
    { day: 18, isOther: false, events: [] },

    { day: 19, isOther: false, events: [] },
    { day: 20, isOther: false, events: [] },
    { day: 21, isOther: false, events: [] },
    { day: 22, isOther: false, events: [] },
    { day: 23, isOther: false, events: [{ title: 'Avance 3', type: 'blue' }] },
    { day: 24, isOther: false, events: [] },
    { day: 25, isOther: false, events: [] },

    { day: 26, isOther: false, events: [] },
    { day: 27, isOther: false, events: [] },
    { day: 28, isOther: false, events: [] },
    { day: 29, isOther: false, events: [] },
    { day: 30, isOther: false, events: [{ title: 'Entrega final', type: 'amber' }] },
    { day: 31, isOther: false, events: [] },
    { day: 1, isOther: true, events: [] },
  ];

  return (
    <div className="calendar-page-container">
      {/* Encabezado */}
      <div className="calendar-header">
        <div className="calendar-header-left">
          <h1 className="calendar-title">Calendario</h1>
          <span className="calendar-meta">Entregas y avances por grupo</span>
        </div>

        <div className="calendar-header-actions">
          <button type="button" className="select-view-btn">
            <span>Mes</span>
            <Icons.ChevronDown />
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="btn-new-event"
          >
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span>
            <span>Nuevo hito</span>
          </button>
        </div>
      </div>

      {apiError && (
        <div style={{ backgroundColor: 'var(--badge-alert-bg)', color: 'var(--badge-alert-text)', border: '1px solid var(--badge-alert-border)', padding: '16px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icons.AlertTriangle />
            <span style={{ fontSize: '0.844rem', fontWeight: 600 }}>{apiError}</span>
          </div>
          <button type="button" onClick={() => window.location.reload()} className="btn-new-event" style={{ padding: '6px 14px', fontSize: '0.813rem' }}>
            Reintentar
          </button>
        </div>
      )}

      {/* Grid Principal: Calendario (Izquierda) + Widgets (Derecha) */}
      <div className="calendar-main-grid">
        {/* Tarjeta de Calendario (Escritorio y Tablet) */}
        <div className="calendar-card">
          <div className="calendar-nav-bar">
            <h2 className="calendar-month-title">Octubre 2026</h2>
            <div className="calendar-nav-controls">
              <button type="button" className="cal-nav-btn">&lt;</button>
              <button type="button" className="cal-nav-btn">Hoy</button>
              <button type="button" className="cal-nav-btn">&gt;</button>
            </div>
          </div>

          <div className="calendar-grid-wrapper">
            <div className="calendar-days-header">
              <span className="calendar-day-col-title">Lun</span>
              <span className="calendar-day-col-title">Mar</span>
              <span className="calendar-day-col-title">Mié</span>
              <span className="calendar-day-col-title">Jue</span>
              <span className="calendar-day-col-title">Vie</span>
              <span className="calendar-day-col-title">Sáb</span>
              <span className="calendar-day-col-title">Dom</span>
            </div>

            <div className="calendar-month-cells">
              {monthDays.map((item, index) => (
                <div
                  key={index}
                  className={`calendar-cell ${item.isOther ? 'other-month' : ''}`}
                >
                  <span className="cell-date-num">{item.day}</span>
                  {item.events.map((ev, evIdx) => (
                    <span key={evIdx} className={`event-pill ${ev.type}`}>
                      {ev.title}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tarjeta de Eventos en Móvil (reemplaza la cuadrícula en pantallas pequeñas según Figma) */}
        <div className="mobile-events-card">
          <h2 className="mobile-events-heading">Octubre 2026</h2>
          <div className="mobile-events-list">
            <div className="event-row">
              <div className="date-box">
                <span className="date-box-month">OCT</span>
                <span className="date-box-day">02</span>
              </div>
              <div className="event-details">
                <span className="event-title">Entrega 2: Prototipo</span>
                <span className="event-subtitle">Grupos 1, 3 y 5</span>
              </div>
            </div>

            <div className="event-row">
              <div className="date-box">
                <span className="date-box-month">OCT</span>
                <span className="date-box-day">07</span>
              </div>
              <div className="event-details">
                <span className="event-title">Avance de repositorio</span>
                <span className="event-subtitle">Todos los grupos</span>
              </div>
            </div>

            <div className="event-row">
              <div className="date-box">
                <span className="date-box-month">OCT</span>
                <span className="date-box-day">16</span>
              </div>
              <div className="event-details">
                <span className="event-title">Presentación parcial</span>
                <span className="event-subtitle">Grupos 2 y 4</span>
              </div>
            </div>

            <div className="event-row">
              <div className="date-box">
                <span className="date-box-month">OCT</span>
                <span className="date-box-day">23</span>
              </div>
              <div className="event-details">
                <span className="event-title">Avance 3</span>
                <span className="event-subtitle">Todos los grupos</span>
              </div>
            </div>

            <div className="event-row">
              <div className="date-box">
                <span className="date-box-month">OCT</span>
                <span className="date-box-day">30</span>
              </div>
              <div className="event-details">
                <span className="event-title">Entrega final</span>
                <span className="event-subtitle">Todos los grupos</span>
              </div>
            </div>
          </div>

          <a href="#" onClick={(e) => e.preventDefault()} className="widget-footer-link">
            <span>Ver mes completo</span>
            <Icons.ChevronRight />
          </a>
        </div>

        {/* Columna Derecha de Widgets */}
        <div className="calendar-right-widgets">
          {/* Widget: Próximas fechas */}
          <div className="figma-widget-card">
            <h3 className="widget-card-heading">Próximas fechas</h3>
            <div className="upcoming-events-list">
              <div className="event-row">
                <div className="date-box">
                  <span className="date-box-month">OCT</span>
                  <span className="date-box-day">02</span>
                </div>
                <div className="event-details">
                  <span className="event-title">Entrega 2: Prototipo</span>
                  <span className="event-subtitle">Grupos 1, 3 y 5</span>
                </div>
              </div>

              <div className="event-row">
                <div className="date-box">
                  <span className="date-box-month">OCT</span>
                  <span className="date-box-day">07</span>
                </div>
                <div className="event-details">
                  <span className="event-title">Avance de repositorio</span>
                  <span className="event-subtitle">Todos los grupos</span>
                </div>
              </div>

              <div className="event-row">
                <div className="date-box">
                  <span className="date-box-month">OCT</span>
                  <span className="date-box-day">16</span>
                </div>
                <div className="event-details">
                  <span className="event-title">Presentación parcial</span>
                  <span className="event-subtitle">Grupos 2 y 4</span>
                </div>
              </div>
            </div>

            <a href="#" onClick={(e) => e.preventDefault()} className="widget-footer-link">
              <span>Ver todas</span>
              <Icons.ChevronRight />
            </a>
          </div>

          {/* Widget: Avisos automáticos con Toggles iOS */}
          <div className="auto-notifications-card">
            <h3 className="auto-notifications-title">Avisos automáticos</h3>
            <div className="toggles-list">
              <div className="toggle-row">
                <span className="toggle-label">Resumen semanal al profesor</span>
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={notifWeekly}
                    onChange={(e) => setNotifWeekly(e.target.checked)}
                  />
                  <span className="slider-round"></span>
                </label>
              </div>

              <div className="toggle-row">
                <span className="toggle-label">Aviso al vencer un plazo</span>
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={notifDeadline}
                    onChange={(e) => setNotifDeadline(e.target.checked)}
                  />
                  <span className="slider-round"></span>
                </label>
              </div>

              <div className="toggle-row">
                <span className="toggle-label">Avisar a estudiantes 3 días antes</span>
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={notifAdvance}
                    onChange={(e) => setNotifAdvance(e.target.checked)}
                  />
                  <span className="slider-round"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para Crear Nuevo Hito */}
      {isModalOpen && (
        <div
          className="modal-overlay-animated"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: 16,
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="modal-content-animated"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 420,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Programar Nuevo Hito</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Título del hito o entrega *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Entrega 3: Testing"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-sunken)',
                    color: 'var(--text-primary)',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Fecha límite *
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-sunken)',
                    color: 'var(--text-primary)',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border-default)',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim()}
                  className="btn-new-event"
                >
                  {isSubmitting ? 'Guardando...' : 'Crear Hito'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
