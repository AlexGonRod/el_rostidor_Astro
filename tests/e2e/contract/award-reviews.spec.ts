/**
 * Contrato del premio 2021 (AGENTS.md 6.3 y 7.5) y de las reseñas reales de Google (7.6).
 * Premio: insignia del hero y hito de «Nosaltres» con «2021»; sin «2021/22», marcadores ni «any a confirmar».
 * Reseñas: exactamente 3, texto literal y autor; las antiguas retiradas; enlace a la ficha con rel="noopener" y sin data-placeholder.
 */
import { test, expect } from '@playwright/test';

type Lang = 'ca' | 'es';
const paths: Record<Lang, string> = { ca: '/', es: '/es/' };

const award = {
  ca: { badge: 'Millor botiga de menjar per emportar 2021', milestone: 'Millor botiga de menjar per emportar' },
  es: { badge: 'Mejor tienda de comida para llevar 2021', milestone: 'Mejor tienda de comida para llevar' },
} as const;

const reviews = [
  { author: 'Jose Manuel Mesa Romero', text: 'El Rostidor, es la apuesta segura si desea comer casero de estos que están hechos con chup-chup durante horas' },
  { author: 'CAROL Hernandez', text: 'Muy buena comida y las personas son una maravilla' },
  { author: 'Raquel Ramírez', text: 'Las mejores manzanas de relleno de arenales de montón junto con la amabilidad de todo el equipo hace un 10 de este local' },
];
const retired = ['Cada domingo encargamos comida', 'Roser Alvarez', 'Victor Sanchez Vendrell', 'Nunca tienen un no por respuesta', 'muy bien de precio'];
const GOOGLE_URL = 'https://www.google.com/maps?cid=17428563639894031302';

for (const lang of ['ca', 'es'] as const) {
  test(`[AW-1] (${lang}) la insignia del hero dice «${award[lang].badge}» y no lleva marcador`, async ({ page }) => {
    await page.goto(paths[lang]);
    const badge = page.locator('#inici li').filter({ hasText: '2021' });
    await expect(badge).toHaveCount(1);
    await expect(badge).toHaveText(award[lang].badge);
    await expect(badge.locator('[data-placeholder]')).toHaveCount(0);
  });

  test(`[AW-2] (${lang}) el hito de Nosaltres es «2021» con la etiqueta del premio, junto a 2002 y Km 0, sin marcador`, async ({ page }) => {
    await page.goto(paths[lang]);
    const values = await page.locator('#nosaltres dt').allTextContents();
    expect(values.map((v) => v.trim())).toEqual(['2002', '2021', 'Km 0']);
    const labels = await page.locator('#nosaltres dd').allTextContents();
    expect(labels[1].trim()).toBe(award[lang].milestone);
    await expect(page.locator('#nosaltres dl [data-placeholder]')).toHaveCount(0);
  });

  test(`[AW-3] (${lang}) el año 2021 aparece exactamente 2 veces (insignia e hito) y nunca «2021/22» ni «año a confirmar»`, async ({ page }) => {
    await page.goto(paths[lang]);
    const body = await page.evaluate(() => document.body.innerText);
    expect(body.split('2021').length - 1).toBe(2);
    const html = await page.content();
    for (const source of [body, html]) {
      expect(source).not.toContain('2021/22');
      expect(source).not.toContain('[2021/22]');
      expect(source).not.toMatch(/any a confirmar|año a confirmar/i);
    }
  });

  test(`[RV-1] (${lang}) Opiniones muestra exactamente 3 reseñas, con su texto literal y su autor`, async ({ page }) => {
    await page.goto(paths[lang]);
    const found = await page.evaluate(() =>
      [...document.querySelectorAll('#opinions blockquote')].map((q) => {
        const card = q.closest('figure') ?? q.closest('li') ?? q.parentElement!;
        return { text: (q.textContent ?? '').trim(), card: (card.textContent ?? '').replace(/\s+/g, ' ').trim() };
      }),
    );
    expect(found).toHaveLength(3);
    expect(found.map((f) => f.text).sort()).toEqual(reviews.map((r) => r.text).sort());
    for (const review of reviews) {
      const hit = found.find((f) => f.text === review.text)!;
      expect(hit.card, review.author).toContain(review.author);
    }
  });

  test(`[RV-2] (${lang}) las reseñas se muestran en su idioma original; en la versión catalana se avisa «original en castellà»`, async ({ page }) => {
    await page.goto(paths[lang]);
    const cards = await page.evaluate(() =>
      [...document.querySelectorAll('#opinions blockquote')].map((q) => ((q.closest('figure') ?? q.closest('li') ?? q.parentElement!).textContent ?? '').replace(/\s+/g, ' ')),
    );
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      if (lang === 'ca') expect(card).toContain('(original en castellà)');
      else expect(card).not.toMatch(/original en castell/);
    }
  });

  test(`[RV-3] (${lang}) las reseñas antiguas (Marc, Roser Alvarez, Victor Sanchez Vendrell) ya no aparecen en la página`, async ({ page }) => {
    await page.goto(paths[lang]);
    const text = await page.evaluate(() => document.body.textContent ?? '');
    for (const old of retired) expect(text).not.toContain(old);
    expect(await page.evaluate(() => /\bMarc\b/.test(document.querySelector('#opinions')?.textContent ?? ''))).toBe(false);
  });

  test(`[RV-4] (${lang}) el enlace a todas las reseñas abre la ficha de Google con rel="noopener" y no es un dato pendiente`, async ({ page }) => {
    await page.goto(paths[lang]);
    const link = page.locator('#opinions').getByRole('link', { name: /Llegir totes les ressenyes a Google|Leer todas las reseñas en Google/ });
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', GOOGLE_URL);
    const rel = (await link.getAttribute('rel')) ?? '';
    expect(rel.split(/\s+/)).toContain('noopener');
    expect(await link.evaluate((a) => !!a.closest('[data-placeholder]') || a.hasAttribute('data-placeholder'))).toBe(false);
    expect(await link.evaluate((a) => (a as HTMLAnchorElement).getAttribute('href'))).not.toBe('#');
  });

  test(`[RV-5] (${lang}) la sección no deja ningún enlace href="#" (sin marcar ni marcado)`, async ({ page }) => {
    await page.goto(paths[lang]);
    await expect(page.locator('#opinions a[href="#"]')).toHaveCount(0);
  });
}
