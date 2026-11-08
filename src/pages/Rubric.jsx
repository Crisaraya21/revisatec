import { useState, useEffect, useMemo, useCallback } from 'react';
import { courseConfigApi } from '../api';
import { useCourse } from '../context/CourseContext';
import { ApiError } from '../lib/apiClient';
import './Rubric.css';

// Iconos SVG para Rúbrica
const RubricIcons = {
  Sparkle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"></path>
    </svg>
  ),
  FileText: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
    </svg>
  ),
  Upload: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="17 8 12 3 7 8"></polyline>
      <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
  ),
  CheckCircle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  ),
  Edit: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  ),
  Trash: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  ),
  Refresh: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="23 4 23 10 17 10"></polyline>
      <polyline points="1 20 1 14 7 14"></polyline>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
  ),
  ShieldCheck: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <polyline points="9 12 11 14 15 10"></polyline>
    </svg>
  ),
  Clock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  ),
};

export default function Rubric() {
  const {
    selectedCourse,
    selectedCourseId,
    loading: coursesLoading,
    error: coursesError,
  } = useCourse();

  // Estados de la Rúbrica
  const [criteria, setCriteria] = useState([]);
  const [fileName, setFileName] = useState('');
  const [interpretationStatus, setInterpretationStatus] = useState('');
  const [rubricLoading, setRubricLoading] = useState(true);
  const [rubricError, setRubricError] = useState(null);

  // Estados de Indicaciones
  const [instructions, setInstructions] = useState('');
  const [instructionsLoading, setInstructionsLoading] = useState(true);
  const [instructionsError, setInstructionsError] = useState(null);

  // Estados de Scraping
  const [frequency, setFrequency] = useState('daily');
  const [minReviewers, setMinReviewers] = useState(2);
  const [nextRunAt, setNextRunAt] = useState(null);
  const [scrapingLoading, setScrapingLoading] = useState(true);
  const [scrapingError, setScrapingError] = useState(null);

  // Estado de referencia guardada (para detectar dirty)
  const [baseline, setBaseline] = useState(null);

  // Estados de guardado
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  // Estados para nuevo criterio
  const [newCriterionName, setNewCriterionName] = useState('');
  const [newCriterionWeight, setNewCriterionWeight] = useState('');

  // Edición inline de ponderación
  const [editingIndex, setEditingIndex] = useState(null);
  const [editWeightValue, setEditWeightValue] = useState(0);

  // Carga en paralelo independiente con Promise.allSettled
  const loadAllSections = useCallback(async (courseId) => {
    if (!courseId) return;

    setRubricLoading(true);
    setInstructionsLoading(true);
    setScrapingLoading(true);
    setRubricError(null);
    setInstructionsError(null);
    setScrapingError(null);
    setSaveErrorMsg('');
    setSaveSuccessMsg('');

    const [rubricRes, instructionsRes, scrapingRes] = await Promise.allSettled([
      courseConfigApi.getRubric(courseId),
      courseConfigApi.getInstructions(courseId),
      courseConfigApi.getScrapingConfig(courseId),
    ]);

    let loadedCriteria = [];
    if (rubricRes.status === 'fulfilled') {
      const data = rubricRes.value;
      loadedCriteria = Array.isArray(data?.criteria) ? data.criteria : [];
      setFileName(data?.fileName || '');
      setInterpretationStatus(data?.interpretationStatus || '');
      setCriteria(loadedCriteria);
    } else {
      console.error('Error al cargar rúbrica:', rubricRes.reason);
      setRubricError('No se pudo cargar la rúbrica desde APIM.');
    }
    setRubricLoading(false);

    let loadedInstructions = '';
    if (instructionsRes.status === 'fulfilled') {
      loadedInstructions = instructionsRes.value?.text || '';
      setInstructions(loadedInstructions);
    } else {
      console.error('Error al cargar indicaciones:', instructionsRes.reason);
      setInstructionsError('No se pudieron cargar las indicaciones de IA.');
    }
    setInstructionsLoading(false);

    let loadedFrequency = 'daily';
    let loadedMinReviewers = 2;
    if (scrapingRes.status === 'fulfilled') {
      const data = scrapingRes.value;
      loadedFrequency = data?.frequency || 'daily';
      loadedMinReviewers = data?.minReviewers ?? 2;
      setNextRunAt(data?.nextRunAt || null);
      setFrequency(loadedFrequency);
      setMinReviewers(loadedMinReviewers);
    } else {
      console.error('Error al cargar scraping config:', scrapingRes.reason);
      setScrapingError('No se pudo cargar la configuración de scraping.');
    }
    setScrapingLoading(false);

    // Guardar referencia base para detección de cambios
    setBaseline({
      criteria: JSON.stringify(loadedCriteria),
      instructions: loadedInstructions,
      frequency: loadedFrequency,
      minReviewers: loadedMinReviewers,
    });
  }, []);

  useEffect(() => {
    if (coursesLoading) return;
    if (selectedCourseId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadAllSections(selectedCourseId);
    }
  }, [coursesLoading, selectedCourseId, loadAllSections]);

  // Validación de pesos de criterios (debe sumar exactamente 100%)
  const totalWeight = useMemo(() => {
    return criteria.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  }, [criteria]);

  const isWeightValid = totalWeight === 100;

  const hasEmptyCriterionName = useMemo(() => {
    return criteria.some((c) => !c.name || String(c.name).trim() === '');
  }, [criteria]);

  // Comprobar si hay cambios pendientes (isDirty)
  const isDirty = useMemo(() => {
    if (!baseline) return false;
    const currentCriteriaStr = JSON.stringify(criteria);
    return (
      currentCriteriaStr !== baseline.criteria ||
      instructions !== baseline.instructions ||
      frequency !== baseline.frequency ||
      minReviewers !== baseline.minReviewers
    );
  }, [baseline, criteria, instructions, frequency, minReviewers]);

  // Prevenir salida accidental si hay cambios sin guardar
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Agregar criterio nuevo
  const handleAddCriterion = (e) => {
    e.preventDefault();
    const name = newCriterionName.trim();
    const weight = Number(newCriterionWeight);
    if (!name || isNaN(weight) || weight <= 0) return;

    setCriteria((prev) => [...prev, { name, weight }]);
    setNewCriterionName('');
    setNewCriterionWeight('');
  };

  // Eliminar criterio
  const handleRemoveCriterion = (indexToRemove) => {
    setCriteria((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Guardar edición de peso inline
  const handleSaveInlineWeight = (index) => {
    const numeric = Number(editWeightValue);
    if (Number.isFinite(numeric) && numeric >= 0) {
      setCriteria((prev) =>
        prev.map((c, i) => (i === index ? { ...c, weight: numeric } : c))
      );
    }
    setEditingIndex(null);
  };

  // Guardar todos los cambios modificados en APIM
  const handleSaveAll = async () => {
    if (!selectedCourseId || !isDirty || isSaving) return;

    if (!isWeightValid) {
      setSaveErrorMsg(`Los pesos de la rúbrica deben sumar exactamente 100%. Actualmente suman ${totalWeight}%.`);
      return;
    }

    if (hasEmptyCriterionName) {
      setSaveErrorMsg('Todos los criterios deben tener un nombre válido.');
      return;
    }

    setIsSaving(true);
    setSaveErrorMsg('');
    setSaveSuccessMsg('');

    try {
      const promises = [];

      // Guardar rúbrica si cambió
      if (JSON.stringify(criteria) !== baseline?.criteria) {
        promises.push(courseConfigApi.saveRubric(selectedCourseId, { criteria }));
      }

      // Guardar indicaciones si cambiaron
      if (instructions !== baseline?.instructions) {
        promises.push(courseConfigApi.saveInstructions(selectedCourseId, { text: instructions }));
      }

      // Guardar scraping si cambió
      if (frequency !== baseline?.frequency || minReviewers !== baseline?.minReviewers) {
        promises.push(courseConfigApi.saveScrapingConfig(selectedCourseId, { frequency, minReviewers }));
      }

      await Promise.all(promises);

      setSaveSuccessMsg('Configuración guardada exitosamente en Azure APIM.');
      setBaseline({
        criteria: JSON.stringify(criteria),
        instructions,
        frequency,
        minReviewers,
      });

      // Ocultar mensaje de éxito tras 4 segundos
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error al guardar configuración en APIM:', err);
      if (err instanceof ApiError) {
        if (err.status === 400) {
          setSaveErrorMsg(err.message || 'Datos inválidos según el esquema de MS2 (400).');
        } else if (err.status === 404) {
          setSaveErrorMsg('El curso seleccionado no fue encontrado en APIM (404).');
        } else {
          setSaveErrorMsg(`Error ${err.status} al guardar en APIM: ${err.message}`);
        }
      } else {
        setSaveErrorMsg(err?.message || 'Error de conexión con Azure APIM.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rubric-page-container">
      {/* Encabezado */}
      <div className="rubric-header">
        <div className="rubric-header-left">
          <h1 className="rubric-title">Configuración del Curso</h1>
          <span className="rubric-meta">
            {selectedCourse
              ? `${selectedCourse.name} · Parámetros del modelo de evaluación y scraping`
              : 'Seleccione un curso en la barra superior'}
          </span>
        </div>

        <div className="rubric-header-actions">
          {/* Botón sin endpoint: Deshabilitado como Próximamente */}
          <button
            type="button"
            className="btn-outline"
            disabled
            title="Funcionalidad planificada para Fase III"
          >
            <span>Probar con un grupo</span>
            <span className="tag-proximamente">Próximamente</span>
          </button>

          {/* Botón Guardar Principal */}
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={!isDirty || !isWeightValid || hasEmptyCriterionName || isSaving}
            className="btn-save-primary"
            aria-live="polite"
          >
            <span>{isSaving ? 'Guardando…' : 'Guardar cambios'}</span>
          </button>
        </div>
      </div>

      {/* Alerta de Cursos Error */}
      {coursesError && (
        <div className="section-error-alert" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RubricIcons.AlertTriangle />
            <span>{coursesError}</span>
          </div>
        </div>
      )}

      {/* Banner de Éxito al Guardar */}
      {saveSuccessMsg && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 10,
            backgroundColor: 'var(--badge-success-bg, rgba(34, 197, 94, 0.12))',
            border: '1px solid var(--badge-success-border, rgba(34, 197, 94, 0.3))',
            color: 'var(--badge-success-text, #16a34a)',
            fontSize: '0.844rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'fadeInView 0.25s ease',
          }}
          role="status"
          aria-live="polite"
        >
          <RubricIcons.CheckCircle />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Banner de Error al Guardar */}
      {saveErrorMsg && (
        <div className="section-error-alert" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RubricIcons.AlertTriangle />
            <span>{saveErrorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveErrorMsg('')}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Layout Principal Grid */}
      <div className="rubric-grid-layout">
        {/* Columna Izquierda */}
        <div className="rubric-left-column">
          {/* Tarjeta 1: Rúbrica */}
          <div className="rubric-card">
            <div className="rubric-card-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="rubric-icon-box">
                  <RubricIcons.Sparkle />
                </div>
                <div className="rubric-card-titles">
                  <h2 className="rubric-card-title">Rúbrica de Evaluación</h2>
                  <span className="rubric-card-subtitle">
                    Criterios y pesos porcentuales. La suma debe dar 100%.
                  </span>
                </div>
              </div>

              {/* Badge de Validación de Pesos */}
              <div>
                {isWeightValid ? (
                  <span className="badge-weight-valid">
                    <RubricIcons.CheckCircle />
                    <span>Total: 100%</span>
                  </span>
                ) : (
                  <span className="badge-weight-invalid" title="Los pesos deben sumar exactamente 100%">
                    <RubricIcons.AlertTriangle />
                    <span>
                      Total: {totalWeight}% ({totalWeight < 100 ? `Faltan ${100 - totalWeight}%` : `Excede por ${totalWeight - 100}%`})
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Error específico de la sección rúbrica */}
            {rubricError && (
              <div className="section-error-alert">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RubricIcons.AlertTriangle />
                  <span>{rubricError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => selectedCourseId && courseConfigApi.getRubric(selectedCourseId)}
                  className="btn-outline"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Subida de archivo (Deshabilitado: contrato solo soporta JSON) */}
            <div className="upload-dropzone" style={{ opacity: 0.7, cursor: 'not-allowed' }}>
              <div className="upload-icon">
                <RubricIcons.Upload />
              </div>
              <span className="upload-main-text">
                Carga automatizada de rúbrica
                <span className="tag-proximamente">Próximamente</span>
              </span>
              <span className="upload-sub-text">
                El endpoint de carga de archivos (PDF/Word) no está contemplado en el contrato OpenAPI de MS2. Los criterios se configuran directamente abajo.
              </span>
            </div>

            {/* Archivo interpretado actual si existe */}
            {fileName && (
              <div className="uploaded-file-banner">
                <div className="file-info-left">
                  <RubricIcons.FileText />
                  <div>
                    <span className="file-name-text">{fileName}</span>
                    <span className="file-meta-sub" style={{ display: 'block' }}>
                      {interpretationStatus || 'Rúbrica activa del curso'}
                    </span>
                  </div>
                </div>
                <span className="badge-ai-interpreted">
                  <RubricIcons.CheckCircle />
                  <span>Interpretada por IA</span>
                </span>
              </div>
            )}

            {/* Lista de Criterios */}
            <div className="criteria-section">
              <span className="section-label">Criterios configurados ({criteria.length})</span>

              {rubricLoading ? (
                <div className="section-loading-spinner">Cargando criterios desde APIM…</div>
              ) : criteria.length === 0 ? (
                <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.844rem', textAlign: 'center' }}>
                  Sin criterios registrados. Agrega uno usando el formulario inferior.
                </div>
              ) : (
                <div className="criteria-list">
                  {criteria.map((item, index) => (
                    <div key={index} className="criterion-item">
                      <span className="criterion-name">{item.name}</span>

                      <div className="criterion-actions">
                        {editingIndex === index ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={editWeightValue}
                              onChange={(e) => setEditWeightValue(e.target.value)}
                              className="criterion-input-weight"
                              style={{ width: 64, padding: '4px 8px' }}
                              autoFocus
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>%</span>
                            <button
                              type="button"
                              onClick={() => handleSaveInlineWeight(index)}
                              className="btn-add-criterion"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              OK
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="weight-pill">{item.weight}%</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingIndex(index);
                                setEditWeightValue(item.weight);
                              }}
                              className="edit-icon-btn"
                              title="Editar peso porcentual"
                              aria-label={`Editar peso de ${item.name}`}
                            >
                              <RubricIcons.Edit />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveCriterion(index)}
                              className="btn-remove-criterion"
                              title="Eliminar criterio"
                              aria-label={`Eliminar criterio ${item.name}`}
                            >
                              <RubricIcons.Trash />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulario para agregar criterio */}
              <form onSubmit={handleAddCriterion} className="criterion-add-row">
                <input
                  type="text"
                  placeholder="Nombre del nuevo criterio (ej: Pruebas unitarias)"
                  value={newCriterionName}
                  onChange={(e) => setNewCriterionName(e.target.value)}
                  className="criterion-input-name"
                />
                <input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="Peso %"
                  value={newCriterionWeight}
                  onChange={(e) => setNewCriterionWeight(e.target.value)}
                  className="criterion-input-weight"
                />
                <button
                  type="submit"
                  disabled={!newCriterionName.trim() || !newCriterionWeight}
                  className="btn-add-criterion"
                >
                  Agregar
                </button>
              </form>
            </div>
          </div>

          {/* Tarjeta 2: Indicaciones para la IA */}
          <div className="rubric-card">
            <div className="rubric-card-header">
              <div className="rubric-icon-box">
                <RubricIcons.FileText />
              </div>
              <div className="rubric-card-titles">
                <h2 className="rubric-card-title">Indicaciones para la IA</h2>
                <span className="rubric-card-subtitle">
                  Instrucciones específicas que el modelo seguirá para evaluar este curso.
                </span>
              </div>
            </div>

            {instructionsError && (
              <div className="section-error-alert">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RubricIcons.AlertTriangle />
                  <span>{instructionsError}</span>
                </div>
              </div>
            )}

            {instructionsLoading ? (
              <div className="section-loading-spinner">Cargando indicaciones desde APIM…</div>
            ) : (
              <>
                <textarea
                  className="ai-instructions-box"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Escribe las directrices de evaluación del repositorio..."
                  rows={4}
                  aria-label="Indicaciones para la IA"
                />

                <div className="ai-instructions-footer">
                  <span className="char-counter">
                    {instructions.length} caracteres
                  </span>
                  <span>Se envían en cada solicitud de análisis a MS2</span>
                </div>
              </>
            )}
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
                  Periodicidad con que el scraping revisa los repositorios.
                </span>
              </div>
            </div>

            {scrapingError && (
              <div className="section-error-alert">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RubricIcons.AlertTriangle />
                  <span>{scrapingError}</span>
                </div>
              </div>
            )}

            {scrapingLoading ? (
              <div className="section-loading-spinner">Cargando scraping config…</div>
            ) : (
              <>
                <div className="frequency-options" role="radiogroup" aria-label="Frecuencia de análisis">
                  <div
                    className={`frequency-option-card ${frequency === 'hourly' ? 'selected' : ''}`}
                    onClick={() => setFrequency('hourly')}
                    role="radio"
                    aria-checked={frequency === 'hourly'}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === ' ' && setFrequency('hourly')}
                  >
                    <div className="radio-indicator">
                      {frequency === 'hourly' && <div className="radio-inner-dot"></div>}
                    </div>
                    <span>Cada hora (hourly)</span>
                  </div>

                  <div
                    className={`frequency-option-card ${frequency === 'daily' ? 'selected' : ''}`}
                    onClick={() => setFrequency('daily')}
                    role="radio"
                    aria-checked={frequency === 'daily'}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === ' ' && setFrequency('daily')}
                  >
                    <div className="radio-indicator">
                      {frequency === 'daily' && <div className="radio-inner-dot"></div>}
                    </div>
                    <span>Una vez al día (daily)</span>
                  </div>

                  <div
                    className={`frequency-option-card ${frequency === 'weekly' ? 'selected' : ''}`}
                    onClick={() => setFrequency('weekly')}
                    role="radio"
                    aria-checked={frequency === 'weekly'}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === ' ' && setFrequency('weekly')}
                  >
                    <div className="radio-indicator">
                      {frequency === 'weekly' && <div className="radio-inner-dot"></div>}
                    </div>
                    <span>Semanal (weekly)</span>
                  </div>
                </div>

                <div className="frequency-footer">
                  <RubricIcons.Clock />
                  <span>
                    {nextRunAt
                      ? `Próximo análisis: ${new Date(nextRunAt).toLocaleString('es-CR')}`
                      : 'Próximo análisis programado según la frecuencia'}
                  </span>
                </div>
              </>
            )}
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
                  Se aplican al verificar pull requests en el repositorio.
                </span>
              </div>
            </div>

            <div className="stepper-row">
              <span className="stepper-label">Mínimo de revisores por PR</span>
              <div className="stepper-controls">
                <button
                  type="button"
                  className="stepper-btn"
                  disabled={minReviewers <= 1}
                  onClick={() => setMinReviewers((v) => Math.max(1, v - 1))}
                  aria-label="Disminuir revisores"
                >
                  -
                </button>
                <span className="stepper-value">{minReviewers}</span>
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setMinReviewers((v) => v + 1)}
                  aria-label="Aumentar revisores"
                >
                  +
                </button>
              </div>
            </div>

            {/* Resumen de Ponderaciones en barra de progreso */}
            <div className="criteria-section">
              <span className="section-label">Ponderación del score</span>
              <div className="score-weights-list">
                {criteria.length > 0 ? (
                  criteria.map((item, idx) => {
                    const weight = Number(item.weight) || 0;
                    const width = Math.min(100, Math.max(0, weight));
                    return (
                      <div key={idx} className="score-weight-item">
                        <span className="score-label">{item.name}</span>
                        <div
                          className="score-progress-track"
                          role="progressbar"
                          aria-valuenow={weight}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className="score-progress-fill"
                            style={{ width: `${width}%` }}
                          ></div>
                        </div>
                        <span className="score-percentage">{weight}%</span>
                      </div>
                    );
                  })
                ) : (
                  <span className="file-meta-sub">Sin ponderaciones registradas.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

