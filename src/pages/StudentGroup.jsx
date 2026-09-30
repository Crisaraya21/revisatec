import { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './StudentDashboard.css';

export default function StudentGroup() {
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [repoInput, setRepoInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setApiError(null);
      try {
        const res = await api.get('/groups/2');
        setGroup({
          id: 2,
          name: res.name || 'Grupo 2',
          repoUrl: res.repoUrl || '',
          course: res.course || 'Diseno de Software',
          avance: res.avance || 0,
        });
        setRepoInput(res.repoUrl || '');

        const membersRes = await api.get('/groups/2/members');
        setMembers(membersRes?.members || []);
      } catch (err) {
        console.error('Error al cargar datos del grupo:', err);
        setApiError('Error de conexion con Azure APIM: No se pudo cargar la informacion del grupo.');
        setGroup(null);
        setMembers([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSaveRepo = async (e) => {
    e.preventDefault();
    try {
      await api.put('/groups/2', {
        name: group.name,
        repoUrl: repoInput,
      });
      setGroup((prev) => ({ ...prev, repoUrl: repoInput }));
      setIsEditing(false);
    } catch (err) {
      console.error('Error al actualizar repo:', err);
    }
  };

  return (
    <div className="student-dashboard-container">
      {/* Encabezado */}
      <div className="student-header">
        <div className="student-header-left">
          <h1 className="student-welcome-title">{group ? group.name : 'Cargando...'}</h1>
          <span className="student-group-subtitle">
            {group?.repoUrl ? group.repoUrl.replace('https://github.com/', '') : ''} {group?.course ? `&middot; ${group.course}` : ''}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="btn-view-my-group"
          disabled={!group}
        >
          <Icons.Edit />
          <span>{isEditing ? 'Cancelar edicion' : 'Editar datos'}</span>
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
          Cargando informacion del grupo...
        </div>
      )}

      {/* Form de edicion */}
      {isEditing && group && (
        <form onSubmit={handleSaveRepo} className="criteria-card" style={{ gap: 12 }}>
          <h3 className="card-title-simple">Editar Repositorio del Grupo</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="url"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              className="issues-search-input"
              style={{ border: '1px solid var(--border-default)', borderRadius: 8, padding: '8px 12px', flex: 1 }}
              required
            />
            <button type="submit" className="btn-new-event" style={{ padding: '8px 16px' }}>
              Guardar
            </button>
          </div>
        </form>
      )}

      {/* Contenido */}
      {!isLoading && !apiError && group && (
        <div className="student-main-grid">
          {/* Datos e integrantes */}
          <div className="student-progress-card">
            <h3 className="card-title-simple">Datos del grupo</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                  URL del repositorio
                </span>
                {group.repoUrl ? (
                  <a
                    href={group.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="repo-slug-link"
                    style={{ marginTop: 4, display: 'inline-flex' }}
                  >
                    <Icons.GitBranch />
                    <span>{group.repoUrl}</span>
                  </a>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.844rem' }}>Sin repositorio configurado</span>
                )}
              </div>

              <div style={{ marginTop: 12 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                  Integrantes del equipo ({members.length})
                </span>
                {members.length === 0 ? (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.844rem' }}>Sin integrantes registrados.</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {members.map((m, idx) => (
                      <div
                        key={idx}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--bg-sunken)', borderRadius: 8, border: '1px solid var(--border-default)' }}
                      >
                        <div>
                          <span style={{ fontSize: '0.844rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                            {m.name}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {m.email} &middot; {m.role}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.781rem', fontWeight: 600, color: 'var(--action-primary)' }}>
                          {m.contribution}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Avance */}
          <div className="student-team-card">
            <h3 className="card-title-simple">Avance del grupo</h3>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {group.avance}%
              </span>
              <span style={{ display: 'block', fontSize: '0.781rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Completado segun rubrica
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
