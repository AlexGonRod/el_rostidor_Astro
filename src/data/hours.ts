/**
 * Horarios estructurados (fuente única de verdad).
 * Índice del día = Date#getDay(): 0 domingo, 1 lunes ... 6 sábado.
 *
 * - 'open'    abre en ese tramo (HH:MM, 24 h).
 * - 'closed'  cerrado todo el día (lunes y martes, dato del cliente 2026-10-21).
 * - 'orders'  solo encargos, con llamada previa (miércoles).
 * - 'unknown' sin datos: solo estado de reserva; ningún día publicado lo usa.
 *
 * Los festivos no están modelados: se tratan como domingo según el
 * horario publicado, así que la web no debe afirmarlo con certeza.
 */
export type DayRule =
  | { kind: 'open'; open: string; close: string }
  | { kind: 'closed' }
  | { kind: 'orders' }
  | { kind: 'unknown' };

export const timezone = 'Europe/Madrid';

export const hours: Record<number, DayRule> = {
  0: { kind: 'open', open: '09:00', close: '15:00' },
  1: { kind: 'closed' },
  2: { kind: 'closed' },
  3: { kind: 'orders' },
  4: { kind: 'open', open: '10:30', close: '14:30' },
  5: { kind: 'open', open: '10:30', close: '14:30' },
  6: { kind: 'open', open: '09:00', close: '15:00' },
};

/** Orden de presentación en las tablas: lunes a domingo. */
export const weekOrder = [1, 2, 3, 4, 5, 6, 0] as const;

/** Nombres schema.org para JSON-LD, indexados por getDay(). */
export const schemaDay = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
