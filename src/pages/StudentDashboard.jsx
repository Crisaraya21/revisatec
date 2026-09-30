import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './StudentDashboard.css';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [groupInfo, setGroupInfo] = useState({
    id: 2,
    name: 'Grupo 2',
    repoUrl: 'https://github.com/revisatec/g2-web',
    score: 71,
    myContribution: 18,
    reviewedPRs: '12 / 14',
    unreviewedPRs: 2,
  });

  const [criteria, setCriteria] = useState([
    { name: 'Contribución equitativa', percent: 58 },
    { name: 'Calidad de revisiones', percent: 80 },
    { name: 'Cumplimiento de hitos', percent: 90 },
    { name: 'Calidad de commits', percent: 45 },
    { name: 'Documentación', percent: 85 },
  ]);

  const [teamMembers] = useState([
    { initials: 'AR', name: 'Ana R.', contribution: '48% del aporte' },
    { initials: 'LM', name: 'Luis M.', contribution: '34% del aporte' },
    { initials: 'SP', name: 'Sofía P. (tú)', contribution: '18% del aporte', isMe: true },
  ]);

  // Cargar datos reales de Azure APIM (/groups/2, /groups/2/analysis)
  useEffect(() => {
    async function loadStudentData() {
      try {
        const groupRes = await api.get('/groups/2');
        if (groupRes?.name) {
          setGroupInfo((prev) => ({
            ...prev,
            name: groupRes.name,
            repoUrl: groupRes.repoUrl || prev.repoUrl,
          }));
        }

        const analysisRes = await api.get('/groups/2/analysis');
        if (analysisRes?.score) {
          setGroupInfo((prev) => ({
            ...prev,
            score: analysisRes.score,
          }));
        }
      } catch (err) {
        console.warn('Usando valores iniciales de estudiante:', err);
      }
    }
    loadStudentData();
  }, []);

  return (
    <div className="student-dashboard-container">
      {/* Encabezado */}
      <div className="student-header">
        <div className="student-header-left">
          <h1 className="student-welcome-title">Hola, Sofía</h1>
          <span className="student-group-subtitle">
            {groupInfo.name} · {groupInfo.repoUrl.replace('https://github.com/', '')}
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

      {/* 3 Tarjetas de Métricas de Estudiante */}
      <div className="student-metrics-grid">
        <div className="student-metric-card">
          <span className="student-metric-label">Nota estimada</span>
          <div className="student-metric-val">
            <strong>{groupInfo.score}</strong>
            <span className="metric-denom"> / 100</span>
          </div>
          <span className="student-metric-caption">Según la rúbrica</span>
        </div>

        <div className="student-metric-card">
          <span className="student-metric-label">Mi aporte</span>
          <div className="student-metric-val">
            <strong>{groupInfo.myContribution}%</strong>
          </div>
          <span className="student-metric-caption">De la contribución total</span>
        </div>

        <div className="student-metric-card">
          <span className="student-metric-label">PRs revisados</span>
          <div className="student-metric-val">
            <strong>{groupInfo.reviewedPRs}</strong>
          </div>
          <span className="student-metric-caption text-warning">
            {groupInfo.unreviewedPRs} sin revisión
          </span>
        </div>
      </div>

      {/* Grid Central: Avance del Grupo (Izquierda) + Mi Equipo (Derecha) */}
      <div className="student-main-grid">
        {/* Avance del Grupo */}
        <div className="student-progress-card">
          <div className="card-header-simple">
            <h2 className="card-title-simple">Avance del grupo</h2>
            <div className="overall-progress-bar-wrap">
              <div className="overall-track">
                <div
                  className="overall-fill"
                  style={{ width: `${groupInfo.score}%` }}
                ></div>
              </div>
              <span className="overall-caption">
                {groupInfo.score}% completado según la rúbrica del curso
              </span>
            </div>
          </div>

          <div className="student-criteria-bars">
            {criteria.map((crit, index) => (
              <div key={index} className="student-crit-row">
                <div className="student-crit-header">
                  <span className="crit-name">{crit.name}</span>
                  <span className="crit-percent">{crit.percent}%</span>
                </div>
                <div className="crit-track">
                  <div
                    className="crit-fill"
                    style={{ width: `${crit.percent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Columna Derecha: Mi Equipo */}
        <div className="student-team-card">
          <h3 className="card-title-simple">Mi equipo</h3>
          <div className="team-members-list">
            {teamMembers.map((member, index) => (
              <div key={index} className="team-member-row">
                <div className={`member-avatar ${member.isMe ? 'is-me' : ''}`}>
                  {member.initials}
                </div>
                <div className="member-info">
                  <span className="member-name">{member.name}</span>
                  <span className="member-contribution">{member.contribution}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tarjeta: Próximas Fechas del Estudiante */}
      <div className="student-dates-card">
        <h3 className="card-title-simple">Próximas fechas</h3>
        <div className="student-dates-list">
          <div className="student-date-item">
            <div className="student-date-badge">
              <span className="badge-month">OCT</span>
              <span className="badge-day">02</span>
            </div>
            <div className="student-date-details">
              <span className="date-title">Entrega 2: Prototipo</span>
              <span className="date-sub">Tu grupo debe entregar</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
