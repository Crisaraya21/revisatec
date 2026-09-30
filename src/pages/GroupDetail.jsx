import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './StudentDashboard.css';

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const groupId = id || 2;

  const [group, setGroup] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [directReviews, setDirectReviews] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    async function loadGroupDetails() {
      setIsLoading(true);
      setApiError(null);
      try {
        const groupRes = await api.get(`/groups/${groupId}`);
        setGroup({
          id: groupId,
          name: groupRes.name || `Grupo ${groupId}`,
          repoUrl: groupRes.repoUrl || '',
          avance: groupRes.avance || 0,
          score: groupRes.score || 0,
          estado: groupRes.estado || 'En curso',
        });

        const analysisRes = await api.get(`/groups/${groupId}/analysis`);
        if (analysisRes?.score !== undefined) {
          setGroup((prev) => ({ ...prev, score: analysisRes.score }));
        }

        const criteriaRes = await api.get(`/groups/${groupId}/criteria`);
        setCriteria(criteriaRes?.criteria || []);

        const reviewsRes = await api.get(`/groups/${groupId}/direct-reviews`);
        setDirectReviews(reviewsRes?.items || []);
      } catch (err) {
        console.error('Error al cargar detalle del grupo desde APIM:', err);
        setApiError('Error de conexion con Azure APIM: No se pudo cargar la informacion del grupo.');
        setGroup(null);
        setCriteria([]);
        setDirectReviews([]);
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
              className="btn-back"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Icons.ChevronLeft />
              <span style={{ fontSize: '0.813rem' }}>Grupos</span>
            </button>
            <span style={{ color: 'var(--border-default)' }}>/</span>
            <h1 className="student-welcome-title" style={{ fontSize: '1.2rem' }}>
              {group ? group.name : `Grupo ${groupId}`}
            </h1>
          </div>
          {group && (
            <span className="student-group-subtitle">
              {group.repoUrl ? group.repoUrl.replace('https://github.com/', '') : 'Sin repositorio'} &middot; {group.estado}
            </span>
          )}
        </div>
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
          Cargando informacion del grupo...
        </div>
      )}

      {/* Contenido */}
      {!isLoading && !apiError && group && (
        <>
          {/* Criterios */}
          {criteria.length > 0 && (
            <div className="criteria-card">
              <div className="criteria-card-header">
                <h3 className="criteria-card-title">Criterios de evaluacion</h3>
              </div>
              <div className="criteria-list">
                {criteria.map((c, i) => (
                  <div key={i} className="criterion-row">
                    <div className="criterion-info-top">
                      <span className="criterion-name">{c.name}</span>
                      <span className={`criterion-badge ${c.level === 'bueno' ? 'success' : c.level === 'regular' ? 'warning' : 'alert'}`}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revisiones directas */}
          <div className="criteria-card">
            <div className="criteria-card-header">
              <h3 className="criteria-card-title">Revisiones directas</h3>
            </div>
            {directReviews.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.844rem' }}>Sin revisiones registradas.</p>
            ) : (
              directReviews.map((r, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-default)', fontSize: '0.844rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{r.date}</span> &mdash; {r.note}
                </div>
              ))
            )}
            <form onSubmit={handleAddReview} style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Agregar nota de revision..."
                className="issues-search-input"
                style={{ flex: 1, border: '1px solid var(--border-default)', borderRadius: 8, padding: '8px 12px' }}
              />
              <button type="submit" className="btn-new-event" style={{ padding: '8px 16px' }}>
                Agregar
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
