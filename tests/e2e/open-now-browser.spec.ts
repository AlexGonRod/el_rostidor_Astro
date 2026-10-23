/**
 * QA: «Obert ara» en el navegador con reloj controlado (script de OpenNow.astro + src/lib/open-now.ts).
 * El resultado debe depender de Europe/Madrid, no de la zona del navegador.
 */
import { test, expect } from '@playwright/test';

const cases: { name: string; iso: string; tz: string; ca: RegExp; es: RegExp; state: string }[] = [
  { name: 'jueves 11:00 Madrid (abierto)', iso: '2026-10-15T09:00:00Z', tz: 'UTC', ca: /^Obert ara · fins a les 14:30$/, es: /^Abierto ahora · hasta las 14:30$/, state: 'open' },
  { name: 'jueves 10:29 Madrid (justo antes de abrir)', iso: '2026-10-15T08:29:00Z', tz: 'UTC', ca: /^Tancat · obrim avui a les 10:30$/, es: /^Cerrado · abrimos hoy a las 10:30$/, state: 'closed' },
  { name: 'jueves 10:30 Madrid (apertura exacta)', iso: '2026-10-15T08:30:00Z', tz: 'UTC', ca: /^Obert ara · fins a les 14:30$/, es: /Abierto ahora/, state: 'open' },
  { name: 'jueves 14:30 Madrid (cierre exacto)', iso: '2026-10-15T12:30:00Z', tz: 'UTC', ca: /^Tancat · obrim divendres a les 10:30$/, es: /^Cerrado · abrimos el viernes a las 10:30$/, state: 'closed' },
  { name: 'martes 12:00 Madrid (cerrado todo el día, AGENTS 6.4 y 7.1 H2)', iso: '2026-10-13T10:00:00Z', tz: 'UTC', ca: /^Tancat avui · obrim dijous a les 10:30$/, es: /^Cerrado hoy · abrimos el jueves a las 10:30$/, state: 'closedDay' },
  { name: 'lunes 12:00 Madrid (cerrado todo el día, AGENTS 6.4 y 7.1 H1)', iso: '2026-10-12T10:00:00Z', tz: 'UTC', ca: /^Tancat avui · obrim dijous a les 10:30$/, es: /^Cerrado hoy · abrimos el jueves a las 10:30$/, state: 'closedDay' },
  { name: 'martes 23:59 Madrid (H3, aún cerrado)', iso: '2026-10-20T21:59:00Z', tz: 'UTC', ca: /^Tancat avui · obrim dijous a les 10:30$/, es: /^Cerrado hoy · abrimos el jueves a las 10:30$/, state: 'closedDay' },
  { name: 'miércoles 00:00 Madrid (H3, solo encargos)', iso: '2026-10-20T22:00:00Z', tz: 'America/New_York', ca: /^Només encàrrecs · truca abans$/, es: /^Solo encargos · llama antes$/, state: 'orders' },
  { name: 'miércoles 12:00 Madrid (H4, solo encargos)', iso: '2026-10-21T10:00:00Z', tz: 'UTC', ca: /^Només encàrrecs · truca abans$/, es: /^Solo encargos · llama antes$/, state: 'orders' },
  { name: 'lunes 26-oct 2026 (H11, CET)', iso: '2026-10-26T11:00:00Z', tz: 'Asia/Tokyo', ca: /^Tancat avui · obrim dijous a les 10:30$/, es: /^Cerrado hoy · abrimos el jueves a las 10:30$/, state: 'closedDay' },
  { name: 'domingo 15:00 Madrid, tras cierre, sábado de zona Pacífico', iso: '2026-10-18T13:00:00Z', tz: 'Pacific/Auckland', ca: /^Tancat · obrim dijous a les 10:30$/, es: /^Cerrado · abrimos el jueves a las 10:30$/, state: 'closed' },
  { name: 'cambio de hora 25-oct 2026 (domingo 09:30 Madrid = 08:30Z)', iso: '2026-10-25T08:30:00Z', tz: 'America/Los_Angeles', ca: /^Obert ara · fins a les 15:00$/, es: /Abierto ahora/, state: 'open' },
  { name: 'cambio de hora 29-mar 2026 (domingo 09:30 Madrid = 07:30Z)', iso: '2026-03-29T07:30:00Z', tz: 'Asia/Tokyo', ca: /^Obert ara · fins a les 15:00$/, es: /Abierto ahora/, state: 'open' },
];

for (const lang of ['ca', 'es'] as const) {
  for (const c of cases) {
    test(`(${lang}) «Obert ara» ${c.name}, navegador en ${c.tz}`, async ({ browser, baseURL }) => {
      const ctx = await browser.newContext({ baseURL, timezoneId: c.tz });
      const page = await ctx.newPage();
      await page.clock.install({ time: new Date(c.iso) });
      await page.goto(lang === 'ca' ? '/' : '/es/');
      const el = page.locator('[data-open-now]').first();
      await expect(el).toHaveAttribute('data-state', c.state);
      await expect(el.locator('[data-open-now-text]')).toHaveText(lang === 'ca' ? c.ca : c.es);
      await ctx.close();
    });
  }
}

test('«Obert ara» se actualiza cada minuto al cruzar el cierre', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-10-15T12:29:30Z') }); // jueves 14:29:30 Madrid
  await page.goto('/');
  const el = page.locator('[data-open-now]').first();
  await expect(el).toHaveAttribute('data-state', 'open');
  await page.clock.fastForward(61_000);
  await expect(el).toHaveAttribute('data-state', 'closed');
  await ctx.close();
});

test('todos los indicadores «Obert ara» de la página muestran el mismo estado', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-10-15T09:00:00Z') });
  await page.goto('/');
  const texts = await page.locator('[data-open-now-text]').allTextContents();
  expect(texts.length).toBeGreaterThan(0);
  expect(new Set(texts).size).toBe(1);
  await ctx.close();
});

test('axe sin violaciones con «Obert ara» abierto y cerrado', async ({ browser, baseURL }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  for (const iso of ['2026-10-15T09:00:00Z', '2026-10-18T13:00:00Z']) {
    const ctx = await browser.newContext({ baseURL });
    const page = await ctx.newPage();
    await page.clock.install({ time: new Date(iso) });
    await page.goto('/');
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(r.violations.map((v) => v.id + ': ' + v.nodes[0]?.target.join(' '))).toEqual([]);
    await ctx.close();
  }
});
