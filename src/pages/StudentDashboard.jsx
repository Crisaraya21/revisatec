import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { Icons } from '../components/Icons';
import './StudentDashboard.css';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentFirstName = user?.name?.split(' ')[0] || 'Estudiante';
  const [groupInfo, setGroupInfo] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [membersUnavailable, setMembersUnavailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    async function loadStudentData() {
      setIsLoading(true);
      setApiError(null);
      setMembersUnavailable(false);
      try {
        const groupRes = await api.get('/groups/2');
        setGroupInfo({
          id: 2,
          name: groupRes.name || 'Grupo 2',
          repoUrl: groupRes.repoUrl || '',
          score: groupRes.score ?? null,
          avance: groupRes.avance ?? null,
          myContribution: groupRes.myContribution ?? null,
          reviewedPRs: groupRes.reviewedPRs ?? null,
          unreviewedPRs: groupRes.unreviewedPRs ?? null,
        });

        const analysisRes = await api.get('/groups/2/analysis');
        if (analysisRes?.score !== undefined || analysisRes?.progress !== undefined) {
          setGroupInfo((prev) => ({
            ...prev,
            score: analysisRes.score ?? prev?.score ?? null,
            avance: analysisRes.progress ?? prev?.avance ?? null,
          }));
        }
        if (analysisRes?.criteria?.length > 0) {
          setCriteria(analysisRes.criteria.map((c) => ({ name: c.name, percent: c.percent || 0 })));
        } else {
          setCriteria([]);
        }

        try {
          const membersRes = await api.get('/groups/2/members');
          setTeamMembers(membersRes?.members || []);
        } catch (err) {
          console.warn('No se pudieron cargar los integrantes del grupo:', err);
          setTeamMembers([]);
          setMembersUnavailable(true);
        }
      } catch (err) {
        console.error('Error al cargar datos del estudiante:', err);
        setApiError('Error de conexion con Azure APIM: No se pudo cargar la informacion del grupo.');
        setGroupInfo(null);
        setCriteria([]);
        setTeamMembers([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadStudentData();
  }, []);

  useEffect(() => {
    api.get('/calendar/events')
      .then((res) => setUpcomingEvents(Array.isArray(res?.items) ? res.items : []))
      .catch((err) => {
        console.warn('No se pudieron cargar las próximas fechas:', err);
        setUpcomingEvents([]);
      });
  }, []);

  return (
    <div className="student-dashboard-container">
      {/* Encabezado */}
      <div className="student-header">
        <div className="student-header-left">
          <h1 className="student-welcome-title">Hola, {studentFirstName}</h1>
          <span className="student-group-subtitle">
            {groupInfo
              ? `Grupo ${groupInfo.id}${groupInfo.repoUrl ? ` · ${groupInfo.repoUrl.replace('https://github.com/', '')}` : ''}`
              : 'Grupo no disponible desde APIM'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/student/group')}
          className="btn-view-my-group"
        >
          <Icons.User />
          <span>Ver mi grupo</span>
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

      {/* Contenido */}
      {!isLoading && !apiError && groupInfo && (
        <>
          <div className="student-metrics-grid">
            <div className="student-metric-card">
              <span className="student-metric-label">Nota estimada</span>
              <span className="student-metric-val">
                {groupInfo.score ?? '—'}<span className="metric-denom"> / 100</span>
              </span>
              <span className="student-metric-caption">Según la rúbrica</span>
            </div>
            <div className="student-metric-card">
              <span className="student-metric-label">Mi aporte</span>
              <span className="student-metric-val">
                {groupInfo.myContribution === null ? '—' : `${groupInfo.myContribution}%`}
              </span>
              <span className="student-metric-caption">De la contribución total</span>
            </div>
            <div className="student-metric-card">
              <span className="student-metric-label">PRs revisados</span>
              <span className="student-metric-val">{groupInfo.reviewedPRs ?? '—'}</span>
              <span className={`student-metric-caption ${groupInfo.unreviewedPRs > 0 ? 'text-warning' : ''}`}>
                {groupInfo.unreviewedPRs === null
                  ? 'Estado no disponible desde APIM'
                  : groupInfo.unreviewedPRs > 0
                  ? `${groupInfo.unreviewedPRs} sin revisión`
                  : 'Sin PRs pendientes'}
              </span>
            </div>
          </div>

          <div className="student-main-grid">
            <div className="student-progress-card">
              <h2 className="card-title-simple">Avance del grupo</h2>
              <div className="overall-progress-bar-wrap">
                <div className="overall-track">
                  <div
                    className="overall-fill"
                    style={{ width: `${Math.min(100, Math.max(0, groupInfo.avance ?? 0))}%` }}
                  />
                </div>
                <span className="overall-caption">
                  {groupInfo.avance === null
                    ? 'Avance no disponible desde APIM.'
                    : `${groupInfo.avance}% completado según la rúbrica del curso`}
                </span>
              </div>

              {criteria.length > 0 ? (
                <div className="student-criteria-bars">
                  {criteria.map((item, index) => (
                    <div key={index} className="student-crit-row">
                      <div className="student-crit-header">
                        <span className="crit-name">{item.name}</span>
                        <span className="crit-percent">{item.percent}%</span>
                      </div>
                      <div className="crit-track">
                        <div className="crit-fill" style={{ width: `${item.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="overall-caption">Criterios no disponibles desde APIM.</span>
              )}
            </div>

            <div className="student-team-card">
              <h2 className="card-title-simple">Mi equipo</h2>
              {membersUnavailable ? (
                <span className="student-metric-caption">
                  Integrantes no disponibles desde APIM.
                </span>
              ) : teamMembers.length === 0 ? (
                <span className="student-metric-caption">Sin integrantes registrados.</span>
              ) : (
                <div className="team-members-list">
                  {teamMembers.map((member, index) => (
                    <div key={index} className="team-member-row">
                      <div className={`member-avatar ${member.email === user?.email ? 'is-me' : ''}`}>
                        {member.initials || member.name?.charAt(0)}
                      </div>
                      <div className="member-info">
                        <span className="member-name">
                          {member.name}{member.email === user?.email ? ' (tú)' : ''}
                        </span>
                        <span className="member-contribution">{member.contribution} del aporte</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="student-dates-card">
            <h2 className="card-title-simple">Próximas fechas</h2>
            <div className="student-dates-list">
              {upcomingEvents.length > 0 ? upcomingEvents.slice(0, 3).map((event) => {
                const date = event.date ? new Date(`${event.date.slice(0, 10)}T00:00:00`) : null;
                return (
                  <div key={event.id || `${event.date}-${event.title}`} className="student-date-item">
                    <div className="student-date-badge">
                      <span className="badge-month">
                        {date && !Number.isNaN(date.getTime())
                          ? date.toLocaleDateString('es-CR', { month: 'short' }).replace('.', '').toUpperCase()
                          : '—'}
                      </span>
                      <span className="badge-day">
                        {date && !Number.isNaN(date.getTime()) ? String(date.getDate()).padStart(2, '0') : '—'}
                      </span>
                    </div>
                    <div className="student-date-details">
                      <span className="date-title">{event.title}</span>
                      {(event.subtitle || event.audience) && (
                        <span className="date-sub">{event.subtitle || event.audience}</span>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <span className="date-sub">No hay fechas disponibles desde APIM.</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
