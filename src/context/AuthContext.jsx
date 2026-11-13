import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { identityApi } from '../api';
import { ApiError } from '../lib/apiClient';

const AuthContext = createContext(null);
const STORAGE_KEY = 'revisatec_user';

function getInitials(name) {
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
  return initials.toUpperCase();
}

/**
 * Convierte la respuesta de GET /me (MS1) y el perfil de Google en la sesión del front.
 * El rol lo decide MS1: profesor (sus cursos) o estudiante (cursos donde es integrante).
 */
function buildSession(identity, profile = {}) {
  const name = (profile.name || identity.name || identity.email.split('@')[0]).trim();
  return {
    role: identity.role,
    name,
    email: identity.email,
    avatar: getInitials(name),
    picture: profile.picture || null,
    courses: Array.isArray(identity.courses) ? identity.courses : [],
    memberships: Array.isArray(identity.memberships) ? identity.memberships : [],
  };
}

function readSavedSession() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    // Sesiones de la versión anterior (sin cursos asignados) se descartan.
    return parsed && Array.isArray(parsed.courses) ? parsed : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSavedSession);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Error al guardar la sesión:', e);
    }
  }, [user]);

  // Al abrir la app con una sesión guardada, se vuelve a consultar el rol en MS1
  // por si el profesor cambió cursos o integrantes. Una sola llamada por carga.
  const savedEmail = user?.email;
  useEffect(() => {
    if (!savedEmail) return undefined;
    let active = true;
    identityApi.me(savedEmail)
      .then((identity) => {
        if (active) setUser((current) => (current ? buildSession(identity, current) : current));
      })
      .catch((err) => {
        if (active && err instanceof ApiError && err.status === 404) setUser(null);
      });
    return () => { active = false; };
    // Solo al montar: savedEmail viene de la sesión guardada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Inicia sesión con el perfil de Google. Lanza ApiError(404) si el correo
   * no está registrado como profesor ni como integrante de un grupo.
   */
  const loginWithGoogleProfile = useCallback(async ({ name, email, picture } = {}, { allowedRoles } = {}) => {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('No se recibió un correo para la sesión.');
    }
    const identity = await identityApi.me(normalizedEmail);
    if (allowedRoles && !allowedRoles.includes(identity.role)) {
      const error = new Error('Este acceso no está permitido para el rol del usuario.');
      error.code = 'ROLE_NOT_ALLOWED';
      throw error;
    }
    const session = buildSession(identity, { name, picture });
    setUser(session);
    return session;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loginWithGoogleProfile,
        logout,
        isProfessor: user?.role === 'professor',
        isStudent: user?.role === 'student',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
