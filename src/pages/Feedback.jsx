import { useState, useEffect } from 'react';
import { api, ApiError } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './Feedback.css';

export default function Feedback() {
  const [selectedGroupId, setSelectedGroupId] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [apiError, setApiError] = useState(null);

  const [aiFeedback, setAiFeedback] = useState('');
  const [professorText, setProfessorText] = useState('');
  const [criteria, setCriteria] = useState([]);
  const [deliveryTitle, setDeliveryTitle] = useState('Entrega 2: Prototipo');
  const [groupName, setGroupName] = useState('Grupo A');
  const [toast, setToast] = useState(null);

  const showToast = (type, code, title, message) => {
    setToast({ type, code, title, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Cargar datos de Azure APIM (/groups/{id}/feedback y /groups/{id}/analysis)
  useEffect(() => {
    async function loadGroupFeedback() {
      setIsLoading(true);
      setApiError(null);
      try {
        const feedbackRes = await api.get(`/groups/${selectedGroupId}/feedback`);
        setAiFeedback(feedbackRes?.ai || '');
        setProfessorText(feedbackRes?.professor || '');
        setDeliveryTitle(feedbackRes?.deliveryTitle || 'Entrega 2: Prototipo');
        setGroupName(feedbackRes?.groupName || (selectedGroupId === 2 ? 'Grupo A' : `Grupo ${selectedGroupId}`));

        const analysisRes = await api.get(`/groups/${selectedGroupId}/analysis`);
        if (analysisRes?.criteria?.length > 0) {
          setCriteria(analysisRes.criteria);
        } else {
          setCriteria([]);
        }
      } catch (err) {
        console.error('Error al cargar feedback desde APIM:', err);
        setApiError('Error de conexion con Azure APIM: No se pudo cargar la retroalimentacion del grupo.');
        setAiFeedback('');
        setProfessorText('');
        setCriteria([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadGroupFeedback();
  }, [selectedGroupId]);

  const handleUseAiBase = () => {
    setProfessorText(aiFeedback);
  };

  const handleDiscard = () => {
    setProfessorText('');
  };

  const handlePublish = async () => {
    setIsSaving(true);
    try {
      await api.put(`/groups/${selectedGroupId}/feedback`, {
        ai: aiFeedback,
        professor: professorText,
      });
      await api.post(`/groups/${selectedGroupId}/feedback/publish`, {});
      setIsPublished(true);
      showToast(
        'success',
        200,
        'Feedback Publicado (HTTP 200 OK)',
        `La retroalimentación para el Grupo ${selectedGroupId} se guardó y publicó en Azure APIM.`
      );
      setTimeout(() => setIsPublished(false), 3500);
    } catch (err) {
      console.error('Error al publicar feedback:', err);
      const code = err instanceof ApiError ? err.status : 500;
      showToast('error', code, `Error HTTP ${code}`, err.message || 'Error al publicar la retroalimentación.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSimulate400 = async () => {
    try {
      await api.put(`/groups/${selectedGroupId}/feedback`, {
        ai: null,
        professor: null,
      });
    } catch (err) {
      const code = err instanceof ApiError ? err.status : 400;
      showToast(
        'error',
        code,
        `Validación de Error (HTTP ${code} Bad Request)`,
        err.message || 'Datos inválidos enviados al mock de Azure APIM.'
      );
    }
  };

  const handleSimulate404 = async () => {
    try {
      await api.get(`/groups/999/feedback`);
    } catch (err) {
      const code = err instanceof ApiError ? err.status : 404;
      showToast(
        'error',
        code,
        `Validación de Error (HTTP ${code} Not Found)`,
        err.message || 'Recurso de feedback no encontrado en Azure APIM.'
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
      <div className="feedback-header">
        <div className="feedback-header-left">
          <h1 className="feedback-title">Retroalimentacion</h1>
          <span className="feedback-meta">
            {groupName} &middot; {deliveryTitle}
          </span>
        </div>

        <div className="feedback-header-actions">
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(Number(e.target.value))}
            className="filter-select"
            aria-label="Seleccionar grupo"
          >
            <option value={2}>Grupo A</option>
            <option value={1}>Grupo 1</option>
            <option value={3}>Grupo 3</option>
          </select>

          <button
            type="button"
            onClick={handlePublish}
            disabled={isSaving || isLoading || !professorText.trim()}
            className="btn-primary-action"
          >
            <Icons.Send />
            <span>{isSaving ? 'Publicando...' : isPublished ? 'Publicado' : 'Publicar'}</span>
          </button>
        </div>
      </div>

      {/* Error API */}
      {apiError && (
        <div style={{ backgroundColor: 'var(--badge-alert-bg)', color: 'var(--badge-alert-text)', border: '1px solid var(--badge-alert-border)', padding: '16px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icons.AlertTriangle />
            <span style={{ fontSize: '0.844rem', fontWeight: 600 }}>{apiError}</span>
          </div>
        </div>
      )}

      {/* Cargando */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Cargando retroalimentacion desde Azure APIM...
        </div>
      )}

      {/* Contenido principal */}
      {!isLoading && !apiError && (
        <>
          {/* Propuesta IA */}
          <div className="ai-proposal-card">
            <div className="ai-proposal-header">
              <div className="ai-icon-badge">
                <Icons.Star />
              </div>
              <div>
                <h3 className="ai-proposal-title">Propuesta generada por IA</h3>
                <span className="ai-proposal-meta">Basada en el analisis del repositorio</span>
              </div>
            </div>
            <div className="ai-proposal-content-box">
              {aiFeedback ? (
                <p>{aiFeedback}</p>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Sin propuesta de IA disponible.
                </p>
              )}
            </div>
            <div className="ai-proposal-actions">
              <button type="button" onClick={handleUseAiBase} className="btn-use-ai" disabled={!aiFeedback}>
                <Icons.CheckCircle />
                <span>Usar como base</span>
              </button>
              <button type="button" onClick={handleDiscard} className="btn-discard">
                Descartar
              </button>
            </div>
          </div>

          {/* Version del profesor */}
          <div className="professor-card">
            <div className="prof-icon-badge">
              <Icons.Edit />
            </div>
            <div className="professor-card-header">
              <h3 className="professor-card-title">Tu version</h3>
              <span className="professor-card-meta">Editable &middot; Se publicara a los estudiantes</span>
            </div>
            <textarea
              className="professor-textarea"
              value={professorText}
              onChange={(e) => setProfessorText(e.target.value)}
              placeholder="Escribe tu retroalimentacion aqui..."
            />
          </div>

          {/* Criterios */}
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
                    <div key={index} className="criterion-row">
                      <div className="criterion-info-top">
                        <span className="criterion-name">{item.name}</span>
                        <span className={`criterion-badge ${badgeClass}`}>
                          {item.level}
                        </span>
                      </div>
                      <div className="criterion-bar-row">
                        <div className="criterion-track">
                          <div
                            className={`criterion-fill ${badgeClass}`}
                            style={{ width: `${percent}%` }}
                          ></div>
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

          {/* Barra de Pruebas de Estados HTTP (Cumplimiento de la Ley sin datos falsos) */}
          <div className="http-simulation-bar" style={{ marginTop: 24 }}>
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
