import { useCourse } from '../context/CourseContext';
import { Icons } from './Icons';

export default function CourseSelector() {
  const {
    courses,
    selectedCourseId,
    setSelectedCourseId,
    loading,
    error,
  } = useCourse();

  const unavailableMessage = error
    ? 'No se pudieron cargar los cursos'
    : 'No hay cursos disponibles';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="course-selector-btn">
        <span>Curso:</span>
        <select
          aria-label="Seleccionar curso"
          value={selectedCourseId ?? ''}
          onChange={(event) => setSelectedCourseId(event.target.value)}
          disabled={loading || Boolean(error) || courses.length === 0}
          style={{
            appearance: 'none',
            border: 0,
            background: 'transparent',
            color: 'inherit',
            font: 'inherit',
            cursor: 'inherit',
            outline: 'none',
          }}
        >
          {loading ? (
            <option value="">Cargando cursos...</option>
          ) : courses.length > 0 ? (
            courses.map((course) => (
              <option key={course.id} value={course.id}>{course.name}</option>
            ))
          ) : (
            <option value="">{unavailableMessage}</option>
          )}
        </select>
        <Icons.ChevronDown />
      </label>
      {error && <span role="alert">{unavailableMessage}</span>}
    </div>
  );
}
