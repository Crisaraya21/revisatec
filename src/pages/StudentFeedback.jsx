import { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './Feedback.css';

export default function StudentFeedback() {
  const [professorComment, setProfessorComment] = useState('');
  const [criteria, setCriteria] = useState([]);
  const [score, setScore] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    async function loadPublishedFeedback() {
      setIsLoading(true);
      setApiError(null);
      try {
        const res = await api.get('/groups/2/feedback');
        setProfessorComment(res?.professor || '');
        setScore(res?.score ?? null);

        const analysisRes = await api.get('/groups/2/analysis');
        setCriteria(analysisRes?.criteria || []);
      } catch (err) {
        console.error('Error al cargar feedback publicado:', err);
        setApiError('Error de conexion con Azure APIM: No se pudo cargar la retroalimentacion.');
        setProfessorComment('');
        setCriteria([]);
        setScore(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadPublishedFeedback();
  }, []);

  return (
    <div className="feedback-page-container">
      {/* Encabezado */}
      <div className="feedback-header">
        <div className="feedback-header-left">
          <h1 className="feedback-title">Retroalimentacion</h1>
          <span className="feedback-meta">
            Entrega 2: Prototipo &middot; publicada
          </span>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="btn-refresh-analysis"
        >
          <Icons.Download />
          <span>Descargar PDF</span>
        </button>
      </div>

      {/* Error API */}
      {apiError && (
        <div style={{ backgroundColor: 'var(--badge-alert-bg)', color: 'var(--badge-alert-text)', border: '1px solid var(--badge-alert-border)', padding: '16px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icons.AlertTriangle />
          <span style={{ fontSize: '0.844rem', fontWeight: 600 }}>{apiError}</span>
        </div>
      )}

      {/* Cargando */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Cargando retroalimentacion...
        </div>
      )}

      {/* Contenido */}
      {!isLoading && !apiError && (
        <>
          {/* Banner con nota */}
          <div
            className="ai-proposal-card"
            style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 24, padding: '24px 28px' }}
          >
            <div
              style={{ backgroundColor: 'rgba(57, 111, 162, 0.12)', borderRadius: 12, padding: '16px 22px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--action-primary)' }}>
                {score !== null ? score : '—'}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                / 100
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Grupo 2 &middot; Entrega 2: Prototipo
                </h3>
                <span
                  style={{ fontSize: '0.688rem', fontWeight: 700, padding: '2px 8px', borderRadius: 12, backgroundColor: 'rgba(34, 197, 94, 0.12)', color: '#16a34a', border: '1px solid rgba(34, 197, 94, 0.3)' }}
                >
                  Publicada
                </span>
              </div>
              <p style={{ fontSize: '0.813rem', color: 'var(--text-muted)' }}>
                Retroalimentacion oficial publicada por el profesor. Ya no se puede editar.
              </p>
            </div>
          </div>

          {/* Comentario del profesor */}
          <div className="ai-proposal-card">
            <div className="ai-proposal-header">
              <div className="prof-icon-badge">
                <Icons.FileText />
              </div>
              <div>
                <h3 className="ai-proposal-title">Comentario del profesor</h3>
                <span className="ai-proposal-meta">Solo lectura</span>
              </div>
            </div>

            <div className="ai-proposal-content-box" style={{ backgroundColor: 'var(--bg-sunken)' }}>
              {professorComment ? (
                <p style={{ color: 'var(--text-primary)', fontStyle: 'normal' }}>
                  {professorComment}
                </p>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Sin comentario publicado aun.
                </p>
              )}
            </div>
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
