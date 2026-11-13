import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ApiError } from '../lib/apiClient';
import { calendarApi, groupsApi } from '../api';
import { useCourse } from '../context/CourseContext';
import { fromEpochMs, toEpochMs, formatDate, toInputValue } from '../utils/date';
import { Icons } from '../components/Icons';
import './Calendar.css';
import './Groups.css';

function parseEventDate(value) {
  return fromEpochMs(value);
}

function formatDateKey(date) {
  return toInputValue(date, 'date');
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

export default function Calendar({ readOnly = false }) {
  const { selectedCourseId } = useCourse();
  // Lista de eventos cargados en vivo desde Azure APIM
  const [eventsList, setEventsList] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pagination, setPagination] = useState(() => ({ courseId: selectedCourseId, page: 1 }));
  const page = Object.is(pagination.courseId, selectedCourseId) ? pagination.page : 1;
  const setPage = (nextPage) => {
    setPagination({
      courseId: selectedCourseId,
      page: typeof nextPage === 'function' ? nextPage(page) : nextPage,
    });
  };
  const pageSize = 5;
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [hoveredDay, setHoveredDay] = useState(null);

  // Notificaciones Toast para feedback visual de estados HTTP
  const [toast, setToast] = useState(null);

  const showToast = (type, code, title, message) => {
    setToast({ type, code, title, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Modales del CRUD
  // 1. Crear Evento (POST)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => formatDateKey(new Date()));
  const newType = 'blue';
  const [newAudience, setNewAudience] = useState('Todos los grupos');
  // Grupos del curso para el campo Audiencia (vienen de MS1).
  const [courseGroups, setCourseGroups] = useState({ courseId: null, items: [] });
  const audienceOptions = [
    'Todos los grupos',
    ...(Object.is(courseGroups.courseId, selectedCourseId) ? courseGroups.items.map((g) => g.name) : []),
  ];

  // 2. Editar Evento (PUT)
  const [editingEvent, setEditingEvent] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editAudience, setEditAudience] = useState('');

  // 3. Eliminar Evento (DELETE)
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);


  // Cargar eventos desde Azure APIM con paginación y búsqueda
  useEffect(() => {
    let isMounted = true;

    async function loadEventsData() {
      try {
        setApiError(null);
        const res = await calendarApi.listEvents({
          page,
          pageSize,
          search,
          courseId: selectedCourseId,
        });
        if (!isMounted) return;
        const rawItems = Array.isArray(res?.content)
          ? res.content
          : Array.isArray(res?.items)
          ? res.items
          : [];
        setEventsList(rawItems);
        setTotalRecords(res?.totalElements ?? res?.totalRecords ?? rawItems.length);
        const firstEventDate = parseEventDate(rawItems[0]?.date);
        if (firstEventDate) {
          setCurrentMonth(new Date(firstEventDate.getFullYear(), firstEventDate.getMonth(), 1));
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error al cargar eventos de Azure APIM:', err);
        const code = err instanceof ApiError ? err.status : 500;
        setApiError({
          status: code,
          message: err.message || 'No se pudieron cargar los hitos del curso.',
        });
        setEventsList([]);
        setTotalRecords(0);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadEventsData();

    return () => {
      isMounted = false;
    };
  }, [page, search, reloadKey, selectedCourseId]);

  useEffect(() => {
    if (selectedCourseId === null || readOnly) return undefined;
    let active = true;
    groupsApi.list({ page: 1, pageSize: 100, courseId: selectedCourseId })
      .then((res) => {
        if (active) setCourseGroups({ courseId: selectedCourseId, items: Array.isArray(res?.items) ? res.items : [] });
      })
      .catch(() => {
        if (active) setCourseGroups({ courseId: selectedCourseId, items: [] });
      });
    return () => { active = false; };
  }, [selectedCourseId, readOnly]);

  const handleManualRefresh = () => {
    setIsLoading(true);
    setReloadKey((k) => k + 1);
  };

  // Manejador del debounce en búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPagination({ courseId: selectedCourseId, page: 1 });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, selectedCourseId]);

  // ----------------------------------------------------
  // OPERACIONES CRUD CON ESTADOS HTTP
  // ----------------------------------------------------

  // 1. CREAR EVENTO (POST /calendar/events -> HTTP 201 Created)
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (selectedCourseId === null) {
      setFormError('Selecciona un curso antes de crear un evento.');
      return;
    }
    if (!newTitle.trim()) {
      setFormError('El título del hito es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const epochDate = toEpochMs(newDate);
      const res = await calendarApi.createEvent({
        title: newTitle.trim(),
        date: epochDate,
        type: newType,
        audience: newAudience,
        courseId: selectedCourseId,
      });
      setNewTitle('');
      setIsCreateModalOpen(false);
      handleManualRefresh();

      showToast(
        'success',
        201,
        'Hito Creado',
        `Se registró "${res?.title || newTitle}" correctamente.`
      );
    } catch (err) {
      console.error('Error al crear evento:', err);
      const code = err instanceof ApiError ? err.status : 400;
      setFormError(err.message || 'Error al crear el hito.');
      showToast('error', code, 'Error al crear', err.message || 'Datos inválidos al crear.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. ACTUALIZAR EVENTO (PUT /calendar/events/{id} -> HTTP 200 OK)
  const handleOpenEdit = (ev) => {
    setEditingEvent(ev);
    setEditTitle(ev.title || '');
    setEditDate(toInputValue(ev.date, 'date') || '2026-10-15');
    setEditAudience(ev.audience || 'Todos los grupos');
    setFormError(null);
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      setFormError('El título no puede estar vacío.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const epochDate = toEpochMs(editDate);
      // MS1 exige type en el PUT; se conserva el tipo actual del hito.
      const res = await calendarApi.updateEvent(editingEvent.id, {
        title: editTitle.trim(),
        date: epochDate,
        type: editingEvent.type || 'blue',
        audience: editAudience,
        courseId: editingEvent.courseId ?? selectedCourseId,
      });

      const updatedTitle = res?.title || editTitle;

      setEditingEvent(null);
      handleManualRefresh();

      showToast(
        'success',
        200,
        'Hito Actualizado',
        `El evento #${editingEvent.id} se actualizó a "${updatedTitle}".`
      );
    } catch (err) {
      console.error('Error al actualizar evento:', err);
      const code = err instanceof ApiError ? err.status : 400;
      setFormError(err.message || 'Error al actualizar.');
      showToast('error', code, 'Error en actualización', err.message || 'Error en actualización.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. ELIMINAR EVENTO (DELETE /calendar/events/{id} -> HTTP 200 OK)
  const handleConfirmDelete = async () => {
    if (!deletingEvent) return;

    setIsSubmitting(true);
    try {
      const res = await calendarApi.removeEvent(deletingEvent.id);
      const msg = res?.message || 'Evento eliminado';

      setDeletingEvent(null);
      handleManualRefresh();

      showToast(
        'success',
        200,
        'Hito Eliminado',
        `${msg}: "${deletingEvent.title}" fue removido.`
      );
    } catch (err) {
      console.error('Error al eliminar evento:', err);
      const code = err instanceof ApiError ? err.status : 500;
      showToast('error', code, `Error HTTP ${code}`, err.message || 'No se pudo eliminar el hito.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // PRUEBA DE ESTADO DE ERROR HTTP (404 Not Found)
  // 100% Dependiente de Azure APIM: si APIM se desconecta, la llamada falla
  // ----------------------------------------------------


  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

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
      events: eventsList.filter((event) => {
        const eventDate = parseEventDate(event.date);
        return eventDate && formatDateKey(eventDate) === dateKey;
      }),
    };
  });
  const sortedEvents = [...eventsList].sort((left, right) => {
    const leftDate = left.date == null || left.date === '' ? null : Number(left.date);
    const rightDate = right.date == null || right.date === '' ? null : Number(right.date);
    const leftIsValid = leftDate !== null && Number.isFinite(leftDate);
    const rightIsValid = rightDate !== null && Number.isFinite(rightDate);

    if (!leftIsValid && !rightIsValid) return 0;
    if (!leftIsValid) return 1;
    if (!rightIsValid) return -1;
    return leftDate - rightDate;
  });
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
      {/* Toast Flotante para notificaciones HTTP */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            backgroundColor: toast.type === 'success' ? '#ecfdf5' : '#fee2e2',
            border: `1.5px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: toast.type === 'success' ? '#065f46' : '#991b1b',
            borderRadius: 12,
            padding: '14px 18px',
            maxWidth: 380,
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            animation: 'fadeInView 0.25s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: '0.875rem' }}>
            {toast.type === 'success' ? <Icons.CheckCircle /> : <Icons.AlertTriangle />}
            <span>{toast.title}</span>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.781rem', lineHeight: 1.4 }}>
            {toast.message}
          </p>
        </div>
      )}

      {/* Encabezado */}
      <div className="calendar-header">
        <div className="calendar-header-left">
          <h1 className="calendar-title">Calendario y Entregas</h1>
          <span className="calendar-meta">Hitos y fechas de entrega del curso</span>
        </div>

        <div className="calendar-header-actions">
          <button
            type="button"
            onClick={handleManualRefresh}
            className="btn-refresh-analysis"
            title="Recargar hitos"
          >
            <Icons.Refresh />
            <span>Actualizar</span>
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setIsCreateModalOpen(true);
              }}
              disabled={selectedCourseId === null}
              className="btn-new-event"
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span>
              <span>Nuevo hito</span>
            </button>
          )}
        </div>
      </div>

      {/* Error de APIM */}
      {apiError && (
        <div
          style={{
            backgroundColor: 'var(--badge-alert-bg)',
            color: 'var(--badge-alert-text)',
            border: '1.5px solid var(--badge-alert-border)',
            padding: '18px 22px',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icons.AlertTriangle />
            <span style={{ fontSize: '0.938rem', fontWeight: 700 }}>
              Error HTTP {apiError.status}: {apiError.message}
            </span>
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            style={{
              alignSelf: 'flex-start',
              marginTop: 6,
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid var(--badge-alert-border)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reintentar llamada a APIM
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
              <p className="event-subtitle">No hay hitos en este curso.</p>
            )}
          </div>

        </div>
        {/* Columna Derecha de Widgets */}
        <div className="calendar-right-widgets">
          {/* Widget: Próximas fechas */}
          <div className="figma-widget-card">
            <h3 className="widget-card-heading">Próximas fechas en vivo</h3>
            <div className="upcoming-events-list">
              {upcomingEvents.length > 0 ? upcomingEvents.slice(0, 3).map((event) => (
                <CalendarEventRow key={event.id || `${event.date}-${event.title}`} event={event} />
              )) : (
                <p className="event-subtitle">No hay hitos en este curso.</p>
              )}
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

      {/* ========================================================
         TABLA DE GESTIÓN CRUD DE HITOS (CREAR, LEER, ACTUALIZAR, ELIMINAR)
         ======================================================== */}
      <div className="groups-table-card" style={{ display: 'block', marginTop: 10 }}>
        <div className="table-top-bar">
          <div className="table-title-area">
            <h2 className="table-main-title">Gestión de Hitos y Entregas (CRUD)</h2>
            <span className="table-total-count">
              {totalRecords} hito(s) registrados
            </span>
          </div>

          {/* Barra de Búsqueda Integrada */}
          <div className="table-search-box">
            <Icons.Search />
            <input
              type="text"
              placeholder="Buscar hito por título..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="table-search-input"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tabla Responsive */}
        <div className="table-responsive-wrapper">
          <table className="custom-groups-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Título del hito</th>
                <th style={{ width: '25%' }}>Fecha programada</th>
                <th style={{ width: '20%' }}>Audiencia</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Cargando hitos...
                  </td>
                </tr>
              ) : eventsList.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No se encontraron hitos que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                eventsList.map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className={`event-pill ${ev.type || 'blue'}`} style={{ display: 'inline-block', width: 8, height: 8, padding: 0, borderRadius: '50%' }}></span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ev.title}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)' }}>{formatDate(ev.date)}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.781rem', color: 'var(--text-muted)' }}>
                        {ev.audience || 'Todos los grupos'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {!readOnly && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(ev)}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border-default)',
                            borderRadius: 6,
                            padding: '4px 8px',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                          title="Editar hito"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingEvent(ev)}
                          style={{
                            background: 'none',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: 6,
                            padding: '4px 8px',
                            cursor: 'pointer',
                            color: '#ef4444',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                          title="Eliminar hito"
                        >
                          Eliminar
                        </button>
                      </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="table-pagination-footer">
          <span className="pagination-text">
            Página {page} de {totalPages} &middot; Total: {totalRecords} hitos
          </span>
          <div className="pagination-pages">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="page-btn-nav"
            >
              Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setPage(num)}
                className={`page-num-btn ${page === num ? 'active' : ''}`}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="page-btn-nav"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>


      {/* Modal para Crear Nuevo Hito (POST) */}
      {isCreateModalOpen && (
        createPortal(
          <div className="modal-overlay-animated calendar-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
            <div
              className="modal-content-animated calendar-modal-content"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-event-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 className="modal-title" id="create-event-modal-title">Agregar Nuevo Hito</h3>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="modal-close-btn" aria-label="Cerrar">
                  ✕
                </button>
              </div>

              {formError && (
                <div role="alert" style={{ backgroundColor: 'var(--badge-alert-bg)', color: 'var(--badge-alert-text)', border: '1px solid var(--badge-alert-border)', padding: '10px 14px', borderRadius: 8, fontSize: '0.813rem' }}>
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateEvent} className="modal-form-body">
                <div className="form-field">
                  <label className="form-label" htmlFor="create-event-title">Título del hito</label>
                  <input
                    id="create-event-title"
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ej. Entrega 3: Arquitectura"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="create-event-date">Fecha de entrega</label>
                  <input
                    id="create-event-date"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="create-event-audience">Audiencia</label>
                  <select
                    id="create-event-audience"
                    value={newAudience}
                    onChange={(e) => setNewAudience(e.target.value)}
                    className="form-input"
                  >
                    {audienceOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div className="modal-footer-actions">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="btn-secondary-action"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || selectedCourseId === null}
                    className="btn-primary-action"
                  >
                    {isSubmitting ? 'Creando...' : 'Crear hito'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )
      )}

      {/* Modal para Editar Hito (PUT) */}
      {editingEvent && (
        createPortal(
          <div className="modal-overlay-animated calendar-modal-overlay" onClick={() => setEditingEvent(null)}>
          <div className="modal-content-animated calendar-modal-content" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Editar Hito #{editingEvent.id}</h3>
              <button type="button" onClick={() => setEditingEvent(null)} className="modal-close-btn">
                ✕
              </button>
            </div>

            {formError && (
              <div style={{ backgroundColor: 'var(--badge-alert-bg)', color: 'var(--badge-alert-text)', border: '1px solid var(--badge-alert-border)', padding: '10px 14px', borderRadius: 8, fontSize: '0.813rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateEvent} className="modal-form-body">
              <div className="form-field">
                <label className="form-label">Título del hito</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label">Fecha de entrega</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="edit-event-audience">Audiencia</label>
                <select
                  id="edit-event-audience"
                  value={editAudience}
                  onChange={(e) => setEditAudience(e.target.value)}
                  className="form-input"
                >
                  {(audienceOptions.includes(editAudience) ? audienceOptions : [editAudience, ...audienceOptions]).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="modal-footer-actions">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="btn-secondary-action"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary-action"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
          </div>,
          document.body,
        )
      )}

      {/* Modal para Confirmar Eliminación (DELETE) */}
      {deletingEvent && (
        createPortal(
          <div className="modal-overlay-animated calendar-modal-overlay" onClick={() => setDeletingEvent(null)}>
          <div className="modal-content-animated calendar-modal-content" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#ef4444' }}>
                Eliminar Hito
              </h3>
              <button type="button" onClick={() => setDeletingEvent(null)} className="modal-close-btn">
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.844rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '14px 0' }}>
              ¿Estás seguro de que deseas eliminar el hito <strong>&quot;{deletingEvent.title}&quot;</strong>? Esta acción no se puede deshacer.
            </p>

            <div className="modal-footer-actions">
              <button
                type="button"
                onClick={() => setDeletingEvent(null)}
                className="btn-secondary-action"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 18px',
                  fontWeight: 600,
                  fontSize: '0.844rem',
                  cursor: 'pointer',
                }}
              >
                {isSubmitting ? 'Eliminando...' : 'Eliminar hito'}
              </button>
            </div>
          </div>
          </div>,
          document.body,
        )
      )}

    </div>
  );
}
