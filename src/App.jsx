import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { Icons } from './components/Icons';
import { ErrorBoundary } from './components/ErrorBoundary';

// Pantallas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Rubric from './pages/Rubric';
import Feedback from './pages/Feedback';
import Calendar from './pages/Calendar';
import Issues from './pages/Issues';
import StudentDashboard from './pages/StudentDashboard';
import StudentGroup from './pages/StudentGroup';
import StudentFeedback from './pages/StudentFeedback';

import './App.css';

function MainAppShell() {
  const { user, isProfessor, isStudent, logout, toggleRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Si no hay sesión activa o estamos en /login, la pantalla de inicio siempre es el Login
  if (!user || location.pathname === '/login') {
    return <Login />;
  }

  const handleLogout = () => {
    logout();
    setProfileMenuOpen(false);
    navigate('/login');
  };

  const handleSwitchRole = () => {
    toggleRole();
    setProfileMenuOpen(false);
    if (isProfessor) {
      navigate('/student');
    } else {
      navigate('/groups');
    }
  };

  return (
    <div className="app-shell">
      {/* Barra Superior Global (Topbar) */}
      <header className="global-topbar">
        <div className="topbar-left">
          {/* Botón para Desplegar / Colapsar Menú Principal en Computadora */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="icon-circle-btn sidebar-toggle-btn"
            title={sidebarCollapsed ? 'Desplegar menú lateral' : 'Colapsar menú lateral'}
            aria-label="Alternar menú lateral"
          >
            <Icons.Menu />
          </button>
          <Link to={isStudent ? '/student' : '/'} className="brand-link">
            <Icons.Logo />
            <span className="brand-title">RevisaTEC</span>
          </Link>
        </div>

        <div className="topbar-center">
          <div className="search-pill-box">
            <span className="search-pill-icon">
              <Icons.Search />
            </span>
            <input
              type="text"
              placeholder="Buscar grupo o repositorio"
              className="search-pill-input"
            />
          </div>
        </div>

        <div className="topbar-right">
          {/* Botón de Modo Oscuro / Claro con animación de giro */}
          <button
            type="button"
            onClick={toggleTheme}
            className="icon-circle-btn theme-btn-animated"
            title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            aria-label="Cambiar tema"
          >
            {theme === 'light' ? <Icons.Moon /> : <Icons.Sun />}
          </button>

          {/* Campana de Notificaciones */}
          <button
            type="button"
            className="icon-circle-btn btn-bell-notification"
            title="Notificaciones"
            aria-label="Notificaciones"
          >
            <Icons.Bell />
          </button>

          {/* Menú de Perfil (Profesor o Estudiante) */}
          <div style={{ position: 'relative' }}>
            <div
              className="profile-pill"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              style={{ cursor: 'pointer' }}
            >
              <div className="profile-avatar">{user.avatar || (isStudent ? 'SP' : 'PR')}</div>
              <span className="profile-name">{user.name || (isStudent ? 'Sofía P.' : 'Profesor')}</span>
              <Icons.ChevronDown />
            </div>

            {profileMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '120%',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 10,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  minWidth: 200,
                  padding: 8,
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  animation: 'fadeInView 0.2s ease',
                }}
              >
                <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border-default)', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Conectado como</span>
                  <strong style={{ fontSize: '0.844rem', color: 'var(--text-primary)' }}>
                    {isStudent ? 'Estudiante (Sofía P.)' : 'Profesor'}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={handleSwitchRole}
                  style={{
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    padding: '8px 12px',
                    borderRadius: 6,
                    fontSize: '0.813rem',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  className="dropdown-menu-item"
                >
                  <Icons.User />
                  <span>{isStudent ? 'Cambiar a Profesor' : 'Cambiar a Estudiante'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    padding: '8px 12px',
                    borderRadius: 6,
                    fontSize: '0.813rem',
                    color: '#ef4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  className="dropdown-menu-item"
                >
                  <span>Cerrar sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Cuerpo Principal */}
      <div className="main-body">
        {/* Barra Lateral (Sidebar) */}
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div>
            <div className="sidebar-category">Menú</div>
            <nav className="sidebar-nav">
              {/* SIDEBAR PARA PROFESOR */}
              {isProfessor && (
                <>
                  <NavLink
                    to="/"
                    end
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    title="Inicio"
                  >
                    <div className="sidebar-link-content">
                      <Icons.Inicio />
                      <span>Inicio</span>
                    </div>
                  </NavLink>

                  <NavLink
                    to="/groups"
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    title="Grupos"
                  >
                    <div className="sidebar-link-content">
                      <Icons.Grupos />
                      <span>Grupos</span>
                    </div>
                  </NavLink>

                  <NavLink
                    to="/rubric"
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    title="Rúbrica"
                  >
                    <div className="sidebar-link-content">
                      <Icons.Rubrica />
                      <span>Rúbrica</span>
                    </div>
                  </NavLink>

                  <NavLink
                    to="/feedback"
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    title="Feedback"
                  >
                    <div className="sidebar-link-content">
                      <Icons.Feedback />
                      <span>Feedback</span>
                    </div>
                  </NavLink>

                  <NavLink
                    to="/calendar"
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    title="Calendario"
                  >
                    <div className="sidebar-link-content">
                      <Icons.Calendario />
                      <span>Calendario</span>
                    </div>
                  </NavLink>

                  <NavLink
                    to="/issues"
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    title="Inconvenientes"
                  >
                    <div className="sidebar-link-content">
                      <Icons.Inconvenientes />
                      <span>Inconvenientes</span>
                    </div>
                    <span className="sidebar-badge">4</span>
                  </NavLink>
                </>
              )}

              {/* SIDEBAR PARA ESTUDIANTE */}
              {isStudent && (
                <>
                  <NavLink
                    to="/student"
                    end
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    title="Inicio"
                  >
                    <div className="sidebar-link-content">
                      <Icons.Inicio />
                      <span>Inicio</span>
                    </div>
                  </NavLink>

                  <NavLink
                    to="/student/group"
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    title="Mi grupo"
                  >
                    <div className="sidebar-link-content">
                      <Icons.Grupos />
                      <span>Mi grupo</span>
                    </div>
                  </NavLink>

                  <NavLink
                    to="/student/feedback"
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    title="Retroalimentación"
                  >
                    <div className="sidebar-link-content">
                      <Icons.Feedback />
                      <span>Retroalimentación</span>
                    </div>
                  </NavLink>

                  <NavLink
                    to="/student/calendar"
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    title="Calendario"
                  >
                    <div className="sidebar-link-content">
                      <Icons.Calendario />
                      <span>Calendario</span>
                    </div>
                  </NavLink>
                </>
              )}
            </nav>
          </div>

          {/* Pie del Sidebar */}
          <div className="sidebar-footer-container">
            {isProfessor ? (
              <>
                <div className="sidebar-help-card">
                  <div className="sidebar-help-title">¿Dudas con la rúbrica?</div>
                  <div className="sidebar-help-text">
                    Consulta la guía de criterios e indicaciones para la IA.
                  </div>
                </div>
                <div className="sidebar-version">Versión {__APP_VERSION__}</div>
              </>
            ) : (
              <>
                <div className="sidebar-help-card" style={{ backgroundColor: 'rgba(57, 111, 162, 0.15)' }}>
                  <div className="sidebar-help-title" style={{ color: 'var(--action-primary)' }}>
                    Grupo 2
                  </div>
                  <div className="sidebar-help-text" style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>
                    revisatec/g2-web
                  </div>
                </div>
                <div className="sidebar-version">Versión {__APP_VERSION__}</div>
              </>
            )}
          </div>
        </aside>

        {/* Área de Contenido con animación de entrada */}
        <main className="page-wrapper">
          <ErrorBoundary>
            <Routes>
              {/* Rutas de Profesor */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/groups/:id" element={<GroupDetail />} />
              <Route path="/rubric" element={<Rubric />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/issues" element={<Issues />} />

              {/* Rutas de Estudiante */}
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/group" element={<StudentGroup />} />
              <Route path="/student/feedback" element={<StudentFeedback />} />
              <Route path="/student/calendar" element={<Calendar />} />

              {/* Redirección por defecto */}
              <Route
                path="*"
                element={<Navigate to={isStudent ? '/student' : '/groups'} replace />}
              />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>

      {/* Barra de Navegación Inferior Móvil */}
      <nav className="mobile-bottom-nav">
        {isProfessor ? (
          <>
            <NavLink
              to="/"
              end
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icons.Inicio />
              <span>Inicio</span>
            </NavLink>
            <NavLink
              to="/groups"
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icons.Grupos />
              <span>Grupos</span>
            </NavLink>
            <NavLink
              to="/rubric"
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icons.Rubrica />
              <span>Rúbrica</span>
            </NavLink>
            <NavLink
              to="/calendar"
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icons.Calendario />
              <span>Calendario</span>
            </NavLink>
            <NavLink
              to="/issues"
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icons.Inconvenientes />
              <span>Alertas</span>
            </NavLink>
          </>
        ) : (
          <>
            <NavLink
              to="/student"
              end
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icons.Inicio />
              <span>Inicio</span>
            </NavLink>
            <NavLink
              to="/student/group"
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icons.Grupos />
              <span>Mi grupo</span>
            </NavLink>
            <NavLink
              to="/student/feedback"
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icons.Feedback />
              <span>Feedback</span>
            </NavLink>
            <NavLink
              to="/student/calendar"
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icons.Calendario />
              <span>Calendario</span>
            </NavLink>
          </>
        )}
      </nav>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MainAppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
