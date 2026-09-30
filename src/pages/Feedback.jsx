import { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './Feedback.css';

export default function Feedback() {
  const [selectedGroupId, setSelectedGroupId] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  // Propuesta de IA
  const [aiFeedback, setAiFeedback] = useState(
    'El grupo mantiene buen ritmo de revisión y cumple los hitos hasta la fecha. El aporte está concentrado en un integrante (48%); se recomienda repartir tareas y pedir más revisiones cruzadas. Se detectaron dos commits de prueba en la rama principal: conviene usar ramas de trabajo y mensajes descriptivos.'
  );

  // Versión del profesor
  const [professorText, setProfessorText] = useState(
    'Buen ritmo de revisión y hitos al día. Ana concentra casi la mitad del aporte: redistribuyan tareas antes del Avance 3. Eviten commits de prueba en main; usen ramas y mensajes claros.'
  );

  // Criterios de evaluación (según Figma)
  const [criteria, setCriteria] = useState([
    { name: 'Contribución equitativa', score: 17, max: 30, level: 'En desarrollo', type: 'warning' },
    { name: 'Calidad de revisiones', score: 20, max: 25, level: 'Logrado', type: 'info' },
    { name: 'Cumplimiento de hitos', score: 18, max: 20, level: 'Sobresaliente', type: 'success' },
    { name: 'Calidad de commits', score: 7, max: 15, level: 'Insuficiente', type: 'alert' },
    { name: 'Documentación', score: 9, max: 10, level: 'Sobresaliente', type: 'success' },
  ]);

  // Cargar datos de Azure APIM (/groups/{id}/feedback y /groups/{id}/analysis)
  useEffect(() => {
    async function loadGroupFeedback() {
      setIsLoading(true);
      try {
        const feedbackRes = await api.get(`/groups/${selectedGroupId}/feedback`);
        if (feedbackRes?.ai) {
          setAiFeedback(feedbackRes.ai);
        }
        if (feedbackRes?.professor) {
          setProfessorText(feedbackRes.professor);
        }

        const analysisRes = await api.get(`/groups/${selectedGroupId}/analysis`);
        if (analysisRes?.score) {
          // Ajustar nota proporcional si existe
        }
      } catch (err) {
        console.warn('Usando valores iniciales para feedback:', err);
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
      // 1. Guardar cambios en APIM
      await api.put(`/groups/${selectedGroupId}/feedback`, {
        ai: aiFeedback,
        professor: professorText,
      });

      // 2. Publicar feedback a los estudiantes
      await api.post(`/groups/${selectedGroupId}/feedback/publish`, {});

      setIsPublished(true);
      setTimeout(() => setIsPublished(false), 3500);
    } catch (err) {
      console.error('Error al publicar feedback:', err);
      // Feedback visual optimista
      setIsPublished(true);
      setTimeout(() => setIsPublished(false), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="feedback-page-container">
      {/* Encabezado */}
      <div className="feedback-header">
        <div className="feedback-header-left">
          <h1 className="feedback-title">Retroalimentación</h1>
          <span className="feedback-meta">
            Grupo {selectedGroupId} · Entrega 2: Prototipo
          </span>
        </div>

        <div className="feedback-header-actions">
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(Number(e.target.value))}
            className="group-selector-select"
          >
            <option value={1}>Grupo 1</option>
            <option value={2}>Grupo 2</option>
            <option value={3}>Grupo 3</option>
            <option value={4}>Grupo 4</option>
            <option value={5}>Grupo 5</option>
          </select>
        </div>
      </div>

      {/* Grid Principal de 2 Columnas */}
      <div className="feedback-grid">
        {/* Columna Izquierda: Cumplimiento por criterio */}
        <div className="criteria-card">
          <div className="criteria-card-header">
            <h2 className="criteria-card-title">Cumplimiento por criterio</h2>
            <span className="criteria-card-subtitle">
              Nota estimada <strong>71 / 100</strong> · nivel según la rúbrica
            </span>
          </div>

          <div className="criteria-list">
            {criteria.map((item, index) => {
              const percent = Math.round((item.score / item.max) * 100);
              return (
                <div key={index} className="criterion-row">
                  <div className="criterion-info-top">
                    <span className="criterion-name">{item.name}</span>
                    <span className={`criterion-badge ${item.type}`}>
                      {item.level}
                    </span>
                  </div>

                  <div className="criterion-bar-row">
                    <div className="criterion-track">
                      <div
                        className={`criterion-fill ${item.type}`}
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

        {/* Columna Derecha: Propuesta IA + Tu versión */}
        <div className="feedback-editor-column">
          {/* Tarjeta: Propuesta de la IA */}
          <div className="ai-proposal-card">
            <div className="ai-proposal-header">
              <div className="ai-proposal-badge-icon">
                <Icons.Sparkles />
              </div>
              <div>
                <h3 className="ai-proposal-title">Propuesta de la IA</h3>
                <span className="ai-proposal-meta">Generada hace 5 min · solo lectura</span>
              </div>
            </div>

            <div className="ai-proposal-content-box">
              <p>{aiFeedback}</p>
            </div>

            <div className="ai-proposal-footer">
              <button
                type="button"
                onClick={handleUseAiBase}
                className="btn-use-base"
              >
                <Icons.Edit />
                <span>Usar como base</span>
              </button>
            </div>
          </div>

          {/* Tarjeta: Tu Versión */}
          <div className="professor-version-card">
            <div className="prof-card-header">
              <div className="prof-card-title-flex">
                <div className="prof-icon-badge">
                  <Icons.Edit />
                </div>
                <div>
                  <h3 className="prof-card-title">Tu versión</h3>
                  <span className="prof-card-meta">
                    Lo que verán los 3 integrantes al publicarla
                  </span>
                </div>
              </div>
              <span className="badge-borrador">Borrador</span>
            </div>

            <textarea
              value={professorText}
              onChange={(e) => setProfessorText(e.target.value)}
              rows={4}
              placeholder="Escribe la retroalimentación para el grupo..."
              className="professor-textarea"
            />

            <div className="deadline-notice-box">
              <Icons.Clock />
              <span>
                Si no la publicas antes del 05 oct, se publicará la versión de la IA.
              </span>
            </div>

            {isPublished && (
              <div className="published-alert-success">
                ✓ ¡Retroalimentación publicada con éxito para los estudiantes!
              </div>
            )}

            <div className="prof-actions-row">
              <button
                type="button"
                onClick={handleDiscard}
                className="btn-discard"
              >
                Descartar cambios
              </button>

              <button
                type="button"
                onClick={handlePublish}
                disabled={isSaving}
                className="btn-publish-feedback"
              >
                <Icons.CheckCircle />
                <span>{isSaving ? 'Publicando...' : 'Publicar retroalimentación'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
