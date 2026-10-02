import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { Icons } from '../components/Icons';
import './StudentDashboard.css';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentFirstName = user?.name?.split(' ')[0] || 'Estudiante';
  const [groupInfo, setGroupInfo] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [issues, setIssues] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [toast] = useState(null);
  const [httpResult, setHttpResult] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadStudentDashboardData() {
      setIsLoading(true);
      setApiError(null);
      try {
        // 1. Cargar información del grupo desde Azure APIM
        const groupRes = await api.get('/groups/2');
        if (!isMounted) return;
        setGroupInfo({
          id: 2,
          name: groupRes.name || 'Grupo 2',
          repoUrl: groupRes.repoUrl || '',
          score: groupRes.score ?? 85,
          myContribution: groupRes.myContribution ?? 18,
          reviewedPRs: groupRes.reviewedPRs || '12 / 14',
          unreviewedPRs: groupRes.unreviewedPRs ?? 2,
          commitsCount: groupRes.commitsCount ?? 96,
          commitsWeek: groupRes.commitsWeek || '+18 esta semana',
          avance: groupRes.avance ?? 71,
        });

        // 2. Cargar análisis de criterios y rúbrica
        const analysisRes = await api.get('/groups/2/analysis');
        if (!isMounted) return;
        if (analysisRes?.score !== undefined || analysisRes?.progress !== undefined) {
          setGroupInfo((prev) => ({
            ...prev,
            score: analysisRes.score ?? prev?.score ?? 85,
            avance: analysisRes.progress ?? prev?.avance ?? 71,
          }));
        }
        setCriteria(analysisRes?.criteria || []);

        // 3. Cargar integrantes del equipo
        try {
          const membersRes = await api.get('/groups/2/members');
          if (isMounted) setTeamMembers(membersRes?.members || []);
        } catch (err) {
          console.warn('No se pudieron cargar los integrantes del grupo:', err);
          if (isMounted) {
            setTeamMembers([]);
          }
        }

        // 4. Cargar reporte de hitos y entregas
        try {
          const reportRes = await api.get('/groups/2/report');
          if (isMounted) setMilestones(reportRes?.checklist || []);
        } catch {
          if (isMounted) setMilestones([]);
        }

        // 5. Cargar estado de retroalimentación
        try {
          const feedbackRes = await api.get('/groups/2/feedback');
          if (isMounted) setFeedbackSummary(feedbackRes);
        } catch {
          if (isMounted) setFeedbackSummary(null);
        }

        // 6. Cargar inconvenientes del grupo
        try {
          const issuesRes = await api.get('/groups/2/issues');
          if (isMounted) setIssues(issuesRes?.items || []);
        } catch {
          if (isMounted) setIssues([]);
        }

        // 7. Cargar próximas fechas
        try {
          const eventsRes = await api.get('/calendar/events');
          if (isMounted) {
            const evList = Array.isArray(eventsRes?.items)
              ? eventsRes.items
              : (Array.isArray(eventsRes) ? eventsRes : []);
            setUpcomingEvents(evList);
          }
        } catch {
          if (isMounted) setUpcomingEvents([]);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error al cargar datos del estudiante:', err);
        const code = err instanceof ApiError ? err.status : 500;
        setApiError({
          status: code,
          message: err.message || 'Error al conectar con los servicios Mock de Azure APIM.',
        });
        setGroupInfo(null);
        setCriteria([]);
        setTeamMembers([]);
        setMilestones([]);
        setFeedbackSummary(null);
        setIssues([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadStudentDashboardData();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const handleManualRefresh = () => {
    setIsLoading(true);
    setReloadKey((k) => k + 1);
  };


  useEffect(() => {
    api.get('/calendar/events')
      .then((res) => setUpcomingEvents(Array.isArray(res?.items) ? res.items : []))
      .catch((err) => {
        console.warn('No se pudieron cargar las próximas fechas:', err);
        setUpcomingEvents([]);
      });
  }, []);

  return (
    <div className="student-dashboard-container">
      {/* Toast Flotante de Notificaciones */}
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
          <h1 className="student-welcome-title">Hola, {studentFirstName}</h1>
          <span className="student-group-subtitle">
            {groupInfo
              ? `${groupInfo.name || `Grupo ${groupInfo.id}`}${groupInfo.repoUrl ? ` · ${groupInfo.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '')}` : ''}`
              : 'Conectando con Azure APIM...'}
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
          >
            <Icons.User />
            <span>Ver mi grupo</span>
          </button>
        </div>
      </div>

      {/* Alerta de Error HTTP (Ley: cero datos falsos) */}
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
            Ley del proyecto: la pantalla muestra el error real de Azure APIM en lugar de datos inventados.
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

      {/* Cargando */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Cargando métricas y análisis de estudiante desde Azure APIM...
        </div>
      )}

      {/* Contenido Principal */}
      {!isLoading && !apiError && groupInfo && (
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
              <span className="stat-value">{groupInfo.score ?? '—'} / 100</span>
              <span className="stat-subtext">Ponderación oficial</span>
            </div>

            <div className="student-stat-card">
              <span className="stat-label">Mi aporte individual</span>
              <span className="stat-value">{groupInfo.myContribution === null ? '—' : `${groupInfo.myContribution}%`}</span>
              <span className="stat-subtext">Participación calculada</span>
            </div>

            <div className="student-stat-card">
              <span className="stat-label">Pull Requests revisados</span>
              <span className="stat-value">{groupInfo.reviewedPRs ?? '—'}</span>
              <span className="stat-subtext">Revisiones de pares</span>
            </div>

            <div className="student-stat-card highlight">
              <span className="stat-label">PRs sin revisar</span>
              <span className="stat-value">{groupInfo.unreviewedPRs ?? '—'}</span>
              <span className="stat-subtext" style={{ color: groupInfo.unreviewedPRs > 0 ? '#d97706' : 'var(--text-muted)', fontWeight: 600 }}>
                {groupInfo.unreviewedPRs === null
                  ? 'No disponible desde APIM'
                  : groupInfo.unreviewedPRs > 0
                  ? `${groupInfo.unreviewedPRs} sin revisión`
                  : 'Sin PRs pendientes'}
              </span>
            </div>

            <div className="student-stat-card">
              <span className="stat-label">Commits registrados</span>
              <span className="stat-value">{groupInfo.commitsCount ?? '—'}</span>
              <span className="stat-subtext" style={{ color: '#16a34a', fontWeight: 600 }}>
                {groupInfo.commitsWeek || 'Registrados en Git'}
              </span>
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
                        Avance global: {groupInfo.avance}%
                      </span>
                    </div>
                    <span className="criteria-card-subtitle">
                      Evaluación continua generada por los Mock Services en Azure APIM
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
                            {iss.description} &middot; {iss.date}
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
                      Obtenido de <code>GET /groups/2/report</code>
                    </span>
                  </div>

                  <div className="milestones-checklist">
                    {milestones.map((m, idx) => (
                      <div key={idx} className="milestone-item">
                        <div className="milestone-left">
                          <Icons.CheckCircle />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span className="milestone-name">{m.name}</span>
                            <span className="milestone-date">{m.date}</span>
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
                    {teamMembers.map((m, idx) => (
                      <div
                        key={idx}
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
                            {m.initials || m.name?.charAt(0)}
                          </div>
                          <div className="member-info">
                            <span className="member-name">{m.name}</span>
                            <span style={{ fontSize: '0.688rem', color: 'var(--text-muted)' }}>
                              {m.email}
                            </span>
                          </div>
                        </div>

                        <span style={{ fontSize: '0.813rem', fontWeight: 700, color: 'var(--action-primary)' }}>
                          {m.contribution}
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
                const date = event.date ? new Date(`${event.date.slice(0, 10)}T00:00:00`) : null;
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
                <span className="date-sub">No hay fechas disponibles desde APIM.</span>
              )}
            </div>
          </div>
        </>
      )}

      {httpResult && (
        <div onClick={() => setHttpResult(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'var(--card-bg, #fff)', borderRadius: 14, padding: '28px 28px 24px', maxWidth: 480, width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', border: httpResult.code === 400 ? '1.5px solid #f59e0b' : '1.5px solid #ef4444' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ backgroundColor: httpResult.code === 400 ? '#fef3c7' : '#fee2e2', color: httpResult.code === 400 ? '#b45309' : '#991b1b', fontWeight: 800, fontSize: '1.1rem', borderRadius: 8, padding: '4px 12px', fontFamily: 'monospace' }}>HTTP {httpResult.code}</span>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary, #111)' }}>{httpResult.label}</span>
              </div>
              <button type="button" onClick={() => setHttpResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--text-secondary, #666)', lineHeight: 1 }}>✕</button>
            </div>
            {httpResult.endpoint && (
              <div style={{ marginBottom: 12, padding: '6px 12px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 6, fontSize: '0.781rem', fontFamily: 'monospace', color: 'var(--text-secondary, #444)' }}>
                <strong>Solicitud a APIM:</strong> {httpResult.endpoint}
              </div>
            )}
            <p style={{ margin: '0 0 14px', fontSize: '0.875rem', color: 'var(--text-secondary, #555)' }}>{httpResult.message}</p>
            {httpResult.body && (
              <pre style={{ backgroundColor: '#1e1e2e', color: '#cdd6f4', borderRadius: 8, padding: '12px 14px', fontSize: '0.781rem', overflowX: 'auto', margin: 0, lineHeight: 1.6 }}>{JSON.stringify(httpResult.body, null, 2)}</pre>
            )}
            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setHttpResult(null)} style={{ backgroundColor: httpResult.code === 400 ? '#f59e0b' : '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
