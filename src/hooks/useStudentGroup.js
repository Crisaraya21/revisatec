import { useAuth } from '../context/AuthContext';
import { useCourse } from '../context/CourseContext';

/**
 * Grupo del estudiante en el curso seleccionado. Sale de las membresías que
 * GET /me (MS1) devolvió al iniciar sesión, así que no hace llamadas extra.
 *
 * status: 'assigned' | 'unassigned' | 'error'
 */
export function useStudentGroup() {
  const { user } = useAuth();
  const { selectedCourseId } = useCourse();

  if (!user?.email) {
    return { status: 'error', group: null, member: null, error: { status: 401, message: 'No hay una sesión activa.' } };
  }
  const membership = (user.memberships || []).find(
    (item) => String(item.course?.id) === String(selectedCourseId)
  );
  if (!membership) {
    return { status: 'unassigned', group: null, member: null, error: null };
  }
  return { status: 'assigned', group: membership.group, member: membership.member, error: null };
}
