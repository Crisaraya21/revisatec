import { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './Feedback.css';

export default function Feedback() {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [deliveryTitle, setDeliveryTitle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [apiError, setApiError] = useState(null);

  const [aiFeedback, setAiFeedback] = useState('');
  const [professorText, setProfessorText] = useState('');
  const [criteria, setCriteria] = useState([]);

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
        setDeliveryTitle(feedbackRes?.deliveryTitle || null);

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
      setTimeout(() => setIsPublished(false), 3500);
    } catch (err) {
      console.error('Error al publicar feedback:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="feedback-page-container">
      {/* Encabezado */}
      <div className="feedback-header">
        <div className="feedback-header-left">
          <h1 className="feedback-title">Retroalimentacion</h1>
          <span className="feedback-meta">
            {groups.find((group) => group.id === selectedGroupId)?.name || 'Grupo no disponible desde APIM'}
            {deliveryTitle ? ` · ${deliveryTitle}` : ''}
          </span>
        </div>

        <div className="feedback-header-actions">
          <select
            value={selectedGroupId ?? ''}
            onChange={(e) => setSelectedGroupId(Number(e.target.value))}
            className="filter-select"
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
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
                <Icons.Sparkles />
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
            <div className="professor-card-header">
              <div className="prof-icon-badge">
                <Icons.Edit />
              </div>
              <div>
                <h3 className="professor-card-title">Tu version</h3>
                <span className="professor-card-meta">Editable &middot; Se publicara a los estudiantes</span>
              </div>
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
                  return (
                    <div key={index} className="criterion-row">
                      <div className="criterion-info-top">
                        <span className="criterion-name">{item.name}</span>
                        <span className={`criterion-badge ${item.type || 'info'}`}>
                          {item.level}
                        </span>
                      </div>
                      <div className="criterion-bar-row">
                        <div className="criterion-track">
                          <div
                            className={`criterion-fill ${item.type || 'info'}`}
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
    </div>
  );
}
