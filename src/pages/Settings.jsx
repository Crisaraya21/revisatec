import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../notifications/useNotifications';
import { Icons } from '../components/Icons';
import './Settings.css';

const NOTIF_SOUND_KEY = 'revisatec_notif_sound';
const NOTIF_TOAST_KEY = 'revisatec_notif_toast';
const NOTIF_FEEDBACK_KEY = 'revisatec_pref_feedback';
const NOTIF_ISSUES_KEY = 'revisatec_pref_issues';
const REDUCED_MOTION_KEY = 'revisatec_reduced_motion';
const COMPACT_DENSITY_KEY = 'revisatec_compact_density';

export default function Settings() {
  const { user, isProfessor, isStudent, logout } = useAuth();
  const { theme, setTheme, toggleTheme } = useTheme();
  const { connectionStatus } = useNotifications();

  // Estados de configuración de notificaciones
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem(NOTIF_SOUND_KEY) !== 'false';
  });
  const [toastEnabled, setToastEnabled] = useState(() => {
    return localStorage.getItem(NOTIF_TOAST_KEY) !== 'false';
  });
  const [feedbackNotifs, setFeedbackNotifs] = useState(() => {
    return localStorage.getItem(NOTIF_FEEDBACK_KEY) !== 'false';
  });
  const [issueNotifs, setIssueNotifs] = useState(() => {
    return localStorage.getItem(NOTIF_ISSUES_KEY) !== 'false';
  });

  // Estados de accesibilidad y visualización
  const [reducedMotion, setReducedMotion] = useState(() => {
    return localStorage.getItem(REDUCED_MOTION_KEY) === 'true';
  });
  const [compactDensity, setCompactDensity] = useState(() => {
    return localStorage.getItem(COMPACT_DENSITY_KEY) === 'true';
  });

  const [savedBanner, setSavedBanner] = useState(false);

  // Persistir y aplicar preferencias
  useEffect(() => {
    localStorage.setItem(NOTIF_SOUND_KEY, String(soundEnabled));
    localStorage.setItem(NOTIF_TOAST_KEY, String(toastEnabled));
    localStorage.setItem(NOTIF_FEEDBACK_KEY, String(feedbackNotifs));
    localStorage.setItem(NOTIF_ISSUES_KEY, String(issueNotifs));
  }, [soundEnabled, toastEnabled, feedbackNotifs, issueNotifs]);

  useEffect(() => {
    localStorage.setItem(REDUCED_MOTION_KEY, String(reducedMotion));
    if (reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [reducedMotion]);

  useEffect(() => {
    localStorage.setItem(COMPACT_DENSITY_KEY, String(compactDensity));
    if (compactDensity) {
      document.documentElement.classList.add('compact-density');
    } else {
      document.documentElement.classList.remove('compact-density');
    }
  }, [compactDensity]);

  const showSaveNotice = () => {
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2400);
  };

  const playTestSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      console.warn('AudioContext no disponible para prueba de sonido:', e);
    }
  };

  return (
    <div className="settings-container">
      {/* Encabezado */}
      <header className="settings-header">
        <div className="settings-header-info">
          <div className="settings-header-icon" aria-hidden="true">
            <Icons.Settings width={24} height={24} />
          </div>
          <div>
            <h1 className="settings-title">Configuración del Sistema</h1>
            <p className="settings-subtitle">
              Personaliza tu experiencia, preferencias de visualización, tema y notificaciones.
            </p>
          </div>
        </div>

        {savedBanner && (
          <div className="settings-saved-badge" role="status" aria-live="polite">
            <Icons.CheckCircle />
            <span>Preferencias guardadas</span>
          </div>
        )}
      </header>

      <div className="settings-grid">
        {/* Sección 1: Tema y Apariencia */}
        <section className="settings-card">
          <div className="settings-card-header">
            <div className="settings-section-icon theme">
              {theme === 'dark' ? <Icons.Moon /> : <Icons.Sun />}
            </div>
            <div>
              <h2 className="settings-card-title">Apariencia y Modo Visual</h2>
              <p className="settings-card-desc">
                Elige el tema que mejor se adapte a tu iluminación ambiental y preferencias.
              </p>
            </div>
          </div>

          <div className="theme-selector-grid">
            {/* Opción Tema Claro */}
            <button
              type="button"
              className={`theme-card-option ${theme === 'light' ? 'selected' : ''}`}
              onClick={() => {
                setTheme('light');
                showSaveNotice();
              }}
              aria-label="Seleccionar modo claro"
            >
              <div className="theme-preview light-preview">
                <div className="preview-topbar" />
                <div className="preview-sidebar" />
                <div className="preview-body">
                  <div className="preview-line" />
                  <div className="preview-card" />
                </div>
              </div>
              <div className="theme-card-footer">
                <Icons.Sun />
                <span className="theme-label">Modo Claro</span>
                {theme === 'light' && <span className="theme-selected-pill">Activo</span>}
              </div>
            </button>

            {/* Opción Tema Oscuro */}
            <button
              type="button"
              className={`theme-card-option ${theme === 'dark' ? 'selected' : ''}`}
              onClick={() => {
                setTheme('dark');
                showSaveNotice();
              }}
              aria-label="Seleccionar modo oscuro"
            >
              <div className="theme-preview dark-preview">
                <div className="preview-topbar" />
                <div className="preview-sidebar" />
                <div className="preview-body">
                  <div className="preview-line" />
                  <div className="preview-card" />
                </div>
              </div>
              <div className="theme-card-footer">
                <Icons.Moon />
                <span className="theme-label">Modo Oscuro</span>
                {theme === 'dark' && <span className="theme-selected-pill">Activo</span>}
              </div>
            </button>
          </div>

          <div className="settings-toggle-row">
            <div className="toggle-text">
              <span className="toggle-label">Alternar tema rápidamente</span>
              <span className="toggle-help">
                También puedes usar el icono de sol/luna en la barra superior.
              </span>
            </div>
            <button
              type="button"
              className="settings-action-btn"
              onClick={() => {
                toggleTheme();
                showSaveNotice();
              }}
            >
              Cambiar a {theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
            </button>
          </div>
        </section>

        {/* Sección 2: Preferencias de Notificaciones */}
        <section className="settings-card">
          <div className="settings-card-header">
            <div className="settings-section-icon bell">
              <Icons.Bell />
            </div>
            <div>
              <h2 className="settings-card-title">Notificaciones y Alertas</h2>
              <p className="settings-card-desc">
                Configura cómo y cuándo deseas recibir alertas sobre tus entregas y proyectos.
              </p>
            </div>
          </div>

          <div className="settings-toggles-list">
            <div className="settings-toggle-row">
              <div className="toggle-text">
                <span className="toggle-label">Sonido de notificación</span>
                <span className="toggle-help">
                  Reproduce un sonido sutil cuando llega una nueva notificación en vivo.
                </span>
              </div>
              <div className="toggle-controls">
                <button
                  type="button"
                  className="settings-icon-preview-btn"
                  onClick={playTestSound}
                  title="Probar sonido"
                  aria-label="Probar sonido de notificación"
                >
                  <Icons.Activity />
                  <span>Probar</span>
                </button>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => {
                      setSoundEnabled(e.target.checked);
                      showSaveNotice();
                    }}
                  />
                  <span className="slider round" />
                </label>
              </div>
            </div>

            <div className="settings-toggle-row">
              <div className="toggle-text">
                <span className="toggle-label">Avisos emergentes en pantalla (toasts)</span>
                <span className="toggle-help">
                  Muestra un banner flotante en la esquina superior cuando ingresa una alerta en vivo.
                </span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={toastEnabled}
                  onChange={(e) => {
                    setToastEnabled(e.target.checked);
                    showSaveNotice();
                  }}
                />
                <span className="slider round" />
              </label>
            </div>

            <div className="settings-toggle-row">
              <div className="toggle-text">
                <span className="toggle-label">Alertas de retroalimentación de entregas</span>
                <span className="toggle-help">
                  Notificar cuando el profesor publique evaluaciones o rúbricas completadas.
                </span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={feedbackNotifs}
                  onChange={(e) => {
                    setFeedbackNotifs(e.target.checked);
                    showSaveNotice();
                  }}
                />
                <span className="slider round" />
              </label>
            </div>

            <div className="settings-toggle-row">
              <div className="toggle-text">
                <span className="toggle-label">Alertas de inconvenientes e issues de GitHub</span>
                <span className="toggle-help">
                  Avisos sobre commits directos en main, ramas desactualizadas o PRs sin revisores.
                </span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={issueNotifs}
                  onChange={(e) => {
                    setIssueNotifs(e.target.checked);
                    showSaveNotice();
                  }}
                />
                <span className="slider round" />
              </label>
            </div>
          </div>
        </section>

        {/* Sección 3: Accesibilidad y Visualización */}
        <section className="settings-card">
          <div className="settings-card-header">
            <div className="settings-section-icon accessibility">
              <Icons.ShieldCheck />
            </div>
            <div>
              <h2 className="settings-card-title">Accesibilidad y Rendimiento</h2>
              <p className="settings-card-desc">
                Adapta las transiciones y densidad del espacio de trabajo.
              </p>
            </div>
          </div>

          <div className="settings-toggles-list">
            <div className="settings-toggle-row">
              <div className="toggle-text">
                <span className="toggle-label">Reducción de movimiento y animaciones</span>
                <span className="toggle-help">
                  Disminuye o elimina efectos de desplazamiento y transición de vistas.
                </span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => {
                    setReducedMotion(e.target.checked);
                    showSaveNotice();
                  }}
                />
                <span className="slider round" />
              </label>
            </div>

            <div className="settings-toggle-row">
              <div className="toggle-text">
                <span className="toggle-label">Modo de densidad compacta</span>
                <span className="toggle-help">
                  Reduce márgenes y espacios entre elementos para visualizar más información en pantalla.
                </span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={compactDensity}
                  onChange={(e) => {
                    setCompactDensity(e.target.checked);
                    showSaveNotice();
                  }}
                />
                <span className="slider round" />
              </label>
            </div>
          </div>
        </section>

        {/* Sección 4: Cuenta e Identidad Institucional */}
        <section className="settings-card">
          <div className="settings-card-header">
            <div className="settings-section-icon profile">
              <Icons.User />
            </div>
            <div>
              <h2 className="settings-card-title">Perfil y Sesión Institucional</h2>
              <p className="settings-card-desc">
                Información de tu identidad autenticada y cursos asignados.
              </p>
            </div>
          </div>

          <div className="profile-details-grid">
            <div className="profile-data-item">
              <span className="profile-data-label">Nombre Completo</span>
              <span className="profile-data-value">{user?.name || 'Usuario RevisaTEC'}</span>
            </div>

            <div className="profile-data-item">
              <span className="profile-data-label">Correo Institucional</span>
              <span className="profile-data-value">{user?.email || 'N/A'}</span>
            </div>

            <div className="profile-data-item">
              <span className="profile-data-label">Rol en Plataforma</span>
              <span className="profile-role-badge">
                {isProfessor ? 'Profesor' : isStudent ? 'Estudiante' : 'Usuario'}
              </span>
            </div>

            <div className="profile-data-item">
              <span className="profile-data-label">Estado de Conexión en Vivo</span>
              <span className={`conn-status-pill ${connectionStatus}`}>
                <span className="dot" />
                {connectionStatus === 'live'
                  ? 'Conectado a Azure Web PubSub'
                  : connectionStatus === 'connecting'
                  ? 'Conectando...'
                  : connectionStatus === 'reconnecting'
                  ? 'Reconectando...'
                  : 'Desconectado'}
              </span>
            </div>
          </div>

          {/* Cursos / Grupos Matriculados */}
          {isProfessor && Array.isArray(user?.courses) && user.courses.length > 0 && (
            <div className="enrolled-courses-box">
              <span className="enrolled-box-title">Cursos Asignados ({user.courses.length})</span>
              <div className="enrolled-chips-wrap">
                {user.courses.map((c) => (
                  <span key={c.id} className="enrolled-course-chip">
                    {c.name || `Curso #${c.id}`} (ID: {c.id})
                  </span>
                ))}
              </div>
            </div>
          )}

          {isStudent && Array.isArray(user?.memberships) && user.memberships.length > 0 && (
            <div className="enrolled-courses-box">
              <span className="enrolled-box-title">Grupos y Membresías Asignadas</span>
              <div className="enrolled-chips-wrap">
                {user.memberships.map((m, idx) => (
                  <span key={idx} className="enrolled-course-chip student">
                    Grupo #{m.group?.id || m.groupId} — Curso: {m.course?.name || `#${m.course?.id || m.courseId}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="settings-footer-actions">
            <button
              type="button"
              className="btn-danger-outline"
              onClick={logout}
            >
              Cerrar Sesión
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
