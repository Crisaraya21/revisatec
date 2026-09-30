import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

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

  // Login con Google -> Estudiante
  const loginAsStudent = (email = 'sofia@estudiantec.cr') => {
    setUser({
      role: 'student',
      name: 'Sofía P.',
      email: email || 'sofia@estudiantec.cr',
      avatar: 'SP',
      group: 'Grupo 2',
      repo: 'revisatec/g2-web',
    });
  };

  const logout = () => {
    setUser(null);
  };

  const toggleRole = () => {
    if (user?.role === 'student') {
      loginAsProfessor();
    } else {
      loginAsStudent();
    }
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
