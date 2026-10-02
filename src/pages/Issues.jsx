import { useState, useEffect } from 'react';
import { api } from '../lib/apiClient';
import { Icons } from '../components/Icons';
import './Issues.css';

export default function Issues() {
  const [issues, setIssues] = useState([]);
  const [groups, setGroups] = useState([]);

  const [filterType, setFilterType] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [bannerClosed, setBannerClosed] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Carga los grupos y consulta los inconvenientes de cada uno.
  const fetchIssuesFromApi = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [groupsRes, issuesRes] = await Promise.all([
        api.get('/groups?page=1&pageSize=100&search='),
        api.get('/groups/1/issues'),
      ]);
      const groupList = Array.isArray(groupsRes?.items) ? groupsRes.items : [];
      setGroups(groupList);

      const apiIssues = (Array.isArray(issuesRes?.items) ? issuesRes.items : []).map((item, index) => {
        const group = groupList.find((entry) => String(entry.id) === String(item.groupId));
        const groupId = item.groupId ?? group?.id;
        return {
          id: `${groupId ?? 'group'}:${item.id || 'issue'}:${index}`,
          type: item.type || 'Tipo no disponible desde APIM',
          description: item.description || item.type || 'Descripción no disponible desde APIM',
          group: item.groupName || group?.name || 'Grupo no disponible desde APIM',
          groupId,
          detected: item.date || null,
          status: item.status || null,
          iconType: item.type?.toLowerCase().includes('commit') ? 'commit' : 'file',
        };
      });

      setIssues(apiIssues);
    } catch (err) {
      console.error('Error al conectar con Azure APIM:', err);
      setApiError('Error de conexion con Azure APIM (/groups/{id}/issues): El servidor no responde o la conexion fue interrumpida.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchIssuesFromApi();
  }, []);

  const handleToggleStatus = (id) => {
    setIssues((prev) =>
      prev.map((item) =>
        item.id === id && item.status
          ? {
              ...item,
              status: item.status === 'Sin resolver' ? 'Resuelto' : 'Sin resolver',
            }
          : item
      )
    );
  };

  const handleReviewIssue = (id) => {
    setIssues((prev) => prev.map((item) => item.id === id
      ? { ...item, status: item.status === 'Resuelto' ? 'Sin resolver' : 'Resuelto' }
      : item));
  };

  // Contadores dinamicos
  const totalCount = issues.length;
  const unresolvedCount = issues.every((issue) => issue.status)
    ? issues.filter((issue) => issue.status === 'Sin resolver').length
    : null;
  const testCommitCount = issues.filter((i) => i.type.toLowerCase().includes('commit')).length;
  const deliveryErrorCount = issues.filter((i) => i.type.toLowerCase().includes('entrega')).length;

  // Filtrado
  const filteredIssues = issues.filter((item) => {
    if (filterType === 'Commits de prueba' && !item.type.toLowerCase().includes('commit')) {
      return false;
    }
    if (filterType === 'Errores de entrega' && !item.type.toLowerCase().includes('entrega')) {
      return false;
    }
    if (groupFilter !== 'all' && item.group !== groupFilter) {
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
          <h1 className="issues-title">Inconvenientes</h1>
          <span className="issues-subtitle">
            {apiError
              ? 'Datos no disponibles desde APIM'
              : `${totalCount} detectados · ${unresolvedCount === null ? 'Estado no disponible desde APIM' : `${unresolvedCount} sin resolver`}`}
          </span>
        </div>

        <button
          type="button"
          onClick={fetchIssuesFromApi}
          disabled={isLoading}
          className="btn-refresh-analysis"
        >
          <Icons.Refresh />
          <span>{isLoading ? 'Actualizando...' : 'Actualizar analisis'}</span>
        </button>
      </div>{/* end issues-header */}

      {/* Error de Conexion Azure APIM */}
      {apiError && (
        <div style={{ backgroundColor: 'var(--badge-alert-bg)', color: 'var(--badge-alert-text)', border: '1px solid var(--badge-alert-border)', padding: '16px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icons.AlertTriangle />
            <span style={{ fontSize: '0.844rem', fontWeight: 600 }}>{apiError}</span>
          </div>
          <button type="button" onClick={fetchIssuesFromApi} className="btn-new-event" style={{ padding: '6px 14px', fontSize: '0.813rem' }}>
            Reintentar
          </button>
        </div>
      )}

      {/* Estado de carga */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Cargando inconvenientes desde Azure APIM...
        </div>
      )}

      {/* Sin datos y sin error */}
      {!isLoading && !apiError && issues.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          No hay inconvenientes registrados en este momento.
        </div>
      )}

      {/* Banner Informativo */}
      {!bannerClosed && issues.length > 0 && (
        <div className="issues-info-banner">
          <div className="banner-content">
            <span className="banner-icon">
              <Icons.AlertTriangle />
            </span>
            <span className="banner-text">
              Se detectan en cada analisis. Marcalos como resueltos o tenlos en cuenta al evaluar.
            </span>
          </div>
          <button
            type="button"
            className="banner-close-btn"
            onClick={() => setBannerClosed(true)}
            aria-label="Cerrar aviso"
          >
            &times;
          </button>
        </div>
      )}

      {/* Barra de Filtros */}
      {issues.length > 0 && (
        <div className="issues-filters-bar">
          <div className="issues-search-box">
            <Icons.Search />
            <input
              type="text"
              placeholder="Buscar inconveniente"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="issues-search-input"
            />
          </div>

          <div className="filter-pills-row">
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
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">Grupo (Todos)</option>
              {groups.map((group) => (
                <option key={group.id} value={group.name}>{group.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
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
                  <th style={{ width: '20%' }}>TIPO</th>
                  <th style={{ width: '36%' }}>DESCRIPCION</th>
                  <th style={{ width: '11%' }}>GRUPO</th>
                  <th style={{ width: '12%' }}>DETECTADO</th>
                  <th className="issues-status-heading" style={{ width: '15%' }}>ESTADO</th>
                  <th style={{ width: '6%' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '36px' }}>
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
                        <span className="issue-detected-time">{item.detected}</span>
                      </td>

                      <td className="issues-status-cell">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item.id)}
                          disabled={!item.status}
                          className={`issue-status-button ${
                            item.status === 'Sin resolver' ? 'is-open' : item.status === 'Resuelto' ? 'is-resolved' : 'is-unavailable'
                          }`}
                          title={item.status ? 'El cambio solo se guarda localmente' : 'Estado no disponible desde APIM'}
                        >
                          {item.status === 'Sin resolver' ? (
                            <Icons.AlertTriangle />
                          ) : (
                            <Icons.CheckCircle />
                          )}
                          <span>{item.status || 'Estado no disponible'}</span>
                        </button>
                      </td>

                      <td className="row-action-cell">
                        <button
                          type="button"
                          onClick={() => handleReviewIssue(item.id)}
                          className="btn-review-issue"
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
