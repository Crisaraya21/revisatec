import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/apiClient';
import { calendarApi, groupAnalysisApi, membersApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCourse } from '../context/CourseContext';
import { useStudentGroup } from '../hooks/useStudentGroup';
import { fromEpochMs, formatDate } from '../utils/date';
import { Icons } from '../components/Icons';
import './StudentDashboard.css';

const optional = (promise) => promise.catch(() => null);

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedCourseId, selectedCourse } = useCourse();
  const studentFirstName = user?.name?.split(' ')[0] || 'Estudiante';
  const [reloadKey, setReloadKey] = useState(0);
  const assignment = useStudentGroup();
  const groupId = assignment.group?.id ?? null;

  const [data, setData] = useState({ groupId: null, analysis: null, members: [], milestones: [], feedback: null, issues: [] });
  const [apiError, setApiError] = useState(null);
  const [upcomingEventsState, setUpcomingEventsState] = useState({ courseId: null, items: [] });
  const upcomingEvents = Object.is(upcomingEventsState.courseId, selectedCourseId)
    ? upcomingEventsState.items
    : [];

  useEffect(() => {
    if (groupId === null) return undefined;
    let isMounted = true;
    Promise.all([
      optional(groupAnalysisApi.getAnalysis(groupId)),
      optional(membersApi.list(groupId)),
      optional(groupAnalysisApi.getReport(groupId)),
      optional(groupAnalysisApi.getFeedback(groupId)),
      optional(groupAnalysisApi.getIssues(groupId)),
    ])
      .then(([analysis, members, report, feedback, issues]) => {
        if (!isMounted) return;
        setApiError(null);
        setData({
          groupId,
          analysis,
          members: members?.members || [],
          milestones: report?.checklist || [],
          feedback,
          issues: issues?.items || [],
        });
      })
      .catch((err) => {
        if (!isMounted) return;
        setApiError({ status: err instanceof ApiError ? err.status : 500, message: err.message });
      });
    return () => { isMounted = false; };
  }, [groupId, reloadKey]);

  const isLoading = assignment.status === 'loading' || (groupId !== null && data.groupId !== groupId && !apiError);
  const groupInfo = assignment.status === 'assigned' && data.groupId === groupId ? assignment.group : null;
  const analysis = groupInfo ? data.analysis : null;
  const criteria = analysis?.criteria || [];
  const teamMembers = groupInfo ? data.members : [];
  const milestones = groupInfo ? data.milestones : [];
  const feedbackSummary = groupInfo && data.feedback?.status === 'published' ? data.feedback : null;
  const issues = groupInfo ? data.issues : [];
  const openIssues = issues.filter((issue) => issue.status !== 'Resuelto').length;
  const avance = groupInfo?.avance ?? null;
  const errorToShow = assignment.status === 'error' ? assignment.error : apiError;

  const handleManualRefresh = () => {
    setReloadKey((k) => k + 1);
  };

  useEffect(() => {
    let active = true;
    calendarApi.listEvents({ courseId: selectedCourseId, page: 1, pageSize: 100 })
      .then((res) => {
        if (!active) return;
        const items = Array.isArray(res?.items) ? res.items : [];
        const now = Date.now();
        setUpcomingEventsState({
          courseId: selectedCourseId,
          items: items
            .filter((event) => typeof event.date === 'number' && event.date >= now)
            .sort((a, b) => a.date - b.date),
        });
      })
      .catch((err) => {
        if (!active) return;
        console.warn('No se pudieron cargar las próximas fechas:', err);
        setUpcomingEventsState({ courseId: selectedCourseId, items: [] });
      });
    return () => { active = false; };
  }, [selectedCourseId, reloadKey]);

  return (
    <div className="student-dashboard-container">
      {/* Encabezado */}
      <div className="student-header">
        <div className="student-header-left">
          <h1 className="student-welcome-title">Hola, {studentFirstName}</h1>
          <span className="student-group-subtitle">
            {groupInfo
              ? `${groupInfo.name}${groupInfo.repoUrl ? ` · ${groupInfo.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '')}` : ''}`
              : selectedCourse?.name || 'Cargando curso...'}
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
            onClick={() => navigate('/student/group')}
            className="btn-view-my-group"
            disabled={!groupInfo}
          >
            <Icons.User />
            <span>Ver mi grupo</span>
          </button>
        </div>
      </div>

      {/* Alerta de Error HTTP */}
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
          Cargando tu grupo y su análisis...
        </div>
      )}

      {/* Estudiante sin grupo en el curso seleccionado */}
      {assignment.status === 'unassigned' && (
        <div className="criteria-card" style={{ textAlign: 'center', padding: 32 }}>
          <h3 className="criteria-card-title">No estás asignado a un grupo en este curso</h3>
          <span className="criteria-card-subtitle">
            Tu correo {user?.email} no aparece en ningún grupo de {selectedCourse?.name || 'este curso'}.
            Pide al profesor que te agregue o selecciona otro curso.
          </span>
        </div>
      )}

      {/* Contenido Principal */}
      {!isLoading && !errorToShow && groupInfo && (
        <>
          {/* Banner de Acción: Proceso de Aceptar Cambios Pendientes */}
          {feedbackSummary && (
            <div className="student-action-banner">
              <div className="student-action-banner-left">
                <div className="student-action-banner-icon">
                  <Icons.Feedback />
                </div>
                <div className="student-action-banner-info">
                  <span className="student-action-banner-title">
                    Proceso de Aceptación de Cambios &middot; {feedbackSummary.deliveryTitle}
                  </span>
                  <span className="student-action-banner-desc">
                    Tienes sugerencias emitidas por el profesor y la IA pendientes de verificación y confirmación en el repositorio.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/student/feedback')}
                className="btn-banner-action"
              >
                <span>Revisar y Aceptar Cambios</span>
                <Icons.ChevronRight />
              </button>
            </div>
          )}

          {/* Tarjetas de Métricas del Estudiante */}
          <div className="student-stats-row">
            <div className="student-stat-card">
              <span className="stat-label">Nota actual</span>
              <span className="stat-value">{analysis?.score ?? '—'} / 100</span>
              <span className="stat-subtext">Según la rúbrica del curso</span>
            </div>

            <div className="student-stat-card">
              <span className="stat-label">Avance del grupo</span>
              <span className="stat-value">{avance === null ? '—' : `${avance}%`}</span>
              <span className="stat-subtext">Estado: {groupInfo.estado}</span>
            </div>

            <div className="student-stat-card highlight">
              <span className="stat-label">Inconvenientes abiertos</span>
              <span className="stat-value">{openIssues}</span>
              <span className="stat-subtext" style={{ color: openIssues > 0 ? '#d97706' : 'var(--text-muted)', fontWeight: 600 }}>
                {openIssues > 0 ? `${openIssues} sin resolver` : 'Sin inconvenientes abiertos'}
              </span>
            </div>

            <div className="student-stat-card">
              <span className="stat-label">Integrantes</span>
              <span className="stat-value">{teamMembers.length}</span>
              <span className="stat-subtext">Registrados en el grupo</span>
            </div>
          </div>

          {/* Grid Principal: Rúbrica + Hitos / Equipo */}
          <div className="student-main-grid">
            {/* Columna Izquierda: Cumplimiento por Criterio e Inconvenientes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Criterios */}
              {criteria.length > 0 && (
                <div className="criteria-card">
                  <div className="criteria-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h3 className="criteria-card-title">Cumplimiento por Criterio (Rúbrica)</h3>
                      <span className="table-total-count">
                        Avance global: {avance === null ? '—' : `${avance}%`}
                      </span>
                    </div>
                    <span className="criteria-card-subtitle">
                      Evaluación del análisis del repositorio según la rúbrica
                    </span>
                  </div>

                  <div className="criteria-list">
                    {criteria.map((item, index) => {
                      const percent = item.percent || (item.max > 0 ? Math.round((item.score / item.max) * 100) : 0);
                      const badgeType = item.type || (percent >= 80 ? 'success' : percent >= 60 ? 'warning' : 'alert');
                      return (
                        <div key={index} className="criterion-row">
                          <div className="criterion-info-top">
                            <span className="criterion-name">{item.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className={`criterion-badge ${badgeType}`}>
                                {item.level || `${percent}%`}
                              </span>
                              <span className="criterion-fraction">
                                {item.score ?? percent} / {item.max || 100}
                              </span>
                            </div>
                          </div>
                          <div className="criterion-bar-row">
                            <div className="criterion-track">
                              <div
                                className={`criterion-fill ${badgeType}`}
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Inconvenientes Detectados */}
              {issues.length > 0 && (
                <div className="criteria-card">
                  <div className="criteria-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h3 className="criteria-card-title">Inconvenientes Detectados en el Repositorio</h3>
                      <span className="table-total-count">{issues.length} alerta(s)</span>
                    </div>
                    <span className="criteria-card-subtitle">
                      Detectados por el analizador de Azure APIM en el historial de código
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

            {/* Columna Derecha: Hitos del Reporte e Integrantes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Checklist de Hitos del Proyecto */}
              {milestones.length > 0 && (
                <div className="criteria-card">
                  <div className="criteria-card-header">
                    <h3 className="criteria-card-title">Hitos y Entregas</h3>
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

              {/* Integrantes del Equipo */}
              {teamMembers.length > 0 && (
                <div className="student-team-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 className="card-title-simple">Integrantes del Equipo</h3>
                    <span className="table-total-count">{teamMembers.length} alumnos</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {teamMembers.map((m) => (
                      <div
                        key={m.id}
                        className="team-member-row"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: 'var(--bg-sunken)',
                          border: '1px solid var(--border-default)',
                          borderRadius: 8,
                          padding: '10px 12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="member-avatar">
                            {m.name?.charAt(0)}
                          </div>
                          <div className="member-info">
                            <span className="member-name">{m.name}</span>
                            <span style={{ fontSize: '0.688rem', color: 'var(--text-muted)' }}>
                              {m.email}
                            </span>
                          </div>
                        </div>

                        <span style={{ fontSize: '0.813rem', fontWeight: 700, color: 'var(--action-primary)' }}>
                          {m.githubUser ? `@${m.githubUser}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="student-dates-card">
            <h2 className="card-title-simple">Próximas fechas</h2>
            <div className="student-dates-list">
              {upcomingEvents.length > 0 ? upcomingEvents.slice(0, 3).map((event) => {
                const date = fromEpochMs(event.date);
                return (
                  <div key={event.id || `${event.date}-${event.title}`} className="student-date-item">
                    <div className="student-date-badge">
                      <span className="badge-month">
                        {date && !Number.isNaN(date.getTime())
                          ? date.toLocaleDateString('es-CR', { month: 'short' }).replace('.', '').toUpperCase()
                          : '—'}
                      </span>
                      <span className="badge-day">
                        {date && !Number.isNaN(date.getTime()) ? String(date.getDate()).padStart(2, '0') : '—'}
                      </span>
                    </div>
                    <div className="student-date-details">
                      <span className="date-title">{event.title}</span>
                      {(event.subtitle || event.audience) && (
                        <span className="date-sub">{event.subtitle || event.audience}</span>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <span className="date-sub">No hay próximas fechas en este curso.</span>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
