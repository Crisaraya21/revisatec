import { BrowserRouter, Routes, Route, Navigate, NavLink, Link } from 'react-router-dom';
import { useTheme } from './context/ThemeContext';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Rubric from './pages/Rubric';
import Calendar from './pages/Calendar';
import Issues from './pages/Issues';
import './App.css';

// Iconos SVG limpios y consistentes
const Icons = {
  Dashboard: () => (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
  ),
  Rubric: () => (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  ),
  Calendar: () => (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  ),
  Issues: () => (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  ),
  Search: () => (
    <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  ),
  Sun: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
  ),
  Moon: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
  )
};

function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Barra Lateral (Desktop y Tablet) */}
        <aside className="sidebar">
          <div>
            <div className="sidebar-header">
              <Link to="/groups" className="brand-badge">
                <div className="brand-icon">R</div>
                <span className="brand-text">RevisaTEC</span>
              </Link>
            </div>

            <nav className="sidebar-nav">
              <NavLink 
                to="/groups" 
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Icons.Dashboard />
                <span>Dashboard</span>
              </NavLink>

              <NavLink 
                to="/rubric" 
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Icons.Rubric />
                <span>Rúbrica</span>
              </NavLink>

              <NavLink 
                to="/calendar" 
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Icons.Calendar />
                <span>Calendario</span>
              </NavLink>

              <NavLink 
                to="/issues" 
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Icons.Issues />
                <span>Inconvenientes</span>
              </NavLink>
            </nav>
          </div>

          <div className="sidebar-footer">
            <div className="course-badge">
              <span className="course-label">Curso activo</span>
              <span className="course-name">Diseño de Software</span>
            </div>

            <button 
              type="button" 
              onClick={toggleTheme} 
              className="theme-toggle-btn"
              aria-label="Cambiar tema"
            >
              <span>{theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}</span>
              {theme === 'light' ? <Icons.Moon /> : <Icons.Sun />}
            </button>
          </div>
        </aside>

        {/* Envoltorio Principal */}
        <div className="main-wrapper">
          {/* Barra Superior */}
          <header className="topbar">
            <div className="topbar-search">
              <Icons.Search />
              <input 
                type="text" 
                placeholder="Buscar grupo o repositorio..." 
                className="search-input"
                readOnly
              />
            </div>

            <div className="topbar-actions">
              <button 
                type="button" 
                onClick={toggleTheme} 
                className="theme-toggle-btn mobile-only" 
                style={{ padding: '6px 10px', width: 'auto', display: 'none' }}
              >
                {theme === 'light' ? <Icons.Moon /> : <Icons.Sun />}
              </button>

              <div className="user-profile">
                <div className="avatar">P</div>
                <span className="user-name">Profesor</span>
              </div>
            </div>
          </header>

          {/* Rutas y Vistas */}
          <main className="content-area">
            <Routes>
              <Route path="/" element={<Navigate to="/groups" replace />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/groups/:id" element={<GroupDetail />} />
              <Route path="/rubric" element={<Rubric />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/issues" element={<Issues />} />
              <Route path="*" element={<Navigate to="/groups" replace />} />
            </Routes>
          </main>
        </div>

        {/* Barra de Navegación Inferior (Móvil) */}
        <nav className="bottom-nav">
          <NavLink 
            to="/groups" 
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icons.Dashboard />
            <span>Grupos</span>
          </NavLink>

          <NavLink 
            to="/rubric" 
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icons.Rubric />
            <span>Rúbrica</span>
          </NavLink>

          <NavLink 
            to="/calendar" 
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icons.Calendar />
            <span>Calendario</span>
          </NavLink>

          <NavLink 
            to="/issues" 
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icons.Issues />
            <span>Alertas</span>
          </NavLink>
        </nav>
      </div>
    </BrowserRouter>
  );
}

export default App;
