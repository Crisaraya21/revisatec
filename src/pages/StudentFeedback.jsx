import { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './Feedback.css';

export default function StudentFeedback() {
  const [professorComment, setProfessorComment] = useState(
    'Buen ritmo de revisión y hitos al día. Ana concentra casi la mitad del aporte: redistribuyan tareas antes del Avance 3. Eviten commits de prueba en main; usen ramas y mensajes claros.'
  );

  const [criteria] = useState([
    { name: 'Contribución equitativa', score: 17, max: 30, level: 'En desarrollo', type: 'warning' },
    { name: 'Calidad de revisiones', score: 20, max: 25, level: 'Logrado', type: 'info' },
    { name: 'Cumplimiento de hitos', score: 18, max: 20, level: 'Sobresaliente', type: 'success' },
    { name: 'Calidad de commits', score: 7, max: 15, level: 'Insuficiente', type: 'alert' },
  ]);

  useEffect(() => {
    async function loadPublishedFeedback() {
      try {
        const res = await api.get('/groups/2/feedback');
        if (res?.professor) {
          setProfessorComment(res.professor);
        }
      } catch (err) {
        console.warn('Usando comentario oficial local:', err);
      }
    }
    loadPublishedFeedback();
  }, []);

  return (
    <div className="feedback-page-container">
      {/* Encabezado */}
      <div className="feedback-header">
        <div className="feedback-header-left">
          <h1 className="feedback-title">Retroalimentación</h1>
          <span className="feedback-meta">
            Entrega 2: Prototipo · publicada el 03 oct
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

      {/* Banner Principal con Nota 71/100 */}
      <div
        className="ai-proposal-card"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 24,
          padding: '24px 28px',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(57, 111, 162, 0.12)',
            borderRadius: 12,
            padding: '16px 22px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--action-primary)' }}>
            71
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            / 100
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Grupo 2 · Entrega 2: Prototipo
            </h3>
            <span
              style={{
                fontSize: '0.688rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 12,
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                color: '#16a34a',
                border: '1px solid rgba(34, 197, 94, 0.3)',
              }}
            >
              ✓ Publicada
            </span>
          </div>
          <p style={{ fontSize: '0.813rem', color: 'var(--text-muted)' }}>
            Retroalimentación oficial publicada por el profesor. Ya no se puede editar.
          </p>
        </div>
      </div>

      {/* Tarjeta: Comentario del Profesor */}
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
          <p style={{ color: 'var(--text-primary)', fontStyle: 'normal' }}>
            {professorComment}
          </p>
        </div>
      </div>

      {/* Tarjeta: Cumplimiento por criterio */}
      <div className="criteria-card">
        <div className="criteria-card-header">
          <h3 className="criteria-card-title">Cumplimiento por criterio</h3>
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
    </div>
  );
}
