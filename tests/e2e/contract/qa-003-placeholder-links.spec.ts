/**
 * [QA-003] Ningún enlace «vacío» (href="#") puede quedar sin marcar como pendiente (AGENTS.md §6.3.1 y §12).
 * Un enlace que aún no tiene destino (reseñas de Google, avisos legales) debe llevar data-placeholder
 * (en el propio enlace o en un ancestro) para que `npm run check:release` lo detecte.
 * Las anclas internas reales (#carta...) no se ven afectadas.
 */
import { test, expect } from '@playwright/test';

const pages = [
  { lang: 'ca', path: '/' },
  { lang: 'es', path: '/es/' },
];

for (const { lang, path } of pages) {
  test(`[QA-003] (${lang}) no hay enlaces href="#" sin data-placeholder`, async ({ page }) => {
    await page.goto(path);
    const bare = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLAnchorElement>('a[href="#"]')]
        .filter((a) => !a.closest('[data-placeholder]'))
        .map((a) => (a.textContent ?? '').trim()),
    );
    expect(bare).toEqual([]);
  });
}
