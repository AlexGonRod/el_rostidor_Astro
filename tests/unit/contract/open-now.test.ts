/**
 * Contrato de src/lib/open-now.ts (ver AGENTS.md, secciones 7.1 y 16).
 * REESCRITO el 2026-10-21 por cambio de requisitos del cliente (lunes y martes cerrado todo el día,
 * nuevo estado `closedDay`); los criterios H1..H14 son los de AGENTS.md 7.1.
 * Los tests marcados [caracterización] fijan comportamiento que no cambia con el nuevo horario.
 * Los módulos se importan dentro de cada test: cada uno falla por separado mientras no exista.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

const mod = async () => await import('../../../src/lib/open-now');
const load = async () => (await mod()).computeOpenState;

type Rule = { kind: 'open'; open: string; close: string } | { kind: 'closed' } | { kind: 'orders' } | { kind: 'unknown' };

// Copia explícita del horario publicado (0 = domingo ... 6 = sábado). Lunes y martes: cerrado todo el día.
const hours: Record<number, Rule> = {
  0: { kind: 'open', open: '09:00', close: '15:00' },
  1: { kind: 'closed' },
  2: { kind: 'closed' },
  3: { kind: 'orders' },
  4: { kind: 'open', open: '10:30', close: '14:30' },
  5: { kind: 'open', open: '10:30', close: '14:30' },
  6: { kind: 'open', open: '09:00', close: '15:00' },
};
const TZ = 'Europe/Madrid';
const at = (iso: string) => new Date(iso);

afterEach(() => {
  vi.useRealTimers();
});

describe('[AC-01][caracterización] zonedNow: día y minutos en la zona horaria inyectada', () => {
  it('jueves 2026-10-15 12:00 en Madrid (CEST, UTC+2) -> día 4, 720 min', async () => {
    const { zonedNow } = await mod();
    expect(zonedNow(at('2026-10-15T10:00:00Z'), TZ)).toEqual({ day: 4, minutes: 720 });
  });

  it('el día cambia con la zona, no con UTC: jueves 22:30Z ya es viernes 00:30 en Madrid', async () => {
    const { zonedNow } = await mod();
    expect(zonedNow(at('2026-10-15T22:30:00Z'), TZ)).toEqual({ day: 5, minutes: 30 });
    expect(zonedNow(at('2026-10-15T22:30:00Z'), 'UTC')).toEqual({ day: 4, minutes: 22 * 60 + 30 });
  });

  it('medianoche se expresa como 0 minutos (ciclo 0-23, nunca 24:00)', async () => {
    const { zonedNow } = await mod();
    expect(zonedNow(at('2026-10-15T22:00:00Z'), TZ)).toEqual({ day: 5, minutes: 0 });
  });

  it('cambio de hora 29-mar-2026: 06:30Z es 08:30 CEST; 00:30Z (antes del cambio) es 01:30 CET', async () => {
    const { zonedNow } = await mod();
    expect(zonedNow(at('2026-03-29T06:30:00Z'), TZ)).toEqual({ day: 0, minutes: 8 * 60 + 30 });
    expect(zonedNow(at('2026-03-29T00:30:00Z'), TZ)).toEqual({ day: 0, minutes: 60 + 30 });
  });

  it('cambio de hora 25-oct-2026: 07:30Z es 08:30 CET (UTC+1)', async () => {
    const { zonedNow } = await mod();
    expect(zonedNow(at('2026-10-25T07:30:00Z'), TZ)).toEqual({ day: 0, minutes: 8 * 60 + 30 });
  });
});

describe('[AC-02][caracterización] computeOpenState: dentro del horario', () => {
  it('jueves 12:00 en Madrid: abierto hasta las 14:30', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-10-15T10:00:00Z'), TZ)).toEqual({ state: 'open', until: '14:30' });
  });

  it('justo en la apertura (jueves 10:30) ya está abierto', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-10-15T08:30:00Z'), TZ)).toEqual({ state: 'open', until: '14:30' });
  });

  it('un minuto antes del cierre (jueves 14:29) sigue abierto', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-10-15T12:29:00Z'), TZ)).toEqual({ state: 'open', until: '14:30' });
  });

  it('sábado y domingo (11:00): abierto hasta las 15:00', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-10-17T09:00:00Z'), TZ)).toEqual({ state: 'open', until: '15:00' }); // sáb 11:00
    expect(compute(hours, at('2026-10-18T09:00:00Z'), TZ)).toEqual({ state: 'open', until: '15:00' }); // dom 11:00
  });
});

describe('[AC-03][caracterización] computeOpenState: cerrado y próxima apertura', () => {
  it('jueves 10:29 (antes de abrir): cerrado, abre hoy a las 10:30', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-10-15T08:29:00Z'), TZ)).toEqual({
      state: 'closed',
      next: { day: 4, time: '10:30', today: true },
    });
  });

  it('domingo 08:59 (antes de abrir): abre hoy a las 9:00 (sin cero inicial)', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-10-18T06:59:00Z'), TZ)).toEqual({
      state: 'closed',
      next: { day: 0, time: '9:00', today: true },
    });
  });

  it('justo en el cierre (jueves 14:30) ya está cerrado; abre el viernes a las 10:30', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-10-15T12:30:00Z'), TZ)).toEqual({
      state: 'closed',
      next: { day: 5, time: '10:30', today: false },
    });
  });

  it('viernes tras el cierre: abre el sábado a las 9:00', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-10-16T13:00:00Z'), TZ)).toEqual({
      state: 'closed',
      next: { day: 6, time: '9:00', today: false },
    });
  });

  it('sábado a las 15:00 (cierre): abre el domingo a las 9:00', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-10-17T13:00:00Z'), TZ)).toEqual({
      state: 'closed',
      next: { day: 0, time: '9:00', today: false },
    });
  });

  it('[H9] domingo tras el cierre: salta lunes y martes (cerrados) y miércoles (encargos) y abre el jueves a las 10:30', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-10-18T13:00:00Z'), TZ)).toEqual({
      state: 'closed',
      next: { day: 4, time: '10:30', today: false },
    });
  });

  it('de madrugada (viernes 00:30 Madrid, aún jueves en UTC) cuenta como viernes antes de abrir', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-10-15T22:30:00Z'), TZ)).toEqual({
      state: 'closed',
      next: { day: 5, time: '10:30', today: true },
    });
  });
});

describe('[AC-04] computeOpenState: lunes y martes cerrados todo el día (closedDay), miércoles solo encargos', () => {
  // Madrid en CEST (UTC+2) hasta el 25-oct-2026; el día civil de Madrid manda, no el de UTC.
  const closedDayNext = { state: 'closedDay', next: { day: 4, time: '10:30', today: false } };

  it('[H1] lunes 19-oct a las 00:00, 12:00 y 23:59 (Madrid): closedDay, próxima apertura el jueves 10:30', async () => {
    const compute = await load();
    for (const iso of ['2026-10-18T22:00:00Z', '2026-10-19T10:00:00Z', '2026-10-19T21:59:00Z']) {
      expect(compute(hours, at(iso), TZ), iso).toEqual(closedDayNext);
    }
  });

  it('[H2] martes 20-oct a las 00:00, 12:00 y 23:59 (Madrid): closedDay, próxima apertura el jueves 10:30', async () => {
    const compute = await load();
    for (const iso of ['2026-10-19T22:00:00Z', '2026-10-20T10:00:00Z', '2026-10-20T21:59:00Z']) {
      expect(compute(hours, at(iso), TZ), iso).toEqual(closedDayNext);
    }
  });

  it('[H3] martes 23:59 sigue closedDay; miércoles 00:00 (22:00Z, medianoche de Madrid) ya es orders', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-10-20T21:59:00Z'), TZ)).toEqual(closedDayNext);
    expect(compute(hours, at('2026-10-20T22:00:00Z'), TZ)).toEqual({ state: 'orders' });
  });

  it('[H4][caracterización] miércoles 21-oct a cualquier hora (00:00, 12:00, 23:59): orders; nunca open, closed ni closedDay', async () => {
    const compute = await load();
    for (const iso of ['2026-10-20T22:00:00Z', '2026-10-21T10:00:00Z', '2026-10-21T21:59:00Z']) {
      expect(compute(hours, at(iso), TZ), iso).toEqual({ state: 'orders' });
    }
  });

  it('[H4][caracterización] jueves 00:00 (22:00Z del miércoles): el miércoles ha terminado, vuelve a ser día con horario', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-10-21T22:00:00Z'), TZ)).toEqual({
      state: 'closed',
      next: { day: 4, time: '10:30', today: true },
    });
  });

  it('closedDay no es unknown ni orders: lunes 12:00 nunca devuelve esos estados', async () => {
    const compute = await load();
    const r = compute(hours, at('2026-10-19T10:00:00Z'), TZ);
    expect(r.state).toBe('closedDay');
    expect(['unknown', 'orders', 'closed', 'open']).not.toContain(r.state);
  });

  it('[H13][caracterización] sin ningún día con horario de apertura de local el resultado es unknown (reserva), también en día cerrado', async () => {
    const compute = await load();
    const noOpening: Record<number, Rule> = { 0: { kind: 'closed' }, 1: { kind: 'closed' }, 2: { kind: 'closed' }, 3: { kind: 'orders' }, 4: { kind: 'closed' }, 5: { kind: 'closed' }, 6: { kind: 'closed' } };
    expect(compute(noOpening, at('2026-10-19T10:00:00Z'), TZ)).toEqual({ state: 'unknown' }); // lunes cerrado
    expect(compute(noOpening, at('2026-10-17T10:00:00Z'), TZ)).toEqual({ state: 'unknown' }); // sábado cerrado
    const none: Record<number, Rule> = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, { kind: 'unknown' } as Rule]));
    expect(compute(none, at('2026-10-15T10:00:00Z'), TZ)).toEqual({ state: 'unknown' });
  });

  it('[H14] la próxima apertura desde un día cerrado nunca es hoy (today = false) a ninguna hora de lunes o martes', async () => {
    const compute = await load();
    for (const dayStart of ['2026-10-18T22:00:00Z', '2026-10-19T22:00:00Z']) {
      for (let h = 0; h < 24; h++) {
        const r = compute(hours, new Date(new Date(dayStart).getTime() + h * 3600_000), TZ);
        expect(r.state).toBe('closedDay');
        if (r.state === 'closedDay') expect(r.next.today).toBe(false);
      }
    }
  });

  it('un día cerrado con otra configuración: la próxima apertura es el siguiente día con horario de local, saltando cerrados y encargos', async () => {
    const compute = await load();
    const custom: Record<number, Rule> = { ...hours, 4: { kind: 'closed' }, 5: { kind: 'orders' }, 6: { kind: 'open', open: '08:00', close: '12:00' } };
    expect(compute(custom, at('2026-10-19T10:00:00Z'), TZ)).toEqual({
      state: 'closedDay',
      next: { day: 6, time: '8:00', today: false },
    });
  });

  it('[caracterización] tras cerrar el domingo y con lunes/martes cerrados, el cambio a medianoche no usa UTC: domingo 23:59 sigue siendo "closed" (hay horario ese día)', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-10-18T21:59:00Z'), TZ)).toEqual({
      state: 'closed',
      next: { day: 4, time: '10:30', today: false },
    });
  });
});

describe('[AC-08] src/data/hours.ts: horario publicado con tipo de día cerrado', () => {
  const loadData = async () => await import('../../../src/data/hours');

  it('lunes (1) y martes (2) son del tipo de día cerrado `closed`', async () => {
    const { hours: published } = await loadData();
    expect(published[1]).toEqual({ kind: 'closed' });
    expect(published[2]).toEqual({ kind: 'closed' });
  });

  it('[caracterización] miércoles es orders; jueves y viernes 10:30-14:30; sábado y domingo 09:00-15:00', async () => {
    const { hours: published } = await loadData();
    expect(published[3]).toEqual({ kind: 'orders' });
    expect(published[4]).toEqual({ kind: 'open', open: '10:30', close: '14:30' });
    expect(published[5]).toEqual({ kind: 'open', open: '10:30', close: '14:30' });
    expect(published[6]).toEqual({ kind: 'open', open: '09:00', close: '15:00' });
    expect(published[0]).toEqual({ kind: 'open', open: '09:00', close: '15:00' });
  });

  it('ningún día queda en `unknown`', async () => {
    const { hours: published } = await loadData();
    expect(Object.keys(published).sort()).toEqual(['0', '1', '2', '3', '4', '5', '6']);
    expect(Object.values(published).filter((rule) => rule.kind === 'unknown')).toEqual([]);
  });

  it('[caracterización] zona Europe/Madrid, orden de tabla lunes a domingo y nombres schema.org por getDay()', async () => {
    const { timezone, weekOrder, schemaDay } = await loadData();
    expect(timezone).toBe('Europe/Madrid');
    expect([...weekOrder]).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect([...schemaDay]).toEqual(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  });

  it('con el horario publicado, el lunes a mediodía de Madrid es closedDay (los datos y la lógica casan)', async () => {
    const { hours: published, timezone } = await loadData();
    const compute = await load();
    expect(compute(published, at('2026-10-19T10:00:00Z'), timezone)).toEqual({
      state: 'closedDay',
      next: { day: 4, time: '10:30', today: false },
    });
  });
});

describe('[AC-05] computeOpenState: cambios de hora de España', () => {
  it('29-mar-2026 (domingo, CET -> CEST): 06:30Z son las 08:30, cerrado; abre hoy a las 9:00', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-03-29T06:30:00Z'), TZ)).toEqual({
      state: 'closed',
      next: { day: 0, time: '9:00', today: true },
    });
  });

  it('29-mar-2026: 07:00Z son las 09:00 CEST, abierto hasta las 15:00', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-03-29T07:00:00Z'), TZ)).toEqual({ state: 'open', until: '15:00' });
  });

  it('29-mar-2026: 12:59Z son las 14:59 CEST (abierto) y 13:00Z las 15:00 (cerrado)', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-03-29T12:59:00Z'), TZ).state).toBe('open');
    expect(compute(hours, at('2026-03-29T13:00:00Z'), TZ).state).toBe('closed');
  });

  it('25-oct-2026 (domingo, CEST -> CET): 07:30Z son las 08:30 CET, cerrado; abre hoy a las 9:00', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-10-25T07:30:00Z'), TZ)).toEqual({
      state: 'closed',
      next: { day: 0, time: '9:00', today: true },
    });
  });

  it('25-oct-2026: 08:00Z son las 09:00 CET, abierto hasta las 15:00', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-10-25T08:00:00Z'), TZ)).toEqual({ state: 'open', until: '15:00' });
  });

  it('25-oct-2026: 13:59Z son las 14:59 CET (abierto) y 14:00Z las 15:00 (cerrado)', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-10-25T13:59:00Z'), TZ).state).toBe('open');
    expect(compute(hours, at('2026-10-25T14:00:00Z'), TZ).state).toBe('closed');
  });
});

describe('[AC-05][H11] cambios de hora de España con el cierre de lunes y martes', () => {
  it('[H11] domingo 25-oct (día de 25 h): abre a las 9:00 CET y cierra a las 15:00 CET; el lunes 26-oct sigue closedDay', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-10-25T08:00:00Z'), TZ)).toEqual({ state: 'open', until: '15:00' });
    expect(compute(hours, at('2026-10-25T14:00:00Z'), TZ)).toEqual({
      state: 'closed',
      next: { day: 4, time: '10:30', today: false },
    });
    for (const iso of ['2026-10-25T23:00:00Z', '2026-10-26T11:00:00Z', '2026-10-26T22:59:00Z']) {
      expect(compute(hours, at(iso), TZ), iso).toEqual({ state: 'closedDay', next: { day: 4, time: '10:30', today: false } });
    }
  });

  it('[H11] con CET (UTC+1) el martes termina a las 22:59Z y el miércoles empieza a las 23:00Z', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-10-27T22:59:00Z'), TZ).state).toBe('closedDay');
    expect(compute(hours, at('2026-10-27T23:00:00Z'), TZ)).toEqual({ state: 'orders' });
  });

  it('29-mar-2026 (CET -> CEST): el domingo 29 abre a las 9:00 CEST; el lunes 30 es closedDay y empieza a las 22:00Z', async () => {
    const compute = await load();
    expect(compute(hours, at('2026-03-29T07:00:00Z'), TZ)).toEqual({ state: 'open', until: '15:00' });
    expect(compute(hours, at('2026-03-29T21:59:00Z'), TZ).state).toBe('closed'); // domingo 23:59 CEST
    expect(compute(hours, at('2026-03-29T22:00:00Z'), TZ)).toEqual({ state: 'closedDay', next: { day: 4, time: '10:30', today: false } });
  });
});

describe('[AC-06] computeOpenState: reloj y zona horaria inyectados, función pura', () => {
  it('usa la zona recibida: el mismo instante da estados distintos en Madrid y en Nueva York', async () => {
    const compute = await load();
    const instant = at('2026-10-15T10:00:00Z'); // jueves 12:00 Madrid, 06:00 Nueva York
    expect(compute(hours, instant, TZ).state).toBe('open');
    expect(compute(hours, instant, 'America/New_York')).toEqual({
      state: 'closed',
      next: { day: 4, time: '10:30', today: true },
    });
  });

  it('[H12] el lunes de Madrid es closedDay aunque en Nueva York todavía sea domingo (lunes 00:30 Madrid = domingo 18:30 NY)', async () => {
    const compute = await load();
    const instant = at('2026-10-18T22:30:00Z');
    expect(compute(hours, instant, TZ).state).toBe('closedDay');
    // En Nueva York es domingo 18:30: ya cerrado (cierra a las 15:00) y abre el jueves; no es un día cerrado.
    expect(compute(hours, instant, 'America/New_York')).toEqual({ state: 'closed', next: { day: 4, time: '10:30', today: false } });
  });

  it('no lee el reloj del sistema: el resultado no cambia si Date.now/new Date() apuntan a otro momento', async () => {
    const compute = await load();
    vi.useFakeTimers();
    vi.setSystemTime(at('2026-10-13T10:00:00Z')); // un martes
    expect(compute(hours, at('2026-10-15T10:00:00Z'), TZ)).toEqual({ state: 'open', until: '14:30' });
  });

  it('usa los horarios recibidos, no los publicados: un horario distinto cambia el resultado', async () => {
    const compute = await load();
    const custom: Record<number, Rule> = { ...hours, 4: { kind: 'open', open: '08:00', close: '09:00' } };
    expect(compute(custom, at('2026-10-15T10:00:00Z'), TZ)).toEqual({
      state: 'closed',
      next: { day: 5, time: '10:30', today: false },
    });
  });

  it('no muta los horarios recibidos y es determinista', async () => {
    const compute = await load();
    const snapshot = JSON.stringify(hours);
    const a = compute(hours, at('2026-10-15T10:00:00Z'), TZ);
    const b = compute(hours, at('2026-10-15T10:00:00Z'), TZ);
    expect(a).toEqual(b);
    expect(JSON.stringify(hours)).toBe(snapshot);
  });
});

describe('[AC-07] formatOpenLabel: textos de interfaz (con closedDay)', () => {
  const text = {
    open: 'Obert ara · fins a les {time}',
    closed: 'Tancat · obrim {day} a les {time}',
    closedDay: 'Tancat avui · obrim {day} a les {time}',
    orders: 'Només encàrrecs · truca abans',
    unknown: 'Consulta els horaris',
    today: 'avui',
  };
  const days = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
  const label = async (state: unknown) => (await mod()).formatOpenLabel(state as never, text, days);

  it('[caracterización] abierto: sustituye {time} por la hora de cierre', async () => {
    expect(await label({ state: 'open', until: '14:30' })).toBe('Obert ara · fins a les 14:30');
  });

  it('[caracterización] cerrado hoy: usa el texto «avui» como día', async () => {
    expect(await label({ state: 'closed', next: { day: 4, time: '10:30', today: true } })).toBe('Tancat · obrim avui a les 10:30');
  });

  it('[caracterización] cerrado otro día: usa el nombre del día indicado por su índice', async () => {
    expect(await label({ state: 'closed', next: { day: 4, time: '10:30', today: false } })).toBe('Tancat · obrim dijous a les 10:30');
    expect(await label({ state: 'closed', next: { day: 0, time: '9:00', today: false } })).toBe('Tancat · obrim diumenge a les 9:00');
  });

  it('closedDay usa su propio texto («Tancat avui · obrim {day} a les {time}»), no el de closed', async () => {
    expect(await label({ state: 'closedDay', next: { day: 4, time: '10:30', today: false } })).toBe('Tancat avui · obrim dijous a les 10:30');
  });

  it('[caracterización] solo encargos y reserva usan su texto fijo', async () => {
    expect(await label({ state: 'orders' })).toBe('Només encàrrecs · truca abans');
    expect(await label({ state: 'unknown' })).toBe('Consulta els horaris');
  });
});

describe('[AC-09] textos finales del indicador (AGENTS.md 7.1) con los diccionarios reales de i18n (las filas de open, closed y orders ya son verdes: caracterización; las de closedDay, rojas)', () => {
  const dicts = async () => {
    const [ca, es] = await Promise.all([import('../../../src/i18n/ca.json'), import('../../../src/i18n/es.json')]);
    return { ca: (ca.default ?? ca) as any, es: (es.default ?? es) as any };
  };
  const render = async (iso: string, lang: 'ca' | 'es') => {
    const { computeOpenState, formatOpenLabel } = await mod();
    const d = (await dicts())[lang];
    return formatOpenLabel(computeOpenState(hours, at(iso), TZ), d.openNow, d.days);
  };
  const rows: [string, string, string, string][] = [
    ['[H1] lunes 00:00', '2026-10-18T22:00:00Z', 'Tancat avui · obrim dijous a les 10:30', 'Cerrado hoy · abrimos el jueves a las 10:30'],
    ['[H1] lunes 12:00', '2026-10-19T10:00:00Z', 'Tancat avui · obrim dijous a les 10:30', 'Cerrado hoy · abrimos el jueves a las 10:30'],
    ['[H1] lunes 23:59', '2026-10-19T21:59:00Z', 'Tancat avui · obrim dijous a les 10:30', 'Cerrado hoy · abrimos el jueves a las 10:30'],
    ['[H2] martes 12:00', '2026-10-20T10:00:00Z', 'Tancat avui · obrim dijous a les 10:30', 'Cerrado hoy · abrimos el jueves a las 10:30'],
    ['[H3] martes 23:59', '2026-10-20T21:59:00Z', 'Tancat avui · obrim dijous a les 10:30', 'Cerrado hoy · abrimos el jueves a las 10:30'],
    ['[H3] miércoles 00:00', '2026-10-20T22:00:00Z', 'Només encàrrecs · truca abans', 'Solo encargos · llama antes'],
    ['[H4] miércoles 12:00', '2026-10-21T10:00:00Z', 'Només encàrrecs · truca abans', 'Solo encargos · llama antes'],
    ['[H5] jueves 00:00', '2026-10-21T22:00:00Z', 'Tancat · obrim avui a les 10:30', 'Cerrado · abrimos hoy a las 10:30'],
    ['[H5] jueves 10:29', '2026-10-22T08:29:00Z', 'Tancat · obrim avui a les 10:30', 'Cerrado · abrimos hoy a las 10:30'],
    ['[H6] jueves 10:30', '2026-10-22T08:30:00Z', 'Obert ara · fins a les 14:30', 'Abierto ahora · hasta las 14:30'],
    ['[H6] jueves 14:29', '2026-10-22T12:29:00Z', 'Obert ara · fins a les 14:30', 'Abierto ahora · hasta las 14:30'],
    ['[H7] jueves 14:30', '2026-10-22T12:30:00Z', 'Tancat · obrim divendres a les 10:30', 'Cerrado · abrimos el viernes a las 10:30'],
    ['[H8] viernes 14:30', '2026-10-23T12:30:00Z', 'Tancat · obrim dissabte a les 9:00', 'Cerrado · abrimos el sábado a las 9:00'],
    ['[H9] domingo 15:00', '2026-10-18T13:00:00Z', 'Tancat · obrim dijous a les 10:30', 'Cerrado · abrimos el jueves a las 10:30'],
    ['[H9] domingo 23:59', '2026-10-18T21:59:00Z', 'Tancat · obrim dijous a les 10:30', 'Cerrado · abrimos el jueves a las 10:30'],
    ['[H10] sábado 15:00', '2026-10-17T13:00:00Z', 'Tancat · obrim diumenge a les 9:00', 'Cerrado · abrimos el domingo a las 9:00'],
    ['[H11] lunes 26-oct (CET) 12:00', '2026-10-26T11:00:00Z', 'Tancat avui · obrim dijous a les 10:30', 'Cerrado hoy · abrimos el jueves a las 10:30'],
  ];
  for (const [name, iso, ca, es] of rows) {
    it(`${name}: CA «${ca}» / ES «${es}»`, async () => {
      expect(await render(iso, 'ca')).toBe(ca);
      expect(await render(iso, 'es')).toBe(es);
    });
  }

  it('los diccionarios definen openNow.closedDay en ca y es (clave del contrato de OpenNowText)', async () => {
    const { ca, es } = await dicts();
    expect(ca.openNow.closedDay).toBe('Tancat avui · obrim {day} a les {time}');
    expect(es.openNow.closedDay).toBe('Cerrado hoy · abrimos {day} a las {time}');
  });
});
