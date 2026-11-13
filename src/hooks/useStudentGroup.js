import { useEffect, useState } from 'react';
import { membersApi } from '../api';
import { ApiError } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { useCourse } from '../context/CourseContext';

/**
 * Resuelve el grupo del estudiante con sesión iniciada en el curso seleccionado,
 * usando GET /members/me?email=&courseId= de MS1.
 *
 * status: 'loading' | 'assigned' | 'unassigned' | 'error'
 */
export function useStudentGroup(reloadKey = 0) {
  const { user } = useAuth();
  const { selectedCourseId } = useCourse();
  const email = user?.email || null;
  const requestKey = `${email}|${selectedCourseId}|${reloadKey}`;
  const [state, setState] = useState({ key: null, status: 'loading', group: null, member: null, error: null });

  useEffect(() => {
    if (!email || selectedCourseId === null || selectedCourseId === undefined) return undefined;
    let active = true;
    membersApi.findMine(email, selectedCourseId)
      .then((res) => {
        if (!active) return;
        setState({ key: requestKey, status: 'assigned', group: res?.group || null, member: res?.member || null, error: null });
      })
      .catch((err) => {
        if (!active) return;
        const unassigned = err instanceof ApiError && err.status === 404;
        setState({
          key: requestKey,
          status: unassigned ? 'unassigned' : 'error',
          group: null,
          member: null,
          error: unassigned ? null : { status: err instanceof ApiError ? err.status : 500, message: err.message },
        });
      });
    return () => { active = false; };
  }, [email, selectedCourseId, requestKey]);

  if (!email) {
    return { status: 'error', group: null, member: null, error: { status: 401, message: 'No hay un correo asociado a la sesión.' } };
  }
  if (selectedCourseId === null || selectedCourseId === undefined || state.key !== requestKey) {
    return { status: 'loading', group: null, member: null, error: null };
  }
  return state;
}
