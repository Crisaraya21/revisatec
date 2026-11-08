import { api } from '../lib/apiClient';

/**
 * Módulo de API para Análisis, Síntesis, Criterios e Inconvenientes de Grupo (MS2: Leiner)
 * Cumple con el contrato OpenAPI 3.0.3 de MS2.
 * Todas las rutas entran a través de Azure API Management (APIM).
 */
export const groupAnalysisApi = {
  /**
   * Obtiene el análisis de un grupo (puntaje, desglose de criterios y evidencias).
   * @param {number|string} groupId
   * @returns {Promise<{ groupId?: number, score: number, criteria: Array<object>, evidence: Array<object>, analyzedAt?: number }>}
   */
  getAnalysis: async (groupId) => {
    return api.get(`/groups/${groupId}/analysis`);
  },

  /**
   * Obtiene la síntesis del avance por criterio de evaluación.
   * @param {number|string} groupId
   * @returns {Promise<{ groupId?: number, overall: number, items: Array<{ criterionId: string, status: 'on_track'|'at_risk'|'delayed', note?: string }>, generatedAt?: number }>}
   */
  getProgressSummary: async (groupId) => {
    return api.get(`/groups/${groupId}/progress-summary`);
  },

  /**
   * Obtiene la lista de criterios y sus niveles evaluados para el grupo.
   * @param {number|string} groupId
   * @returns {Promise<{ groupId?: number, criteria: Array<{ id: string, name: string, level: 'not_met'|'partial'|'met', score?: number }> }>}
   */
  getCriteria: async (groupId) => {
    return api.get(`/groups/${groupId}/criteria`);
  },

  /**
   * Obtiene los inconvenientes detectados para un grupo específico.
   * @param {number|string} groupId
   * @returns {Promise<{ groupId?: number, total?: number, items: Array<{ id: number, groupId: number, groupName?: string, type: string, description?: string, date: number, status: 'Sin resolver'|'Resuelto' }> }>}
   */
  getIssues: async (groupId) => {
    return api.get(`/groups/${groupId}/issues`);
  },

  /**
   * Obtiene la retroalimentación de un grupo (versión IA y versión del profesor).
   * @param {number|string} groupId
   * @returns {Promise<{ groupName?: string, deliveryTitle?: string, score?: number, ai: string, professor: string, status?: 'draft'|'published' }>}
   */
  getFeedback: async (groupId) => {
    return api.get(`/groups/${groupId}/feedback`);
  },

  /**
   * Guarda el borrador de retroalimentación del profesor (PUT /groups/{id}/feedback).
   * @param {number|string} groupId
   * @param {{ ai?: string, professor: string }} data
   */
  saveFeedback: async (groupId, data) => {
    return api.put(`/groups/${groupId}/feedback`, {
      ai: data.ai || '',
      professor: String(data.professor || ''),
    });
  },

  /**
   * Publica la retroalimentación y emite el evento asíncrono a la cola para MS3.
   * @param {number|string} groupId
   * @returns {Promise<{ message: string, eventId: string }>}
   */
  publishFeedback: async (groupId) => {
    return api.post(`/groups/${groupId}/feedback/publish`, {});
  },

  /**
   * Obtiene las revisiones directas del grupo.
   * @param {number|string} groupId
   * @returns {Promise<{ items: Array<{ id?: string, note: string, date: number }> }>}
   */
  getDirectReviews: async (groupId) => {
    return api.get(`/groups/${groupId}/direct-reviews`);
  },

  /**
   * Agrega una revisión directa al grupo.
   * @param {number|string} groupId
   * @param {{ note: string }} data
   */
  addDirectReview: async (groupId, data) => {
    return api.post(`/groups/${groupId}/direct-reviews`, {
      note: String(data.note || '').trim(),
    });
  },

  /**
   * Obtiene el reporte del grupo con su checklist.
   * @param {number|string} groupId
   * @returns {Promise<{ checklist: Array<{ name: string, date: number, status: 'completado'|'pendiente' }> }>}
   */
  getReport: async (groupId) => {
    return api.get(`/groups/${groupId}/report`);
  },
};

