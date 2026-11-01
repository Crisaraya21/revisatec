import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { api } from '../lib/apiClient';
import { calendarApi, coursesApi } from '../api';
import { fromEpochMs, formatDate } from '../utils/date';
import { Icons } from '../components/Icons';
import './Groups.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { items, totalRecords, status } = usePaginatedList('/groups', { pageSize: 5 });

  // Eventos e inconvenientes dinámicos desde APIM
  const [eventsList, setEventsList] = useState([]);
  const [issuesList, setIssuesList] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [coursesStatus, setCoursesStatus] = useState('loading');
  const [coursesError, setCoursesError] = useState(null);
  const [isCourseMenuOpen, setIsCourseMenuOpen] = useState(false);
  const courseSelectorRef = useRef(null);
  const courseSelectorButtonRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    coursesApi.list()
      .then((response) => {
        const courseList = Array.isArray(response)
          ? response
          : Array.isArray(response?.content)
          ? response.content
          : Array.isArray(response?.items)
          ? response.items
          : null;

        if (!courseList) {
          throw new Error('La respuesta de /courses no contiene una lista de cursos.');
        }

        const validCourses = courseList.filter(
          (course) =>
            course &&
            course.id !== undefined &&
            course.id !== null &&
            typeof course.name === 'string' &&
            course.name.trim() !== '',
        );

        if (validCourses.length !== courseList.length) {
          throw new Error('La respuesta de /courses contiene cursos sin identificador o nombre.');
        }

        if (isMounted) {
          setCourses(validCourses);
          setSelectedCourseId((currentId) =>
            validCourses.some((course) => String(course.id) === currentId)
              ? currentId
              : String(validCourses[0]?.id ?? ''),
          );
          setCoursesStatus('success');
        }
      })
      .catch((err) => {
        console.error('Error al cargar cursos desde APIM:', err);
        if (isMounted) {
          setCoursesError(
            err instanceof Error
              ? `No se pudieron cargar los cursos desde APIM: ${err.message}`
              : 'No se pudieron cargar los cursos desde APIM.',
          );
          setCoursesStatus('error');
        }
      });

    calendarApi.listEvents()
      .then((res) => setEventsList(Array.isArray(res?.content) ? res.content : Array.isArray(res?.items) ? res.items : []))
      .catch((err) => console.warn('Error al cargar eventos en Dashboard:', err));

    api.get('/groups/1/issues')
      .then((res) => setIssuesList(res.items || []))
      .catch((err) => console.warn('Error al cargar issues en Dashboard:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isCourseMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!courseSelectorRef.current?.contains(event.target)) {
        setIsCourseMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsCourseMenuOpen(false);
        courseSelectorButtonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCourseMenuOpen]);

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
          <div className="course-selector-control" ref={courseSelectorRef}>
            <button
              ref={courseSelectorButtonRef}
              type="button"
              className={`course-selector-btn ${isCourseMenuOpen ? 'is-open' : ''}`}
              onClick={() => setIsCourseMenuOpen((isOpen) => !isOpen)}
              disabled={coursesStatus !== 'success' || courses.length === 0}
              aria-label="Seleccionar curso"
              aria-haspopup="listbox"
              aria-expanded={isCourseMenuOpen}
              aria-controls={isCourseMenuOpen ? 'dashboard-course-options' : undefined}
              aria-describedby={coursesError ? 'dashboard-courses-error' : undefined}
            >
              <span className="course-selector-label">
                {courses.length === 0
                  ? coursesStatus === 'loading'
                    ? 'Cargando cursos...'
                    : coursesStatus === 'error'
                    ? 'No se pudieron cargar los cursos'
                    : 'No hay cursos disponibles'
                  : `Curso: ${courses.find((course) => String(course.id) === selectedCourseId)?.name || 'Seleccionar curso'}`}
              </span>
              <Icons.ChevronDown />
            </button>
            {isCourseMenuOpen && (
              <div
                id="dashboard-course-options"
                className="course-selector-menu"
                role="listbox"
                aria-label="Cursos disponibles"
              >
                {courses.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    className="course-selector-option"
                    role="option"
                    aria-selected={String(course.id) === selectedCourseId}
                    onClick={() => {
                      setSelectedCourseId(String(course.id));
                      setIsCourseMenuOpen(false);
                    }}
                  >
                    {course.name}
                  </button>
                ))}
              </div>
            )}
            {coursesError && (
              <span id="dashboard-courses-error" className="course-selector-error" role="alert">
                {coursesError}
              </span>
            )}
          </div>
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
                  const dateObj = fromEpochMs(ev.date);
                  let monthStr = '—';
                  let dayStr = '—';
                  if (dateObj) {
                    try {
                      monthStr = new Intl.DateTimeFormat('es-CR', { month: 'short' }).format(dateObj).replace('.', '').slice(0, 3).toUpperCase();
                      dayStr = String(dateObj.getDate()).padStart(2, '0');
                    } catch {
                      dayStr = String(dateObj.getDate());
                    }
                  }

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
                      <span className="issue-mini-meta">{iss.groupName} · {formatDate(iss.date)}</span>
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
