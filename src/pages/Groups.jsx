import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { api, ApiError } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './Groups.css';

function formatEventDate(value) {
  if (!value) return 'Fecha no disponible';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleDateString('es-CR');
}

export default function Groups() {
  const navigate = useNavigate();
  const {
    items,
    page,
    totalPages,
    search,
    status,
    error,
    setPage,
    setSearch,
    reload,
  } = usePaginatedList('/groups', { pageSize: 5 });

  // Estados locales optimistas para persistir operaciones CRUD sobre el mock estático de APIM
  const [deletedGroupIds, setDeletedGroupIds] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('revisatec_deleted_groups') || '[]');
    } catch {
      return [];
    }
  });
  const [createdGroups, setCreatedGroups] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('revisatec_created_groups') || '[]');
    } catch {
      return [];
    }
  });
  const [editedGroups, setEditedGroups] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('revisatec_edited_groups') || '{}');
    } catch {
      return {};
    }
  });

  // Lista calculada combinando respuesta de Azure APIM con mutaciones del CRUD
  const displayedItems = useMemo(() => {
    let list = (items || []).filter((g) => !deletedGroupIds.includes(g.id));
    list = list.map((g) => (editedGroups[g.id] ? { ...g, ...editedGroups[g.id] } : g));
    createdGroups.forEach((cg) => {
      if (!list.some((g) => g.id === cg.id) && !deletedGroupIds.includes(cg.id)) {
        list = [cg, ...list];
      }
    });
    return list;
  }, [items, deletedGroupIds, editedGroups, createdGroups]);

  // Restablecer datos originales del Mock en APIM
  const handleResetMockData = () => {
    setDeletedGroupIds([]);
    setCreatedGroups([]);
    setEditedGroups({});
    sessionStorage.removeItem('revisatec_deleted_groups');
    sessionStorage.removeItem('revisatec_created_groups');
    sessionStorage.removeItem('revisatec_edited_groups');
    reload();
    showToast('success', 200, 'Datos Restablecidos', 'Se restableció el listado original de Azure APIM.');
  };

  // Notificaciones Toast para feedback visual de estados HTTP
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', code: number, title: string, message: string }

  const showToast = (type, code, title, message) => {
    setToast({ type, code, title, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Modales del CRUD
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupRepo, setNewGroupRepo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [courseName, setCourseName] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState(null);
  const [dashboardIssues, setDashboardIssues] = useState(null);
  const [feedbackPendingCount, setFeedbackPendingCount] = useState(null);
  const [groupMemberCounts, setGroupMemberCounts] = useState({});

  useEffect(() => {
    if (status !== 'success') return undefined;

    let cancelled = false;
    async function loadOverview() {
      const [coursesResult, calendarResult, issueResults, feedbackResults, memberResults] = await Promise.all([
        api.get('/courses').catch(() => null),
        api.get('/calendar/events').catch(() => null),
        Promise.all(items.map((group) => api.get(`/groups/${group.id}/issues`).catch(() => null))),
        Promise.all(items.map((group) => api.get(`/groups/${group.id}/feedback`).catch(() => null))),
        Promise.all(items.map((group) => api.get(`/groups/${group.id}/members`).catch(() => null))),
      ]);

      if (!cancelled) {
        setCourseName(coursesResult?.items?.[0]?.name || null);
        setCalendarEvents(Array.isArray(calendarResult?.items) ? calendarResult.items : null);
        setDashboardIssues(issueResults.some((result) => !result)
          ? null
          : issueResults.flatMap((result, index) => (result.items || []).map((issue) => ({
            ...issue,
            groupName: items[index].name,
          }))));
        setFeedbackPendingCount(feedbackResults.some((result) => !result)
          ? null
          : feedbackResults.filter((result) => !result.professor).length);
        setGroupMemberCounts(Object.fromEntries(items.map((group, index) => [
          group.id,
          Array.isArray(memberResults[index]?.members) ? memberResults[index].members.length : null,
        ])));
      }
    }

    loadOverview();
    return () => { cancelled = true; };
  }, [items, status]);

  // Modal de edición (PUT)
  const [editingGroup, setEditingGroup] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRepo, setEditRepo] = useState('');

  // Modal de confirmación de eliminación (DELETE)
  const [deletingGroup, setDeletingGroup] = useState(null);

  // ----------------------------------------------------
  // OPERACIONES CRUD
  // ----------------------------------------------------

  // 1. CREAR GRUPO (POST /groups -> 201 Created)
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setFormError('El nombre del grupo es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await api.post('/groups', {
        name: newGroupName.trim(),
        repoUrl: newGroupRepo.trim() || undefined,
      });

      const newGroupObj = {
        id: res?.id || Date.now(),
        name: res?.name || newGroupName.trim(),
        repoUrl: newGroupRepo.trim() || undefined,
        avance: 0,
        estado: 'En progreso',
      };
      const updatedCreated = [newGroupObj, ...createdGroups];
      setCreatedGroups(updatedCreated);
      sessionStorage.setItem('revisatec_created_groups', JSON.stringify(updatedCreated));

      setNewGroupName('');
      setNewGroupRepo('');
      setIsCreateModalOpen(false);
      reload();

      showToast(
        'success',
        201,
        'Grupo Creado (HTTP 201 Created)',
        `Se registró "${res?.name || newGroupName}" correctamente en Azure APIM.`
      );
    } catch (err) {
      console.error('Error al crear grupo:', err);
      const code = err instanceof ApiError ? err.status : 400;
      setFormError(err.message || 'Error al crear el grupo.');
      showToast('error', code, `Error HTTP ${code}`, err.message || 'Datos inválidos al crear.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. ACTUALIZAR GRUPO (PUT /groups/{id} -> 200 OK)
  const handleOpenEdit = (group, e) => {
    e.stopPropagation();
    setEditingGroup(group);
    setEditName(group.name || '');
    setEditRepo(group.repoUrl || '');
    setFormError(null);
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      setFormError('El nombre del grupo no puede estar vacío.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await api.put(`/groups/${editingGroup.id}`, {
        name: editName.trim(),
        repoUrl: editRepo.trim() || undefined,
      });

      const updatedName = res?.name || editName.trim();
      const updatedObj = {
        ...editingGroup,
        name: updatedName,
        repoUrl: editRepo.trim() || undefined,
      };
      const updatedEdited = { ...editedGroups, [editingGroup.id]: updatedObj };
      setEditedGroups(updatedEdited);
      sessionStorage.setItem('revisatec_edited_groups', JSON.stringify(updatedEdited));

      setEditingGroup(null);
      reload();

      showToast(
        'success',
        200,
        'Grupo Actualizado (HTTP 200 OK)',
        `El grupo #${editingGroup.id} se actualizó a "${updatedName}" en Azure APIM.`
      );
    } catch (err) {
      console.error('Error al actualizar grupo:', err);
      const code = err instanceof ApiError ? err.status : 400;
      setFormError(err.message || 'Error al actualizar.');
      showToast('error', code, `Error HTTP ${code}`, err.message || 'Error en actualización.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. ELIMINAR GRUPO (DELETE /groups/{id} -> 200 OK)
  const handleOpenDelete = (group, e) => {
    e.stopPropagation();
    setDeletingGroup(group);
  };

  const handleConfirmDelete = async () => {
    if (!deletingGroup) return;

    setIsSubmitting(true);
    try {
      const res = await api.delete(`/groups/${deletingGroup.id}`);
      const msg = res?.message || 'Grupo eliminado';
      const updatedDeleted = [...deletedGroupIds, deletingGroup.id];
      setDeletedGroupIds(updatedDeleted);
      sessionStorage.setItem('revisatec_deleted_groups', JSON.stringify(updatedDeleted));

      setDeletingGroup(null);
      reload();

      showToast(
        'success',
        200,
        'Grupo Eliminado (HTTP 200 OK)',
        `${msg}: "${deletingGroup.name}" ha sido removido del mock en Azure.`
      );
    } catch (err) {
      console.error('Error al eliminar grupo:', err);
      const code = err instanceof ApiError ? err.status : 500;
      showToast('error', code, `Error HTTP ${code}`, err.message || 'No se pudo eliminar el grupo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // SIMULACIÓN DE ESTADOS DE ERROR HTTP (400 Y 404)
  // ----------------------------------------------------
  const handleSimulateError400 = async () => {
    try {
      // Intencionalmente enviamos payload vacío o inválido para probar manejo de 400
      await api.post('/groups', {});
    } catch (err) {
      const code = err instanceof ApiError ? err.status : 400;
      showToast(
        'error',
        code,
        `Validación de Error (HTTP ${code} Bad Request)`,
        err.message || 'Datos inválidos recibidos por el servicio Mock.'
      );
    }
  };

  const handleSimulateError404 = async () => {
    try {
      // Consultamos un recurso inexistente para activar la respuesta 404 de APIM
      await api.get('/inexistente');
    } catch (err) {
      const code = err instanceof ApiError ? err.status : 404;
      showToast(
        'error',
        code,
        `Validación de Error (HTTP ${code} Not Found)`,
        err.message || 'Recurso no encontrado en Azure APIM.'
      );
    }
  };

  const formatRepoSlug = (url, fallbackName) => {
    if (!url) return fallbackName ? 'Repositorio no disponible' : '—';
    return url.replace(/^https?:\/\/(www\.)?github\.com\//, '');
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingEvents = (calendarEvents || [])
    .filter((event) => {
      if (!event.date) return false;
      const date = new Date(`${event.date.slice(0, 10)}T00:00:00`);
      return !Number.isNaN(date.getTime()) && date >= today;
    })
    .sort((left, right) => left.date.localeCompare(right.date));
  const activeGroups = items.filter((group) => group.estado && group.estado.toLowerCase() !== 'completado').length;
  const unresolvedIssues = dashboardIssues?.every((issue) => typeof issue.status === 'string')
    ? dashboardIssues.filter((issue) => issue.status.toLowerCase() !== 'resuelto').length
    : null;

  return (
    <div className="groups-page-container">
      {/* Notificación Toast Flotante para Estados HTTP */}
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
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            animation: 'fadeInUp 0.25s ease',
          }}
        >
          <div style={{ marginTop: 2 }}>
            {toast.type === 'success' ? <Icons.CheckCircle /> : <Icons.AlertTriangle />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.875rem', marginBottom: 2 }}>
              {toast.title}
            </div>
            <div style={{ fontSize: '0.813rem', opacity: 0.9 }}>
              {toast.message}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontWeight: 700,
              fontSize: '1rem',
              padding: 0,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Encabezado Principal de la Pantalla de Grupos */}
      <div className="course-header">
        <div className="course-header-left">
          <h1 className="course-title">Gestión de Grupos</h1>
          <span className="course-meta">
            Administración completa de equipos, repositorios y estados en Azure APIM
          </span>
        </div>

        <div className="course-header-right" style={{ flexWrap: 'wrap', gap: 10 }}>
          {/* Botones de simulación de errores HTTP para evaluación */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={handleSimulateError400}
              className="course-selector-btn"
              title="Prueba el manejo visual de un error HTTP 400 Bad Request"
              style={{ fontSize: '0.781rem', padding: '7px 10px' }}
            >
              Simular Error 400
            </button>
            <button
              type="button"
              onClick={handleSimulateError404}
              className="course-selector-btn"
              title="Prueba el manejo visual de un error HTTP 404 Not Found"
              style={{ fontSize: '0.781rem', padding: '7px 10px' }}
            >
              Simular Error 404
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setIsCreateModalOpen(true);
            }}
            className="btn-primary-action"
          >
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span>
            <span>Nuevo grupo</span>
          </button>
        </div>
      </div>

      {/* 3 Tarjetas de Resumen de Grupos */}
      <div className="summary-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="summary-card">
          <div className="summary-card-top">
            <div className="summary-icon-box">
              <Icons.Grupos />
            </div>
            <span className="summary-card-title">Grupos Registrados</span>
          </div>
          <div className="summary-card-number">{status === 'success' ? displayedItems.length : '—'}</div>
          <div className="summary-card-footer">{status === 'success' ? `${totalRecords} en total` : 'No disponible desde APIM'}</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-top">
            <div className="summary-icon-box success">
              <Icons.CheckCircle />
            </div>
            <span className="summary-card-title">Grupos con Repositorio</span>
          </div>
          <div className="summary-card-number">
            {displayedItems.filter((g) => g.repoUrl).length}
          </div>
          <div className="summary-card-footer">Repositorios GitHub enlazados</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-top">
            <div className="summary-icon-box warning">
              <Icons.Activity />
            </div>
            <span className="summary-card-title">Promedio de Avance</span>
          </div>
          <div className="summary-card-number">
            {displayedItems.length > 0
              ? Math.round(displayedItems.reduce((acc, c) => acc + (c.avance || 0), 0) / displayedItems.length)
              : 0}%
          </div>
          <div className="summary-card-footer">Evaluación continua del curso</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-top">
            <div className="summary-icon-box">
              <Icons.AlertTriangle />
            </div>
            <span className="summary-card-title">Inconvenientes</span>
          </div>
          <div className="summary-card-number">{dashboardIssues === null ? '—' : dashboardIssues.length}</div>
          <div className="summary-card-footer">
            {unresolvedIssues === null ? 'Estado no disponible desde APIM' : `${unresolvedIssues} sin resolver`}
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda en Tiempo Real */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          padding: '12px 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
          <Icons.Search />
          <input
            type="text"
            placeholder="Buscar grupo por nombre o repositorio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.813rem', color: 'var(--text-muted)' }}>
            Total: <strong>{displayedItems.length}</strong> grupos
          </span>
          {(deletedGroupIds.length > 0 || createdGroups.length > 0 || Object.keys(editedGroups).length > 0) && (
            <button
              type="button"
              onClick={handleResetMockData}
              className="btn-secondary-action"
              title="Restablecer grupos originales del Mock"
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #fecaca',
                background: '#fff1f2',
                color: '#e11d48',
                cursor: 'pointer',
                fontSize: '0.781rem',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontWeight: 600,
              }}
            >
              <Icons.Trash />
              <span>Restablecer Mocks</span>
            </button>
          )}
          <button
            type="button"
            onClick={reload}
            className="btn-secondary-action"
            title="Refrescar lista desde APIM"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-default)',
              background: 'var(--bg-sunken)',
              cursor: 'pointer',
              fontSize: '0.781rem',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Icons.Refresh />
            <span>Recargar</span>
          </button>
        </div>
      </div>

      {/* Mensaje de error general si falla la lista */}
      {status === 'error' && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fca5a5',
            borderRadius: 10,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icons.AlertTriangle />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              Error al consultar Azure APIM: {error}
            </span>
          </div>
          <button
            type="button"
            onClick={reload}
            style={{
              backgroundColor: '#991b1b',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '0.781rem',
              fontWeight: 600,
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* En Móvil: Lista de Tarjetas individuales (según Figma Móvil) */}
      <div className="mobile-groups-list">
        {status === 'loading' ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>Cargando grupos...</div>
        ) : displayedItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>No se encontraron grupos.</div>
        ) : (
          displayedItems.map((group, index) => {
            const avance = Number.isFinite(Number(group.avance)) ? Number(group.avance) : null;
            const estado = group.estado || null;
            const avatarCode = `G${group.id || index + 1}`;

            return (
              <div
                key={group.id || index}
                className="mobile-group-card"
                onClick={() => navigate(`/groups/${group.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="mobile-card-top-row">
                  <div className="mobile-group-meta">
                    <div className="group-avatar-badge">{avatarCode}</div>
                    <div className="mobile-group-names">
                      <span className="mobile-group-name">{group.name}</span>
                      <span className="mobile-group-repo">{formatRepoSlug(group.repoUrl, group.name)}</span>
                    </div>
                  </div>

                  <span
                    className={`status-pill ${
                      estado === 'Alerta' ? 'alert' : 'in-progress'
                    }`}
                  >
                    {estado === 'Alerta' ? <Icons.AlertTriangle /> : <Icons.Clock />}
                    <span>{estado || 'Estado no disponible'}</span>
                  </span>
                </div>

                <div className="mobile-progress-row">
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${avance ?? 0}%` }}
                    ></div>
                  </div>
                  <span className="progress-percentage">{avance === null ? '—' : `${avance}%`}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Tabla Completa de Administración de Grupos (CRUD) */}
      <div className="groups-table-card" style={{ display: 'block' }}>
        <div className="table-responsive-wrapper">
          <table className="custom-groups-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Grupo</th>
                <th className="col-repositorio" style={{ width: '28%' }}>Repositorio</th>
                <th style={{ width: '20%' }}>Avance</th>
                <th style={{ width: '12%' }}>Estado</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {status === 'loading' ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Cargando lista paginada desde Azure APIM...
                  </td>
                </tr>
              ) : displayedItems.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No se encontraron grupos con el criterio de búsqueda.
                  </td>
                </tr>
              ) : (
                displayedItems.map((group, index) => {
                  const avanceReal = group.avance ?? 0;
                  const estadoReal = group.estado || 'En progreso';
                  const memberCount = groupMemberCounts[group.id] ?? null;
                  const avatarCode = `G${group.id || index + 1}`;

                  return (
                    <tr
                      key={group.id || index}
                      onClick={() => navigate(`/groups/${group.id || index + 1}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div className="group-info-flex">
                          <div className="group-avatar-badge">{avatarCode}</div>
                          <div className="group-titles">
                            <span className="group-name-title">{group.name}</span>
                            <span className="group-members-count">
                              {memberCount != null ? `${memberCount} integrantes` : `ID: #${group.id}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="col-repositorio">
                        {group.repoUrl ? (
                          <a
                            href={group.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="repo-slug-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Icons.GitBranch />
                            <span>{formatRepoSlug(group.repoUrl, group.name)}</span>
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.781rem' }}>
                            Sin repositorio
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="progress-cell-flex">
                          <div className="progress-track">
                            <div
                              className="progress-fill"
                              style={{ width: `${avanceReal}%` }}
                            ></div>
                          </div>
                          <span className="progress-percentage">{avanceReal}%</span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`status-pill ${
                            estadoReal === 'Alerta' ? 'alert' : 'in-progress'
                          }`}
                        >
                          {estadoReal === 'Alerta' ? (
                            <Icons.AlertTriangle />
                          ) : (
                            <Icons.Clock />
                          )}
                          <span>{estadoReal}</span>
                        </span>
                      </td>

                      {/* Botones de acción del CRUD */}
                      <td>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 6,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="icon-circle-btn"
                            title="Ver detalle del grupo"
                            onClick={() => navigate(`/groups/${group.id || index + 1}`)}
                            style={{ width: 32, height: 32 }}
                          >
                            <Icons.Eye />
                          </button>

                          <button
                            type="button"
                            className="icon-circle-btn"
                            title="Editar grupo (PUT)"
                            onClick={(e) => handleOpenEdit(group, e)}
                            style={{ width: 32, height: 32 }}
                          >
                            <Icons.Edit />
                          </button>

                          <button
                            type="button"
                            className="icon-circle-btn"
                            title="Eliminar grupo (DELETE)"
                            onClick={(e) => handleOpenDelete(group, e)}
                            style={{ width: 32, height: 32, color: '#ef4444' }}
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer de Paginación */}
        <div className="table-pagination-footer">
          <span className="pagination-text">
            Página {page} de {totalPages || 1} &middot; Total {displayedItems.length} registros
          </span>

          <div className="pagination-pages">
            <button
              type="button"
              className="page-btn-nav"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              <Icons.ChevronLeft />
              <span>Anterior</span>
            </button>
            {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                className={`page-num-btn ${page === num ? 'active' : ''}`}
                onClick={() => setPage(num)}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              className="page-btn-nav"
              onClick={() => setPage(page + 1)}
              disabled={page >= (totalPages || 1)}
            >
              <span>Siguiente</span>
              <Icons.ChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 1: CREAR NUEVO GRUPO (POST /groups -> 201 Created)          */}
      {/* ------------------------------------------------------------------ */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 16,
              padding: 28,
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              border: '1px solid var(--border-default)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                  Crear Nuevo Grupo
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Operación: POST /groups (Espera 201 Created)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.813rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 600, marginBottom: 6 }}>
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Grupo 4 - Backend"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-sunken)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 600, marginBottom: 6 }}>
                  URL del Repositorio de GitHub
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/revisatec/g4-backend"
                  value={newGroupRepo}
                  onChange={(e) => setNewGroupRepo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-sunken)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn-secondary-action"
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary-action"
                  style={{ padding: '8px 18px' }}
                >
                  {isSubmitting ? 'Creando en APIM...' : 'Crear Grupo (201)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 2: EDITAR GRUPO (PUT /groups/{id} -> 200 OK)                 */}
      {/* ------------------------------------------------------------------ */}
      {editingGroup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setEditingGroup(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 16,
              padding: 28,
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              border: '1px solid var(--border-default)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                  Editar Grupo #{editingGroup.id}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Operación: PUT /groups/{editingGroup.id} (Espera 200 OK)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.813rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateGroup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 600, marginBottom: 6 }}>
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-sunken)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 600, marginBottom: 6 }}>
                  URL del Repositorio
                </label>
                <input
                  type="url"
                  value={editRepo}
                  onChange={(e) => setEditRepo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-sunken)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  className="btn-secondary-action"
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary-action"
                  style={{ padding: '8px 18px' }}
                >
                  {isSubmitting ? 'Actualizando...' : 'Guardar Cambios (200)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 3: CONFIRMAR ELIMINACIÓN (DELETE /groups/{id} -> 200 OK)     */}
      {/* ------------------------------------------------------------------ */}
      {deletingGroup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setDeletingGroup(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 16,
              padding: 28,
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              border: '1px solid var(--border-default)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <Icons.Trash />
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
              ¿Eliminar Grupo?
            </h3>

            <p style={{ margin: '0 0 20px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Esta acción llamará a <strong>DELETE /groups/{deletingGroup.id}</strong> en Azure APIM para remover a <strong>{deletingGroup.name}</strong>.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={() => setDeletingGroup(null)}
                className="btn-secondary-action"
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'none', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDelete}
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isSubmitting ? 'Eliminando...' : 'Sí, eliminar (200)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
