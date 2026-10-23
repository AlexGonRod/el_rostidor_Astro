/**
 * Contrato de horarios en la interfaz: lunes y martes cerrados todo el día, miércoles solo encargos
 * (AGENTS.md 5, 7.1 y 6.4). Criterios H1..H14 de 7.1 vistos desde el navegador con reloj controlado
 * (page.clock.install) y zona del navegador distinta de Madrid: el texto depende de Europe/Madrid.
 * Indicador: `[data-open-now]` (atributo data-state = estado del módulo) y `[data-open-now-text]` (texto), ya existentes.
 * Tabla de horarios: filas del `<table>` de #contacte (celda de cabecera de fila + celda de valor).
 */
import { test, expect, type Browser } from '@playwright/test';

type Lang = 'ca' | 'es';
const paths: Record<Lang, string> = { ca: '/', es: '/es/' };

interface Case {
  name: string;
  iso: string;
  tz: string;
  state: 'open' | 'closed' | 'closedDay' | 'orders';
  ca: string;
  es: string;
}
const CLOSED_DAY_CA = 'Tancat avui · obrim dijous a les 10:30';
const CLOSED_DAY_ES = 'Cerrado hoy · abrimos el jueves a las 10:30';
const ORDERS_CA = 'Només encàrrecs · truca abans';
const ORDERS_ES = 'Solo encargos · llama antes';

