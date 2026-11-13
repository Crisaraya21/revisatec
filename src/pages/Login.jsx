import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/apiClient';
import { useTheme } from '../context/ThemeContext';
import { Icons } from '../components/Icons';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { loginWithGoogleProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [googleError, setGoogleError] = useState(null);

  // El rol (profesor o estudiante) lo decide MS1 con GET /me, no la pantalla.
  const signIn = async (profile, options) => {
    setIsSigningIn(true);
    try {
      const session = await loginWithGoogleProfile(profile, options);
      navigate(session.role === 'professor' ? '/groups' : '/student');
    } catch (err) {
      if (err?.code === 'ROLE_NOT_ALLOWED') {
        setGoogleError('Los profesores deben ingresar con el botón de Google.');
      } else if (err instanceof ApiError && err.status === 404) {
        setGoogleError(`El correo ${profile.email} no está registrado en RevisaTEC. Pide al profesor que te agregue.`);
      } else {
        console.error('Error al iniciar sesión:', err);
        setGoogleError('No se pudo iniciar sesión. Intenta de nuevo.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  // Acceso de estudiantes con su correo estudiantil (las cuentas del TEC son de
  // Microsoft y no sirven con Google). Solo @estudiantec.cr y solo rol estudiante:
  // un profesor nunca entra por aquí.
  const handleStudentEmailLogin = (e) => {
    e.preventDefault();
    setGoogleError(null);
    const value = email.trim().toLowerCase();
    if (!value.endsWith('@estudiantec.cr')) {
      setGoogleError('Usa tu correo estudiantil (@estudiantec.cr) o entra con Google.');
      return;
    }
    signIn({ email: value }, { allowedRoles: ['student'] });
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      // Login real con Google: se lee el perfil (nombre y correo) con el token de acceso.
      setGoogleError(null);
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        if (!res.ok) throw new Error(`Google respondió HTTP ${res.status}`);
        const profile = await res.json();
        // El acceso lo controla MS1: solo entran correos registrados como profesor o integrante.
        await signIn({ name: profile.name, email: profile.email, picture: profile.picture });
      } catch (err) {
        console.error('No se pudo leer el perfil de Google:', err);
        setGoogleError('No se pudo obtener tu perfil de Google. Intenta de nuevo.');
      }
    },
    onError: () => setGoogleError('Falló el inicio de sesión con Google.'),
  });

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
              Estudiantes: correo estudiantil o Gmail. Profesores: cuenta de Google.
            </p>
          </div>

          {/* Estudiantes con correo estudiantil (@estudiantec.cr) */}
          <form onSubmit={handleStudentEmailLogin} className="login-form">
            <div className="login-field-group">
              <label htmlFor="student-email" className="login-label">
                Accede con tu correo institucional
              </label>
              <div className="login-input-box">
                <span className="login-input-icon">
                  <Icons.Mail width={17} height={17} />
                </span>
                <input
                  id="student-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@estudiantec.cr"
                  className="login-input"
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn-login-primary" disabled={isSigningIn}>
              <span>Iniciar sesión</span>
              <span className="btn-arrow">→</span>
            </button>
          </form>

          <div className="login-divider">
            <span className="login-divider-line"></span>
            <span className="login-divider-text">o</span>
            <span className="login-divider-line"></span>
          </div>

          {/* Google: estudiantes con Gmail y profesores */}
          <button
            type="button"
            onClick={() => handleGoogleLogin()}
            className="btn-login-google"
            disabled={isSigningIn}
          >
            <Icons.Google />
            <span>{isSigningIn ? 'Verificando tu cuenta...' : 'Continuar con Google'}</span>
          </button>

          {googleError && (
            <p role="alert" style={{ margin: 0, fontSize: '0.813rem', color: 'var(--badge-alert-text)' }}>
              {googleError}
            </p>
          )}

          <div className="login-security-notice">
            <span className="login-security-shield">
              <Icons.ShieldCheck width={20} height={20} />
            </span>
            <span>
              Solo pueden entrar las cuentas que el profesor registró en RevisaTEC.
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