import { api } from '../lib/apiClient';

/**
 * Módulo de API para Configuración del Curso (MS2: Rúbrica IA y Reportes - Leiner)
 * Cumple estrictamente con el contrato OpenAPI 3.0.3 de MS2.
 * Todas las rutas entran a través de Azure API Management (APIM).
 */
export const courseConfigApi = {
  /**
   * Obtiene la rúbrica del curso.
   * @param {number|string} courseId
   * @returns {Promise<{ criteria: Array<{ name: string, weight: number }>, fileName?: string, interpretationStatus?: string }>}
   */
  getRubric: async (courseId) => {
    return api.get(`/courses/${courseId}/rubric`);
  },

  /**
   * Reemplaza la rúbrica completa del curso (PUT /courses/{id}/rubric).
   * @param {number|string} courseId
   * @param {{ criteria: Array<{ name: string, weight: number }> }} data
   */
  saveRubric: async (courseId, data) => {
    // Validar esquema básico según RubricInput
    const payload = {
      criteria: (data.criteria || []).map((c) => ({
        name: String(c.name).trim(),
        weight: Number(c.weight),
      })),
    };
    return api.put(`/courses/${courseId}/rubric`, payload);
  },

  /**
   * Obtiene las indicaciones para la IA.
   * @param {number|string} courseId
   * @returns {Promise<{ courseId?: number, text: string, updatedAt?: number }>}
   */
  getInstructions: async (courseId) => {
    return api.get(`/courses/${courseId}/instructions`);
  },

  /**
   * Actualiza las indicaciones para la IA (PUT /courses/{id}/instructions).
   * @param {number|string} courseId
   * @param {{ text: string }} data
   */
  saveInstructions: async (courseId, data) => {
    const payload = {
      text: typeof data === 'string' ? data : (data?.text ?? ''),
    };
    return api.put(`/courses/${courseId}/instructions`, payload);
  },

  /**
   * Obtiene la configuración de scraping del curso.
   * @param {number|string} courseId
   * @returns {Promise<{ frequency: 'hourly'|'daily'|'weekly', minReviewers: number, nextRunAt?: number }>}
   */
  getScrapingConfig: async (courseId) => {
    return api.get(`/courses/${courseId}/scraping-config`);
  },

  /**
   * Actualiza la configuración de scraping del curso (PUT /courses/{id}/scraping-config).
   * @param {number|string} courseId
   * @param {{ frequency: 'hourly'|'daily'|'weekly', minReviewers: number }} data
   */
  saveScrapingConfig: async (courseId, data) => {
    const payload = {
      frequency: data.frequency || 'daily',
      minReviewers: Math.max(1, parseInt(data.minReviewers, 10) || 1),
    };
    return api.put(`/courses/${courseId}/scraping-config`, payload);
  },
};
