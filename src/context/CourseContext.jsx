import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { coursesApi } from '../api';

const CourseContext = createContext(null);
const STORAGE_KEY = 'revisatec_selected_course_id';
let coursesRequest;

function getCourseList(response) {
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.items)) return response.items;
  return Array.isArray(response) ? response : [];
}

function readSavedCourseId() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error al leer el curso seleccionado de localStorage:', error);
    return null;
  }
}

export function CourseProvider({ children }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(readSavedCourseId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    if (!coursesRequest) coursesRequest = coursesApi.list();

    coursesRequest
      .then((response) => {
        if (!active) return;
        const courseList = getCourseList(response);
        setCourses(courseList);
        setSelectedCourseId((currentId) => (
          courseList.some((course) => String(course.id) === String(currentId))
            ? currentId
            : courseList[0]?.id ?? null
        ));
      })
      .catch((requestError) => {
        if (!active) return;
        console.error('Error al cargar cursos desde APIM:', requestError);
        setError('No se pudieron cargar los cursos desde APIM.');
        coursesRequest = null;
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedCourseId === null || selectedCourseId === undefined) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(selectedCourseId));
    } catch (storageError) {
      console.error('Error al guardar el curso seleccionado en localStorage:', storageError);
    }
  }, [selectedCourseId]);

  const selectedCourse = courses.find(
    (course) => String(course.id) === String(selectedCourseId)
  ) || null;
  const value = useMemo(() => ({
    courses,
    selectedCourse,
    selectedCourseId: selectedCourse?.id ?? null,
    setSelectedCourseId,
    loading,
    error,
  }), [courses, selectedCourse, loading, error]);

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
