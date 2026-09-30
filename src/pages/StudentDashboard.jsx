import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './StudentDashboard.css';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [groupInfo, setGroupInfo] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    async function loadStudentData() {
      setIsLoading(true);
      setApiError(null);
      try {
        const groupRes = await api.get('/groups/2');
        setGroupInfo({
          id: 2,
          name: groupRes.name || 'Grupo 2',
          repoUrl: groupRes.repoUrl || '',
          score: groupRes.score || 0,
          myContribution: groupRes.myContribution || 0,
          reviewedPRs: groupRes.reviewedPRs || '0 / 0',
          unreviewedPRs: groupRes.unreviewedPRs || 0,
        });

        const analysisRes = await api.get('/groups/2/analysis');
        if (analysisRes?.score !== undefined) {
          setGroupInfo((prev) => ({ ...prev, score: analysisRes.score }));
        }
        if (analysisRes?.criteria?.length > 0) {
          setCriteria(analysisRes.criteria.map((c) => ({ name: c.name, percent: c.percent || 0 })));
        } else {
          setCriteria([]);
        }

        const membersRes = await api.get('/groups/2/members');
        setTeamMembers(membersRes?.members || []);
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

  return (
    <div className="student-dashboard-container">
      {/* Encabezado */}
      <div className="student-header">
        <div className="student-header-left">
          <h1 className="student-welcome-title">
            {groupInfo ? groupInfo.name : 'Cargando...'}
          </h1>
          <span className="student-group-subtitle">
            {groupInfo?.repoUrl ? groupInfo.repoUrl.replace('https://github.com/', '') : ''}
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
          {/* Stats */}
          <div className="student-stats-row">
            <div className="student-stat-card">
              <span className="stat-value">{groupInfo.score}</span>
              <span className="stat-label">Nota actual</span>
            </div>
            <div className="student-stat-card">
              <span className="stat-value">{groupInfo.myContribution}%</span>
              <span className="stat-label">Mi aporte</span>
            </div>
            <div className="student-stat-card">
              <span className="stat-value">{groupInfo.reviewedPRs}</span>
              <span className="stat-label">PRs revisados</span>
            </div>
            <div className="student-stat-card highlight">
              <span className="stat-value">{groupInfo.unreviewedPRs}</span>
              <span className="stat-label">Sin revisar</span>
            </div>
          </div>

          <div className="student-main-grid">
            {/* Criterios */}
            {criteria.length > 0 && (
              <div className="criteria-card">
                <div className="criteria-card-header">
                  <h3 className="criteria-card-title">Cumplimiento por criterio</h3>
                </div>
                <div className="criteria-list">
                  {criteria.map((item, index) => (
                    <div key={index} className="criterion-row" style={{ animationDelay: `${index * 0.08}s` }}>
                      <div className="criterion-info-top">
                        <span className="criterion-name">{item.name}</span>
                        <span className="criterion-fraction">{item.percent}%</span>
                      </div>
                      <div className="criterion-bar-row">
                        <div className="criterion-track">
                          <div
                            className="criterion-fill info"
                            style={{ width: `${item.percent}%`, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Integrantes */}
            {teamMembers.length > 0 && (
              <div className="student-team-card">
                <h3 className="card-title-simple">Integrantes del equipo</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {teamMembers.map((m, idx) => (
                    <div
                      key={idx}
                      className="team-member-row"
                      style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                      <div className="member-avatar">{m.initials || m.name?.charAt(0)}</div>
                      <div className="member-info">
                        <span className="member-name">{m.name}</span>
                        <span className="member-contribution">{m.contribution}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
