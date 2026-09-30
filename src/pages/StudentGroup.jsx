import { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './StudentDashboard.css';

export default function StudentGroup() {
  const [group, setGroup] = useState({
    id: 2,
    name: 'Grupo 2',
    repoUrl: 'https://github.com/revisatec/g2-web',
    course: 'Diseño de Software',
    avance: 71,
  });

  const [members] = useState([
    { name: 'Ana R.', email: 'ana.r@estudiantec.cr', role: 'Líder', contribution: '48%' },
    { name: 'Luis M.', email: 'luis.m@estudiantec.cr', role: 'Desarrollador', contribution: '34%' },
    { name: 'Sofía P. (tú)', email: 'sofia.p@estudiantec.cr', role: 'Desarrolladora', contribution: '18%' },
  ]);

  const [isEditing, setIsEditing] = useState(false);
  const [repoInput, setRepoInput] = useState('https://github.com/revisatec/g2-web');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/groups/2');
        if (res?.name) {
          setGroup((prev) => ({
            ...prev,
            name: res.name,
            repoUrl: res.repoUrl || prev.repoUrl,
          }));
          setRepoInput(res.repoUrl || 'https://github.com/revisatec/g2-web');
        }
      } catch (err) {
        console.warn('Usando datos de grupo locales:', err);
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
      setGroup((prev) => ({ ...prev, repoUrl: repoInput }));
      setIsEditing(false);
    }
  };

  return (
    <div className="student-dashboard-container">
      {/* Encabezado */}
      <div className="student-header">
        <div className="student-header-left">
          <h1 className="student-welcome-title">{group.name}</h1>
          <span className="student-group-subtitle">
            {group.repoUrl.replace('https://github.com/', '')} · {group.course}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="btn-view-my-group"
        >
          <Icons.Edit />
          <span>{isEditing ? 'Cancelar edición' : 'Editar datos'}</span>
        </button>
      </div>

      {isEditing && (
        <form onSubmit={handleSaveRepo} className="criteria-card" style={{ gap: 12 }}>
          <h3 className="card-title-simple">Editar Repositorio del Grupo</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="url"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              className="issues-search-input"
              style={{
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                padding: '8px 12px',
                flex: 1,
              }}
              required
            />
            <button
              type="submit"
              className="btn-new-event"
              style={{ padding: '8px 16px' }}
            >
              Guardar
            </button>
          </div>
        </form>
      )}

      {/* Grid Principal */}
      <div className="student-main-grid">
        {/* Card: Datos e Integrantes */}
        <div className="student-progress-card">
          <h3 className="card-title-simple">Datos del grupo</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                URL del repositorio
              </span>
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
            </div>

            <div style={{ marginTop: 12 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                Integrantes del equipo ({members.length})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {members.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: 'var(--bg-sunken)',
                      borderRadius: 8,
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.844rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                        {m.name}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {m.email} · {m.role}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.781rem', fontWeight: 600, color: 'var(--action-primary)' }}>
                      {m.contribution}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card: Resumen de Avance */}
        <div className="student-team-card">
          <h3 className="card-title-simple">Avance del grupo</h3>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {group.avance}%
            </span>
            <span style={{ display: 'block', fontSize: '0.781rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Completado según rúbrica
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--border-default)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.813rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Commits analizados</span>
              <strong style={{ color: 'var(--text-primary)' }}>48</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.813rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Pull Requests</span>
              <strong style={{ color: 'var(--text-primary)' }}>14</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.813rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Inconvenientes</span>
              <span style={{ color: '#ef4444', fontWeight: 600 }}>1 detectado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
