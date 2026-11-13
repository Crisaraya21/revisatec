import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const CourseContext = createContext(null);
const STORAGE_KEY = 'revisatec_selected_course_id';

function readSavedCourseId() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error al leer el curso seleccionado de localStorage:', error);
    return null;
  }
}

/**
 * Cursos visibles para la sesión actual. Vienen de GET /me (MS1):
 * el profesor ve sus cursos asignados y el estudiante los cursos donde es integrante.
 */
export function CourseProvider({ children }) {
  const { user } = useAuth();
  const courses = useMemo(() => user?.courses || [], [user]);
  const [savedCourseId, setSelectedCourseId] = useState(readSavedCourseId);

  const selectedCourse = courses.find((course) => String(course.id) === String(savedCourseId))
    || courses[0]
    || null;

  useEffect(() => {
    if (!selectedCourse) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(selectedCourse.id));
    } catch (storageError) {
      console.error('Error al guardar el curso seleccionado en localStorage:', storageError);
    }
  }, [selectedCourse]);

  const value = useMemo(() => ({
    courses,
    selectedCourse,
    selectedCourseId: selectedCourse?.id ?? null,
    setSelectedCourseId,
    loading: false,
    error: user && courses.length === 0 ? 'No tienes cursos asignados en RevisaTEC.' : null,
  }), [courses, selectedCourse, user]);

  return (
    <CourseContext.Provider value={value}>
      {children}
    </CourseContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCourse() {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error('useCourse must be used within a CourseProvider');
  }
  return context;
}
