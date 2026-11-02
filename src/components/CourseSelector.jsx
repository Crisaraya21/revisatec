import { useEffect, useRef, useState } from 'react';
import { useCourse } from '../context/CourseContext';
import { Icons } from './Icons';

export default function CourseSelector() {
  const {
    courses,
    selectedCourse,
    selectedCourseId,
    setSelectedCourseId,
    loading,
    error,
  } = useCourse();
  const [isOpen, setIsOpen] = useState(false);
  const selectorRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);

  const unavailableMessage = error
    ? 'No se pudieron cargar los cursos'
    : 'No hay cursos disponibles';
  const selectedIndex = courses.findIndex(
    (course) => String(course.id) === String(selectedCourseId)
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!selectorRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedIndex >= 0) optionRefs.current[selectedIndex]?.focus();
  }, [isOpen, selectedIndex]);

  const focusOption = (index) => {
    const nextIndex = (index + courses.length) % courses.length;
    optionRefs.current[nextIndex]?.focus();
  };

  const handleTriggerKeyDown = (event) => {
    if (courses.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        focusOption(selectedIndex + (event.key === 'ArrowDown' ? 1 : -1));
      }
    }
  };

  const handleOptionKeyDown = (event, index) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption(index + (event.key === 'ArrowDown' ? 1 : -1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusOption(courses.length - 1);
    }
  };

  const handleSelectCourse = (courseId) => {
    setSelectedCourseId(courseId);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="course-selector-control" ref={selectorRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`course-selector-btn ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={handleTriggerKeyDown}
        disabled={loading || Boolean(error) || courses.length === 0}
        aria-label="Seleccionar curso"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'dashboard-course-options' : undefined}
        aria-describedby={error ? 'dashboard-courses-error' : undefined}
      >
        <span className="course-selector-label">
          {courses.length === 0
            ? loading ? 'Cargando cursos...' : unavailableMessage
            : `Curso: ${selectedCourse?.name || 'Seleccionar curso'}`}
        </span>
        <Icons.ChevronDown />
      </button>
      {isOpen && (
        <div
          id="dashboard-course-options"
          className="course-selector-menu"
          role="listbox"
          aria-label="Cursos disponibles"
        >
          {courses.map((course, index) => (
            <button
              key={course.id}
              ref={(element) => { optionRefs.current[index] = element; }}
              type="button"
              className="course-selector-option"
              role="option"
              aria-selected={String(course.id) === String(selectedCourseId)}
              onClick={() => handleSelectCourse(course.id)}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
            >
              {course.name}
            </button>
          ))}
        </div>
      )}
      {error && (
        <span id="dashboard-courses-error" className="course-selector-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
