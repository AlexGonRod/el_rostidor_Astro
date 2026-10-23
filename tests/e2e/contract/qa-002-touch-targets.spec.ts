/**
 * [QA-002] Áreas táctiles >= 44 x 44 px en móvil (AGENTS.md §8 y §13).
 * Cubre todos los enlaces, botones y resúmenes de <details> visibles que no estén dentro de un párrafo
 * (selector CA/ES, wordmark y enlaces del pie, teléfono, email, enlaces legales, resumen de la FAQ...).
 * Se mide la caja del elemento interactivo; no depende de clases ni de la estructura del DOM.
 */
import { test, expect } from '@playwright/test';

const pages = [
  { lang: 'ca', path: '/' },
  { lang: 'es', path: '/es/' },
];

for (const { lang, path } of pages) {
  test(`[QA-002] (${lang}) enlaces y botones visibles miden al menos 44x44 px en móvil`, async ({ page, isMobile }) => {
    test.skip(!isMobile, 'criterio solo móvil');
    await page.goto(path);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('button, summary, a[href]')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return cs.visibility !== 'hidden' && cs.display !== 'none' && r.width > 4 && r.height > 0 && (el.offsetParent !== null || cs.position === 'fixed') && !el.closest('p');
        })
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { t: (el.textContent ?? '').trim().slice(0, 25) || el.getAttribute('aria-label') || el.getAttribute('href') || el.tagName, w: Math.round(r.width), h: Math.round(r.height) };
        })
        .filter(({ w, h }) => w < 44 || h < 44)
        .map(({ t, w, h }) => `${t} ${w}x${h}`),
    );
    expect(small).toEqual([]);
  });

  test(`[QA-002] (${lang}) el selector de idioma, el teléfono del pie y la FAQ son pulsables (44 px) en móvil`, async ({ page, isMobile }) => {
    test.skip(!isMobile, 'criterio solo móvil');
    await page.goto(path);
    const targets = [
      page.locator('[data-lang-switch]:visible'),
      page.locator('footer a[href^="tel:"]'),
      page.locator('footer a[href^="mailto:"]'),
      page.locator('#faq summary'),
    ];
    for (const loc of targets) {
      expect(await loc.count(), 'debe existir el elemento comprobado').toBeGreaterThan(0);
      for (const box of await loc.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.width, r.height]; }))) {
        expect(box[0]).toBeGreaterThanOrEqual(44);
        expect(box[1]).toBeGreaterThanOrEqual(44);
      }
    }
  });
}
