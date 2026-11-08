import { useState, useEffect, useCallback, useRef } from 'react';
import { groupsApi, groupAnalysisApi } from '../api';
import { useCourse } from '../context/CourseContext';
import { formatDate } from '../utils/date';
import { Icons } from '../components/Icons';
import './Issues.css';

// Equivalencia de tipos de inconvenientes a etiquetas e íconos en español
const ISSUE_TYPE_MAP = {
  'commits de prueba': { label: 'Commits de prueba', icon: 'commit', badgeClass: 'warning' },
  'errores de entrega': { label: 'Errores de entrega', icon: 'alert', badgeClass: 'alert' },
  'desbalance de contribución': { label: 'Desbalance de contribución', icon: 'users', badgeClass: 'warning' },
  'entrega tardía': { label: 'Entrega tardía', icon: 'alert', badgeClass: 'alert' },
};

function resolveIssueType(rawType) {
  const normalized = String(rawType || '').trim().toLowerCase();
  for (const [key, meta] of Object.entries(ISSUE_TYPE_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return meta;
    }
  }
  return {
    label: rawType || 'Inconveniente detectado',
    icon: 'neutral',
    badgeClass: 'info',
  };
}

export default function Issues() {
  const { selectedCourseId } = useCourse();
  const [issues, setIssues] = useState([]);
  const [groups, setGroups] = useState([]);

  const [filterType, setFilterType] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [bannerClosed, setBannerClosed] = useState(false);
  const [apiError, setApiError] = useState(null);
  const requestIdRef = useRef(0);

  // Carga los grupos del curso y consulta los inconvenientes vía MS2 (groupAnalysisApi)
  const fetchIssuesFromApi = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setApiError(null);
    setIssues([]);

    try {
      const groupsRes = await groupsApi.list({
        page: 1,
        pageSize: 100,
        courseId: selectedCourseId,
      });

      const groupList = Array.isArray(groupsRes?.content)
        ? groupsRes.content
        : Array.isArray(groupsRes?.items) ? groupsRes.items : [];

      if (requestId !== requestIdRef.current) return;
      setGroups(groupList);

      if (groupList.length === 0) {
        setIsLoading(false);
        return;
      }

      // Si hay un grupo específico seleccionado
      const targetGroups = groupFilter === 'all'
        ? groupList
        : groupList.filter((g) => String(g.id) === String(groupFilter) || g.name === groupFilter);

      // Consulta en paralelo con allSettled (un fallo de un grupo no tumba al resto)
      const settledResults = await Promise.allSettled(
        targetGroups.map(async (group) => {
          const res = await groupAnalysisApi.getIssues(group.id);
          const rawItems = Array.isArray(res?.items) ? res.items : [];
          return rawItems.map((item, index) => {
            const groupId = item.groupId ?? group.id;
            const typeMeta = resolveIssueType(item.type);
            return {
              id: `${groupId}:${item.id || 'issue'}:${index}`,
              rawId: item.id,
              type: typeMeta.label,
              description: item.description || item.type || 'Sin descripción disponible',
              group: item.groupName || group.name || `Grupo ${groupId}`,
              groupId,
              detected: item.date || null,
              status: item.status || 'Sin resolver',
              iconType: typeMeta.icon,
            };
          });
        })
      );

      if (requestId !== requestIdRef.current) return;

      const loadedIssues = settledResults
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => r.value);

      // Ordenar por fecha descendente
      loadedIssues.sort((a, b) => (Number(b.detected) || 0) - (Number(a.detected) || 0));

      setIssues(loadedIssues);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('Error al consultar inconvenientes en APIM:', err);
      setApiError('Error al consultar inconvenientes desde Azure APIM (/groups/{id}/issues).');
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [selectedCourseId, groupFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchIssuesFromApi();
  }, [fetchIssuesFromApi]);

  const handleToggleStatus = (id) => {
    setIssues((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === 'Sin resolver' ? 'Resuelto' : 'Sin resolver',
            }
          : item
      )
    );
  };

  const handleReviewIssue = (id) => {
    setIssues((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === 'Resuelto' ? 'Sin resolver' : 'Resuelto' }
          : item
      )
    );
  };

  // Contadores dinámicos
  const totalCount = issues.length;
  const unresolvedCount = issues.filter((i) => i.status === 'Sin resolver').length;
  const testCommitCount = issues.filter((i) => i.type.toLowerCase().includes('commit')).length;
  const deliveryErrorCount = issues.filter((i) => i.type.toLowerCase().includes('entrega')).length;

  // Filtrado reactivo en cliente
  const filteredIssues = issues.filter((item) => {
    if (filterType === 'Commits de prueba' && !item.type.toLowerCase().includes('commit')) {
      return false;
    }
    if (filterType === 'Errores de entrega' && !item.type.toLowerCase().includes('entrega')) {
      return false;
    }
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }
    if (
      searchQuery.trim() &&
      !item.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !item.group.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !item.type.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="issues-page-container">
      {/* Encabezado */}
      <div className="issues-header">
        <div className="issues-header-left">
          <h1 className="issues-title">Inconvenientes Detectados</h1>
          <span className="issues-subtitle">
            Alertas automáticas generadas por el análisis de repositorio (MS2)
          </span>
        </div>

        <div className="issues-header-right">
          <div className="issues-search-box">
            <span className="issues-search-icon">
              <Icons.Search />
            </span>
            <input
              type="text"
              placeholder="Buscar por tipo, descripción o grupo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="issues-search-input"
              aria-label="Buscar inconveniente"
            />
          </div>
        </div>
      </div>

      {/* Banner Informativo de Alertas Activas */}
      {!bannerClosed && unresolvedCount > 0 && !isLoading && !apiError && (
        <div className="issues-warning-banner" role="status">
          <div className="warning-banner-left">
            <span className="warning-badge-counter">{unresolvedCount}</span>
            <div className="warning-banner-text">
              <span className="warning-banner-title">
                {unresolvedCount} {unresolvedCount === 1 ? 'inconveniente pendiente' : 'inconvenientes pendientes'} de revisión
              </span>
              <span className="warning-banner-desc">
                Se detectaron anomalías en commits o entregas que requieren seguimiento docente.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBannerClosed(true)}
            className="warning-banner-close"
            title="Cerrar notificación"
            aria-label="Cerrar aviso"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error de Conexión */}
      {apiError && (
        <div
          style={{
            backgroundColor: 'var(--badge-alert-bg)',
            color: 'var(--badge-alert-text)',
            border: '1px solid var(--badge-alert-border)',
            padding: '16px 20px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
          role="alert"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icons.AlertTriangle />
            <span style={{ fontSize: '0.844rem', fontWeight: 600 }}>{apiError}</span>
          </div>
          <button
            type="button"
            onClick={fetchIssuesFromApi}
            className="btn-outline"
            style={{ padding: '6px 12px', fontSize: '0.781rem', background: 'var(--bg-surface)' }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Estado Cargando */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Consultando alertas e inconvenientes desde Azure APIM…
        </div>
      )}

      {/* Estado Vacío Sin Inconvenientes */}
      {!isLoading && !apiError && issues.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 14,
            border: '1px solid var(--border-default)',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: 'var(--bg-sunken)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Icons.CheckCircle />
          </div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
            Sin inconvenientes detectados
          </h3>
          <p style={{ margin: 0, fontSize: '0.813rem' }}>
            Los repositorios analizados cumplen con las directrices del curso.
          </p>
        </div>
      )}

      {/* Barra de Filtros */}
      {!isLoading && issues.length > 0 && (
        <div className="issues-controls-bar">
          <div className="pills-filters-row">
            <button
              type="button"
              onClick={() => setFilterType('Todos')}
              className={`pill-filter-btn ${filterType === 'Todos' ? 'active' : ''}`}
            >
              Todos <span className="pill-count">{totalCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('Commits de prueba')}
              className={`pill-filter-btn ${filterType === 'Commits de prueba' ? 'active' : ''}`}
            >
              Commits de prueba <span className="pill-count">{testCommitCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('Errores de entrega')}
              className={`pill-filter-btn ${filterType === 'Errores de entrega' ? 'active' : ''}`}
            >
              Errores de entrega <span className="pill-count">{deliveryErrorCount}</span>
            </button>
          </div>

          <div className="dropdown-filters-row">
            {/* Selector de Grupo (D4) */}
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="filter-select"
              aria-label="Filtrar por grupo"
            >
              <option value="all">Grupo (Todos)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name || `Grupo ${g.id}`}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
              aria-label="Filtrar por estado"
            >
              <option value="all">Estado (Todos)</option>
              <option value="Sin resolver">Sin resolver</option>
              <option value="Resuelto">Resuelto</option>
            </select>
          </div>
        </div>
      )}

      {/* Tabla de Inconvenientes */}
      {!isLoading && issues.length > 0 && (
        <div className="issues-table-card">
          <div className="table-responsive-wrapper">
            <table className="custom-issues-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>TIPO</th>
                  <th style={{ width: '36%' }}>DESCRIPCIÓN</th>
                  <th style={{ width: '12%' }}>GRUPO</th>
                  <th style={{ width: '13%' }}>DETECTADO</th>
                  <th className="issues-status-heading" style={{ width: '11%' }}>ESTADO</th>
                  <th style={{ width: '6%' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No se encontraron inconvenientes con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredIssues.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="issue-type-cell">
                          <div className="issue-type-icon-box">
                            {item.iconType === 'commit' ? <Icons.GitBranch /> : <Icons.FileText />}
                          </div>
                          <span className="issue-type-name">{item.type}</span>
                        </div>
                      </td>

                      <td>
                        <span className="issue-desc-text">{item.description}</span>
                      </td>

                      <td>
                        <span className="issue-group-tag">{item.group}</span>
                      </td>

                      <td>
                        <span className="issue-detected-time">
                          {item.detected ? formatDate(item.detected) : 'Reciente'}
                        </span>
                      </td>

                      <td className="issues-status-cell">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item.id)}
                          className={`issue-status-button ${
                            item.status === 'Sin resolver' ? 'is-open' : 'is-resolved'
                          }`}
                          title="Alternar estado localmente"
                          aria-label={`Cambiar estado de ${item.description}`}
                        >
                          {item.status === 'Sin resolver' ? (
                            <Icons.AlertTriangle />
                          ) : (
                            <Icons.CheckCircle />
                          )}
                          <span>{item.status}</span>
                        </button>
                      </td>

                      <td className="row-action-cell">
                        <button
                          type="button"
                          onClick={() => handleReviewIssue(item.id)}
                          className="btn-review-issue"
                          aria-label={`Revisar o reabrir ${item.type}`}
                        >
                          <span>{item.status === 'Resuelto' ? 'Reabrir' : 'Revisar'}</span>
                          <Icons.ChevronRight />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
