import { useState, useEffect, useMemo, useCallback } from 'react';
import { ApiError } from '../lib/apiClient';
import { groupsApi, groupAnalysisApi } from '../api';
import { useCourse } from '../context/CourseContext';
import { Icons } from '../components/Icons';
import './Feedback.css';

export default function Feedback() {
  const { selectedCourseId, loading: coursesLoading } = useCourse();
  const [groupsState, setGroupsState] = useState({ courseId: null, items: [] });
  const groups = useMemo(
    () => (Object.is(groupsState.courseId, selectedCourseId) ? groupsState.items : []),
    [groupsState, selectedCourseId]
  );

  const [groupSelection, setGroupSelection] = useState({ courseId: null, groupId: null });
  const selectedGroupId = Object.is(groupSelection.courseId, selectedCourseId)
    ? groupSelection.groupId
    : null;

  const setSelectedGroupId = useCallback(
    (groupId) => setGroupSelection({ courseId: selectedCourseId, groupId }),
    [selectedCourseId]
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [apiError, setApiError] = useState(null);

  const [aiFeedback, setAiFeedback] = useState('');
  const [professorText, setProfessorText] = useState('');
  const [savedProfessorText, setSavedProfessorText] = useState('');
  const [criteria, setCriteria] = useState([]);
  const [deliveryTitle, setDeliveryTitle] = useState('Entrega de proyecto');
  const [groupName, setGroupName] = useState('');
  const [status, setStatus] = useState('draft');
  const [toast, setToast] = useState(null);
  const [showConfirmPublish, setShowConfirmPublish] = useState(false);

  const isDirty = professorText !== savedProfessorText;

  const showToast = (type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Alerta si el usuario intenta cerrar o recargar con cambios sin guardar
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

  // Cargar grupos del curso seleccionado
  useEffect(() => {
    if (coursesLoading || selectedCourseId === null) return undefined;

    let active = true;
    groupsApi.list({ page: 1, pageSize: 100, courseId: selectedCourseId })
      .then((res) => {
        if (!active) return;
        const nextGroups = Array.isArray(res?.content)
          ? res.content
          : Array.isArray(res?.items) ? res.items : [];
        setApiError(null);
        setGroupsState({ courseId: selectedCourseId, items: nextGroups });
        if (nextGroups.length > 0) {
          setSelectedGroupId(nextGroups[0].id);
        } else {
          setSelectedGroupId(null);
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error('Error al cargar grupos para feedback:', err);
        setApiError('No se pudieron cargar los grupos desde el servidor.');
      });

    return () => { active = false; };
  }, [selectedCourseId, coursesLoading, setSelectedGroupId]);

  // Cargar retroalimentación y análisis del grupo seleccionado
  useEffect(() => {
    if (selectedGroupId === null) return undefined;
    let active = true;

    async function loadGroupFeedback() {
      setIsLoading(true);
      setApiError(null);

      const [fbResult, analysisResult] = await Promise.allSettled([
        groupAnalysisApi.getFeedback(selectedGroupId),
        groupAnalysisApi.getAnalysis(selectedGroupId),
      ]);

      if (!active) return;

      if (fbResult.status === 'fulfilled') {
        const fbData = fbResult.value;
        const aiText = fbData?.ai || '';
        const profText = fbData?.professor || '';
        setAiFeedback(aiText);
        setProfessorText(profText);
        setSavedProfessorText(profText);
        setDeliveryTitle(fbData?.deliveryTitle || 'Entrega de proyecto');
        setStatus(fbData?.status === 'published' ? 'published' : 'draft');
        setGroupName(
          fbData?.groupName ||
          groups.find((g) => String(g.id) === String(selectedGroupId))?.name ||
          `Grupo ${selectedGroupId}`
        );
      } else {
        const err = fbResult.reason;
        if (err instanceof ApiError && err.status === 404) {
          // Si no existe aún retroalimentación creada en MS2, se inicializa como nuevo borrador
          setAiFeedback('');
          setProfessorText('');
          setSavedProfessorText('');
          setStatus('draft');
          setGroupName(
            groups.find((g) => String(g.id) === String(selectedGroupId))?.name ||
            `Grupo ${selectedGroupId}`
          );
        } else {
          console.error('Error al cargar feedback:', err);
          setApiError('No se pudo cargar la retroalimentación del grupo.');
        }
      }

      if (analysisResult.status === 'fulfilled') {
        const analysisData = analysisResult.value;
        setCriteria(Array.isArray(analysisData?.criteria) ? analysisData.criteria : []);
      } else {
        setCriteria([]);
      }

      setIsLoading(false);
    }

    loadGroupFeedback();
    return () => { active = false; };
  }, [selectedGroupId, groups]);

  const handleUseAiBase = () => {
    if (!aiFeedback) return;
    setProfessorText(aiFeedback);
  };

  const handleDiscard = () => {
    setProfessorText(savedProfessorText);
  };

  // Guardar borrador (PUT /groups/{id}/feedback)
  const handleSaveDraft = async () => {
    if (selectedGroupId === null || isSaving || isPublishing) return;
    setIsSaving(true);
    setApiError(null);
    try {
      await groupAnalysisApi.saveFeedback(selectedGroupId, {
        ai: aiFeedback,
        professor: professorText,
      });
      setSavedProfessorText(professorText);
      showToast(
        'success',
        'Borrador guardado',
        `La versión del profesor para ${groupName} ha sido guardada exitosamente.`
      );
    } catch (err) {
      console.error('Error al guardar borrador de feedback:', err);
      const code = err instanceof ApiError ? err.status : 500;
      showToast(
        'error',
        `Error al guardar (${code})`,
        err.message || 'No se pudo guardar el borrador en el servidor.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Confirmar y publicar (POST /groups/{id}/feedback/publish)
  const handleConfirmPublish = async () => {
    if (selectedGroupId === null || isPublishing) return;
    setIsPublishing(true);
    try {
      // Guardar cambios pendientes primero si está dirty
      if (isDirty) {
        await groupAnalysisApi.saveFeedback(selectedGroupId, {
          ai: aiFeedback,
          professor: professorText,
        });
        setSavedProfessorText(professorText);
      }

      await groupAnalysisApi.publishFeedback(selectedGroupId);
      setStatus('published');
      setShowConfirmPublish(false);
      showToast(
        'success',
        'Retroalimentación publicada',
        `Se ha publicado la retroalimentación para ${groupName}. Los estudiantes ya pueden consultarla.`
      );
    } catch (err) {
      console.error('Error al publicar feedback:', err);
      const code = err instanceof ApiError ? err.status : 500;
      showToast(
        'error',
        `Error al publicar (${code})`,
        err.message || 'No se pudo publicar la retroalimentación. Los cambios locales se mantienen.'
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const isFeedbackLoading = selectedGroupId !== null && isLoading;

  return (
    <div className="feedback-page-container">
      {/* Toast Flotante para notificaciones de acción */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="feedback-title">Retroalimentación</h1>
            <span className={`feedback-status-badge ${status === 'published' ? 'published' : 'draft'}`}>
              {status === 'published' ? (
                <>
                  <Icons.CheckCircle />
                  <span>Publicada</span>
                </>
              ) : (
                <>
                  <Icons.Clock />
                  <span>Borrador</span>
                </>
              )}
            </span>
          </div>
          <span className="feedback-meta">
            {selectedGroupId === null
              ? 'Seleccione un grupo'
              : `${groupName || 'Grupo seleccionado'} · ${deliveryTitle}`}
          </span>
        </div>

        <div className="feedback-header-actions">
          <select
            value={selectedGroupId ?? ''}
            onChange={(e) => setSelectedGroupId(Number(e.target.value))}
            className="filter-select"
            aria-label="Seleccionar grupo para retroalimentación"
            disabled={groups.length === 0 || isSaving || isPublishing}
          >
            {groups.length > 0
              ? groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))
              : <option value="">No hay grupos disponibles</option>}
          </select>

          {/* Botón Guardar borrador */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={!isDirty || isSaving || isPublishing || isFeedbackLoading || selectedGroupId === null}
            className="btn-secondary-save"
            title="Guarda la versión actual como borrador sin notificar a los estudiantes"
          >
            <Icons.CheckCircle />
            <span>{isSaving ? 'Guardando...' : 'Guardar borrador'}</span>
          </button>

          {/* Botón Publicar con diálogo de confirmación */}
          <button
            type="button"
            onClick={() => setShowConfirmPublish(true)}
            disabled={isSaving || isPublishing || isFeedbackLoading || selectedGroupId === null || !professorText.trim()}
            className="btn-primary-action"
            title="Publica la versión a los estudiantes y emite la notificación"
          >
            <Icons.Send />
            <span>{isPublishing ? 'Publicando...' : 'Publicar'}</span>
          </button>
        </div>
      </div>

      {/* Error API */}
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
      {isFeedbackLoading && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Cargando retroalimentación del grupo...
        </div>
      )}

      {/* Contenido principal */}
      {selectedGroupId !== null && !isFeedbackLoading && !apiError && (
        <>
          {/* Propuesta IA */}
          <div className="ai-proposal-card">
            <div className="ai-proposal-header">
              <div className="ai-icon-badge">
                <Icons.Star />
              </div>
              <div>
                <h3 className="ai-proposal-title">Propuesta generada por IA</h3>
                <span className="ai-proposal-meta">Basada en el análisis del repositorio</span>
              </div>
            </div>
            <div className="ai-proposal-content-box">
              {aiFeedback ? (
                <p>{aiFeedback}</p>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Sin propuesta de IA disponible para esta entrega.
                </p>
              )}
            </div>
            <div className="ai-proposal-actions">
              <button
                type="button"
                onClick={handleUseAiBase}
                className="btn-use-ai"
                disabled={!aiFeedback || isSaving || isPublishing}
              >
                <Icons.CheckCircle />
                <span>Usar como base</span>
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                className="btn-discard"
                disabled={!isDirty || isSaving || isPublishing}
              >
                Descartar cambios
              </button>
            </div>
          </div>

          {/* Versión del profesor */}
          <div className="professor-card">
            <div className="prof-icon-badge">
              <Icons.Edit />
            </div>
            <div className="professor-card-header">
              <h3 className="professor-card-title">Tu versión</h3>
              <span className="professor-card-meta">
                {status === 'published'
                  ? 'Publicada · Visible para los estudiantes del grupo'
                  : 'Borrador editable · Se notificará al publicar'}
              </span>
            </div>
            <textarea
              className="professor-textarea"
              value={professorText}
              onChange={(e) => setProfessorText(e.target.value)}
              placeholder="Escribe la retroalimentación para el grupo aquí..."
              aria-label="Texto de retroalimentación del profesor"
              disabled={isSaving || isPublishing}
            />
            <div className="feedback-char-count">
              <span>{professorText.length} caracteres</span>
              {isDirty && (
                <span className="feedback-dirty-indicator">• Cambios sin guardar en borrador</span>
              )}
            </div>
          </div>

          {/* Cumplimiento por criterio */}
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
        </>
      )}

      {/* Modal de confirmación para Publicar */}
      {showConfirmPublish && (
        <div
          className="feedback-modal-backdrop"
          onClick={() => !isPublishing && setShowConfirmPublish(false)}
        >
          <div
            className="feedback-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-publish-title"
          >
            <h3 id="confirm-publish-title" className="feedback-modal-title">
              <Icons.Send />
              <span>¿Publicar retroalimentación?</span>
            </h3>
            <p className="feedback-modal-text">
              Se notificará a los integrantes de <strong>{groupName}</strong> y la retroalimentación
              quedará visible de inmediato en su panel de estudiante.
            </p>
            {isDirty && (
              <p className="feedback-modal-text" style={{ color: 'var(--badge-alert-text)' }}>
                Nota: Se guardarán automáticamente tus últimos cambios antes de emitir la publicación.
              </p>
            )}
            <div className="feedback-modal-actions">
              <button
                type="button"
                className="btn-secondary-save"
                onClick={() => setShowConfirmPublish(false)}
                disabled={isPublishing}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary-action"
                onClick={handleConfirmPublish}
                disabled={isPublishing}
              >
                {isPublishing ? 'Publicando...' : 'Sí, publicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
