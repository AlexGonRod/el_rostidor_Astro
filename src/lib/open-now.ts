/**
 * Lógica pura del indicador "Obert ara" (AGENTS.md, sección 16).
 * Sin DOM, sin reloj del sistema, sin zona del navegador: todo se inyecta.
 */
import type { DayRule } from '../data/hours';

export type OpenState =
  | { state: 'open'; until: string }
  | { state: 'closed'; next: { day: number; time: string; today: boolean } }
  | { state: 'closedDay'; next: { day: number; time: string; today: false } }
  | { state: 'orders' }
  | { state: 'unknown' };

export interface OpenNowText {
  open: string;
  closed: string;
  closedDay: string;
  orders: string;
  unknown: string;
  today: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const display = (hhmm: string): string => hhmm.replace(/^0/, '');

/** Día de la semana (0 = domingo) y minutos desde las 00:00 en la zona indicada. */
export function zonedNow(now: Date, timezone: string): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    day: WEEKDAYS.indexOf(get('weekday')),
    minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')),
  };
}

export function computeOpenState(hours: Record<number, DayRule>, now: Date, timezone: string): OpenState {
  const { day, minutes } = zonedNow(now, timezone);
  const today = hours[day];

  if (today?.kind === 'orders') return { state: 'orders' };
  if (today?.kind === 'unknown') return { state: 'unknown' };

  const nextOpening = () => {
    for (let step = 1; step <= 7; step++) {
      const index = (day + step) % 7;
      const rule = hours[index];
      if (rule?.kind === 'open') return { day: index, time: display(rule.open) };
    }
    return null;
  };

  // Día cerrado todo el día: la próxima apertura nunca es hoy.
  if (today?.kind === 'closed') {
    const next = nextOpening();
    return next ? { state: 'closedDay', next: { ...next, today: false } } : { state: 'unknown' };
  }

  if (today?.kind === 'open') {
    if (minutes >= toMinutes(today.open) && minutes < toMinutes(today.close)) {
      return { state: 'open', until: display(today.close) };
    }
    if (minutes < toMinutes(today.open)) {
      return { state: 'closed', next: { day, time: display(today.open), today: true } };
    }
  }

  const next = nextOpening();
  return next ? { state: 'closed', next: { ...next, today: false } } : { state: 'unknown' };
}

export function formatOpenLabel(state: OpenState, text: OpenNowText, days: string[]): string {
  switch (state.state) {
    case 'open':
      return text.open.replace('{time}', state.until);
    case 'closed':
      return text.closed
        .replace('{day}', state.next.today ? text.today : days[state.next.day])
        .replace('{time}', state.next.time);
    case 'closedDay':
      return text.closedDay.replace('{day}', days[state.next.day]).replace('{time}', state.next.time);
    case 'orders':
      return text.orders;
    default:
      return text.unknown;
  }
}
