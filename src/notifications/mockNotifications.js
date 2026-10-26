/**
 * Datos simulados de notificaciones para RevisaTEC (Fase A).
 * Contrato compartido con MS3 (Microservicio de Notificaciones).
 * Tipos admitidos: FEEDBACK_PUBLISHED e ISSUE_DETECTED.
 * createdAt siempre en Epoch (milisegundos).
 */

const NOW = Date.now();
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const INITIAL_MOCK_NOTIFICATIONS = [
  {
    id: 'notif-001',
    type: 'FEEDBACK_PUBLISHED',
    title: 'Retroalimentación publicada',
    message: 'Se publicó la retroalimentación del Grupo A para la Entrega 2.',
    courseId: 1,
    groupId: 1,
    createdAt: NOW - 12 * MINUTE,
    read: false,
  },
  {
    id: 'notif-002',
    type: 'ISSUE_DETECTED',
    title: 'Nuevo inconveniente detectado',
    message: 'Grupo 2: Se detectaron commits de fin de semana con mensajes no descriptivos.',
    courseId: 1,
    groupId: 2,
    createdAt: NOW - 45 * MINUTE,
    read: false,
  },
  {
    id: 'notif-003',
    type: 'FEEDBACK_PUBLISHED',
    title: 'Retroalimentación publicada',
    message: 'Se publicó la retroalimentación del Grupo 3 para el Avance 1.',
    courseId: 1,
    groupId: 3,
    createdAt: NOW - 3 * HOUR,
    read: false,
  },
  {
    id: 'notif-004',
    type: 'ISSUE_DETECTED',
    title: 'Inconveniente de contribución',
    message: 'Grupo 1: Desbalance significativo en pull requests de los integrantes.',
    courseId: 1,
    groupId: 1,
    createdAt: NOW - 1 * DAY,
    read: true,
  },
  {
    id: 'notif-005',
    type: 'FEEDBACK_PUBLISHED',
    title: 'Propuesta de IA lista para revisión',
    message: 'La síntesis de rúbrica del Grupo 4 ya está generada para evaluación docente.',
    courseId: 1,
    groupId: 4,
    createdAt: NOW - 2 * DAY,
    read: true,
  },
];
