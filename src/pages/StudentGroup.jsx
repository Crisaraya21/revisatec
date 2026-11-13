import { useState, useEffect } from 'react';
import { ApiError } from '../lib/apiClient';
import { groupAnalysisApi, groupsApi, membersApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCourse } from '../context/CourseContext';
import { useStudentGroup } from '../hooks/useStudentGroup';
import { formatDate } from '../utils/date';
import { Icons } from '../components/Icons';
import './StudentDashboard.css';

const optional = (promise) => promise.catch(() => null);

export default function StudentGroup() {
  const { user } = useAuth();
  const { selectedCourse } = useCourse();
  const [reloadKey, setReloadKey] = useState(0);
  const assignment = useStudentGroup();
  const groupId = assignment.group?.id ?? null;

  const [data, setData] = useState({ groupId: null, group: null, members: null, issues: [], milestones: [] });
  const [isEditing, setIsEditing] = useState(false);
  const [repoInput, setRepoInput] = useState('');
  const [apiError, setApiError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, status, title, message) => {
    setToast({ type, status, title, message });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    if (groupId === null) return undefined;
    let isMounted = true;
    Promise.all([
      groupsApi.get(groupId),
      optional(membersApi.list(groupId)),
      optional(groupAnalysisApi.getIssues(groupId)),
      optional(groupAnalysisApi.getReport(groupId)),
    ])
      .then(([groupRes, membersRes, issuesRes, reportRes]) => {
        if (!isMounted) return;
        setApiError(null);
        setData({
          groupId,
          group: groupRes,
          members: membersRes ? membersRes.members || [] : null,
          issues: issuesRes?.items || [],
          milestones: reportRes?.checklist || [],
        });
        setRepoInput(groupRes?.repoUrl || '');
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error al cargar datos del grupo:', err);
        setApiError({ status: err instanceof ApiError ? err.status : 500, message: err.message });
      });
    return () => { isMounted = false; };
  }, [groupId, reloadKey]);

  const isLoading = assignment.status === 'loading' || (groupId !== null && data.groupId !== groupId && !apiError);
  const group = assignment.status === 'assigned' && data.groupId === groupId ? data.group : null;
  const members = group ? data.members || [] : [];
  const membersUnavailable = group ? data.members === null : false;
  const issues = group ? data.issues : [];
  const milestones = group ? data.milestones : [];
  const errorToShow = assignment.status === 'error' ? assignment.error : apiError;

  const handleManualRefresh = () => {
    setReloadKey((k) => k + 1);
  };

  const handleSaveRepo = async (e) => {
    e.preventDefault();
    try {
      const res = await groupsApi.update(group.id, {
        name: group.name,
        repoUrl: repoInput.trim(),
        avance: group.avance,
        estado: group.estado,
        courseId: group.courseId,
      });
      setData((prev) => ({ ...prev, group: res || { ...prev.group, repoUrl: repoInput.trim() } }));
      setIsEditing(false);
      showToast('success', 200, 'Repositorio actualizado', 'La URL del repositorio se guardó en MS1.');
    } catch (err) {
      console.error('Error al actualizar repo:', err);
      const code = err instanceof ApiError ? err.status : 400;
      showToast('error', code, `Error HTTP ${code}`, err.message || 'Error al actualizar repositorio.');
    }
  };

  return (
    <div className="student-dashboard-container">
      {/* Toast Notificaciones */}
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
      <div className="student-header">
        <div className="student-header-left">
          <h1 className="student-welcome-title">
            {group
              ? group.name || 'Mi Grupo'
              : isLoading
                ? 'Cargando...'
                : 'Sin grupo asignado'}
          </h1>
          <span className="student-group-subtitle">
            {group?.repoUrl ? `${group.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '')} · ` : ''}{selectedCourse?.name || 'Curso no disponible'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="btn-refresh-analysis"
            title="Recargar datos desde Azure APIM"
          >
            <Icons.Refresh />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="btn-view-my-group"
            disabled={!group}
          >
            <Icons.Edit />
            <span>{isEditing ? 'Cancelar edición' : 'Editar repositorio'}</span>
          </button>
        </div>
      </div>

      {/* Error API */}
      {errorToShow && (
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
              Error HTTP {errorToShow.status}: {errorToShow.message}
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
            Reintentar
          </button>
        </div>
      )}

      {/* Cargando */}
      {isLoading && !errorToShow && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Cargando información del grupo...
        </div>
      )}

      {assignment.status === 'unassigned' && (
        <div className="criteria-card" style={{ textAlign: 'center', padding: 32 }}>
          <h3 className="criteria-card-title">No estás asignado a un grupo en este curso</h3>
          <span className="criteria-card-subtitle">
            Tu correo {user?.email} no aparece en ningún grupo de {selectedCourse?.name || 'este curso'}.
            Pide al profesor que te agregue.
          </span>
        </div>
      )}

      {/* Formulario de edición */}
      {isEditing && group && (
        <form onSubmit={handleSaveRepo} className="criteria-card" style={{ gap: 14 }}>
          <div className="criteria-card-header">
            <h3 className="criteria-card-title">Configuración del Repositorio de GitHub</h3>
            <span className="criteria-card-subtitle">
              Se guarda en MS1 con <code>PUT /groups/{group.id}</code>
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="url"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              className="issues-search-input"
              style={{
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                padding: '10px 14px',
                flex: 1,
                minWidth: 260,
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
              }}
              placeholder="https://github.com/usuario/repo"
              required
            />
            <button
              type="submit"
              className="btn-primary-action"
              style={{ padding: '10px 20px', borderRadius: 8 }}
            >
              Guardar
            </button>
          </div>
        </form>
      )}

      {/* Contenido Principal */}
      {!isLoading && !errorToShow && group && (
        <div className="student-main-grid">
          {/* Columna Izquierda: Datos, Repo e Inconvenientes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Tarjeta de Datos del Repositorio */}
            <div className="student-progress-card">
              <h3 className="card-title-simple">Información del Repositorio</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                    URL Vinculada en GitHub
                  </span>
                  {group.repoUrl ? (
                    <a
                      href={group.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="repo-slug-link"
                      style={{ marginTop: 6, display: 'inline-flex', fontSize: '0.875rem' }}
                    >
                      <Icons.GitBranch />
                      <span>{group.repoUrl}</span>
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.844rem' }}>
                      Sin repositorio configurado
                    </span>
                  )}
                </div>

                <div style={{ marginTop: 10 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                    Integrantes del equipo ({members.length})
                  </span>
                  {membersUnavailable ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.844rem' }}>
                      No se pudieron cargar los integrantes.
                    </span>
                  ) : members.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.844rem' }}>Sin integrantes registrados.</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {members.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            backgroundColor: 'var(--bg-sunken)',
                            borderRadius: 8,
                            border: '1px solid var(--border-default)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="member-avatar">
                              {m.name?.charAt(0)}
                            </div>
                            <div>
                              <span style={{ fontSize: '0.844rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                                {m.name}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {m.email}{m.email === user?.email ? ' · Tú' : ''}
                              </span>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.813rem', fontWeight: 700, color: 'var(--action-primary)' }}>
                            {m.githubUser ? `@${m.githubUser}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Inconvenientes Reportados */}
            {issues.length > 0 && (
              <div className="criteria-card">
                <div className="criteria-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 className="criteria-card-title">Inconvenientes Registrados del Grupo</h3>
                    <span className="table-total-count">{issues.length} detectados</span>
                  </div>
                  <span className="criteria-card-subtitle">
                    Detectados por el análisis del repositorio
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {issues.map((iss, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        backgroundColor: 'var(--bg-sunken)',
                        borderRadius: 8,
                        border: '1px solid var(--border-default)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: '0.844rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {iss.type}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {iss.description} &middot; {formatDate(iss.date)}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.688rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 10,
                          backgroundColor: iss.status === 'Resuelto' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: iss.status === 'Resuelto' ? '#16a34a' : '#d97706',
                          border: `1px solid ${iss.status === 'Resuelto' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                        }}
                      >
                        {iss.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Avance e Hitos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Avance del Grupo */}
            <div className="student-team-card">
              <h3 className="card-title-simple">Avance Global del Grupo</h3>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <span style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--action-primary)' }}>
                  {group.avance === null || group.avance === undefined ? '—' : `${group.avance}%`}
                </span>
                <span style={{ display: 'block', fontSize: '0.781rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {group.avance === null || group.avance === undefined ? 'Avance no disponible' : `Estado: ${group.estado}`}
                </span>
              </div>
            </div>

            {/* Checklist de Hitos */}
            {milestones.length > 0 && (
              <div className="criteria-card">
                <div className="criteria-card-header">
                  <h3 className="criteria-card-title">Hitos del Proyecto</h3>
                  <span className="criteria-card-subtitle">
                    Reporte generado por el análisis del repositorio
                  </span>
                </div>

                <div className="milestones-checklist">
                  {milestones.map((m, idx) => (
                    <div key={idx} className="milestone-item">
                      <div className="milestone-left">
                        <Icons.CheckCircle />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span className="milestone-name">{m.name}</span>
                          <span className="milestone-date">{typeof m.date === 'number' ? formatDate(m.date) : m.date}</span>
                        </div>
                      </div>
                      <span className={`milestone-badge ${m.status}`}>
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  );
}
