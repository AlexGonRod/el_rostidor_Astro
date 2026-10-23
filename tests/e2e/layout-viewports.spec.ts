/**
 * QA ciclo 2 (regresión): maquetación en 320, 360, 390, 768, 1280 y 1920 px, en ca y es.
 * Detecta regresiones por los cambios de relleno (barra superior, cabecera, pie, FAQ, contacto):
 * desbordes, elementos fuera de pantalla, áreas táctiles, barra fija tapando contenido y axe AA.
 * Las capturas se guardan solo si SHOT_DIR está definido (revisión visual humana).
 * Se ejecuta solo en el proyecto «desktop»: el ancho se fija aquí.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const langs = [
  { lang: 'ca', path: '/' },
  { lang: 'es', path: '/es/' },
] as const;
const widths = [320, 360, 390, 768, 1280, 1920];
const heights: Record<number, number> = { 320: 640, 360: 800, 390: 844, 768: 1024, 1280: 800, 1920: 1080 };

const gotoAt = async (page: Page, path: string, w: number) => {
  await page.setViewportSize({ width: w, height: heights[w] });
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
};

for (const { lang, path } of langs) {
  for (const w of widths) {
    test.describe(`(${lang}) ${w}px`, () => {
      test.skip(({ isMobile }) => isMobile, 'el ancho se fija en el proyecto desktop');

      test('sin scroll horizontal ni elementos fuera del ancho visible', async ({ page }) => {
        await gotoAt(page, path, w);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        const outside = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          return [...document.querySelectorAll<HTMLElement>('header *, main *, footer *')]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              const cs = getComputedStyle(el);
              if (cs.display === 'none' || cs.visibility === 'hidden' || r.width === 0 || el.closest('[aria-hidden="true"], .sr-only, [inert]')) return false;
              if (el.closest('[class*="overflow-x"], .overflow-hidden, .overflow-x-auto')) return false;
              return r.right > vw + 1 || r.left < -1;
            })
            .slice(0, 8)
            .map((el) => `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''} ${Math.round(el.getBoundingClientRect().left)}..${Math.round(el.getBoundingClientRect().right)}`);
        });
        expect(outside).toEqual([]);
      });

      if (w <= 390) {
        test('enlaces, botones y resúmenes miden al menos 44x44 px', async ({ page }) => {
          await gotoAt(page, path, w);
          const small = await page.evaluate(() =>
            [...document.querySelectorAll<HTMLElement>('button, summary, a[href]')]
              .filter((el) => {
                const r = el.getBoundingClientRect();
                const cs = getComputedStyle(el);
                return cs.visibility !== 'hidden' && cs.display !== 'none' && r.width > 4 && r.height > 0 && (el.offsetParent !== null || cs.position === 'fixed') && !el.closest('p') && !el.closest('.sr-only') && !el.matches('.sr-only');
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

        test('la barra de acciones fija no tapa el final de la página', async ({ page }) => {
          await gotoAt(page, path, w);
          await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
          await expect.poll(() => page.evaluate(() => Math.round(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 1)).toBe(true);
          const res = await page.evaluate(() => {
            const fixed = [...document.querySelectorAll<HTMLElement>('body *')].filter((e) => getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().bottom >= window.innerHeight - 2);
            const bar = fixed.map((e) => e.getBoundingClientRect().top).sort((a, b) => a - b)[0];
            const foot = document.querySelector('footer')!.getBoundingClientRect();
            return { bar: bar ?? null, footBottom: foot.bottom, vh: window.innerHeight };
          });
          if (res.bar !== null) expect(res.footBottom).toBeLessThanOrEqual(res.bar + 1);
        });
      }

      test('axe sin violaciones WCAG 2.2 AA', async ({ page }) => {
        await gotoAt(page, path, w);
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
      });

      test('captura de la página completa (revisión visual)', async ({ page }) => {
        test.skip(!process.env.SHOT_DIR, 'solo con SHOT_DIR');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await gotoAt(page, path, w);
        await page.screenshot({ path: `${process.env.SHOT_DIR}/${lang}-${w}.png`, fullPage: true });
      });
    });
  }
}
