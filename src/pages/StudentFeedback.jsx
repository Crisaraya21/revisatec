import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCourse } from '../context/CourseContext';
import { useStudentGroup } from '../hooks/useStudentGroup';
import { groupAnalysisApi } from '../api';
import { ApiError } from '../lib/apiClient';
import { formatDate } from '../utils/date';
import { Icons } from '../components/Icons';
import './Feedback.css';
import './StudentDashboard.css';

export default function StudentFeedback() {
  const { user } = useAuth();
  const { selectedCourse } = useCourse();
  const [reloadKey, setReloadKey] = useState(0);
  const assignment = useStudentGroup(reloadKey);
  const studentGroupId = assignment.group?.id ?? null;

  const [feedbackData, setFeedbackData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [loadedGroupId, setLoadedGroupId] = useState(null);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    if (studentGroupId === null) return undefined;
    let isMounted = true;

    async function loadStudentData() {

      const [fbResult, analysisResult] = await Promise.allSettled([
        groupAnalysisApi.getFeedback(studentGroupId),
        groupAnalysisApi.getAnalysis(studentGroupId),
      ]);

      if (!isMounted) return;

      setApiError(null);
      if (fbResult.status === 'fulfilled') {
        setFeedbackData(fbResult.value);
      } else {
        const err = fbResult.reason;
        if (err instanceof ApiError && err.status === 404) {
          // Retroalimentación aún no creada por el profesor
          setFeedbackData(null);
        } else {
          console.error('Error al cargar feedback para el estudiante:', err);
          setApiError('No se pudo cargar la información de retroalimentación.');
        }
      }

      if (analysisResult.status === 'fulfilled') {
        setAnalysisData(analysisResult.value);
      } else {
        setAnalysisData(null);
      }

      setLoadedGroupId(studentGroupId);
    }

    loadStudentData();

    return () => {
      isMounted = false;
    };
  }, [studentGroupId, reloadKey]);

  const handleManualRefresh = () => {
    setReloadKey((k) => k + 1);
  };

  const isLoading = assignment.status === 'loading' || (studentGroupId !== null && loadedGroupId !== studentGroupId);
  const isPublished = feedbackData?.status === 'published';
  const groupName = feedbackData?.groupName || assignment.group?.name || 'Sin grupo';
  const deliveryTitle = feedbackData?.deliveryTitle || 'Entrega de proyecto';
  const score = feedbackData?.score ?? analysisData?.score ?? null;
  const criteria = Array.isArray(analysisData?.criteria) ? analysisData.criteria : [];
  const evidence = Array.isArray(analysisData?.evidence) ? analysisData.evidence : [];

  return (
    <div className="feedback-page-container">
      {/* Encabezado */}
      <div className="feedback-header">
        <div className="feedback-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="feedback-title">Retroalimentación del estudiante</h1>
            <span
              className={`feedback-status-badge ${isPublished ? 'published' : 'draft'}`}
              style={{
                backgroundColor: isPublished ? 'rgba(34, 197, 94, 0.12)' : 'rgba(148, 163, 184, 0.15)',
                color: isPublished ? '#16a34a' : 'var(--text-muted)',
                border: `1px solid ${isPublished ? 'rgba(34, 197, 94, 0.3)' : 'rgba(148, 163, 184, 0.3)'}`,
              }}
            >
              {isPublished ? (
                <>
                  <Icons.CheckCircle />
                  <span>Publicada</span>
                </>
              ) : (
                <>
                  <Icons.Clock />
                  <span>Pendiente de publicación</span>
                </>
              )}
            </span>
          </div>
          <span className="feedback-meta">
            {groupName} · {deliveryTitle} (Modo solo lectura)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="btn-refresh-analysis"
            title="Recargar datos desde el servidor"
            disabled={isLoading}
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
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Estudiante sin grupo en el curso seleccionado */}
      {assignment.status === 'unassigned' && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
          Tu correo {user?.email} no aparece en ningún grupo de {selectedCourse?.name || 'este curso'}.
        </div>
      )}

      {/* Manejo de Error */}
      {assignment.status === 'error' && (
        <div role="alert" style={{ color: 'var(--badge-alert-text)', fontWeight: 600 }}>
          Error HTTP {assignment.error?.status}: {assignment.error?.message}
        </div>
      )}
      {apiError && (
        <div
          role="alert"
          style={{
            backgroundColor: 'var(--badge-alert-bg)',
            color: 'var(--badge-alert-text)',
            border: '1px solid var(--badge-alert-border)',
            padding: '16px 20px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Icons.AlertTriangle />
          <span style={{ fontSize: '0.844rem', fontWeight: 600 }}>{apiError}</span>
        </div>
      )}

      {/* Cargando */}
      {isLoading && assignment.status !== 'error' && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Cargando retroalimentación de tu grupo...
        </div>
      )}

      {/* Contenido si AÚN NO ESTÁ PUBLICADA */}
      {!isLoading && !apiError && studentGroupId !== null && !isPublished && (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 14,
            padding: '48px 32px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'var(--bg-sunken)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <Icons.Clock />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Aún no hay retroalimentación publicada
          </h2>
          <p
            style={{
              margin: 0,
              maxWidth: 520,
              fontSize: '0.875rem',
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
            }}
          >
            El profesor aún no ha publicado la retroalimentación oficial de esta entrega para{' '}
            <strong>{groupName}</strong>. En cuanto sea publicada, recibirás una notificación en tiempo
            real en la campana y podrás revisarla aquí.
          </p>
        </div>
      )}

      {/* Contenido Principal CUANDO ESTÁ PUBLICADA (Solo lectura) */}
      {!isLoading && !apiError && studentGroupId !== null && isPublished && feedbackData && (
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
                {score !== null ? score : '—'}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                / 100 PTS
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {groupName} · {deliveryTitle}
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
                  Dictamen publicado
                </span>
              </div>
              <p style={{ fontSize: '0.844rem', color: 'var(--text-secondary)', margin: 0 }}>
                Esta es la retroalimentación oficial emitida por el docente a cargo para tu grupo de trabajo.
              </p>
            </div>
          </div>

          {/* Grid de Retroalimentación: Observaciones del Profesor + Propuesta IA */}
          <div className="feedback-grid">
            {/* Observaciones del Profesor (Oficial) */}
            <div className="ai-proposal-card">
              <div className="ai-proposal-header">
                <div className="prof-icon-badge">
                  <Icons.Edit />
                </div>
                <div>
                  <h3 className="ai-proposal-title">Observaciones del profesor</h3>
                  <span className="ai-proposal-meta">Dictamen oficial publicado</span>
                </div>
              </div>

              <div className="ai-proposal-content-box" style={{ backgroundColor: 'var(--bg-sunken)' }}>
                <p style={{ color: 'var(--text-primary)', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {feedbackData.professor || 'Sin observaciones adicionales por el profesor.'}
                </p>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icons.CheckCircle />
                <span>Evaluación docente vinculada a la rúbrica oficial</span>
              </div>
            </div>

            {/* Propuesta IA */}
            {feedbackData.ai && (
              <div className="ai-proposal-card">
                <div className="ai-proposal-header">
                  <div className="ai-icon-badge">
                    <Icons.Star />
                  </div>
                  <div>
                    <h3 className="ai-proposal-title">Análisis asistido por IA</h3>
                    <span className="ai-proposal-meta">Base analítica del repositorio</span>
                  </div>
                </div>

                <div className="ai-proposal-content-box">
                  <p style={{ color: 'var(--text-primary)', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {feedbackData.ai}
                  </p>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icons.CheckCircle />
                  <span>Base analítica procesada por el modelo de IA</span>
                </div>
              </div>
            )}
          </div>

          {/* Cumplimiento por Criterio */}
          {criteria.length > 0 && (
            <div className="criteria-card">
              <div className="criteria-card-header">
                <h3 className="criteria-card-title">Cumplimiento por criterio</h3>
              </div>
              <div className="criteria-list">
                {criteria.map((item, index) => {
                  const percent = item.max > 0 ? Math.round((item.score / item.max) * 100) : 0;
                  const levelLower = (item?.level || '').toLowerCase();
                  const typeLower = (item?.type || '').toLowerCase();
                  const badgeClass =
                    levelLower.includes('excelente') || levelLower.includes('bueno') || typeLower === 'success'
                      ? 'success'
                      : levelLower.includes('progreso') || levelLower.includes('medio') || typeLower === 'warning'
                        ? 'warning'
                        : levelLower.includes('bajo') || levelLower.includes('alerta') || typeLower === 'alert'
                          ? 'alert'
                          : 'info';

                  return (
                    <div key={item.name || index} className="criterion-row">
                      <div className="criterion-info-top">
                        <span className="criterion-name">{item.name}</span>
                        <span className={`criterion-badge ${badgeClass}`}>
                          {item.level || 'Evaluado'}
                        </span>
                      </div>
                      <div className="criterion-bar-row">
                        <div className="criterion-track">
                          <div
                            className={`criterion-fill ${badgeClass}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="criterion-fraction">
                          {item.score} / {item.max}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Evidencias del Repositorio */}
          {evidence.length > 0 && (
            <div className="criteria-card">
              <div className="criteria-card-header">
                <h3 className="criteria-card-title">Evidencias detectadas en el repositorio</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {evidence.map((ev, idx) => (
                  <div
                    key={ev.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
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
                          textTransform: 'uppercase',
                          padding: '2px 8px',
                          borderRadius: 6,
                          backgroundColor: ev.type === 'pr' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: ev.type === 'pr' ? 'var(--action-primary)' : '#059669',
                        }}
                      >
                        {ev.type || 'Commit'}
                      </span>
                      <span style={{ fontSize: '0.844rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {ev.text}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {ev.author && <span>Por {ev.author} · </span>}
                      {formatDate(ev.when)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
