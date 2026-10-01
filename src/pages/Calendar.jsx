import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './Calendar.css';

function parseEventDate(value) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function CalendarEventRow({ event }) {
  const date = parseEventDate(event.date);

  return (
    <div className="event-row">
      <div className="date-box">
        <span className="date-box-month">
          {date ? date.toLocaleDateString('es-CR', { month: 'short' }).replace('.', '').toUpperCase() : '—'}
        </span>
        <span className="date-box-day">{date ? String(date.getDate()).padStart(2, '0') : '—'}</span>
      </div>
      <div className="event-details">
        <span className="event-title">{event.title}</span>
        {(event.subtitle || event.audience) && (
          <span className="event-subtitle">{event.subtitle || event.audience}</span>
        )}
      </div>
    </div>
  );
}

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [hoveredDay, setHoveredDay] = useState(null);

  // Estados de toggles para avisos automáticos (Figma)
  const [notifWeekly, setNotifWeekly] = useState(true);
  const [notifDeadline, setNotifDeadline] = useState(true);
  const [notifAdvance, setNotifAdvance] = useState(false);

  // Modal para agregar nuevo hito
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => formatDateKey(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [apiError, setApiError] = useState(null);

  // Cargar eventos desde Azure APIM (/calendar/events)
  useEffect(() => {
    async function loadEvents() {
      try {
        setApiError(null);
        const res = await api.get('/calendar/events');
        const apiEvents = Array.isArray(res?.items) ? res.items : [];
        setEvents(apiEvents);
        const firstEventDate = parseEventDate(apiEvents[0]?.date);
        if (firstEventDate) {
          setCurrentMonth(new Date(firstEventDate.getFullYear(), firstEventDate.getMonth(), 1));
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
      const res = await api.get('/calendar/events');
      setEvents(Array.isArray(res?.items) ? res.items : []);
      setNewTitle('');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error al crear evento:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const firstOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const leadingDays = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - leadingDays);
  const gridCellCount = Math.ceil((leadingDays + new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()) / 7) * 7;
  const calendarDays = Array.from({ length: gridCellCount }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const dateKey = formatDateKey(date);

    return {
      date,
      isOther: date.getMonth() !== currentMonth.getMonth(),
      events: events.filter((event) => {
        const eventDate = parseEventDate(event.date);
        return eventDate && formatDateKey(eventDate) === dateKey;
      }),
    };
  });
  const sortedEvents = [...events].sort((left, right) => left.date.localeCompare(right.date));
  const monthLabel = currentMonth.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });
  const changeMonth = (offset) => {
    setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() + offset, 1));
  };
  const upcomingEvents = sortedEvents.filter((event) => {
    const date = parseEventDate(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date && date >= today;
  });
  const showDayDetails = (date, dayEvents, target) => {
    if (dayEvents.length === 0) return;
    const rect = target.getBoundingClientRect();
    const tooltipWidth = Math.min(240, window.innerWidth - 24);
    const tooltipHeight = Math.min(140, 78 + dayEvents.length * 44);
    const fitsBelow = rect.bottom + tooltipHeight + 8 <= window.innerHeight - 12;
    const showAbove = !fitsBelow && rect.top >= tooltipHeight + 12;
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - tooltipWidth - 12));
    const top = showAbove
      ? rect.top - 8
      : Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - tooltipHeight - 12));

    setHoveredDay({
      date,
      events: dayEvents,
      left,
      top,
      showAbove,
    });
  };

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
            <h2 className="calendar-month-title">{monthLabel}</h2>
            <div className="calendar-nav-controls">
              <button type="button" className="cal-nav-btn" onClick={() => changeMonth(-1)}>&lt;</button>
              <button type="button" className="cal-nav-btn" onClick={() => setCurrentMonth(new Date())}>Hoy</button>
              <button type="button" className="cal-nav-btn" onClick={() => changeMonth(1)}>&gt;</button>
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
              {calendarDays.map(({ date, isOther, events: dayEvents }) => (
                <div
                  key={formatDateKey(date)}
                  className={`calendar-cell ${isOther ? 'other-month' : ''}`}
                  onMouseEnter={(event) => showDayDetails(date, dayEvents, event.currentTarget)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  <span className="cell-date-num">{date.getDate()}</span>
                  {dayEvents.map((event) => (
                    <span
                      key={event.id || `${event.date}-${event.title}`}
                      className={`event-pill ${event.type || 'blue'}`}
                      aria-label={event.title}
                      tabIndex={0}
                      aria-describedby="calendar-day-tooltip"
                      onFocus={(focusEvent) => showDayDetails(date, dayEvents, focusEvent.currentTarget)}
                      onBlur={() => setHoveredDay(null)}
                    >
                      {event.title}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tarjeta de Eventos en Móvil (reemplaza la cuadrícula en pantallas pequeñas según Figma) */}
        <div className="mobile-events-card">
          <h2 className="mobile-events-heading">{monthLabel}</h2>
          <div className="mobile-events-list">
            {upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
              <CalendarEventRow key={event.id || `${event.date}-${event.title}`} event={event} />
            )) : (
              <p className="event-subtitle">No hay eventos disponibles desde APIM.</p>
            )}
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
              {upcomingEvents.length > 0 ? upcomingEvents.slice(0, 3).map((event) => (
                <CalendarEventRow key={event.id || `${event.date}-${event.title}`} event={event} />
              )) : (
                <p className="event-subtitle">No hay eventos disponibles desde APIM.</p>
              )}
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

      {hoveredDay && (
        createPortal(
          <div
            id="calendar-day-tooltip"
            role="tooltip"
            className={`calendar-event-tooltip ${hoveredDay.showAbove ? 'is-above' : ''}`}
            style={{ left: hoveredDay.left, top: hoveredDay.top }}
          >
            <span className="calendar-tooltip-date">
              {hoveredDay.date.toLocaleDateString('es-CR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </span>
            {hoveredDay.events.map((event) => (
              <div key={event.id || `${event.date}-${event.title}`} className="calendar-tooltip-event">
                <strong>{event.title}</strong>
                {(event.subtitle || event.audience) && (
                  <span>{event.subtitle || event.audience}</span>
                )}
              </div>
            ))}
          </div>,
          document.body,
        )
      )}

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
