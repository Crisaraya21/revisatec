import { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import './Rubric.css';

// Iconos SVG para Rúbrica
const RubricIcons = {
  Sparkle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"></path>
    </svg>
  ),
  FileText: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  ),
  Upload: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="17 8 12 3 7 8"></polyline>
      <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
  ),
  CheckCircle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  ),
  Edit: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  ),
  MessageSquare: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  ),
  Refresh: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10"></polyline>
      <polyline points="1 20 1 14 7 14"></polyline>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
  ),
  ShieldCheck: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <polyline points="9 12 11 14 15 10"></polyline>
    </svg>
  ),
  Clock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  )
};

export default function Rubric() {
  // Criterios detectados (inicializados con los 5 del diseño de Figma)
  const defaultCriteria = [
    { name: 'Contribución equitativa', weight: 30 },
    { name: 'Calidad de revisiones', weight: 25 },
    { name: 'Cumplimiento de hitos', weight: 20 },
    { name: 'Calidad de commits', weight: 15 },
    { name: 'Documentación', weight: 10 },
  ];

  const defaultInstructions =
    'Prioriza la calidad de las revisiones sobre la cantidad de commits. Un aporte cuenta más si fue revisado por un compañero. Ignora commits de formato o documentación menor. La retroalimentación debe ser breve, constructiva y con una sugerencia concreta.';

  const [criteria, setCriteria] = useState(defaultCriteria);
  const [instructions, setInstructions] = useState(defaultInstructions);
  const [frequency, setFrequency] = useState('twice-daily');
  const [minReviewers, setMinReviewers] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editWeightValue, setEditWeightValue] = useState(0);

  // Cargar datos de la API de Azure APIM (/courses/1/...)
  useEffect(() => {
    async function loadCourseConfig() {
      try {
        const rubricRes = await api.get('/courses/1/rubric');
        if (rubricRes?.criteria?.length > 0) {
          // Fusionar criterios si la API trae datos
          setCriteria(rubricRes.criteria.length >= 3 ? rubricRes.criteria : defaultCriteria);
        }

        const instructionsRes = await api.get('/courses/1/instructions');
        if (instructionsRes?.text) {
          setInstructions(instructionsRes.text);
        }

        const configRes = await api.get('/courses/1/scraping-config');
        if (configRes?.frequency) {
          if (configRes.frequency === 'hourly') setFrequency('hourly');
          else if (configRes.frequency === 'weekly') setFrequency('weekly');
          else setFrequency('twice-daily');
        }
      } catch (err) {
        console.warn('Usando valores locales de Figma para configuración del curso:', err);
      }
    }

    loadCourseConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      // Guardar en Azure APIM (Endpoints del OpenAPI)
      await Promise.allSettled([
        api.put('/courses/1/rubric', { criteria }),
        api.put('/courses/1/instructions', { text: instructions }),
        api.put('/courses/1/scraping-config', {
          frequency: frequency === 'hourly' ? 'hourly' : frequency === 'weekly' ? 'weekly' : 'daily',
        }),
      ]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error al guardar configuración:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setCriteria(defaultCriteria);
    setInstructions(defaultInstructions);
    setFrequency('twice-daily');
    setMinReviewers(1);
  };

  const startEditWeight = (index) => {
    setEditingIndex(index);
    setEditWeightValue(criteria[index].weight);
  };

  const saveEditWeight = (index) => {
    const updated = [...criteria];
    updated[index].weight = Number(editWeightValue) || 0;
    setCriteria(updated);
    setEditingIndex(null);
  };

  return (
    <div className="rubric-page-container">
      {/* Encabezado */}
      <div className="rubric-header">
        <div className="rubric-header-left">
          <h1 className="rubric-title">Configuración del curso</h1>
          <span className="rubric-meta">Diseño de Software · Semestre II 2026</span>
        </div>

        <div className="rubric-header-actions">
          <button type="button" onClick={handleDiscard} className="btn-outline">
            Descartar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn-save-primary"
          >
            <RubricIcons.CheckCircle />
            <span>{isSaving ? 'Guardando...' : saveSuccess ? '¡Guardado!' : 'Guardar cambios'}</span>
          </button>
        </div>
      </div>

      {/* Grid Principal (Columna Izquierda: Rúbrica e Indicaciones; Columna Derecha: Frecuencia y Reglas) */}
      <div className="rubric-grid-layout">
        {/* Columna Izquierda */}
        <div className="rubric-left-column">
          {/* Tarjeta 1: Rúbrica del curso */}
          <div className="rubric-card">
            <div className="rubric-card-header">
              <div className="rubric-icon-box">
                <RubricIcons.Sparkle />
              </div>
              <div className="rubric-card-titles">
                <h2 className="rubric-card-title">Rúbrica del curso</h2>
                <span className="rubric-card-subtitle">
                  La IA la interpreta y la aplica sobre cada repositorio.
                </span>
              </div>
            </div>

            {/* Dropzone de subida */}
            <div className="upload-dropzone">
              <span className="upload-icon">
                <RubricIcons.Upload />
              </span>
              <span className="upload-main-text">Arrastra tu rúbrica o selecciónala desde tu equipo</span>
              <span className="upload-sub-text">PDF, DOCX o XLSX · máx. 10 MB</span>
              <button type="button" className="btn-upload-file">
                <RubricIcons.Upload />
                <span>Subir archivo</span>
              </button>
            </div>

            {/* Banner de Archivo Interpretado */}
            <div className="uploaded-file-banner">
              <div className="file-info-left">
                <span style={{ color: 'var(--action-primary)' }}>
                  <RubricIcons.FileText />
                </span>
                <div>
                  <div className="file-name-text">Rubrica_Proyecto1.pdf</div>
                  <div className="file-meta-sub">{criteria.length} criterios detectados</div>
                </div>
              </div>

              <div className="badge-ai-interpreted">
                <RubricIcons.CheckCircle />
                <span>Interpretada por IA</span>
              </div>
            </div>

            {/* Criterios Detectados */}
            <div className="criteria-section">
              <span className="section-label">Criterios detectados</span>
              <div className="criteria-list">
                {criteria.map((item, index) => (
                  <div key={item.name} className="criterion-item">
                    <span className="criterion-name">{item.name}</span>
                    <div className="criterion-actions">
                      {editingIndex === index ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="number"
                            value={editWeightValue}
                            onChange={(e) => setEditWeightValue(e.target.value)}
                            style={{
                              width: 50,
                              padding: '2px 6px',
                              borderRadius: 6,
                              border: '1px solid var(--action-primary)',
                              fontSize: '0.8rem',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => saveEditWeight(index)}
                            style={{ cursor: 'pointer', padding: '2px 8px', fontSize: '0.75rem' }}
                          >
                            ✓
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="weight-pill">{item.weight}%</span>
                          <button
                            type="button"
                            onClick={() => startEditWeight(index)}
                            className="edit-icon-btn"
                            title="Editar porcentaje"
                          >
                            <RubricIcons.Edit />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Indicaciones para la IA */}
          <div className="rubric-card">
            <div className="rubric-card-header">
              <div className="rubric-icon-box">
                <RubricIcons.MessageSquare />
              </div>
              <div className="rubric-card-titles">
                <h2 className="rubric-card-title">Indicaciones para la IA</h2>
                <span className="rubric-card-subtitle">
                  Énfasis y reglas que la IA considera al analizar y proponer retroalimentación.
                </span>
              </div>
            </div>

            <textarea
              className="ai-instructions-box"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              maxLength={1000}
              rows={4}
            />

            <div className="ai-instructions-footer">
              <span>Sé específico: la IA sigue esto en cada análisis.</span>
              <span>{instructions.length} / 1000</span>
            </div>
          </div>
        </div>

        {/* Columna Derecha */}
        <div className="rubric-right-column">
          {/* Tarjeta 3: Frecuencia de análisis */}
          <div className="rubric-card">
            <div className="rubric-card-header">
              <div className="rubric-icon-box">
                <RubricIcons.Refresh />
              </div>
              <div className="rubric-card-titles">
                <h2 className="rubric-card-title">Frecuencia de análisis</h2>
                <span className="rubric-card-subtitle">
                  Cada cuánto se revisan los repositorios.
                </span>
              </div>
            </div>

            <div className="frequency-options">
              <div
                className={`frequency-option-card ${frequency === 'hourly' ? 'selected' : ''}`}
                onClick={() => setFrequency('hourly')}
              >
                <div className="radio-indicator">
                  {frequency === 'hourly' && <div className="radio-inner-dot"></div>}
                </div>
                <span>Cada hora</span>
              </div>

              <div
                className={`frequency-option-card ${frequency === 'twice-daily' ? 'selected' : ''}`}
                onClick={() => setFrequency('twice-daily')}
              >
                <div className="radio-indicator">
                  {frequency === 'twice-daily' && <div className="radio-inner-dot"></div>}
                </div>
                <span>Dos veces al día</span>
              </div>

              <div
                className={`frequency-option-card ${frequency === 'weekly' ? 'selected' : ''}`}
                onClick={() => setFrequency('weekly')}
              >
                <div className="radio-indicator">
                  {frequency === 'weekly' && <div className="radio-inner-dot"></div>}
                </div>
                <span>Semanal</span>
              </div>
            </div>

            <div className="frequency-footer">
              <RubricIcons.Clock />
              <span>Próximo análisis: hoy, 6:00 p. m.</span>
            </div>
          </div>

          {/* Tarjeta 4: Reglas de revisión */}
          <div className="rubric-card">
            <div className="rubric-card-header">
              <div className="rubric-icon-box">
                <RubricIcons.ShieldCheck />
              </div>
              <div className="rubric-card-titles">
                <h2 className="rubric-card-title">Reglas de revisión</h2>
                <span className="rubric-card-subtitle">
                  Se aplican a cada pull request.
                </span>
              </div>
            </div>

            <div className="stepper-row">
              <span className="stepper-label">Mínimo de revisores por PR</span>
              <div className="stepper-controls">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setMinReviewers((v) => Math.max(1, v - 1))}
                >
                  -
                </button>
                <span className="stepper-value">{minReviewers}</span>
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setMinReviewers((v) => v + 1)}
                >
                  +
                </button>
              </div>
            </div>

            <div className="criteria-section">
              <span className="section-label">Ponderación del score</span>
              <div className="score-weights-list">
                <div className="score-weight-item">
                  <span className="score-label">Código</span>
                  <div className="score-progress-track">
                    <div className="score-progress-fill" style={{ width: '40%' }}></div>
                  </div>
                  <span className="score-percentage">40%</span>
                </div>

                <div className="score-weight-item">
                  <span className="score-label">Revisiones</span>
                  <div className="score-progress-track">
                    <div className="score-progress-fill" style={{ width: '40%' }}></div>
                  </div>
                  <span className="score-percentage">40%</span>
                </div>

                <div className="score-weight-item">
                  <span className="score-label">Consistencia</span>
                  <div className="score-progress-track">
                    <div className="score-progress-fill" style={{ width: '20%' }}></div>
                  </div>
                  <span className="score-percentage">20%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
