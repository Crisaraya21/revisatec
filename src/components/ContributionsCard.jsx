import { useEffect, useState } from 'react';
import { groupAnalysisApi, membersApi } from '../api';
import { ApiError } from '../lib/apiClient';
import '../pages/GroupDetail.css';

// Colores distinguibles en tema claro y oscuro (uno por integrante)
const SLICE_COLORS = ['#3b6fb6', '#d9822b', '#2e9d7a', '#8e5bd0', '#c94f6d', '#6b8e23', '#4a90a4', '#b8860b'];

/**
 * Une el aporte calculado por MS2 (por usuario de GitHub) con los integrantes de MS1.
 * Devuelve una fila por integrante, incluidos los que todavía no tienen actividad.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function mergeContributions(contributions, members) {
  const byUser = new Map((contributions?.items || []).map((c) => [c.githubUser?.toLowerCase(), c]));
  const rows = (members || []).map((m) => {
    const c = byUser.get(m.githubUser?.toLowerCase());
    byUser.delete(m.githubUser?.toLowerCase());
    return {
      key: `m-${m.id}`,
      name: m.name,
      email: m.email,
      githubUser: m.githubUser,
      commits: c?.commits ?? 0,
      prs: c?.prs ?? 0,
      reviews: c?.reviews ?? 0,
      percent: c?.percent ?? 0,
    };
  });
  // Autores del repositorio que no están registrados como integrantes en MS1
  byUser.forEach((c, user) => rows.push({ key: `g-${user}`, name: null, email: null, ...c }));
  return rows.sort((a, b) => b.commits - a.commits || b.reviews - a.reviews);
}

/** Punto de la circunferencia para un ángulo dado (0 = arriba, sentido horario). */
function polar(cx, cy, r, angle) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

/** Gráfico de pastel en SVG con el porcentaje de commits de cada integrante. */
function ContributionsPie({ rows, size = 168 }) {
  const total = rows.reduce((sum, r) => sum + r.commits, 0);
  const c = size / 2;
  const r = size / 2 - 2;
  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Sin commits registrados">
        <circle cx={c} cy={c} r={r} fill="var(--border-default)" />
      </svg>
    );
  }
  const withColor = rows
    .map((row, i) => ({ row, color: SLICE_COLORS[i % SLICE_COLORS.length] }))
    .filter(({ row }) => row.commits > 0);
  const sweeps = withColor.map(({ row }) => (row.commits / total) * 360);
  const starts = sweeps.map((_, i) => sweeps.slice(0, i).reduce((sum, s) => sum + s, 0));
  const slices = withColor.map(({ row, color }, i) => {
    const sweep = sweeps[i];
    let d = null; // un solo integrante con todo: círculo completo
    if (sweep < 359.99) {
      const [x1, y1] = polar(c, c, r, starts[i]);
      const [x2, y2] = polar(c, c, r, starts[i] + sweep);
      d = `M ${c} ${c} L ${x1} ${y1} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;
    }
    return { key: row.key, d, color, label: `${row.name || row.githubUser}: ${row.percent}%` };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
      aria-label={`Aporte por integrante: ${slices.map((s) => s.label).join(', ')}`}>
      {slices.map((s) => (s.d === null
        ? <circle key={s.key} cx={c} cy={c} r={r} fill={s.color}><title>{s.label}</title></circle>
        : <path key={s.key} d={s.d} fill={s.color} stroke="var(--bg-surface)" strokeWidth="2"><title>{s.label}</title></path>))}
    </svg>
  );
}

/**
 * Aporte por integrante: pastel con el porcentaje de commits y leyenda con commits, PR y revisiones.
 * Datos de MS2 (GET /groups/{id}/contributions); nombres de MS1.
 * variant="inline" se usa dentro de otra tarjeta (detalle de grupo); "card" va como tarjeta propia.
 */
export default function ContributionsCard({ groupId, highlightEmail = null, title = 'Aporte por integrante', variant = 'card' }) {
  const [state, setState] = useState({ groupId: null, rows: [], totals: null, error: null });

  useEffect(() => {
    let active = true;
    Promise.all([
      groupAnalysisApi.getContributions(groupId),
      membersApi.list(groupId).catch(() => ({ members: [] })),
    ])
      .then(([contrib, members]) => {
        if (!active) return;
        setState({
          groupId,
          rows: mergeContributions(contrib, members?.members),
          totals: { commits: contrib?.totalCommits ?? 0, prs: contrib?.totalPrs ?? 0 },
          error: null,
        });
      })
      .catch((err) => {
        if (!active) return;
        setState({
          groupId,
          rows: [],
          totals: null,
          error: err instanceof ApiError ? err.message : 'No se pudo cargar el aporte por integrante.',
        });
      });
    return () => { active = false; };
  }, [groupId]);

  const isLoading = state.groupId !== groupId;
  const subtitle = state.totals
    ? `Porcentaje de los ${state.totals.commits} commits del grupo · ${state.totals.prs} pull requests`
    : 'Porcentaje de commits, pull requests y revisiones de cada integrante';

  let body;
  if (isLoading) {
    body = <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.844rem' }}>Cargando aporte...</div>;
  } else if (state.error) {
    body = <div role="alert" style={{ padding: 16, color: 'var(--badge-alert-text)', fontSize: '0.844rem' }}>{state.error}</div>;
  } else if (state.rows.length === 0) {
    body = (
      <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.844rem' }}>
        Todavía no hay actividad registrada en el repositorio.
      </div>
    );
  } else {
    body = (
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
        <div style={{ flex: '0 0 auto', margin: '0 auto' }}>
          <ContributionsPie rows={state.rows} />
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, flex: '1 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {state.rows.map((r, i) => {
            const isMe = highlightEmail && r.email === highlightEmail;
            return (
              <li key={r.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span aria-hidden="true" style={{
                  width: 12, height: 12, borderRadius: 3, marginTop: 3, flexShrink: 0,
                  backgroundColor: r.commits > 0 ? SLICE_COLORS[i % SLICE_COLORS.length] : 'var(--border-default)',
                }} />
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: '0.844rem', fontWeight: 600, color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>
                      {r.name || r.githubUser}{isMe ? ' (tú)' : ''}
                    </span>
                    <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {r.percent}%
                    </strong>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {r.commits} commits · {r.prs} PR · {r.reviews} revisiones
                    {!r.name ? ' · no registrado en el grupo' : ''}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h3 className="card-heading-title" style={{ fontSize: '0.95rem' }}>{title}</h3>
          <span className="card-heading-subtitle">{subtitle}</span>
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className="evidence-panel-card">
      <div className="evidence-header">
        <h2 className="card-heading-title">{title}</h2>
        <span className="card-heading-subtitle">{subtitle}</span>
      </div>
      {body}
    </div>
  );
}
