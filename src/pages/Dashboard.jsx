import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { api } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './Groups.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { items, totalRecords, status } = usePaginatedList('/groups', { pageSize: 5 });

  // Eventos e inconvenientes dinámicos desde APIM
  const [eventsList, setEventsList] = useState([]);
  const [issuesList, setIssuesList] = useState([]);

  useEffect(() => {
    api.get('/calendar/events')
      .then((res) => setEventsList(res.items || []))
      .catch((err) => console.warn('Error al cargar eventos en Dashboard:', err));

    api.get('/groups/1/issues')
      .then((res) => setIssuesList(res.items || []))
      .catch((err) => console.warn('Error al cargar issues en Dashboard:', err));
  }, []);

  const formatRepoSlug = (url, fallbackName) => {
    if (!url) return `revisatec/${fallbackName.toLowerCase().replace(/\s+/g, '-')}`;
    return url.replace(/^https?:\/\/(www\.)?github\.com\//, '');
  };

  return (
    <div className="groups-page-container">
      {/* Encabezado del Inicio / Dashboard */}
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
            onClick={() => navigate('/groups')}
            className="btn-primary-action"
          >
            <Icons.Grupos />
            <span>Ir a Gestión de Grupos</span>
          </button>
        </div>
      </div>

      {/* 4 Tarjetas de Métricas Resumen */}
      <div className="summary-cards-grid">
        <div className="summary-card" onClick={() => navigate('/groups')} style={{ cursor: 'pointer' }}>
          <div className="summary-card-top">
            <div className="summary-icon-box">
              <Icons.Grupos />
            </div>
            <span className="summary-card-title">Grupos activos</span>
          </div>
          <div className="summary-card-number">{totalRecords || items.length || 3}</div>
          <div className="summary-card-footer">Ver listado completo →</div>
        </div>

        <div className="summary-card" onClick={() => navigate('/calendar')} style={{ cursor: 'pointer' }}>
          <div className="summary-card-top">
            <div className="summary-icon-box">
              <Icons.Calendario />
            </div>
            <span className="summary-card-title">Próximas entregas</span>
          </div>
          <div className="summary-card-number">{eventsList.length || 5}</div>
          <div className="summary-card-footer">Próxima: vie 2 oct</div>
        </div>

        <div className="summary-card" onClick={() => navigate('/issues')} style={{ cursor: 'pointer' }}>
          <div className="summary-card-top">
            <div className="summary-icon-box warning">
              <Icons.Inconvenientes />
            </div>
            <span className="summary-card-title">Inconvenientes</span>
          </div>
          <div className="summary-card-number">{issuesList.length || 3}</div>
          <div className="summary-card-footer">Sin resolver</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-top">
            <div className="summary-icon-box success">
              <Icons.CheckCircle />
            </div>
            <span className="summary-card-title">Avance general</span>
          </div>
          <div className="summary-card-number">71%</div>
          <div className="summary-card-footer">Promedio de rúbrica</div>
        </div>
      </div>

      {/* Grid Principal: Tabla Resumen + Widgets Laterales */}
      <div className="dashboard-main-grid">
        {/* Tarjeta de la Tabla Resumida de Grupos */}
        <div className="groups-table-card">
          <div className="table-top-bar">
            <div className="table-title-area">
              <h2 className="table-main-title">Último avance de grupos</h2>
              <span className="table-total-count">Monitoreo reciente en Azure APIM</span>
            </div>

            <button
              type="button"
              className="btn-secondary-action"
              onClick={() => navigate('/groups')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid var(--border-default)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.813rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>Ver todos los grupos</span>
              <Icons.ChevronRight />
            </button>
          </div>

          <div className="table-responsive-wrapper">
            <table className="custom-groups-table">
              <thead>
                <tr>
                  <th style={{ width: '32%' }}>Grupo</th>
                  <th className="col-repositorio" style={{ width: '28%' }}>Repositorio</th>
                  <th style={{ width: '25%' }}>Avance</th>
                  <th style={{ width: '15%' }}>Estado</th>
                  <th style={{ width: '24px' }} aria-label="Acciones"></th>
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
                    const avanceReal = group.avance ?? 0;
                    const estadoReal = group.estado || 'Sin estado';
                    const avatarCode = `G${group.id || index + 1}`;

                    return (
                      <tr
                        key={group.id || index}
                        onClick={() => navigate(`/groups/${group.id || index + 1}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <div className="group-info-flex">
                            <div className="group-avatar-badge">{avatarCode}</div>
                            <div className="group-titles">
                              <span className="group-name-title">{group.name}</span>
                              <span className="group-members-count">Grupo registrado</span>
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
                                style={{ width: `${avanceReal}%` }}
                              ></div>
                            </div>
                            <span className="progress-percentage">{avanceReal}%</span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`status-pill ${
                              estadoReal === 'Alerta' ? 'alert' : 'in-progress'
                            }`}
                          >
                            {estadoReal === 'Alerta' ? (
                              <Icons.AlertTriangle />
                            ) : (
                              <Icons.Clock />
                            )}
                            <span>{estadoReal}</span>
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
        </div>

        {/* Widgets Laterales: Próximas Fechas e Inconvenientes */}
        <div className="dashboard-right-widgets">
          {/* Widget: Próximas fechas */}
          <div className="figma-widget-card">
            <h3 className="widget-card-heading">Próximas fechas</h3>
            <div className="upcoming-events-list">
              {eventsList.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.813rem', padding: '8px 0' }}>
                  Sin eventos registrados en el mock.
                </div>
              ) : (
                eventsList.slice(0, 3).map((ev) => {
                  const parts = ev.date ? ev.date.split('-') : [];
                  const monthStr = parts[1] === '10' ? 'OCT' : parts[1] === '09' ? 'SEP' : parts[1] === '11' ? 'NOV' : 'OCT';
                  const dayStr = parts[2] || '01';

                  return (
                    <div key={ev.id} className="event-row">
                      <div className="date-box">
                        <span className="date-box-month">{monthStr}</span>
                        <span className="date-box-day">{dayStr}</span>
                      </div>
                      <div className="event-details">
                        <span className="event-title">{ev.title}</span>
                        <span className="event-subtitle">{ev.audience || 'Todos los grupos'}</span>
                      </div>
                    </div>
                  );
                })
              )}
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
              {issuesList.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.813rem', padding: '8px 0' }}>
                  Sin inconvenientes registrados en el mock.
                </div>
              ) : (
                issuesList.slice(0, 2).map((iss) => (
                  <div key={iss.id} className="issue-mini-row">
                    <div className="issue-icon-square">
                      <Icons.AlertTriangle />
                    </div>
                    <div className="issue-mini-info">
                      <span className="issue-mini-title">{iss.type}</span>
                      <span className="issue-mini-meta">{iss.groupName} · {iss.date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <a href="/issues" className="widget-footer-link">
              <span>Ver todos</span>
              <Icons.ChevronRight />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
