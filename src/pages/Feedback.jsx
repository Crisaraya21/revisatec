import { useState, useEffect } from 'react';
import { api, ApiError } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './Feedback.css';

export default function Feedback() {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
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
  const [httpResult, setHttpResult] = useState(null);

  const showToast = (type, code, title, message) => {
    setToast({ type, code, title, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  useEffect(() => {
    api.get('/groups?page=1&pageSize=100&search=')
      .then((res) => {
        const nextGroups = Array.isArray(res?.items) ? res.items : [];
        setGroups(nextGroups);
        setSelectedGroupId((current) => current ?? nextGroups[0]?.id ?? null);
      })
      .catch((err) => {
        console.error('Error al cargar grupos para feedback:', err);
        setApiError('No se pudieron cargar los grupos desde APIM.');
      });
  }, []);

  // Cargar datos de Azure APIM (/groups/{id}/feedback y /groups/{id}/analysis)
  useEffect(() => {
    if (selectedGroupId === null) return;
    async function loadGroupFeedback() {
      setIsLoading(true);
      setApiError(null);
      try {
        const feedbackRes = await api.get(`/groups/${selectedGroupId}/feedback`);
        setAiFeedback(feedbackRes?.ai || '');
        setProfessorText(feedbackRes?.professor || '');
        setDeliveryTitle(feedbackRes?.deliveryTitle || 'Entrega 2: Prototipo');
        setGroupName(
          feedbackRes?.groupName ||
          groups.find((g) => g.id === selectedGroupId)?.name ||
          (selectedGroupId === 2 ? 'Grupo A' : `Grupo ${selectedGroupId}`)
        );

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
        setDeliveryTitle(null);
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
            {groupName || groups.find((group) => group.id === selectedGroupId)?.name || 'Grupo A'}
            {deliveryTitle ? ` · ${deliveryTitle}` : ''}
          </span>
        </div>

        <div className="feedback-header-actions">
          <select
            value={selectedGroupId ?? 2}
            onChange={(e) => setSelectedGroupId(Number(e.target.value))}
            className="filter-select"
            aria-label="Seleccionar grupo"
          >
            {groups.length > 0 ? (
              groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))
            ) : (
              <>
                <option value={2}>Grupo A</option>
                <option value={1}>Grupo 1</option>
                <option value={3}>Grupo 3</option>
              </>
            )}
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
