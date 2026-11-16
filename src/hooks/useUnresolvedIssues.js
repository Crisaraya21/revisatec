import { useEffect, useState } from 'react';
import { groupAnalysisApi, groupsApi } from '../api';

/**
 * Cantidad de inconvenientes "Sin resolver" en los grupos del curso (MS1 grupos + MS2 inconvenientes).
 * Usa las mismas llamadas que la pantalla de Inconvenientes, así que la caché del cliente las reutiliza.
 */
export function useUnresolvedIssues(courseId, enabled = true) {
  const [state, setState] = useState({ courseId: null, count: 0 });

  useEffect(() => {
    if (!enabled || courseId === null || courseId === undefined) return undefined;
    let active = true;
    groupsApi.list({ page: 1, pageSize: 100, courseId })
      .then((res) => Promise.all((res?.items || []).map((g) =>
        groupAnalysisApi.getIssues(g.id).catch(() => null))))
      .then((results) => {
        if (!active) return;
        const count = results
          .flatMap((r) => r?.items || [])
          .filter((issue) => issue.status === 'Sin resolver').length;
        setState({ courseId, count });
      })
      .catch(() => {
        if (active) setState({ courseId, count: 0 });
      });
    return () => { active = false; };
  }, [courseId, enabled]);

  return Object.is(state.courseId, courseId) ? state.count : 0;
}
