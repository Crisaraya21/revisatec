import { useState, useEffect } from 'react';
import { api, ApiError } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './Feedback.css';
import './StudentDashboard.css';

export default function StudentFeedback() {
  const [feedbackData, setFeedbackData] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [directReviews, setDirectReviews] = useState([]);
  const [groupIssues, setGroupIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Estados interactivos para el flujo de aceptación de cambios
  const [acceptedChanges, setAcceptedChanges] = useState({
    ai: true,
    prof: true,
    issues: false,
  });
  const [notes, setNotes] = useState({
    ai: 'Documentación de casos límite agregada en PR #16.',
    prof: 'Se integró suite de pruebas de integración con reporte lcov.',
    issues: 'Commit temporal revertido en rama develop.',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, status, title, message) => {
    setToast({ type, status, title, message });
    setTimeout(() => setToast(null), 5000);
  };

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadAllStudentFeedback() {
      try {
        // 1. Cargar Feedback oficial desde Azure APIM
        const fbRes = await api.get('/groups/2/feedback');
        if (!isMounted) return;
        setFeedbackData(fbRes);

        // 2. Cargar Análisis de Criterios y Evidencias
        const analysisRes = await api.get('/groups/2/analysis');
        if (!isMounted) return;
        setCriteria(analysisRes?.criteria || []);
        setEvidence(analysisRes?.evidence || []);

        // 3. Cargar Historial de Revisiones Directas
        const reviewsRes = await api.get('/groups/2/direct-reviews');
        if (!isMounted) return;
        setDirectReviews(reviewsRes?.items || []);

        // 4. Cargar Inconvenientes detectados en el repo
        const issuesRes = await api.get('/groups/2/issues');
        if (!isMounted) return;
        setGroupIssues(issuesRes?.items || []);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error al cargar datos en vista del estudiante:', err);
        const code = err instanceof ApiError ? err.status : 500;
        setApiError({
          status: code,
          message: err.message || 'Error de conexión con Azure APIM. No se pudieron obtener los datos reales.',
        });
        setFeedbackData(null);
        setCriteria([]);
        setEvidence([]);
        setDirectReviews([]);
        setGroupIssues([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAllStudentFeedback();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const handleManualRefresh = () => {
    setIsLoading(true);
    setReloadKey((k) => k + 1);
  };

  // Enviar aceptación de cambios a Azure APIM (POST /groups/2/direct-reviews -> 201 Created)
  const handleConfirmChanges = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const acceptedItemsList = [];
    if (acceptedChanges.ai) acceptedItemsList.push(`[IA]: ${notes.ai || 'Aceptado'}`);
    if (acceptedChanges.prof) acceptedItemsList.push(`[Profesor]: ${notes.prof || 'Aceptado'}`);
    if (acceptedChanges.issues) acceptedItemsList.push(`[Inconvenientes]: ${notes.issues || 'Aceptado'}`);

    const reviewNote = `Aceptación de cambios por el estudiante: ${acceptedItemsList.join(' | ')}`;

    try {
      const res = await api.post('/groups/2/direct-reviews', {
        note: reviewNote,
      });

      // Actualizar bitácora local en base a la respuesta 201 Created del Mock de Azure APIM
      const newReviewItem = {
        date: res?.date || new Date().toISOString().split('T')[0],
        note: reviewNote,
      };

      setDirectReviews((prev) => [newReviewItem, ...prev]);

      showToast(
        'success',
        201,
        'Cambios Aceptados y Confirmados (HTTP 201 Created)',
        'Tu aceptación de sugerencias y reporte de cambios se registró exitosamente en Azure APIM.'
      );
    } catch (err) {
      console.error('Error al registrar cambios:', err);
      const code = err instanceof ApiError ? err.status : 400;
      showToast(
        'error',
        code,
        `Error HTTP ${code}`,
        err.message || 'No se pudo registrar la confirmación de cambios en Azure APIM.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simulación de Error 400 según la Ley del Proyecto
  const handleSimulate400 = async () => {
    try {
      await api.post('/groups/2/direct-reviews', {});
    } catch (err) {
      const code = err instanceof ApiError ? err.status : 400;
      showToast(
        'error',
        code,
        `Simulación Error HTTP ${code} (Bad Request)`,
        err.message || 'Error 400: Datos inválidos enviados al mock de Azure APIM.'
      );
    }
  };

  // Simulación de Error 404 según la Ley del Proyecto
  const handleSimulate404 = async () => {
    try {
      await api.get('/inexistente-recurso');
    } catch (err) {
      const code = err instanceof ApiError ? err.status : 404;
      showToast(
        'error',
        code,
        `Simulación Error HTTP ${code} (Not Found)`,
        err.message || 'Error 404: Recurso no encontrado en Azure APIM.'
      );
    }
  };

  return (
    <div className="feedback-page-container">
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
            maxWidth: 400,
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
      <div className="feedback-header">
        <div className="feedback-header-left">
          <h1 className="feedback-title">Retroalimentación y Aceptación de Cambios</h1>
          <span className="feedback-meta">
            {feedbackData ? `${feedbackData.groupName} · ${feedbackData.deliveryTitle}` : 'Cargando información...'}
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
            onClick={() => window.print()}
            className="btn-primary-action"
          >
            <Icons.Download />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Manejo de Error Estricto (Cumplimiento de la Ley sin datos falsos) */}
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
          <p style={{ fontSize: '0.813rem', margin: 0, opacity: 0.9 }}>
            La vista no renderiza datos falsos inventados. Si el mock en Azure APIM falla o no responde,
            la interfaz refleja fielmente el estado del servicio.
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
          Cargando retroalimentación y análisis técnico desde Azure APIM...
        </div>
      )}

      {/* Contenido Principal */}
      {!isLoading && !apiError && feedbackData && (
        <>
          {/* Banner Resumen de Calificación Oficial */}
          <div
            className="ai-proposal-card"
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 24,
              padding: '22px 28px',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                backgroundColor: 'rgba(57, 111, 162, 0.12)',
                borderRadius: 14,
                padding: '16px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--action-primary)' }}>
                {feedbackData.score}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                / 100 PTS
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {feedbackData.groupName} &middot; {feedbackData.deliveryTitle}
                </h3>
                <span
                  style={{
                    fontSize: '0.688rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 12,
                    backgroundColor: 'rgba(34, 197, 94, 0.12)',
                    color: '#16a34a',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    textTransform: 'uppercase',
                  }}
                >
                  {feedbackData.status}
                </span>
              </div>
              <p style={{ fontSize: '0.844rem', color: 'var(--text-secondary)', margin: 0 }}>
                Revisa las sugerencias de la IA y del profesor a continuación. Marca los cambios aceptados
                y registra la confirmación de aplicación en el repositorio.
              </p>
            </div>
          </div>

          {/* Grid de Retroalimentación: IA vs Profesor */}
          <div className="feedback-grid">
            {/* Propuesta IA */}
            <div className="ai-proposal-card">
              <div className="ai-proposal-header">
                <div className="ai-icon-badge">
                  <Icons.Sparkles />
                </div>
                <div>
                  <h3 className="ai-proposal-title">Retroalimentación generada por IA</h3>
                  <span className="ai-proposal-meta">Análisis sintético de commits y PRs</span>
                </div>
              </div>

              <div className="ai-proposal-content-box">
                <p style={{ color: 'var(--text-primary)', margin: 0 }}>
                  {feedbackData.ai}
                </p>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icons.CheckCircle />
                <span>Base analítica procesada por el modelo de IA en Azure APIM</span>
              </div>
            </div>

            {/* Comentario del Profesor */}
            <div className="ai-proposal-card">
              <div className="ai-proposal-header">
                <div className="prof-icon-badge">
                  <Icons.FileText />
                </div>
                <div>
                  <h3 className="ai-proposal-title">Observaciones del profesor</h3>
                  <span className="ai-proposal-meta">Dictamen oficial publicado</span>
                </div>
              </div>

              <div className="ai-proposal-content-box" style={{ backgroundColor: 'var(--bg-sunken)' }}>
                <p style={{ color: 'var(--text-primary)', margin: 0 }}>
                  {feedbackData.professor || 'Sin observaciones adicionales por el profesor.'}
                </p>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icons.CheckCircle />
                <span>Evaluación docente vinculada a la rúbrica oficial</span>
              </div>
            </div>
          </div>

          {/* ========================================================
             PROCESO INTERACTIVO DE ACEPTACIÓN DE CAMBIOS DEL ESTUDIANTE
             ======================================================== */}
          <div className="change-process-card">
            <div className="change-process-header">
              <div className="change-process-title-box">
                <h2 className="change-process-title">Proceso de Aceptación y Aplicación de Cambios</h2>
                <span className="change-process-subtitle">
                  El equipo debe verificar cada recomendación, marcar su aplicación y registrar las notas de resolución.
                </span>
              </div>

              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 8,
                  backgroundColor: 'var(--bg-sunken)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                }}
              >
                Conectado a POST /groups/2/direct-reviews
              </span>
            </div>

            <form onSubmit={handleConfirmChanges} className="change-items-list">
              {/* Sugerencia 1: Basada en IA */}
              <div className={`change-item-card ${acceptedChanges.ai ? 'accepted' : ''}`}>
                <div className="change-item-top">
                  <label className="change-item-checkbox-label">
                    <input
                      type="checkbox"
                      checked={acceptedChanges.ai}
                      onChange={(e) => setAcceptedChanges((prev) => ({ ...prev, ai: e.target.checked }))}
                      className="change-item-checkbox"
                    />
                    <div className="change-item-title-desc">
                      <span className="change-item-title">
                        1. Documentar los casos límite en las revisiones de código y endpoints
                      </span>
                      <span className="change-item-text">
                        Sugerencia generada por IA: &quot;{feedbackData.ai}&quot;
                      </span>
                    </div>
                  </label>
                  <span className="change-origin-badge ai">Sugerido por IA</span>
                </div>

                <div className="change-item-note-row">
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    Evidencia / PR:
                  </span>
                  <input
                    type="text"
                    value={notes.ai}
                    onChange={(e) => setNotes((prev) => ({ ...prev, ai: e.target.value }))}
                    placeholder="Indica el PR o commit donde se implementó..."
                    className="change-note-input"
                  />
                </div>
              </div>

              {/* Sugerencia 2: Observación del Profesor */}
              <div className={`change-item-card ${acceptedChanges.prof ? 'accepted' : ''}`}>
                <div className="change-item-top">
                  <label className="change-item-checkbox-label">
                    <input
                      type="checkbox"
                      checked={acceptedChanges.prof}
                      onChange={(e) => setAcceptedChanges((prev) => ({ ...prev, prof: e.target.checked }))}
                      className="change-item-checkbox"
                    />
                    <div className="change-item-title-desc">
                      <span className="change-item-title">
                        2. Incorporar evidencia de pruebas unitarias y cobertura en la entrega
                      </span>
                      <span className="change-item-text">
                        Indicación del docente: &quot;{feedbackData.professor}&quot;
                      </span>
                    </div>
                  </label>
                  <span className="change-origin-badge prof">Profesor</span>
                </div>

                <div className="change-item-note-row">
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    Evidencia / PR:
                  </span>
                  <input
                    type="text"
                    value={notes.prof}
                    onChange={(e) => setNotes((prev) => ({ ...prev, prof: e.target.value }))}
                    placeholder="Indica las pruebas agregadas o reporte generado..."
                    className="change-note-input"
                  />
                </div>
              </div>

              {/* Sugerencia 3: Inconvenientes de Commits / Issues */}
              <div className={`change-item-card ${acceptedChanges.issues ? 'accepted' : ''}`}>
                <div className="change-item-top">
                  <label className="change-item-checkbox-label">
                    <input
                      type="checkbox"
                      checked={acceptedChanges.issues}
                      onChange={(e) => setAcceptedChanges((prev) => ({ ...prev, issues: e.target.checked }))}
                      className="change-item-checkbox"
                    />
                    <div className="change-item-title-desc">
                      <span className="change-item-title">
                        3. Resolución de commits temporales e inconvenientes detectados en el repo
                      </span>
                      <span className="change-item-text">
                        {groupIssues.length > 0
                          ? `Detectado en Azure APIM: ${groupIssues[0].type} (${groupIssues[0].description})`
                          : 'Validación de convenios de ramas y calidad de commits.'}
                      </span>
                    </div>
                  </label>
                  <span className="change-origin-badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    Inconveniente Repo
                  </span>
                </div>

                <div className="change-item-note-row">
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    Resolución:
                  </span>
                  <input
                    type="text"
                    value={notes.issues}
                    onChange={(e) => setNotes((prev) => ({ ...prev, issues: e.target.value }))}
                    placeholder="Indica cómo el equipo subsanó el inconveniente..."
                    className="change-note-input"
                  />
                </div>
              </div>

              {/* Botón de Confirmación Principal */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginTop: 10 }}>
                <div style={{ fontSize: '0.781rem', color: 'var(--text-muted)' }}>
                  Al confirmar, se enviará una notificación formal a Azure APIM mediante el endpoint <code>POST /groups/2/direct-reviews</code>.
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary-action"
                  style={{
                    padding: '10px 20px',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                  }}
                >
                  <Icons.CheckCircle />
                  <span>{isSubmitting ? 'Registrando en APIM...' : 'Confirmar y Registrar Aceptación de Cambios'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Historial de Revisiones Directas / Bitácora de Cambios desde APIM */}
          <div className="criteria-card">
            <div className="criteria-card-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 className="criteria-card-title">Historial de Revisiones y Confirmaciones Directas</h3>
                <span className="table-total-count">
                  {directReviews.length} registro(s) en Azure APIM
                </span>
              </div>
              <span className="criteria-card-subtitle">
                Obtenido directamente del endpoint <code>GET /groups/2/direct-reviews</code>
              </span>
            </div>

            {directReviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.844rem' }}>
                Sin revisiones directas registradas aún.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="direct-reviews-table">
                  <thead>
                    <tr>
                      <th style={{ width: '130px' }}>Fecha</th>
                      <th>Detalle de la Revisión / Cambios Aceptados</th>
                      <th style={{ width: '120px' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {directReviews.map((rev, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {rev.date}
                        </td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{rev.note}</span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.688rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 10,
                              backgroundColor: 'rgba(34, 197, 94, 0.12)',
                              color: '#16a34a',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                            }}
                          >
                            Registrado
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Desglose de Cumplimiento por Criterio (GET /groups/2/analysis) */}
          {criteria.length > 0 && (
            <div className="criteria-card">
              <div className="criteria-card-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 className="criteria-card-title">Evaluación por Criterios de la Rúbrica</h3>
                  <span className="table-total-count">Análisis de Repositorio</span>
                </div>
                <span className="criteria-card-subtitle">
                  Ponderación y cumplimiento calculados en base a commits y PRs del grupo
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className={`criterion-badge ${badgeType}`}>
                            {item.level || `${percent}%`}
                          </span>
                          <span className="criterion-fraction">
                            {item.score} / {item.max || 100}
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

          {/* Evidencias Analizadas (GET /groups/2/analysis -> evidence) */}
          {evidence.length > 0 && (
            <div className="criteria-card">
              <div className="criteria-card-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 className="criteria-card-title">Evidencias del Repositorio Analizadas</h3>
                  <span className="table-total-count">{evidence.length} elemento(s)</span>
                </div>
                <span className="criteria-card-subtitle">
                  Trazabilidad de commits y PRs evaluados por el motor de análisis
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {evidence.map((ev) => (
                  <div
                    key={ev.id}
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
                      <span
                        style={{
                          fontSize: '0.688rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 6,
                          backgroundColor: ev.type === 'pr' ? 'rgba(57, 111, 162, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                          color: ev.type === 'pr' ? 'var(--action-primary)' : 'var(--text-secondary)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {ev.type}
                      </span>
                      <span style={{ fontSize: '0.844rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {ev.text}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Autor: <strong>{ev.author}</strong></span>
                      <span>Revisor: <strong>{ev.reviewer}</strong></span>
                      <span>{ev.when}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Barra de Pruebas de Estados HTTP (Cumplimiento de la Ley sin datos falsos) */}
          <div className="http-simulation-bar">
            <div className="http-sim-label">
              <Icons.AlertTriangle />
              <span>Simulación de Estados HTTP para Evaluación:</span>
            </div>
            <div className="http-sim-buttons">
              <button
                type="button"
                onClick={handleSimulate400}
                className="btn-test-http warning"
                title="Llama al mock para comprobar el manejo visual de HTTP 400"
              >
                Probar Error 400 (Bad Request)
              </button>
              <button
                type="button"
                onClick={handleSimulate404}
                className="btn-test-http danger"
                title="Llama al mock para comprobar el manejo visual de HTTP 404"
              >
                Probar Error 404 (Not Found)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
