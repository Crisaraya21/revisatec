import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Icons } from '../components/Icons';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const { loginAsProfessor, loginAsStudent } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleNormalLogin = (e) => {
    e.preventDefault();
    // Botón normal: Ingresa como Profesor
    loginAsProfessor(email.trim() || 'profesor@itcr.ac.cr');
    navigate('/groups');
  };

  const handleGoogleLogin = () => {
    // Botón Google: Ingresa como Estudiante
    loginAsStudent('sofia@estudiantec.cr');
    navigate('/student');
  };

  return (
    <div className="login-page-container">
      {/* Topbar del Login */}
      <header className="login-topbar">
        <div className="login-brand">
          <Icons.Logo />
          <span className="login-brand-name">RevisaTEC</span>
        </div>

        <div className="login-topbar-actions">
          <button
            type="button"
            onClick={toggleTheme}
            className="icon-circle-btn theme-btn-animated"
            title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          >
            {theme === 'light' ? <Icons.Moon /> : <Icons.Sun />}
          </button>
          <button type="button" className="login-help-btn">
            Ayuda
          </button>
        </div>
      </header>

      {/* Contenedor Central con Tarjeta */}
      <div className="login-card-wrapper">
        <div className="login-card">
          <div className="login-header-group">
            <h1 className="login-title">
              Inicia sesión en tu <span className="login-title-accent">cuenta</span>
            </h1>
            <p className="login-subtitle">
              Profesores y estudiantes ingresan con su correo institucional.
            </p>
          </div>

          <form onSubmit={handleNormalLogin} className="login-form">
            <div className="login-field-group">
              <label htmlFor="inst-email" className="login-label">
                Correo institucional
              </label>
              <div className="login-input-box">
                <span className="login-input-icon">✉</span>
                <input
                  id="inst-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@estudiantec.cr"
                  className="login-input"
                />
              </div>
            </div>

            {/* Botón Normal: Entra como Profesor */}
            <button type="submit" className="btn-login-primary">
              <span>Iniciar sesión</span>
              <span className="btn-arrow">→</span>
            </button>
          </form>

          <a href="#" onClick={(e) => e.preventDefault()} className="login-forgot-link">
            ¿Problemas para ingresar?
          </a>

          <div className="login-divider">
            <span className="login-divider-line"></span>
            <span className="login-divider-text">o</span>
            <span className="login-divider-line"></span>
          </div>

          {/* Botón Google: Entra como Estudiante */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="btn-login-google"
          >
            <Icons.Google />
            <span>Continuar con Google</span>
          </button>

          <div className="login-security-notice">
            <span className="login-security-shield">
              <Icons.ShieldCheck width={20} height={20} />
            </span>
            <span>
              Solo se permiten cuentas institucionales terminadas en <strong>@estudiantec.cr</strong> o <strong>@itcr</strong>.
            </span>
          </div>
        </div>
      </div>

      <footer className="login-footer">
        <span>Versión {__APP_VERSION__}</span>
      </footer>
    </div>
  );
}
