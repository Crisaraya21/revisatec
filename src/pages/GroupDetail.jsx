import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './GroupDetail.css';

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const groupId = id || '1';

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [issues, setIssues] = useState([]);
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [showSynthesisModal, setShowSynthesisModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadStrictData() {
      setIsLoading(true);
      setApiError(null);

      try {
        // Consultas ESTRICTAS a Azure APIM: si falla la llamada base, debe romperse y mostrar error HTTP
        const [groupRes, membersRes, analysisRes, issuesRes, reportRes] = await Promise.all([
          api.get(`/groups/${groupId}`),
          api.get(`/groups/${groupId}/members`).catch((err) => {
            console.warn('Members mock no disponible:', err);
            return { members: [] };
          }),
          api.get(`/groups/${groupId}/analysis`).catch((err) => {
            console.warn('Analysis mock no disponible:', err);
            return null;
          }),
          api.get(`/groups/${groupId}/issues`).catch((err) => {
            console.warn('Issues mock no disponible:', err);
            return { items: [] };
          }),
          api.get(`/groups/${groupId}/report`).catch((err) => {
            console.warn('Report mock no disponible:', err);
            return { checklist: [] };
          }),
        ]);

        if (!isMounted) return;

        // Asignación estricta de datos recibidos del mock
        setGroup(groupRes);

        // Integrantes recibidos
        const rawMembers = membersRes?.members || [];
        const colorPalette = ['#2b5279', '#699cc7', '#f59e0b', '#396fa2', '#9dbedc'];
        setMembers(
          rawMembers.map((m, idx) => ({
            ...m,
            color: colorPalette[idx % colorPalette.length],
            contributionNum: parseInt(m.contribution, 10) || 0,
          }))
        );

        setAnalysis(analysisRes);
        setIssues(issuesRes?.items || []);
        setReport(reportRes);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error estricto de APIM:', err);
        const status = err instanceof ApiError ? err.status : 500;
        const message = err instanceof ApiError ? err.message : 'Error de conexión con el servicio Mock.';
        setApiError({ status, message });
        setGroup(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadStrictData();
    return () => {
      isMounted = false;
    };
  }, [groupId]);

  // Si falló el mock o la llamada retornó un error HTTP (400, 404, etc.)
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

          <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
            Error al consultar el grupo en Azure APIM
          </h2>

          <p style={{ margin: 0, color: 'var(--text-muted)', maxWidth: 500, fontSize: '0.9rem' }}>
            {apiError.message}
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              className="btn-secondary-outline"
              onClick={() => navigate('/groups')}
            >
              Volver a la lista de grupos
            </button>
            <button
              type="button"
              className="btn-primary-action"
              onClick={() => window.location.reload()}
            >
              Reintentar llamada
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Si está cargando
  if (isLoading) {
    return (
      <div className="group-detail-page">
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Cargando datos directamente desde Azure APIM (/groups/{groupId})...
        </div>
      </div>
    );
  }

  // Cálculos para el Donut SVG (usando datos reales recibidos)
  const radius = 44;
  const circumference = 2 * Math.PI * radius;

  const donutSegments = members.map((m, idx) => {
    const percentNum = m.contributionNum;
    const prevSum = members
      .slice(0, idx)
      .reduce((acc, curr) => acc + curr.contributionNum, 0);
    const strokeDasharray = `${(percentNum / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((prevSum / 100) * circumference);
    return {
      ...m,
      percentNum,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  // Miembro con mayor aporte
  const maxContribMember =
    members.length > 0
      ? [...members].sort((a, b) => b.contributionNum - a.contributionNum)[0]
      : null;

  // Inconvenientes no resueltos
  const unresolvedIssues = issues.filter(
    (iss) =>
      iss.status?.toLowerCase().includes('sin') ||
      iss.status?.toLowerCase().includes('pend')
  );

  return (
    <div className="group-detail-page">
      {/* ----------------- CABECERA ----------------- */}
      <div className="group-detail-header">
        <div className="group-detail-header-left">
          {/* Breadcrumb */}
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
            <span>{group?.name || `Grupo ${groupId}`}</span>
          </div>

          {/* Título y badge */}
          <div className="group-detail-title-row">
            <h1 className="group-detail-title">{group?.name || `Grupo ${groupId}`}</h1>
            {group?.estado && (
              <span className="alert-pill">
                <Icons.AlertTriangle />
                <span>{group.estado}</span>
              </span>
            )}
          </div>

          {/* Subtítulo / Metadatos */}
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
              <span style={{ color: 'var(--text-muted)' }}>Sin repositorio</span>
            )}
            <span>&middot;</span>
            <span>{members.length} integrantes</span>
          </div>
        </div>

        {/* Acciones superiores */}
        <div className="group-detail-header-actions">
          <button
            type="button"
            className="btn-secondary-outline"
            onClick={() => setShowSynthesisModal(true)}
          >
            <Icons.Activity />
            <span>Ver síntesis</span>
          </button>

          <button
            type="button"
            className="btn-primary-action"
            onClick={() => navigate('/feedback', { state: { selectedGroupId: groupId } })}
          >
            <Icons.MessageSquare />
            <span>Dar retroalimentación</span>
          </button>
        </div>
      </div>

      {/* ----------------- 4 TARJETAS DE MÉTRICAS (Datos del Mock) ----------------- */}
      <div className="metrics-cards-grid">
        {/* Nota estimada */}
        <div className="metric-card">
          <span className="metric-card-label">Nota estimada</span>
          <span className="metric-card-value">
            {group?.avance ?? analysis?.score ?? analysis?.progress ?? '—'} / 100
          </span>
          <span className="metric-card-subtext">Según la rúbrica</span>
        </div>

        {/* PRs revisados */}
        <div className="metric-card">
          <span className="metric-card-label">PRs revisados</span>
          <span className="metric-card-value">
            {group?.reviewedPRs || '—'}
          </span>
          <span className="metric-card-subtext warning">
            {group?.unreviewedPRs != null ? `${group.unreviewedPRs} sin revisión` : 'Sin datos'}
          </span>
        </div>

        {/* Commits */}
        <div className="metric-card">
          <span className="metric-card-label">Commits</span>
          <span className="metric-card-value">
            {group?.commitsCount ?? (analysis?.evidence?.length ? analysis.evidence.length : '—')}
          </span>
          <span className="metric-card-subtext success">
            {group?.commitsWeek ?? 'Registrados en mock'}
          </span>
        </div>

        {/* Inconvenientes */}
        <div className="metric-card">
          <span className="metric-card-label">Inconvenientes</span>
          <span className="metric-card-value">{unresolvedIssues.length}</span>
          <span className="metric-card-subtext warning">Sin resolver</span>
        </div>
      </div>

      {/* ----------------- SECCIÓN INTERMEDIA (2 COLUMNAS) ----------------- */}
      <div className="middle-sections-grid">
        {/* Columna Izquierda: Contribución por estudiante */}
        <div className="panel-card">
          <div className="panel-header">
            <h2 className="panel-title">Contribución por estudiante</h2>
            <p className="panel-subtitle">Score = código 40% &middot; revisiones 40% &middot; consistencia 20%</p>
          </div>

          {members.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.844rem' }}>
              No hay integrantes registrados en el mock para este grupo (/groups/{groupId}/members).
            </p>
          ) : (
            <div className="contribution-body">
              {/* Gráfico Donut SVG con datos reales */}
              <div className="donut-chart-wrapper">
                <svg className="donut-svg" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke="var(--bg-sunken)"
                    strokeWidth="12"
                  />
                  {donutSegments.map((seg, idx) => (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="12"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      strokeLinecap="butt"
                    />
                  ))}
                </svg>

                <div className="donut-center-content">
                  <span className="donut-center-number">{members.length}</span>
                  <span className="donut-center-label">integrantes</span>
                </div>
              </div>

              {/* Lista de estudiantes y porcentajes reales */}
              <div className="members-contribution-list">
                {members.map((m, idx) => (
                  <div key={idx} className="member-contrib-item">
                    <div className="member-contrib-left">
                      <span className="member-dot" style={{ backgroundColor: m.color }}></span>
                      <div className="member-contrib-info">
                        <span className="member-contrib-name">{m.name}</span>
                        <span className="member-contrib-sub">{m.role || 'Estudiante'} &middot; {m.email}</span>
                      </div>
                    </div>
                    <span className="member-contrib-percent">{m.contribution}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerta si un miembro tiene aporte concentrado */}
          {maxContribMember && maxContribMember.contributionNum > 40 && (
            <div className="contribution-alert-box">
              <Icons.AlertTriangle />
              <span>
                <strong>{maxContribMember.name}</strong> concentra el {maxContribMember.contribution} del aporte.
                Tenlo en cuenta al evaluar el trabajo grupal.
              </span>
            </div>
          )}
        </div>

        {/* Columna Derecha: Checklist de hitos */}
        <div className="panel-card">
          <div className="panel-header">
            <h2 className="panel-title">Checklist de hitos</h2>
          </div>

          {report?.checklist?.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.844rem', padding: '16px 0' }}>
              El mock /groups/{groupId}/report actualmente devuelve el checklist vacío.
            </div>
          ) : (
            <div className="milestones-list">
              {report?.checklist?.map((h, idx) => (
                <div key={idx} className="milestone-item">
                  <span className={`milestone-icon ${h.status}`}>
                    {h.status === 'completed' ? <Icons.CheckCircle /> : <Icons.Clock />}
                  </span>
                  <div className="milestone-content">
                    <span className="milestone-title">{h.title}</span>
                    <span className={`milestone-meta ${h.status}`}>
                      {h.date} &middot; {h.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ----------------- TABLA INFERIOR: EVIDENCIA DEL ANÁLISIS ----------------- */}
      <div className="evidence-panel-card">
        <div className="evidence-header">
          <h2 className="panel-title">Evidencia del análisis</h2>
          <p className="panel-subtitle">Pull requests y commits devueltos por /groups/{groupId}/analysis</p>
        </div>

        <div className="evidence-table-container">
          {!analysis?.evidence || analysis.evidence.length === 0 ? (
            <div style={{ padding: '24px', color: 'var(--text-muted)', fontSize: '0.844rem' }}>
              Sin evidencias registradas en el análisis.
            </div>
          ) : (
            <table className="evidence-table">
              <thead>
                <tr>
                  <th>Evidencia (Mock)</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {analysis.evidence.map((ev, idx) => {
                  const isString = typeof ev === 'string';
                  const title = isString ? ev : ev.text || ev.title;
                  const isPR = title.toLowerCase().includes('pr');

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
                      <td>{isPR ? 'Pull Request' : 'Commit'}</td>
                      <td>
                        <span className="reviewer-badge success">
                          <Icons.CheckCircle />
                          Registrado en análisis
                        </span>
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
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                Síntesis de Avance — {group?.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowSynthesisModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '20px' }}>
              Desglose de criterios analizados por el motor de scraping (/groups/{groupId}/analysis).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {analysis?.criteria?.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-sunken)' }}>
                  <span style={{ fontSize: '0.844rem', fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.844rem', fontWeight: 700, color: c.type === 'warning' ? '#d97706' : '#059669' }}>
                      {c.percent ?? c.score}%
                    </span>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: c.type === 'warning' ? '#fef3c7' : '#ecfdf5', color: c.type === 'warning' ? '#92400e' : '#065f46' }}>
                      {c.level}
                    </span>
                  </div>
                </div>
              ))}
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
