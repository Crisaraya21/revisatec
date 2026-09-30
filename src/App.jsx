import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom';
import { useTheme } from './context/ThemeContext';
import { Icons } from './components/Icons';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Rubric from './pages/Rubric';
import Calendar from './pages/Calendar';
import Issues from './pages/Issues';
import './App.css';

function FeedbackPlaceholder() {
  return (
    <div className="view-container animate-fade-in">
      <div className="view-header">
        <div>
          <h1 className="view-title">Feedback y Evaluaciones</h1>
          <p className="view-subtitle">Retroalimentación generada por IA y editada por el profesor</p>
        </div>
      </div>
      <div className="placeholder-card">
        <p>Próximamente: módulo de retroalimentación.</p>
      </div>
    </div>
  );
}

function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <BrowserRouter>
      <div className="app-shell">
        {/* Barra Superior Global (Topbar) */}
        <header className="global-topbar">
          <div className="topbar-left">
            <Link to="/" className="brand-link">
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
            {/* Botón de Modo Oscuro / Claro con micro-animación de giro */}
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

            {/* Perfil del Profesor */}
            <div className="profile-pill">
              <div className="profile-avatar">PR</div>
              <span className="profile-name">Profesor</span>
              <Icons.ChevronDown />
            </div>
          </div>
        </header>

        {/* Cuerpo Principal */}
        <div className="main-body">
          {/* Barra Lateral (Sidebar) */}
          <aside className="sidebar">
            <div>
              <div className="sidebar-category">Menú</div>
              <nav className="sidebar-nav">
                {/* Inicio va a '/' para que NO se active a la vez que Grupos */}
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

                {/* Grupos va a '/groups' */}
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
              </nav>
            </div>

            {/* Pie del Sidebar */}
            <div className="sidebar-footer-container">
              <div className="sidebar-help-card">
                <div className="sidebar-help-title">¿Dudas con la rúbrica?</div>
                <div className="sidebar-help-text">
                  Consulta la guía de criterios e indicaciones para la IA.
                </div>
              </div>
              <div className="sidebar-version">Versión v0.1.0</div>
            </div>
          </aside>

          {/* Área de Contenido con animación de entrada */}
          <main className="page-wrapper">
            <Routes>
              <Route path="/" element={<Groups />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/groups/:id" element={<GroupDetail />} />
              <Route path="/rubric" element={<Rubric />} />
              <Route path="/feedback" element={<FeedbackPlaceholder />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/issues" element={<Issues />} />
              <Route path="*" element={<Groups />} />
            </Routes>
          </main>
        </div>

        {/* Barra de Navegación Inferior Móvil */}
        <nav className="mobile-bottom-nav">
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
        </nav>
      </div>
    </BrowserRouter>
  );
}

export default App;
