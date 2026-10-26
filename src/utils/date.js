/**
 * Utilidades de fecha para RevisaTEC (Frontend Fase II).
 * Convención obligatoria:
 * - El backend siempre recibe y entrega Epoch en milisegundos (ms).
 * - En la interfaz siempre se visualiza en la zona horaria del dispositivo.
 * - Todas las funciones son puras y tolerantes a null/valores inválidos.
 */

export function getDeviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Convierte Date, string ISO, fecha "YYYY-MM-DD" o datetime-local a Epoch en ms.
 * Fechas de solo día ("YYYY-MM-DD") se interpretan como medianoche local.
 */
export function toEpochMs(input) {
  if (input === null || input === undefined || input === '') return null;

  if (typeof input === 'number') {
    if (Number.isNaN(input)) return null;
    // Si viene en segundos (ej. timestamp unix clásico < 10000000000), convertir a ms
    return input < 10000000000 ? input * 1000 : input;
  }

  if (input instanceof Date) {
    const time = input.getTime();
    return Number.isNaN(time) ? null : time;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    // Caso de solo día "YYYY-MM-DD" -> medianoche local
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (dateOnlyMatch) {
      const year = Number(dateOnlyMatch[1]);
      const month = Number(dateOnlyMatch[2]) - 1;
      const day = Number(dateOnlyMatch[3]);
      const localDate = new Date(year, month, day, 0, 0, 0, 0);
      return Number.isNaN(localDate.getTime()) ? null : localDate.getTime();
    }

    // Caso datetime-local "YYYY-MM-DDTHH:mm"
    const parsed = new Date(trimmed);
    const time = parsed.getTime();
    return Number.isNaN(time) ? null : time;
  }

  return null;
}

/**
 * Retorna una instancia Date a partir de Epoch en ms.
 */
export function fromEpochMs(ms) {
  const epoch = toEpochMs(ms);
  return epoch !== null ? new Date(epoch) : null;
}

/**
 * Formato de fecha corta en es-CR en la zona horaria del dispositivo (ej. "01/10/2026").
 */
export function formatDate(ms) {
  const date = fromEpochMs(ms);
  if (!date) return '—';

  try {
    return new Intl.DateTimeFormat('es-CR', {
      timeZone: getDeviceTimeZone(),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleDateString('es-CR');
  }
}

/**
 * Formato de fecha y hora en es-CR en la zona horaria del dispositivo.
 */
export function formatDateTime(ms) {
  const date = fromEpochMs(ms);
  if (!date) return '—';

  try {
    return new Intl.DateTimeFormat('es-CR', {
      timeZone: getDeviceTimeZone(),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString('es-CR');
  }
}

/**
 * Retorna tiempo relativo legible (ej. "hace 2 horas", "ayer", "hace 3 días").
 */
export function formatRelative(ms, now = Date.now()) {
  const date = fromEpochMs(ms);
  if (!date) return '—';

  const diffMs = date.getTime() - (typeof now === 'number' ? now : new Date(now).getTime());
  const diffSec = Math.round(diffMs / 1000);

  if (Math.abs(diffSec) < 45) {
    return 'hace unos momentos';
  }

  try {
    const rtf = new Intl.RelativeTimeFormat('es-CR', { numeric: 'auto' });
    const diffMin = Math.round(diffSec / 60);
    const diffHours = Math.round(diffSec / 3600);
    const diffDays = Math.round(diffSec / 86400);

    if (Math.abs(diffSec) < 3600) {
      return rtf.format(diffMin, 'minute');
    }
    if (Math.abs(diffSec) < 86400) {
      return rtf.format(diffHours, 'hour');
    }
    if (Math.abs(diffSec) < 2592000) {
      return rtf.format(diffDays, 'day');
    }

    return formatDate(date);
  } catch {
    return formatDate(date);
  }
}

/**
 * Genera el valor en formato string para precargar inputs type="date" ("YYYY-MM-DD")
 * o type="datetime-local" ("YYYY-MM-DDTHH:mm") a partir de Epoch en ms (hora local).
 */
export function toInputValue(ms, type = 'date') {
  const date = fromEpochMs(ms);
  if (!date) return '';

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  if (type === 'datetime-local') {
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
  }

  return `${y}-${m}-${d}`;
}

/*
 ============================================================================
 Ejemplos y Casos de Verificación (Documentados):
 ----------------------------------------------------------------------------
 1. toEpochMs('2026-10-01')
    -> Medianoche local del 1 de octubre de 2026 en ms.
 2. formatDate(1790812800000)
    -> "01/10/2026" formateado en zona del dispositivo.
 3. formatRelative(Date.now() - 7200 * 1000)
    -> "hace 2 horas".
 4. toInputValue(1790812800000, 'date')
    -> "2026-10-01".
 5. Ida y vuelta:
    const originalEpoch = toEpochMs('2026-10-01');
    const inputVal = toInputValue(originalEpoch, 'date');
    const roundTrip = toEpochMs(inputVal);
    originalEpoch === roundTrip (true).
 6. Tolerancia a nulos e inválidos:
    toEpochMs(null) === null
    formatDate(null) === '—'
    formatDateTime(undefined) === '—'
    formatRelative('invalido') === '—'
    toInputValue(null) === ''
 ============================================================================
*/