const cases: Case[] = [
  { name: '[H1] lunes 00:00 Madrid', iso: '2026-10-18T22:00:00Z', tz: 'America/New_York', state: 'closedDay', ca: CLOSED_DAY_CA, es: CLOSED_DAY_ES },
  { name: '[H1] lunes 12:00 Madrid', iso: '2026-10-19T10:00:00Z', tz: 'UTC', state: 'closedDay', ca: CLOSED_DAY_CA, es: CLOSED_DAY_ES },
  { name: '[H1] lunes 23:59 Madrid', iso: '2026-10-19T21:59:00Z', tz: 'Asia/Tokyo', state: 'closedDay', ca: CLOSED_DAY_CA, es: CLOSED_DAY_ES },
  { name: '[H2] martes 00:00 Madrid', iso: '2026-10-19T22:00:00Z', tz: 'UTC', state: 'closedDay', ca: CLOSED_DAY_CA, es: CLOSED_DAY_ES },
  { name: '[H2] martes 12:00 Madrid', iso: '2026-10-20T10:00:00Z', tz: 'Pacific/Auckland', state: 'closedDay', ca: CLOSED_DAY_CA, es: CLOSED_DAY_ES },
  { name: '[H3] martes 23:59 Madrid', iso: '2026-10-20T21:59:00Z', tz: 'UTC', state: 'closedDay', ca: CLOSED_DAY_CA, es: CLOSED_DAY_ES },
  { name: '[H3] miércoles 00:00 Madrid', iso: '2026-10-20T22:00:00Z', tz: 'America/Los_Angeles', state: 'orders', ca: ORDERS_CA, es: ORDERS_ES },
  { name: '[H4] miércoles 12:00 Madrid', iso: '2026-10-21T10:00:00Z', tz: 'UTC', state: 'orders', ca: ORDERS_CA, es: ORDERS_ES },
  { name: '[H4] miércoles 23:59 Madrid', iso: '2026-10-21T21:59:00Z', tz: 'Asia/Tokyo', state: 'orders', ca: ORDERS_CA, es: ORDERS_ES },
  { name: '[H5] jueves 00:00 Madrid', iso: '2026-10-21T22:00:00Z', tz: 'UTC', state: 'closed', ca: 'Tancat · obrim avui a les 10:30', es: 'Cerrado · abrimos hoy a las 10:30' },
  { name: '[H5] jueves 10:29 Madrid', iso: '2026-10-22T08:29:00Z', tz: 'America/New_York', state: 'closed', ca: 'Tancat · obrim avui a les 10:30', es: 'Cerrado · abrimos hoy a las 10:30' },
  { name: '[H6] jueves 10:30 Madrid', iso: '2026-10-22T08:30:00Z', tz: 'UTC', state: 'open', ca: 'Obert ara · fins a les 14:30', es: 'Abierto ahora · hasta las 14:30' },
  { name: '[H6] jueves 14:29 Madrid', iso: '2026-10-22T12:29:00Z', tz: 'Asia/Tokyo', state: 'open', ca: 'Obert ara · fins a les 14:30', es: 'Abierto ahora · hasta las 14:30' },
  { name: '[H7] jueves 14:30 Madrid', iso: '2026-10-22T12:30:00Z', tz: 'UTC', state: 'closed', ca: 'Tancat · obrim divendres a les 10:30', es: 'Cerrado · abrimos el viernes a las 10:30' },
  { name: '[H8] viernes 14:30 Madrid', iso: '2026-10-23T12:30:00Z', tz: 'UTC', state: 'closed', ca: 'Tancat · obrim dissabte a les 9:00', es: 'Cerrado · abrimos el sábado a las 9:00' },
  { name: '[H9] domingo 15:00 Madrid', iso: '2026-10-18T13:00:00Z', tz: 'Pacific/Auckland', state: 'closed', ca: 'Tancat · obrim dijous a les 10:30', es: 'Cerrado · abrimos el jueves a las 10:30' },
  { name: '[H9] domingo 23:59 Madrid', iso: '2026-10-18T21:59:00Z', tz: 'UTC', state: 'closed', ca: 'Tancat · obrim dijous a les 10:30', es: 'Cerrado · abrimos el jueves a las 10:30' },
  { name: '[H10] sábado 15:00 Madrid', iso: '2026-10-17T13:00:00Z', tz: 'UTC', state: 'closed', ca: 'Tancat · obrim diumenge a les 9:00', es: 'Cerrado · abrimos el domingo a las 9:00' },
  { name: '[H11] domingo 25-oct 09:00 Madrid (cambio de hora)', iso: '2026-10-25T08:00:00Z', tz: 'America/Los_Angeles', state: 'open', ca: 'Obert ara · fins a les 15:00', es: 'Abierto ahora · hasta las 15:00' },
  { name: '[H11] lunes 26-oct 12:00 Madrid (CET)', iso: '2026-10-26T11:00:00Z', tz: 'UTC', state: 'closedDay', ca: CLOSED_DAY_CA, es: CLOSED_DAY_ES },
  { name: '[H12] lunes 00:30 Madrid con el navegador aún en domingo (Nueva York)', iso: '2026-10-18T22:30:00Z', tz: 'America/New_York', state: 'closedDay', ca: CLOSED_DAY_CA, es: CLOSED_DAY_ES },
];

async function openAt(browser: Browser, baseURL: string | undefined, lang: Lang, iso: string, tz: string) {
  const ctx = await browser.newContext({ baseURL, timezoneId: tz });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date(iso) });
  await page.goto(paths[lang]);
  return { ctx, page };
}

