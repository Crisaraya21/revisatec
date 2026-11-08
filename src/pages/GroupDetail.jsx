import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupsApi, groupAnalysisApi } from '../api';
import { ApiError } from '../lib/apiClient';
import { formatDate } from '../utils/date';
import { Icons } from '../components/Icons';
import './GroupDetail.css';

// Equivalencia para estados de síntesis de avance según el contrato MS2
const PROGRESS_STATUS_MAP = {
  on_track: { label: 'Al día', badgeClass: 'success', textClass: 'success' },
  at_risk: { label: 'En riesgo', badgeClass: 'warning', textClass: 'warning' },
  delayed: { label: 'Atrasado', badgeClass: 'alert', textClass: 'alert' },
};

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const groupId = id || '1';

  const [group, setGroup] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [progressSummary, setProgressSummary] = useState(null);
  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [showSynthesisModal, setShowSynthesisModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadGroupData() {
      setIsLoading(true);
      setApiError(null);

      // Cargar en paralelo tolerante e independiente
      try {
        const groupRes = await groupsApi.get(groupId);
        if (!isMounted) return;
        setGroup(groupRes);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error al cargar grupo:', err);
        const status = err instanceof ApiError ? err.status : 500;
        const message = err instanceof ApiError ? err.message : 'No se pudo cargar la información del grupo.';
        setApiError({ status, message });
        setIsLoading(false);
        return;
      }

      // Cargar análisis, síntesis de avance e inconvenientes con allSettled (un fallo no tumba al resto)
      const [analysisRes, progressRes, issuesRes] = await Promise.allSettled([
        groupAnalysisApi.getAnalysis(groupId),
        groupAnalysisApi.getProgressSummary(groupId),
        groupAnalysisApi.getIssues(groupId),
      ]);

      if (!isMounted) return;

      if (analysisRes.status === 'fulfilled') {
        setAnalysis(analysisRes.value);
        if (analysisRes.value?.score !== undefined) {
          setGroup((prev) => ({ ...prev, score: analysisRes.value.score }));
        }
      } else {
        console.warn('Análisis no disponible:', analysisRes.reason);
      }

      if (progressRes.status === 'fulfilled') {
        setProgressSummary(progressRes.value);
      } else {
        console.warn('Síntesis de avance no disponible:', progressRes.reason);
      }

      if (issuesRes.status === 'fulfilled') {
        const rawIssues = issuesRes.value?.items || [];
        setIssues(rawIssues);
      } else {
        console.warn('Inconvenientes no disponibles:', issuesRes.reason);
      }

      setIsLoading(false);
    }

    loadGroupData();
    return () => {
      isMounted = false;
    };
  }, [groupId]);

  if (apiError) {
    return (
      <div className="group-detail-page">
        <div className="group-detail-breadcrumbs">
          <button
            type="button"
            className="breadcrumb-back-btn"
            onClick={() => navigate('/groups')}
          >
            <Icons.ChevronLeft />
            <span>Grupos</span>
          </button>
          <span className="breadcrumb-separator">/</span>
          <span>Error</span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '2px solid #ef4444',
            borderRadius: '16px',
            padding: '40px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)',
          }}
          role="alert"
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icons.AlertTriangle />
          </div>

          <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '6px', backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: 800, fontSize: '0.875rem' }}>
            HTTP {apiError.status}
          </div>

          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
            Error al consultar grupo en Azure APIM
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '480px' }}>
            {apiError.message}
          </p>

          <button
            type="button"
            className="btn-primary-action"
            onClick={() => navigate('/groups')}
            style={{ marginTop: '8px' }}
          >
            Volver al listado de grupos
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && !group) {
    return (
      <div className="group-detail-page">
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          Cargando análisis y detalle del grupo desde APIM…
        </div>
      </div>
    );
  }

  const scoreDisplay = analysis?.score ?? group?.score ?? null;
  const overallProgress = progressSummary?.overall ?? group?.avance ?? 0;
  const unresolvedIssuesCount = issues.filter((i) => i.status === 'Sin resolver').length;
  const evidenceList = Array.isArray(analysis?.evidence) ? analysis.evidence : [];
  const criteriaList = Array.isArray(analysis?.criteria) ? analysis.criteria : [];
  const progressItems = Array.isArray(progressSummary?.items) ? progressSummary.items : [];

  return (
    <div className="group-detail-page">
      {/* ----------------- CABECERA PRINCIPAL ----------------- */}
      <div className="group-detail-header">
        <div className="group-detail-header-left">
          <div className="group-detail-breadcrumbs">
            <button
              type="button"
              className="breadcrumb-back-btn"
              onClick={() => navigate('/groups')}
            >
              <Icons.ChevronLeft />
              <span>Grupos</span>
            </button>
            <span className="breadcrumb-separator">/</span>
            <span>Detalle de Grupo</span>
          </div>

          <div className="group-detail-title-row">
            <h1 className="group-detail-title">{group?.name || `Grupo ${groupId}`}</h1>
            {group?.estado === 'Alerta' && (
              <span className="alert-pill">
                <Icons.AlertTriangle />
                Alerta de avance
              </span>
            )}
          </div>

          <div className="group-detail-meta-row">
            {group?.repoUrl ? (
              <a
                href={group.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group-repo-link"
              >
                {group.repoUrl.replace('https://github.com/', '')}
              </a>
            ) : (
              <span>Sin repositorio asignado</span>
            )}
            <span>·</span>
            <span>{group?.estado || 'En progreso'}</span>
          </div>
        </div>

        <div className="group-detail-header-actions">
          <button
            type="button"
            className="btn-secondary-outline"
            onClick={() => setShowSynthesisModal(true)}
            disabled={!progressSummary && criteriaList.length === 0}
          >
            <Icons.Sparkles />
            <span>Ver síntesis de avance</span>
          </button>

          <button
            type="button"
            className="btn-primary-action"
            onClick={() => navigate('/feedback')}
          >
            <Icons.Feedback />
            <span>Dar retroalimentación</span>
          </button>
        </div>
      </div>

      {/* ----------------- TARJETAS DE MÉTRICAS ----------------- */}
      <div className="metrics-cards-grid">
        <div className="metric-card">
          <span className="metric-card-label">Puntaje global</span>
          <span className="metric-card-value">
            {scoreDisplay !== null ? `${scoreDisplay}` : '—'}
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}> / 100</span>
          </span>
          <span className="metric-card-subtext success">
            {analysis?.analyzedAt ? `Evaluado: ${formatDate(analysis.analyzedAt)}` : 'Basado en análisis de rúbrica'}
          </span>
        </div>

        <div className="metric-card">
          <span className="metric-card-label">Avance global</span>
          <span className="metric-card-value">{overallProgress}%</span>
          <div
            className="progress-track"
            style={{ height: 6, marginTop: 4, borderRadius: 9999, backgroundColor: 'var(--border-default)', overflow: 'hidden' }}
            role="progressbar"
            aria-valuenow={overallProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="progress-fill"
              style={{ width: `${overallProgress}%`, height: '100%', backgroundColor: 'var(--action-primary)' }}
            />
          </div>
        </div>

        <div className="metric-card">
          <span className="metric-card-label">Inconvenientes</span>
          <span className="metric-card-value">{issues.length}</span>
          <span className={`metric-card-subtext ${unresolvedIssuesCount > 0 ? 'warning' : 'success'}`}>
            {unresolvedIssuesCount > 0 ? `${unresolvedIssuesCount} sin resolver` : 'Todos resueltos'}
          </span>
        </div>

        <div className="metric-card">
          <span className="metric-card-label">Evidencias detectadas</span>
          <span className="metric-card-value">{evidenceList.length}</span>
          <span className="metric-card-subtext">Commits y pull requests</span>
        </div>
      </div>

      {/* ----------------- SECCIÓN INTERMEDIA ----------------- */}
      <div className="middle-sections-grid">
        {/* Desglose de Criterios (MS2 Analysis) */}
        <div className="contribution-card">
          <div className="card-top-header">
            <div>
              <h2 className="card-heading-title">Cumplimiento por Criterio</h2>
              <span className="card-heading-subtitle">
                Puntajes calculados contra la rúbrica activa del curso
              </span>
            </div>
          </div>

          {criteriaList.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.844rem' }}>
              Sin criterios evaluados para este grupo aún.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 0' }}>
              {criteriaList.map((c, idx) => {
                const percent = c.percent ?? (c.max > 0 ? Math.round((c.score / c.max) * 100) : 0);
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.844rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {c.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.813rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {c.score !== undefined && c.max !== undefined ? `${c.score} / ${c.max}` : `${percent}%`}
                        </span>
                        <span
                          className={`criterion-badge ${c.type || (percent >= 70 ? 'success' : percent >= 40 ? 'warning' : 'alert')}`}
                          style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 6 }}
                        >
                          {c.level || (percent >= 70 ? 'Bueno' : 'Regular')}
                        </span>
                      </div>
                    </div>
                    <div
                      className="criterion-track"
                      style={{ height: 6, borderRadius: 9999, backgroundColor: 'var(--border-default)', overflow: 'hidden' }}
                      role="progressbar"
                      aria-valuenow={percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className={`criterion-fill ${c.type || (percent >= 70 ? 'success' : percent >= 40 ? 'warning' : 'alert')}`}
                        style={{ width: `${percent}%`, height: '100%' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Nota informativa de Aporte Individual */}
          <div className="contribution-alert-box" style={{ marginTop: 12 }}>
            <Icons.Sparkles />
            <span>
              <strong>Aporte por integrante:</strong> El modelo de análisis grupal (MS2) evalúa la salud del repositorio colectivo. El desglose individual no forma parte del contrato de análisis de grupo.
            </span>
          </div>
        </div>

        {/* Síntesis del Avance (MS2 progress-summary) */}
        <div className="milestones-card">
          <div className="card-top-header">
            <div>
              <h2 className="card-heading-title">Síntesis del Avance</h2>
              <span className="card-heading-subtitle">
                Estado operativo por criterio según el análisis más reciente
              </span>
            </div>
          </div>

          {progressItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.844rem' }}>
              Síntesis de avance en generación o no disponible para este grupo.
            </div>
          ) : (
            <div className="milestones-list">
              {progressItems.map((item, idx) => {
                const statusMeta = PROGRESS_STATUS_MAP[item.status] || {
                  label: item.status,
                  badgeClass: 'info',
                  textClass: 'info',
                };

                return (
                  <div key={idx} className="hito-item">
                    <span className={`milestone-icon ${statusMeta.badgeClass}`}>
                      {item.status === 'on_track' ? (
                        <Icons.CheckCircle />
                      ) : (
                        <Icons.AlertTriangle />
                      )}
                    </span>
                    <div className="milestone-content" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="milestone-title">{item.criterionId || `Criterio ${idx + 1}`}</span>
                        <span
                          className={`reviewer-badge ${statusMeta.badgeClass}`}
                          style={{ fontSize: '0.72rem' }}
                        >
                          {statusMeta.label}
                        </span>
                      </div>
                      {item.note && (
                        <span className="milestone-meta" style={{ marginTop: 2 }}>
                          {item.note}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ----------------- TABLA INFERIOR: EVIDENCIAS ----------------- */}
      <div className="evidence-panel-card">
        <div className="evidence-header">
          <h2 className="card-heading-title">Evidencias del Análisis</h2>
          <span className="card-heading-subtitle">
            Commits y pull requests inspeccionados en el repositorio
          </span>
        </div>

        <div className="evidence-table-container">
          {evidenceList.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.844rem' }}>
              Sin evidencias registradas en el análisis del grupo.
            </div>
          ) : (
            <table className="evidence-table">
              <thead>
                <tr>
                  <th>Evidencia</th>
                  <th>Tipo</th>
                  <th>Fecha de Detección</th>
                  <th>Enlace</th>
                </tr>
              </thead>
              <tbody>
                {evidenceList.map((ev, idx) => {
                  const title = ev.description || ev.title || ev.id || `Evidencia ${idx + 1}`;
                  const isPR = String(ev.type || '').toLowerCase().includes('pr') || String(title).toLowerCase().includes('pr');

                  return (
                    <tr key={idx}>
                      <td>
                        <div className="evidence-item-cell">
                          <span className="evidence-icon-badge">
                            {isPR ? <Icons.GitPullRequest /> : <Icons.GitCommit />}
                          </span>
                          <span>{title}</span>
                        </div>
                      </td>
                      <td>
                        <span className="reviewer-badge direct">
                          {ev.type || (isPR ? 'Pull Request' : 'Commit')}
                        </span>
                      </td>
                      <td>
                        <span className="evidence-time">
                          {ev.date ? formatDate(ev.date) : 'Reciente'}
                        </span>
                      </td>
                      <td>
                        {ev.url ? (
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--action-primary)', fontWeight: 600, fontSize: '0.813rem' }}
                          >
                            Ver en GitHub ↗
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.813rem' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ----------------- MODAL DE SÍNTESIS DE ANÁLISIS ----------------- */}
      {showSynthesisModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowSynthesisModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border-default)',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Modal Síntesis de Avance"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                Síntesis de Avance — {group?.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowSynthesisModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '20px' }}>
              Estado operativo consolidado por el modelo de scraping (/groups/{groupId}/progress-summary).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {progressItems.length > 0 ? (
                progressItems.map((p, i) => {
                  const meta = PROGRESS_STATUS_MAP[p.status] || { label: p.status, badgeClass: 'info' };
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-sunken)',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.844rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                          {p.criterionId}
                        </span>
                        {p.note && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.note}</span>
                        )}
                      </div>
                      <span className={`reviewer-badge ${meta.badgeClass}`} style={{ fontSize: '0.75rem' }}>
                        {meta.label}
                      </span>
                    </div>
                  );
                })
              ) : (
                criteriaList.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-sunken)' }}>
                    <span style={{ fontSize: '0.844rem', fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
                    <span className="reviewer-badge success" style={{ fontSize: '0.75rem' }}>{c.level || 'Evaluado'}</span>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-primary-action"
                onClick={() => setShowSynthesisModal(false)}
              >
                Cerrar síntesis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
