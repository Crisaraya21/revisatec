import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

function getInitials(name) {
  const parts = name.split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
  return initials.toUpperCase();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('revisatec_user') || localStorage.getItem('revisatec_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('revisatec_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('revisatec_user');
      }
    } catch (e) {
      console.error('Error saving user to localStorage:', e);
    }
  }, [user]);

  // Login normal -> Profesor
  const loginAsProfessor = (email = 'profesor@itcr.ac.cr') => {
    setUser({
      role: 'professor',
      name: 'Profesor',
      email: email || 'profesor@itcr.ac.cr',
      avatar: 'PR',
    });
  };

  // Login con Google -> Estudiante. Nombre y correo vienen del perfil de Google;
  // el grupo se resuelve después con GET /members/me (MS1).
  const loginAsStudent = ({ name, email, picture } = {}) => {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Google no devolvió un correo para la sesión.');
    }
    const displayName = (name || '').trim() || normalizedEmail.split('@')[0];
    setUser({
      role: 'student',
      name: displayName,
      email: normalizedEmail,
      avatar: getInitials(displayName),
      picture: picture || null,
    });
  };

  const logout = () => {
    setUser(null);
  };

  // Cambio de vista para demostración: conserva la identidad real de la sesión.
  const toggleRole = () => {
    if (!user) return;
    setUser({ ...user, role: user.role === 'student' ? 'professor' : 'student' });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loginAsProfessor,
        loginAsStudent,
        logout,
        toggleRole,
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
