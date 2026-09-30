import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './StudentDashboard.css';

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const groupId = id || 2;

  const [group, setGroup] = useState({
    id: groupId,
    name: `Grupo ${groupId}`,
    repoUrl: `https://github.com/revisatec/g${groupId}-web`,
    avance: 72,
    score: 85,
    estado: 'En curso',
  });

  const [criteria, setCriteria] = useState([
    { name: 'Código limpio', status: 'cumplido', level: 'bueno', weight: 25 },
    { name: 'Contribución equitativa', status: 'en progreso', level: 'regular', weight: 20 },
    { name: 'Calidad de commits', status: 'cumplido', level: 'bueno', weight: 25 },
    { name: 'Documentación', status: 'pendiente', level: 'regular', weight: 30 },
  ]);

  const [directReviews, setDirectReviews] = useState([
    { date: '2026-09-20', note: 'Revisión directa inicial de arquitectura' },
  ]);
  const [newNote, setNewNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadGroupDetails() {
      setIsLoading(true);
      try {
        const groupRes = await api.get(`/groups/${groupId}`).catch(() => null);
        if (groupRes?.name) {
          setGroup((prev) => ({
            ...prev,
            name: groupRes.name,
            repoUrl: groupRes.repoUrl || prev.repoUrl,
          }));
        }

        const analysisRes = await api.get(`/groups/${groupId}/analysis`).catch(() => null);
        if (analysisRes?.score) {
          setGroup((prev) => ({ ...prev, score: analysisRes.score }));
        }

        const criteriaRes = await api.get(`/groups/${groupId}/criteria`).catch(() => null);
        if (criteriaRes?.criteria?.length > 0) {
          setCriteria(criteriaRes.criteria);
        }

        const reviewsRes = await api.get(`/groups/${groupId}/direct-reviews`).catch(() => null);
        if (reviewsRes?.items?.length > 0) {
          setDirectReviews(reviewsRes.items);
        }
      } catch (err) {
        console.warn('Usando valores iniciales de detalle:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadGroupDetails();
  }, [groupId]);

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      await api.post(`/groups/${groupId}/direct-reviews`, {
        date: new Date().toISOString().split('T')[0],
        note: newNote.trim(),
      });
      setDirectReviews((prev) => [
        ...prev,
        { date: new Date().toISOString().split('T')[0], note: newNote.trim() },
      ]);
      setNewNote('');
    } catch (err) {
      console.error('Error al agregar nota:', err);
      setDirectReviews((prev) => [
        ...prev,
        { date: new Date().toISOString().split('T')[0], note: newNote.trim() },
      ]);
      setNewNote('');
    }
  };

  return (
    <div className="student-dashboard-container">
      {/* Encabezado */}
      <div className="student-header">
        <div className="student-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => navigate('/groups')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              ← Volver a grupos
            </button>
          </div>
          <h1 className="student-welcome-title">{group.name}</h1>
          <span className="student-group-subtitle">
            {group.repoUrl.replace('https://github.com/', '')} · Análisis y Métricas
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/feedback')}
          className="btn-new-event"
        >
          <Icons.Feedback />
          <span>Ver retroalimentación</span>
        </button>
      </div>

      {/* Métricas del Grupo */}
      <div className="student-metrics-grid">
        <div className="student-metric-card">
          <span className="student-metric-label">Nota estimada</span>
          <div className="student-metric-val">
            <strong>{group.score}</strong>
            <span className="metric-denom"> / 100</span>
          </div>
          <span className="student-metric-caption">Cálculo de Azure APIM</span>
        </div>

        <div className="student-metric-card">
          <span className="student-metric-label">Avance global</span>
          <div className="student-metric-val">
            <strong>{group.avance}%</strong>
          </div>
          <span className="student-metric-caption">Progreso del repositorio</span>
        </div>

        <div className="student-metric-card">
          <span className="student-metric-label">Estado actual</span>
          <div className="student-metric-val" style={{ fontSize: '1.25rem', marginTop: 4 }}>
            <span className="status-pill in-progress">
              <Icons.Clock />
              <span>{group.estado}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Criterios Evaluados + Revisiones Directas */}
      <div className="student-main-grid">
        {/* Criterios de la Rúbrica */}
        <div className="student-progress-card">
          <h3 className="card-title-simple">Criterios evaluados por el sistema</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {criteria.map((crit, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-sunken)',
                  borderRadius: 10,
                  border: '1px solid var(--border-default)',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                    {crit.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Ponderación: {crit.weight || 25}%
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    padding: '3px 10px',
                    borderRadius: 12,
                    backgroundColor: crit.status === 'cumplido' ? 'rgba(34, 197, 94, 0.12)' : 'var(--badge-warning-bg)',
                    color: crit.status === 'cumplido' ? '#16a34a' : 'var(--badge-warning-text)',
                  }}
                >
                  {crit.status || crit.level || 'En progreso'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Notas y Revisiones Directas */}
        <div className="student-team-card">
          <h3 className="card-title-simple">Notas del profesor</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {directReviews.map((rev, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: 'var(--bg-sunken)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <span style={{ fontSize: '0.688rem', color: 'var(--text-muted)', display: 'block' }}>
                  {rev.date}
                </span>
                <p style={{ fontSize: '0.813rem', color: 'var(--text-primary)', marginTop: 2 }}>
                  {rev.note}
                </p>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddReview} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            <input
              type="text"
              placeholder="Nueva nota para el grupo..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="issues-search-input"
              style={{
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: '0.813rem',
              }}
            />
            <button
              type="submit"
              disabled={!newNote.trim()}
              className="btn-new-event"
              style={{ padding: '7px 12px', fontSize: '0.781rem', justifyContent: 'center' }}
            >
              Agregar nota
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