for (const lang of ['ca', 'es'] as const) {
  for (const c of cases) {
    test(`(${lang}) indicador ${c.name}, navegador en ${c.tz}: «${c[lang]}»`, async ({ browser, baseURL, isMobile }) => {
      test.skip(isMobile, 'lógica horaria: basta el proyecto de escritorio');
      const { ctx, page } = await openAt(browser, baseURL, lang, c.iso, c.tz);
      const indicator = page.locator('[data-open-now]').first();
      await expect(indicator).toHaveAttribute('data-state', c.state);
      await expect(indicator.locator('[data-open-now-text]')).toHaveText(c[lang]);
      await ctx.close();
    });
  }

  test(`[H1][H14] (${lang}) un día cerrado nunca dice «abrimos hoy», ni «Obert ara», ni «Consulta els horaris»`, async ({ browser, baseURL, isMobile }) => {
    test.skip(isMobile, 'lógica horaria: basta el proyecto de escritorio');
    for (const iso of ['2026-10-19T10:00:00Z', '2026-10-20T10:00:00Z']) {
      const { ctx, page } = await openAt(browser, baseURL, lang, iso, 'UTC');
      const text = (await page.locator('[data-open-now-text]').first().textContent()) ?? '';
      expect(text).not.toMatch(/obrim avui|abrimos hoy|Obert ara|Abierto ahora|Consulta/);
      expect(text).toMatch(/^(Tancat avui|Cerrado hoy)/);
      await ctx.close();
    }
  });

  test(`[H3] (${lang}) el cambio de martes a miércoles ocurre a medianoche de Madrid con la página abierta (actualización por minuto)`, async ({ browser, baseURL, isMobile }) => {
    test.skip(isMobile, 'lógica horaria: basta el proyecto de escritorio');
    const { ctx, page } = await openAt(browser, baseURL, lang, '2026-10-20T21:59:30Z', 'UTC'); // martes 23:59:30 Madrid
    const indicator = page.locator('[data-open-now]').first();
    await expect(indicator).toHaveAttribute('data-state', 'closedDay');
    await page.clock.fastForward(61_000);
    await expect(indicator).toHaveAttribute('data-state', 'orders');
    await expect(indicator.locator('[data-open-now-text]')).toHaveText(lang === 'ca' ? ORDERS_CA : ORDERS_ES);
    await ctx.close();
  });

  test(`[7.1] (${lang}) el punto verde solo aparece en «abierto»; en día cerrado y solo encargos el punto es neutro`, async ({ browser, baseURL, isMobile }) => {
    test.skip(isMobile, 'lógica horaria: basta el proyecto de escritorio');
    const dot = async (iso: string) => {
      const { ctx, page } = await openAt(browser, baseURL, lang, iso, 'UTC');
      const color = await page.locator('[data-open-now] [aria-hidden="true"]').first().evaluate((el) => getComputedStyle(el).backgroundColor);
      await ctx.close();
      return color;
    };
    expect(await dot('2026-10-22T09:00:00Z')).toBe('rgb(63, 184, 104)'); // jueves 11:00: abierto, #3FB868
    expect(await dot('2026-10-19T10:00:00Z')).not.toBe('rgb(63, 184, 104)'); // lunes: cerrado todo el día
    expect(await dot('2026-10-21T10:00:00Z')).not.toBe('rgb(63, 184, 104)'); // miércoles: solo encargos
  });

  test(`[7.1] (${lang}) un cambio de estado se anuncia de forma educada (aria-live polite o role=status), sin robar el foco`, async ({ browser, baseURL, isMobile }) => {
    test.skip(isMobile, 'criterio de escritorio');
    const { ctx, page } = await openAt(browser, baseURL, lang, '2026-10-22T12:29:30Z', 'UTC');
    const announced = await page.locator('[data-open-now-text]').first().evaluate((el) => {
      for (let n: Element | null = el; n; n = n.parentElement) {
        if (n.getAttribute('aria-live') === 'polite' || n.getAttribute('role') === 'status') return true;
      }
      return false;
    });
    expect(announced).toBe(true);
    await ctx.close();
  });

  test(`[7.1] (${lang}) sin JavaScript el indicador no afirma «abierto» ni «cerrado» y la tabla de horarios está completa`, async ({ browser, baseURL, isMobile }) => {
    test.skip(isMobile, 'criterio de escritorio');
    const ctx = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await ctx.newPage();
    await page.goto(paths[lang]);
    await expect(page.locator('[data-open-now-text]').first()).toHaveText(lang === 'ca' ? 'Horaris i encàrrecs' : 'Horarios y encargos');
    await expect(page.locator('#contacte table tr')).toHaveCount(7);
    await expect(page.locator('#contacte table')).toContainText(lang === 'ca' ? 'Dilluns' : 'Lunes');
    await ctx.close();
  });

  test(`[7.1] (${lang}) tabla de horarios: de lunes a domingo, «${lang === 'ca' ? 'Tancat' : 'Cerrado'}» el lunes y el martes, sin marcadores pendientes`, async ({ page }) => {
    await page.goto(paths[lang]);
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll('#contacte table tr')].map((tr) => ({
        cells: [...tr.querySelectorAll('th, td')].map((cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim()),
        placeholder: !!tr.querySelector('[data-placeholder]'),
      })),
    );
    const expected =
      lang === 'ca'
        ? [
            ['Dilluns', 'Tancat'],
            ['Dimarts', 'Tancat'],
            ['Dimecres', 'Només encàrrecs, trucant abans'],
            ['Dijous', '10:30 a 14:30'],
            ['Divendres', '10:30 a 14:30'],
            ['Dissabte', '9:00 a 15:00'],
            ['Diumenge i festius', '9:00 a 15:00'],
          ]
        : [
            ['Lunes', 'Cerrado'],
            ['Martes', 'Cerrado'],
            ['Miércoles', 'Solo encargos, llamando antes'],
            ['Jueves', '10:30 a 14:30'],
            ['Viernes', '10:30 a 14:30'],
            ['Sábado', '9:00 a 15:00'],
            ['Domingo y festivos', '9:00 a 15:00'],
          ];
    expect(rows.map((r) => r.cells)).toEqual(expected);
    expect(rows.filter((r) => r.placeholder)).toEqual([]);
    expect(await page.locator('#contacte table').textContent()).not.toContain('[');
  });

  test(`[7.1] (${lang}) pie: 4 líneas de horario, con lunes y martes cerrados`, async ({ page }) => {
    await page.goto(paths[lang]);
    const lines =
      lang === 'ca'
        ? ['Dl i dt: tancat', 'Dc: només encàrrecs', 'Dj i dv: 10:30 a 14:30', 'Ds, dg i festius: 9:00 a 15:00']
        : ['Lun y mar: cerrado', 'Mié: solo encargos', 'Jue y vie: 10:30 a 14:30', 'Sáb, dom y festivos: 9:00 a 15:00'];
    const footer = page.locator('footer');
    for (const line of lines) await expect(footer.getByText(line, { exact: true })).toHaveCount(1);
    // Las líneas antiguas («Dt i dc: només encàrrecs» / «Mar y mié: solo encargos») ya no existen.
    await expect(footer.getByText(/^(Dt i dc|Mar y mié):/)).toHaveCount(0);
  });

  test(`[7.1] (${lang}) «Cómo encargar»: el paso 2 informa de lunes y martes cerrados y de los miércoles solo bajo encargo`, async ({ page }) => {
    await page.goto(paths[lang]);
    const text = lang === 'ca' ? 'Dilluns i dimarts, tancat. Els dimecres, només sota encàrrec.' : 'Lunes y martes, cerrado. Los miércoles, solo bajo encargo.';
    await expect(page.locator('#encarrega').getByText(text, { exact: true })).toHaveCount(1);
    await expect(page.locator('#encarrega')).not.toContainText(lang === 'ca' ? 'Els dimarts i dimecres' : 'Los martes y miércoles');
  });

  test(`[7.1] (${lang}) JSON-LD: openingHoursSpecification solo con jueves, viernes, sábado y domingo`, async ({ page }) => {
    await page.goto(paths[lang]);
    const days = await page.evaluate(() => {
      const spec = [...document.querySelectorAll('script[type="application/ld+json"]')]
        .map((s) => JSON.parse(s.textContent ?? '{}'))
        .flatMap((d) => (Array.isArray(d) ? d : [d]))
        .flatMap((d) => d.openingHoursSpecification ?? []);
      return spec.map((s: { dayOfWeek: string; opens: string; closes: string }) => `${s.dayOfWeek} ${s.opens}-${s.closes}`);
    });
    expect(days.sort()).toEqual(['Friday 10:30-14:30', 'Saturday 09:00-15:00', 'Sunday 09:00-15:00', 'Thursday 10:30-14:30']);
  });
}
