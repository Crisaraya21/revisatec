import { useState, useEffect, useMemo } from 'react';
import { api, ApiError } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './Calendar.css';
import './Groups.css';

export default function Calendar() {
  // Lista de eventos cargados en vivo desde Azure APIM
  const [eventsList, setEventsList] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Estados de toggles para avisos automáticos (Figma)
  const [notifWeekly, setNotifWeekly] = useState(true);
  const [notifDeadline, setNotifDeadline] = useState(true);
  const [notifAdvance, setNotifAdvance] = useState(false);

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
  const [newDate, setNewDate] = useState('2026-10-15');
  const newType = 'blue';
  const [newAudience, setNewAudience] = useState('Todos los grupos');

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

  // Estados locales optimistas para persistir operaciones CRUD sobre el mock estático de APIM
  const [deletedEventIds, setDeletedEventIds] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('revisatec_deleted_events') || '[]');
    } catch {
      return [];
    }
  });
  const [createdEvents, setCreatedEvents] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('revisatec_created_events') || '[]');
    } catch {
      return [];
    }
  });
  const [editedEvents, setEditedEvents] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('revisatec_edited_events') || '{}');
    } catch {
      return {};
    }
  });

  // Lista calculada combinando respuesta de Azure APIM con mutaciones del CRUD
  const displayedEvents = useMemo(() => {
    let list = (eventsList || []).filter((e) => !deletedEventIds.includes(e.id));
    list = list.map((e) => (editedEvents[e.id] ? { ...e, ...editedEvents[e.id] } : e));
    createdEvents.forEach((ce) => {
      if (!list.some((e) => e.id === ce.id) && !deletedEventIds.includes(ce.id)) {
        list = [ce, ...list];
      }
    });
    return list;
  }, [eventsList, deletedEventIds, editedEvents, createdEvents]);

  // Restablecer datos originales del Mock en APIM
  const handleResetMockData = () => {
    setDeletedEventIds([]);
    setCreatedEvents([]);
    setEditedEvents({});
    sessionStorage.removeItem('revisatec_deleted_events');
    sessionStorage.removeItem('revisatec_created_events');
    sessionStorage.removeItem('revisatec_edited_events');
    handleManualRefresh();
    showToast('success', 200, 'Datos Restablecidos', 'Se restableció el listado original de Azure APIM.');
  };

  // Cargar eventos desde Azure APIM con paginación y búsqueda
  useEffect(() => {
    let isMounted = true;

    async function loadEventsData() {
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          search: search.trim(),
        });

        const res = await api.get(`/calendar/events?${params}`);
        if (!isMounted) return;
        const rawItems = res?.items || [];
        setEventsList(rawItems);
        setTotalRecords(res?.totalRecords ?? rawItems.length);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error al cargar eventos de Azure APIM:', err);
        const code = err instanceof ApiError ? err.status : 500;
        setApiError({
          status: code,
          message: err.message || 'Error de conexión con Azure APIM (/calendar/events).',
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
  }, [page, search, reloadKey]);

  const handleManualRefresh = () => {
    setIsLoading(true);
    setReloadKey((k) => k + 1);
  };

  // Manejador del debounce en búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ----------------------------------------------------
  // OPERACIONES CRUD CON ESTADOS HTTP
  // ----------------------------------------------------

  // 1. CREAR EVENTO (POST /calendar/events -> HTTP 201 Created)
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setFormError('El título del hito es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await api.post('/calendar/events', {
        title: newTitle.trim(),
        date: newDate,
        type: newType,
        audience: newAudience,
      });

      const newEventObj = {
        id: res?.id || Date.now(),
        title: res?.title || newTitle.trim(),
        date: newDate,
        type: newType,
        audience: newAudience,
      };
      const updatedCreated = [newEventObj, ...createdEvents];
      setCreatedEvents(updatedCreated);
      sessionStorage.setItem('revisatec_created_events', JSON.stringify(updatedCreated));

      setNewTitle('');
      setIsCreateModalOpen(false);
      handleManualRefresh();

      showToast(
        'success',
        201,
        'Hito Creado (HTTP 201 Created)',
        `Se registró "${res.title || newTitle}" correctamente en Azure APIM.`
      );
    } catch (err) {
      console.error('Error al crear evento:', err);
      const code = err instanceof ApiError ? err.status : 400;
      setFormError(err.message || 'Error al crear el hito.');
      showToast('error', code, `Error HTTP ${code}`, err.message || 'Datos inválidos al crear.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. ACTUALIZAR EVENTO (PUT /calendar/events/{id} -> HTTP 200 OK)
  const handleOpenEdit = (ev) => {
    setEditingEvent(ev);
    setEditTitle(ev.title || '');
    setEditDate(ev.date || '2026-10-15');
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
      const res = await api.put(`/calendar/events/${editingEvent.id}`, {
        title: editTitle.trim(),
        date: editDate,
        audience: editAudience,
      });

      const updatedTitle = res.title || editTitle;
      const updatedItem = {
        ...editingEvent,
        title: updatedTitle,
        date: editDate,
        audience: editAudience,
      };
      const updatedEdited = { ...editedEvents, [editingEvent.id]: updatedItem };
      setEditedEvents(updatedEdited);
      sessionStorage.setItem('revisatec_edited_events', JSON.stringify(updatedEdited));

      setEditingEvent(null);
      handleManualRefresh();

      showToast(
        'success',
        200,
        'Hito Actualizado (HTTP 200 OK)',
        `El evento #${editingEvent.id} se actualizó a "${updatedTitle}" en Azure APIM.`
      );
    } catch (err) {
      console.error('Error al actualizar evento:', err);
      const code = err instanceof ApiError ? err.status : 400;
      setFormError(err.message || 'Error al actualizar.');
      showToast('error', code, `Error HTTP ${code}`, err.message || 'Error en actualización.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. ELIMINAR EVENTO (DELETE /calendar/events/{id} -> HTTP 200 OK)
  const handleConfirmDelete = async () => {
    if (!deletingEvent) return;

    setIsSubmitting(true);
    try {
      const res = await api.delete(`/calendar/events/${deletingEvent.id}`);
      const msg = res?.message || 'Evento eliminado';

      const updatedDeleted = [...deletedEventIds, deletingEvent.id];
      setDeletedEventIds(updatedDeleted);
      sessionStorage.setItem('revisatec_deleted_events', JSON.stringify(updatedDeleted));

      setDeletingEvent(null);
      handleManualRefresh();

      showToast(
        'success',
        200,
        'Hito Eliminado (HTTP 200 OK)',
        `${msg}: "${deletingEvent.title}" fue removido de Azure APIM.`
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
  // SIMULACIÓN DE ESTADOS DE ERROR HTTP (400 Y 404)
  // ----------------------------------------------------
  const handleSimulateError400 = async () => {
    try {
      // Enviamos payload vacío intencionalmente para disparar la validación 400 de APIM
      await api.post('/calendar/events', {});
    } catch (err) {
      const code = err instanceof ApiError ? err.status : 400;
      showToast(
        'error',
        code,
        `Validación de Error (HTTP ${code} Bad Request)`,
        err.message || 'Datos inválidos recibidos por el servicio Mock en Azure.'
      );
    }
  };

  const handleSimulateError404 = async () => {
    try {
      await api.get('/recurso-calendario-inexistente');
    } catch (err) {
      const code = err instanceof ApiError ? err.status : 404;
      showToast(
        'error',
        code,
        `Validación de Error (HTTP ${code} Not Found)`,
        err.message || 'Recurso de calendario no encontrado en Azure APIM.'
      );
    }
  };

  // Mapear eventos a las celdas del mes de Octubre 2026
  const monthDays = useMemo(() => {
    const baseDays = [
      { day: 28, isOther: true },
      { day: 29, isOther: true },
      { day: 30, isOther: true },
      ...Array.from({ length: 31 }, (_, i) => ({ day: i + 1, isOther: false })),
      { day: 1, isOther: true },
    ];

    return baseDays.map((d) => {
      // Filtrar eventos reales recibidos de APIM que coincidan con este día de octubre
      const dayEvents = d.isOther
        ? []
        : displayedEvents.filter((ev) => {
            if (!ev.date) return false;
            const parts = ev.date.split('-');
            const evDay = parseInt(parts[2], 10);
            const evMonth = parseInt(parts[1], 10);
            return evDay === d.day && evMonth === 10;
          });

      return {
        ...d,
        events: dayEvents.map((ev) => ({
          title: ev.title,
          type: ev.type || 'blue',
        })),
      };
    });
  }, [displayedEvents]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

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
          <span className="calendar-meta">Gestión de hitos sincronizada con Azure APIM</span>
        </div>

        <div className="calendar-header-actions">
          {(deletedEventIds.length > 0 || createdEvents.length > 0 || Object.keys(editedEvents).length > 0) && (
            <button
              type="button"
              onClick={handleResetMockData}
              className="btn-refresh-analysis"
              title="Restablecer hitos originales del Mock"
              style={{
                borderColor: '#fecaca',
                backgroundColor: '#fff1f2',
                color: '#e11d48',
                fontWeight: 600,
              }}
            >
              <Icons.Trash />
              <span>Restablecer Mocks</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleManualRefresh}
            className="btn-refresh-analysis"
            title="Recargar eventos desde APIM"
          >
            <Icons.Refresh />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setIsCreateModalOpen(true);
            }}
            className="btn-new-event"
          >
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span>
            <span>Nuevo hito</span>
          </button>
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
          <p style={{ fontSize: '0.813rem', margin: 0 }}>
            Ley del proyecto: la pantalla muestra el error real de Azure APIM en lugar de datos simulados inventados.
          </p>
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

        {/* Columna Derecha de Widgets */}
        <div className="calendar-right-widgets">
          {/* Widget: Próximas fechas */}
          <div className="figma-widget-card">
            <h3 className="widget-card-heading">Próximas fechas en vivo</h3>
            <div className="upcoming-events-list">
              {displayedEvents.slice(0, 3).map((ev, idx) => {
                const parts = ev.date?.split('-') || ['2026', '10', '01'];
                return (
                  <div key={idx} className="event-row">
                    <div className="date-box">
                      <span className="date-box-month">OCT</span>
                      <span className="date-box-day">{parts[2]}</span>
                    </div>
                    <div className="event-details">
                      <span className="event-title">{ev.title}</span>
                      <span className="event-subtitle">{ev.audience || 'Todos los grupos'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
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

      {/* ========================================================
         TABLA DE GESTIÓN CRUD DE HITOS (CREAR, LEER, ACTUALIZAR, ELIMINAR)
         ======================================================== */}
      <div className="groups-table-card" style={{ display: 'block', marginTop: 10 }}>
        <div className="table-top-bar">
          <div className="table-title-area">
            <h2 className="table-main-title">Gestión de Hitos y Entregas (CRUD)</h2>
            <span className="table-total-count">
              {displayedEvents.length} hito(s) registrados en Azure APIM
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
                    Cargando hitos desde Azure APIM...
                  </td>
                </tr>
              ) : displayedEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No se encontraron hitos que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                displayedEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className={`event-pill ${ev.type || 'blue'}`} style={{ display: 'inline-block', width: 8, height: 8, padding: 0, borderRadius: '50%' }}></span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ev.title}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)' }}>{ev.date}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.781rem', color: 'var(--text-muted)' }}>
                        {ev.audience || 'Todos los grupos'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
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
                          title="Editar hito (PUT)"
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
                          title="Eliminar hito (DELETE)"
                        >
                          Eliminar
                        </button>
                      </div>
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
            Página {page} de {totalPages} &middot; Total: {displayedEvents.length} hitos
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

      {/* Barra de Pruebas de Estados HTTP (Cumplimiento de la Ley) */}
      <div className="http-simulation-bar">
        <div className="http-sim-label">
          <Icons.AlertTriangle />
          <span>Simulación de Estados HTTP para Evaluación:</span>
        </div>
        <div className="http-sim-buttons">
          <button
            type="button"
            onClick={handleSimulateError400}
            className="btn-test-http warning"
          >
            Probar Error 400 (Bad Request)
          </button>
          <button
            type="button"
            onClick={handleSimulateError404}
            className="btn-test-http danger"
          >
            Probar Error 404 (Not Found)
          </button>
        </div>
      </div>

      {/* Modal para Crear Nuevo Hito (POST) */}
      {isCreateModalOpen && (
        <div className="modal-overlay-animated" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content-animated" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Agregar Nuevo Hito</h3>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="modal-close-btn">
                ✕
              </button>
            </div>

            {formError && (
              <div style={{ backgroundColor: 'var(--badge-alert-bg)', color: 'var(--badge-alert-text)', border: '1px solid var(--badge-alert-border)', padding: '10px 14px', borderRadius: 8, fontSize: '0.813rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="modal-form-body">
              <div className="form-field">
                <label className="form-label">Título del hito</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej. Entrega 3: Arquitectura"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label">Fecha de entrega</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label">Audiencia</label>
                <select
                  value={newAudience}
                  onChange={(e) => setNewAudience(e.target.value)}
                  className="form-input"
                >
                  <option value="Todos los grupos">Todos los grupos</option>
                  <option value="Grupos 1 y 3">Grupos 1 y 3</option>
                  <option value="Grupos 2 y 4">Grupos 2 y 4</option>
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
                  disabled={isSubmitting}
                  className="btn-primary-action"
                >
                  {isSubmitting ? 'Creando en APIM...' : 'Crear Hito (HTTP 201)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Editar Hito (PUT) */}
      {editingEvent && (
        <div className="modal-overlay-animated" onClick={() => setEditingEvent(null)}>
          <div className="modal-content-animated" onClick={(e) => e.stopPropagation()}>
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
                <label className="form-label">Audiencia</label>
                <input
                  type="text"
                  value={editAudience}
                  onChange={(e) => setEditAudience(e.target.value)}
                  className="form-input"
                />
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
                  {isSubmitting ? 'Guardando en APIM...' : 'Guardar Cambios (HTTP 200)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Confirmar Eliminación (DELETE) */}
      {deletingEvent && (
        <div className="modal-overlay-animated" onClick={() => setDeletingEvent(null)}>
          <div className="modal-content-animated" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#ef4444' }}>
                Eliminar Hito
              </h3>
              <button type="button" onClick={() => setDeletingEvent(null)} className="modal-close-btn">
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.844rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '14px 0' }}>
              ¿Estás seguro de que deseas eliminar el hito <strong>&quot;{deletingEvent.title}&quot;</strong>? Esta acción ejecutará la petición <code>DELETE /calendar/events/{deletingEvent.id}</code> en Azure APIM.
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
                {isSubmitting ? 'Eliminando...' : 'Eliminar en APIM (HTTP 200)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
