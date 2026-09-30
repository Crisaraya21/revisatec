import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { api } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './Groups.css';

export default function Groups() {
  const navigate = useNavigate();
  const {
    items,
    totalRecords,
    page,
    totalPages,
    search,
    status,
    error,
    setPage,
    setSearch,
    reload,
  } = usePaginatedList('/groups', { pageSize: 5 });

  // Modal para agregar nuevo grupo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupRepo, setNewGroupRepo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setIsSubmitting(true);
    setModalError(null);
    try {
      await api.post('/groups', {
        name: newGroupName.trim(),
        repoUrl: newGroupRepo.trim() || undefined,
      });
      setNewGroupName('');
      setNewGroupRepo('');
      setIsModalOpen(false);
      reload();
    } catch (err) {
      setModalError(err.message || 'Error al crear el grupo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRepoSlug = (url, fallbackName) => {
    if (!url) return `revisatec/${fallbackName.toLowerCase().replace(/\s+/g, '-')}`;
    return url.replace(/^https?:\/\/(www\.)?github\.com\//, '');
  };

  return (
    <div className="groups-page-container">
      {/* Encabezado del Curso */}
      <div className="course-header">
        <div className="course-header-left">
          <h1 className="course-title">Resumen del curso</h1>
          <span className="course-meta">Actualizado hace 5 min · Semestre II 2026</span>
        </div>

        <div className="course-header-right">
          <button type="button" className="course-selector-btn">
            <span>Curso: Diseño de Software</span>
            <Icons.ChevronDown />
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="btn-primary-action"
          >
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span>
            <span>Nuevo grupo</span>
          </button>
        </div>
      </div>

      {/* 4 Tarjetas de Métricas (Escritorio: 4 en 1 fila; Tablet y Móvil: 2x2) */}
      <div className="summary-cards-grid">
        <div className="summary-card">
          <div className="summary-card-top">
            <div className="summary-icon-box">
              <Icons.Grupos />
            </div>
            <span className="summary-card-title">Grupos activos</span>
          </div>
          <div className="summary-card-number">{totalRecords || 12}</div>
          <div className="summary-card-footer">+2 esta semana</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-top">
            <div className="summary-icon-box">
              <Icons.Calendario />
            </div>
            <span className="summary-card-title">Próximas entregas</span>
          </div>
          <div className="summary-card-number">3</div>
          <div className="summary-card-footer">Próxima: vie 2 oct</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-top">
            <div className="summary-icon-box warning">
              <Icons.Inconvenientes />
            </div>
            <span className="summary-card-title">Inconvenientes</span>
          </div>
          <div className="summary-card-number">4</div>
          <div className="summary-card-footer">2 sin resolver</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-top">
            <div className="summary-icon-box">
              <Icons.Feedback />
            </div>
            <span className="summary-card-title">Feedback pendiente</span>
          </div>
          <div className="summary-card-number">7</div>
          <div className="summary-card-footer">Por publicar</div>
        </div>
      </div>

      {/* En Móvil: Buscador independiente ancho completo */}
      <div className="mobile-search-section" style={{ display: 'none' }}>
        <div className="table-search-pill" style={{ width: '100%' }}>
          <span className="search-pill-icon" style={{ left: 14 }}>
            <Icons.Search />
          </span>
          <input
            type="text"
            placeholder="Buscar grupo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 14px 10px 40px' }}
          />
        </div>
      </div>

      {/* En Móvil: Título de Sección Grupos */}
      <div className="mobile-groups-title" style={{ display: 'none' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Grupos</h2>
      </div>

      {/* En Móvil: Lista de Tarjetas individuales (según Figma Móvil) */}
      <div className="mobile-groups-list">
        {status === 'loading' ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>Cargando grupos...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>No se encontraron grupos.</div>
        ) : (
          items.map((group, index) => {
            const fallbackAvance = group.avance ?? (index === 0 ? 72 : index === 1 ? 35 : 88);
            const fallbackEstado = group.estado ?? (index === 1 ? 'Alerta' : 'En curso');
            const avatarCode = `G${group.id || index + 1}`;

            return (
              <div
                key={group.id || index}
                className="mobile-group-card"
                onClick={() => navigate(`/groups/${group.id || index + 1}`)}
              >
                <div className="mobile-card-top-row">
                  <div className="mobile-group-meta">
                    <div className="group-avatar-badge">{avatarCode}</div>
                    <div className="mobile-group-names">
                      <span className="mobile-group-name">{group.name}</span>
                      <span className="mobile-group-repo">{formatRepoSlug(group.repoUrl, group.name)}</span>
                    </div>
                  </div>

                  <span
                    className={`status-pill ${
                      fallbackEstado === 'Alerta' ? 'alert' : 'in-progress'
                    }`}
                  >
                    {fallbackEstado === 'Alerta' ? <Icons.AlertTriangle /> : <Icons.Clock />}
                    <span>{fallbackEstado}</span>
                  </span>
                </div>

                <div className="mobile-progress-row">
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${fallbackAvance}%` }}
                    ></div>
                  </div>
                  <span className="progress-percentage">{fallbackAvance}%</span>
                </div>
              </div>
            );
          })
        )}

        <button
          type="button"
          className="mobile-view-all-btn"
          onClick={() => navigate('/groups')}
        >
          Ver los {totalRecords || 12} grupos
        </button>
      </div>

      {/* Cuadrícula Principal: Tabla (Escritorio y Tablet) + Widgets Laterales */}
      <div className="dashboard-main-grid">
        {/* Tarjeta de la Tabla de Grupos (Escritorio y Tablet) */}
        <div className="groups-table-card">
          <div className="table-top-bar">
            <div className="table-title-area">
              <h2 className="table-main-title">Grupos</h2>
              <span className="table-total-count">{totalRecords || items.length} en total</span>
            </div>

            <div className="table-filters-area">
              <div className="table-search-pill">
                <span className="search-pill-icon" style={{ left: 10 }}>
                  <Icons.Search />
                </span>
                <input
                  type="text"
                  placeholder="Buscar grupo"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Botón de filtro (visible en Escritorio, se oculta en Tablet según Figma) */}
              <button type="button" className="filter-btn-pill">
                <Icons.Filter />
                <span>Estado</span>
                <Icons.ChevronDown />
              </button>
            </div>
          </div>

          {status === 'error' && (
            <div style={{ padding: '16px 20px', color: '#ef4444' }}>
              Error: {error}
              <button
                type="button"
                onClick={reload}
                style={{ marginLeft: 12, padding: '4px 8px', cursor: 'pointer' }}
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Tabla */}
          <div className="table-responsive-wrapper">
            <table className="custom-groups-table">
              <thead>
                <tr>
                  <th>GRUPO</th>
                  <th className="col-repositorio">REPOSITORIO</th>
                  <th>AVANCE</th>
                  <th>ESTADO</th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {status === 'loading' ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '36px' }}>
                      Cargando datos desde Azure APIM...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '36px' }}>
                      No se encontraron grupos.
                    </td>
                  </tr>
                ) : (
                  items.map((group, index) => {
                    const fallbackAvance = group.avance ?? (index === 0 ? 72 : index === 1 ? 35 : 88);
                    const fallbackEstado = group.estado ?? (index === 1 ? 'Alerta' : 'En curso');
                    const membersCount = index === 0 ? 4 : index === 1 ? 3 : 5;
                    const avatarCode = `G${group.id || index + 1}`;

                    return (
                      <tr
                        key={group.id || index}
                        onClick={() => navigate(`/groups/${group.id || index + 1}`)}
                      >
                        <td>
                          <div className="group-info-flex">
                            <div className="group-avatar-badge">{avatarCode}</div>
                            <div className="group-titles">
                              <span className="group-name-title">{group.name}</span>
                              <span className="group-members-count">{membersCount} integrantes</span>
                            </div>
                          </div>
                        </td>

                        <td className="col-repositorio">
                          <a
                            href={group.repoUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="repo-slug-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Icons.GitBranch />
                            <span>{formatRepoSlug(group.repoUrl, group.name)}</span>
                          </a>
                        </td>

                        <td>
                          <div className="progress-cell-flex">
                            <div className="progress-track">
                              <div
                                className="progress-fill"
                                style={{ width: `${fallbackAvance}%` }}
                              ></div>
                            </div>
                            <span className="progress-percentage">{fallbackAvance}%</span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`status-pill ${
                              fallbackEstado === 'Alerta' ? 'alert' : 'in-progress'
                            }`}
                          >
                            {fallbackEstado === 'Alerta' ? (
                              <Icons.AlertTriangle />
                            ) : (
                              <Icons.Clock />
                            )}
                            <span>{fallbackEstado}</span>
                          </span>
                        </td>

                        <td className="row-chevron">
                          <Icons.ChevronRight />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer de Paginación */}
          <div className="table-pagination-footer">
            <span className="pagination-text">
              Mostrando {items.length > 0 ? `1-${items.length}` : '0'} de {totalRecords || items.length}
            </span>

            <div className="pagination-pages">
              <button
                type="button"
                className="page-num-btn"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                &lt;
              </button>
              {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`page-num-btn ${page === num ? 'active' : ''}`}
                  onClick={() => setPage(num)}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                className="page-num-btn"
                onClick={() => setPage(page + 1)}
                disabled={page >= (totalPages || 1)}
              >
                &gt;
              </button>
            </div>
          </div>
        </div>

        {/* Widgets: Próximas Fechas e Inconvenientes (Escritorio: vertical; Tablet: lado a lado; Móvil: apilados) */}
        <div className="dashboard-right-widgets">
          {/* Widget: Próximas fechas */}
          <div className="figma-widget-card">
            <h3 className="widget-card-heading">Próximas fechas</h3>
            <div className="upcoming-events-list">
              <div className="event-row">
                <div className="date-box">
                  <span className="date-box-month">OCT</span>
                  <span className="date-box-day">02</span>
                </div>
                <div className="event-details">
                  <span className="event-title">Entrega 2: Prototipo</span>
                  <span className="event-subtitle">Grupos 1, 3 y 5</span>
                </div>
              </div>

              <div className="event-row">
                <div className="date-box">
                  <span className="date-box-month">OCT</span>
                  <span className="date-box-day">07</span>
                </div>
                <div className="event-details">
                  <span className="event-title">Avance de repositorio</span>
                  <span className="event-subtitle">Todos los grupos</span>
                </div>
              </div>

              <div className="event-row">
                <div className="date-box">
                  <span className="date-box-month">OCT</span>
                  <span className="date-box-day">16</span>
                </div>
                <div className="event-details">
                  <span className="event-title">Presentación parcial</span>
                  <span className="event-subtitle">Grupos 2 y 4</span>
                </div>
              </div>
            </div>

            <a href="/calendar" className="widget-footer-link">
              <span>Ver calendario</span>
              <Icons.ChevronRight />
            </a>
          </div>

          {/* Widget: Inconvenientes recientes */}
          <div className="figma-widget-card">
            <h3 className="widget-card-heading">Inconvenientes recientes</h3>
            <div className="issues-mini-list">
              <div className="issue-mini-row">
                <div className="issue-icon-square">
                  <Icons.AlertTriangle />
                </div>
                <div className="issue-mini-info">
                  <span className="issue-mini-title">Commit de prueba</span>
                  <span className="issue-mini-meta">Grupo 2 · hace 2 h</span>
                </div>
              </div>

              <div className="issue-mini-row">
                <div className="issue-icon-square">
                  <Icons.AlertTriangle />
                </div>
                <div className="issue-mini-info">
                  <span className="issue-mini-title">Error de entrega</span>
                  <span className="issue-mini-meta">Grupo 5 · ayer</span>
                </div>
              </div>
            </div>

            <a href="/issues" className="widget-footer-link">
              <span>Ver todos</span>
              <Icons.ChevronRight />
            </a>
          </div>
        </div>
      </div>

      {/* Modal para Crear Nuevo Grupo */}
      {isModalOpen && (
        <div
          className="modal-overlay-animated"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: 16,
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="modal-content-animated"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 420,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Registrar Nuevo Grupo</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{modalError}</div>
            )}

            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Nombre del grupo *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Grupo 4"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-sunken)',
                    color: 'var(--text-primary)',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Repositorio GitHub (opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/revisatec/g4-app"
                  value={newGroupRepo}
                  onChange={(e) => setNewGroupRepo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-sunken)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border-default)',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newGroupName.trim()}
                  className="btn-primary-action"
                >
                  {isSubmitting ? 'Guardando...' : 'Crear Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
