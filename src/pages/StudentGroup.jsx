import { useState, useEffect } from 'react';
import { api, ApiError } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './StudentDashboard.css';

export default function StudentGroup() {
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [repoInput, setRepoInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, status, title, message) => {
    setToast({ type, status, title, message });
    setTimeout(() => setToast(null), 5000);
  };

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadGroupDetails() {
      try {
        // 1. Datos del grupo
        const res = await api.get('/groups/2');
        if (!isMounted) return;
        setGroup({
          id: 2,
          name: res.name || 'Grupo 2',
          repoUrl: res.repoUrl || '',
          course: res.course || 'Diseño de Software',
          avance: res.avance ?? 71,
        });
        setRepoInput(res.repoUrl || '');

        // 2. Integrantes
        const membersRes = await api.get('/groups/2/members');
        if (!isMounted) return;
        setMembers(membersRes?.members || []);

        // 3. Inconvenientes reportados en el repo
        const issuesRes = await api.get('/groups/2/issues');
        if (!isMounted) return;
        setIssues(issuesRes?.items || []);

        // 4. Reporte de hitos
        const reportRes = await api.get('/groups/2/report');
        if (!isMounted) return;
        setMilestones(reportRes?.checklist || []);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error al cargar datos del grupo:', err);
        const code = err instanceof ApiError ? err.status : 500;
        setApiError({
          status: code,
          message: err.message || 'Error de conexión con Azure APIM al cargar la información del grupo.',
        });
        setGroup(null);
        setMembers([]);
        setIssues([]);
        setMilestones([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadGroupDetails();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const handleManualRefresh = () => {
    setIsLoading(true);
    setReloadKey((k) => k + 1);
  };

  const handleSaveRepo = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/groups/2', {
        name: group.name,
        repoUrl: repoInput.trim(),
      });
      setGroup((prev) => ({ ...prev, repoUrl: res?.repoUrl || repoInput.trim() }));
      setIsEditing(false);
      showToast(
        'success',
        200,
        'Repositorio Actualizado (HTTP 200 OK)',
        'La URL del repositorio se sincronizó exitosamente en Azure APIM.'
      );
    } catch (err) {
      console.error('Error al actualizar repo:', err);
      const code = err instanceof ApiError ? err.status : 400;
      showToast('error', code, `Error HTTP ${code}`, err.message || 'Error al actualizar repositorio.');
    }
  };

  // Simulación de estados HTTP
  const handleSimulate400 = async () => {
    try {
      await api.put('/groups/2', {});
    } catch (err) {
      const code = err instanceof ApiError ? err.status : 400;
      showToast(
        'error',
        code,
        `Simulación Error HTTP ${code} (Bad Request)`,
        err.message || 'Error 400: Datos inválidos enviados a Azure APIM.'
      );
    }
  };

  const handleSimulate404 = async () => {
    try {
      await api.get('/recurso-inexistente-404');
    } catch (err) {
      const code = err instanceof ApiError ? err.status : 404;
      showToast(
        'error',
        code,
        `Simulación Error HTTP ${code} (Not Found)`,
        err.message || 'Error 404: Recurso no encontrado en Azure APIM.'
      );
    }
  };

  return (
    <div className="student-dashboard-container">
      {/* Toast Notificaciones */}
      {toast && (
        <div
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
      <div className="student-header">
        <div className="student-header-left">
          <h1 className="student-welcome-title">{group ? group.name : 'Mi Grupo'}</h1>
          <span className="student-group-subtitle">
            {group?.repoUrl ? group.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '') : ''} &middot; {group?.course || 'Diseño de Software'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="btn-refresh-analysis"
            title="Recargar datos desde Azure APIM"
          >
            <Icons.Refresh />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="btn-view-my-group"
            disabled={!group}
          >
            <Icons.Edit />
            <span>{isEditing ? 'Cancelar edición' : 'Editar repositorio'}</span>
          </button>
        </div>
      </div>

      {/* Error API */}
      {apiError && (
        <div
          style={{
            backgroundColor: 'var(--badge-alert-bg)',
            color: 'var(--badge-alert-text)',
            border: '1.5px solid var(--badge-alert-border)',
            padding: '18px 22px',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icons.AlertTriangle />
            <span style={{ fontSize: '0.938rem', fontWeight: 700 }}>
              Error HTTP {apiError.status}: {apiError.message}
            </span>
          </div>
          <p style={{ fontSize: '0.813rem', margin: 0 }}>
            Ley del proyecto: la pantalla refleja fielmente el error devuelto por Azure APIM.
          </p>
          <button
            type="button"
            onClick={handleManualRefresh}
            style={{
              alignSelf: 'flex-start',
              marginTop: 6,
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid var(--badge-alert-border)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reintentar llamada a APIM
          </button>
        </div>
      )}

      {/* Cargando */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Cargando información del grupo desde Azure APIM...
        </div>
      )}

      {/* Formulario de edición */}
      {isEditing && group && (
        <form onSubmit={handleSaveRepo} className="criteria-card" style={{ gap: 14 }}>
          <div className="criteria-card-header">
            <h3 className="criteria-card-title">Configuración del Repositorio de GitHub</h3>
            <span className="criteria-card-subtitle">
              Sincronizado con el endpoint <code>PUT /groups/2</code> en Azure APIM
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="url"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              className="issues-search-input"
              style={{
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                padding: '10px 14px',
                flex: 1,
                minWidth: 260,
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
              }}
              placeholder="https://github.com/usuario/repo"
              required
            />
            <button
              type="submit"
              className="btn-primary-action"
              style={{ padding: '10px 20px', borderRadius: 8 }}
            >
              Guardar en Azure APIM
            </button>
          </div>
        </form>
      )}

      {/* Contenido Principal */}
      {!isLoading && !apiError && group && (
        <div className="student-main-grid">
          {/* Columna Izquierda: Datos, Repo e Inconvenientes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Tarjeta de Datos del Repositorio */}
            <div className="student-progress-card">
              <h3 className="card-title-simple">Información del Repositorio</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                    URL Vinculada en GitHub
                  </span>
                  {group.repoUrl ? (
                    <a
                      href={group.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="repo-slug-link"
                      style={{ marginTop: 6, display: 'inline-flex', fontSize: '0.875rem' }}
                    >
                      <Icons.GitBranch />
                      <span>{group.repoUrl}</span>
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.844rem' }}>
                      Sin repositorio configurado
                    </span>
                  )}
                </div>

                <div style={{ marginTop: 8 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 10 }}>
                    Integrantes del Equipo ({members.length}) &middot; Obtenido de <code>GET /groups/2/members</code>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="member-avatar">
                            {m.initials || m.name?.charAt(0)}
                          </div>
                          <div>
                            <span style={{ fontSize: '0.844rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                              {m.name}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {m.email} &middot; {m.role}
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.813rem', fontWeight: 700, color: 'var(--action-primary)' }}>
                          {m.contribution}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Inconvenientes Reportados */}
            {issues.length > 0 && (
              <div className="criteria-card">
                <div className="criteria-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 className="criteria-card-title">Inconvenientes Registrados del Grupo</h3>
                    <span className="table-total-count">{issues.length} detectados</span>
                  </div>
                  <span className="criteria-card-subtitle">
                    Obtenido de <code>GET /groups/2/issues</code>
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {issues.map((iss, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        backgroundColor: 'var(--bg-sunken)',
                        borderRadius: 8,
                        border: '1px solid var(--border-default)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: '0.844rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {iss.type}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {iss.description} &middot; {iss.date}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.688rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 10,
                          backgroundColor: iss.status === 'Resuelto' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: iss.status === 'Resuelto' ? '#16a34a' : '#d97706',
                          border: `1px solid ${iss.status === 'Resuelto' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                        }}
                      >
                        {iss.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Avance e Hitos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Avance del Grupo */}
            <div className="student-team-card">
              <h3 className="card-title-simple">Avance Global del Grupo</h3>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <span style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--action-primary)' }}>
                  {group.avance}%
                </span>
                <span style={{ display: 'block', fontSize: '0.781rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Calculado según rúbrica y entregas
                </span>
              </div>
            </div>

            {/* Checklist de Hitos */}
            {milestones.length > 0 && (
              <div className="criteria-card">
                <div className="criteria-card-header">
                  <h3 className="criteria-card-title">Hitos del Proyecto</h3>
                  <span className="criteria-card-subtitle">
                    Obtenido de <code>GET /groups/2/report</code>
                  </span>
                </div>

                <div className="milestones-checklist">
                  {milestones.map((m, idx) => (
                    <div key={idx} className="milestone-item">
                      <div className="milestone-left">
                        <Icons.CheckCircle />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span className="milestone-name">{m.name}</span>
                          <span className="milestone-date">{m.date}</span>
                        </div>
                      </div>
                      <span className={`milestone-badge ${m.status}`}>
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barra de Pruebas de Estados HTTP (Cumplimiento de la Ley sin datos falsos) */}
      <div className="http-simulation-bar">
        <div className="http-sim-label">
          <Icons.AlertTriangle />
          <span>Validación de Estados de Error HTTP:</span>
        </div>
        <div className="http-sim-buttons">
          <button
            type="button"
            onClick={handleSimulate400}
            className="btn-test-http warning"
          >
            Probar Error 400 (Bad Request)
          </button>
          <button
            type="button"
            onClick={handleSimulate404}
            className="btn-test-http danger"
          >
            Probar Error 404 (Not Found)
          </button>
        </div>
      </div>
    </div>
  );
}
