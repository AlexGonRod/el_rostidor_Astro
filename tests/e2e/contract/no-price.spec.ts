/**
 * Contrato «sin precios en toda la web» (AGENTS.md 6.4, 7.2 y 7.4; criterios P1-P4 en tests/unit/contract/no-price.test.ts).
 * Decisión del cliente (2026-10-21): ni menús, ni tarjeta del jueves, ni carta llevan precio.
 * Aquí se comprueba lo que ve el usuario en `/` y `/es/`: ninguna cifra de precio, «€» ni «[X,XX]»,
 * la estructura de las tarjetas de menú y de la tarjeta del jueves (7.4) y que no desborda a 320 px.
 * Localizadores por texto visible y roles: sin clases ni atributos data-* del implementador.
 */
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

type Lang = 'ca' | 'es';
const pages: { lang: Lang; path: string }[] = [
  { lang: 'ca', path: '/' },
  { lang: 'es', path: '/es/' },
];

const copy = {
  ca: {
    week: { title: 'Menú de la setmana', subtitle: 'Només dijous' },
    weekend: { title: 'Menú de cap de setmana', subtitle: 'Dissabtes, diumenges i festius' },
    thursday: { label: 'Només dijous', title: 'Paella o fideuà', schedule: 'De dimecres a diumenge', notice: /Encarrega-la abans de/ },
    old: /Reserva la teva/,
  },
  es: {
    week: { title: 'Menú de la semana', subtitle: 'Solo los jueves' },
    weekend: { title: 'Menú de fin de semana', subtitle: 'Sábados, domingos y festivos' },
    thursday: { label: 'Solo los jueves', title: 'Paella o fideuà', schedule: 'De miércoles a domingo', notice: /Encárgala antes de/ },
    old: /Reserva la tuya/,
  },
} as const;

/** AGENTS.md 7.4: el botón de las tarjetas es «Encarrega» (ca y es); el diccionario actual usa «Encarga» en castellano: se admiten ambos. */
const ORDER_LABEL = /^(Encarrega|Encarga)$/;

/**
 * Datos de una tarjeta de menú: el ancestro más cercano al H3 que contiene un enlace.
 * Devuelve texto, enlaces con su caja, filas de lista y la caja de la tarjeta.
 */
async function readCard(page: Page, heading: string) {
  return await page.evaluate((title) => {
    const h3 = [...document.querySelectorAll<HTMLElement>('#menus h3')].find((h) => (h.textContent ?? '').trim() === title);
    if (!h3) return null;
    let card: HTMLElement | null = h3;
    while (card && card.id !== 'menus' && !card.querySelector('a[href]')) card = card.parentElement;
    if (!card || card.id === 'menus') return null;
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
    };
    return {
      text: (card.textContent ?? '').replace(/\s+/g, ' ').trim(),
      box: box(card),
      links: [...card.querySelectorAll<HTMLAnchorElement>('a[href]')].map((a) => ({ name: (a.textContent ?? '').trim(), href: a.getAttribute('href'), box: box(a) })),
      lines: [...card.querySelectorAll('li')].map((li) => (li.textContent ?? '').replace(/\s+/g, ' ').trim()),
      pending: card.querySelectorAll('[data-placeholder]').length,
    };
  }, heading);
}

for (const { lang, path } of pages) {
  const c = copy[lang];

  test(`[P5] (${lang}) ninguna parte de la página muestra «€», «[X,XX]», «/ ració» ni una cifra con moneda`, async ({ page }) => {
    await page.goto(path);
    const html = await page.content();
    const text = await page.evaluate(() => document.body.textContent ?? '');
    for (const source of [html, text]) {
      expect(source).not.toContain('€');
      expect(source).not.toContain('[X,XX]');
      expect(source).not.toMatch(/\/\s*raci(ó|o)n?/i);
    }
    expect(text).not.toMatch(/\d\s*(€|eur\b|euros?\b)/i);
  });

  test(`[P6] (${lang}) la carta no muestra precio: ni en las tarjetas de plato ni en la lista de más platos`, async ({ page }) => {
    await page.goto(path);
    const carta = await page.evaluate(() => {
      const root = document.querySelector('#carta');
      const rows = [...(root?.querySelectorAll('li') ?? [])].map((li) => (li.textContent ?? '').replace(/\s+/g, ' ').trim());
      const dishCards = [...(root?.querySelectorAll('h4') ?? [])].map((h) => (h.parentElement?.textContent ?? '').replace(/\s+/g, ' ').trim());
      return { text: root?.textContent ?? '', rows, dishCards };
    });
    expect(carta.rows.length, 'la lista de más platos sigue existiendo').toBeGreaterThan(5);
    expect(carta.dishCards.length, 'las tarjetas de plato siguen existiendo').toBeGreaterThan(0);
    const priceLike = /\d+\s*[,.]\s*\d{2}|€|\[X,XX\]/;
    expect(carta.text).not.toMatch(priceLike);
    expect(carta.rows.filter((row) => priceLike.test(row))).toEqual([]);
    expect(carta.dishCards.filter((card) => priceLike.test(card))).toEqual([]);
  });

  for (const key of ['week', 'weekend'] as const) {
    test(`[P7] (${lang}) tarjeta «${c[key].title}»: subtítulo, 3 líneas, un único botón Encarrega y ninguna cifra`, async ({ page }) => {
      await page.goto(path);
      const card = await readCard(page, c[key].title);
      expect(card, 'la tarjeta existe').not.toBeNull();
      expect(card!.text).toContain(c[key].subtitle);
      expect(card!.lines).toHaveLength(3);
      expect(card!.links).toHaveLength(1);
      expect(card!.links[0].name).toMatch(ORDER_LABEL);
      expect(card!.links[0].href).toBe('#encarrega');
      expect(card!.links[0].box.h).toBeGreaterThanOrEqual(44);
      expect(card!.text).not.toMatch(/€|\[X,XX\]|\d\s*[,.]\s*\d{2}/);
    });
  }

  test(`[P8] (${lang}) tarjeta del jueves: etiqueta, título, horario, aviso y un único «Encarrega», en ese orden y sin precio`, async ({ page }) => {
    await page.goto(path);
    const t = c.thursday;
    const card = await readCard(page, t.title);
    expect(card, 'la tarjeta existe').not.toBeNull();
    expect(card!.links).toHaveLength(1);
    expect(card!.links[0].name).toMatch(ORDER_LABEL);
    expect(card!.links[0].href).toBe('#encarrega');
    expect(card!.text).not.toMatch(c.old);
    expect(card!.text).not.toMatch(/€|\[X,XX\]|\/\s*raci(ó|o)n?/i);

    // Posición vertical (borde superior) del primer nodo de texto que casa, dentro de la tarjeta.
    const tops = await page.evaluate(
      ({ title, label, schedule, notice }) => {
        const h3 = [...document.querySelectorAll<HTMLElement>('#menus h3')].find((h) => (h.textContent ?? '').trim() === title)!;
        let card: HTMLElement = h3;
        while (!card.querySelector('a[href]')) card = card.parentElement!;
        const topOf = (match: (s: string) => boolean) => {
          const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            if (match(n.nodeValue ?? '')) {
              const range = document.createRange();
              range.selectNodeContents(n);
              return { top: range.getBoundingClientRect().top, own: n.nodeValue ?? '' };
            }
          }
          return null;
        };
        return {
          label: topOf((s) => s.trim() === label),
          title: { top: h3.getBoundingClientRect().top, own: title },
          schedule: topOf((s) => s.includes(schedule)),
          notice: topOf((s) => new RegExp(notice).test(s)),
          link: { top: card.querySelector('a[href]')!.getBoundingClientRect().top },
        };
      },
      { title: t.title, label: t.label, schedule: t.schedule, notice: t.notice.source },
    );
    expect(tops.label, 'etiqueta').not.toBeNull();
    expect(tops.schedule, 'línea de horario').not.toBeNull();
    expect(tops.notice, 'aviso de hora límite').not.toBeNull();
    // El aviso es un bloque propio (pastilla), no la misma frase que el horario.
    expect(tops.notice!.own).not.toContain('10:30');
    expect(tops.schedule!.own).not.toMatch(t.notice);
    expect(tops.label!.top).toBeLessThan(tops.title.top);
    expect(tops.title.top).toBeLessThan(tops.schedule!.top);
    expect(tops.schedule!.top).toBeLessThan(tops.notice!.top);
    expect(tops.notice!.top).toBeLessThan(tops.link.top);
    // El botón cumple el área táctil de 44 px.
    expect(card!.links[0].box.h).toBeGreaterThanOrEqual(44);
    expect(card!.links[0].box.w).toBeGreaterThanOrEqual(44);
  });

  test(`[P9] (${lang}) a 320 px las tres tarjetas no desbordan y su botón queda dentro de la tarjeta`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'el ancho se fija en el propio test');
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    for (const title of [c.week.title, c.weekend.title, c.thursday.title]) {
      const card = await readCard(page, title);
      expect(card, title).not.toBeNull();
      expect(card!.box.right, `${title}: tarjeta dentro del viewport`).toBeLessThanOrEqual(320.5);
      for (const link of card!.links) {
        expect(link.box.x, `${title}: botón`).toBeGreaterThanOrEqual(card!.box.x - 0.5);
        expect(link.box.right, `${title}: botón`).toBeLessThanOrEqual(card!.box.right + 0.5);
      }
    }
  });
}

test('[P10] las líneas de los menús salen de menus.json: vacío, marcadores pendientes; con platos, los platos', async ({ page }) => {
  const menus = JSON.parse(readFileSync('src/content/menus.json', 'utf8')) as Record<string, { items: { ca: string; es: string }[] }>;
  for (const { lang, path } of pages) {
    await page.goto(path);
    for (const key of ['week', 'weekend'] as const) {
      const card = await readCard(page, copy[lang][key].title);
      expect(card, `${lang} ${key}`).not.toBeNull();
      const items = menus[key].items;
      if (items.length === 0) {
        expect(card!.lines, `${lang} ${key} marcadores`).toHaveLength(3);
        for (const line of card!.lines) expect(line).toMatch(/^\[[^\]]+\]$/);
        // Acotado a la tarjeta (antes contaba 6 en toda la sección): el menú de la semana ya tiene platos reales.
        expect(card!.pending, 'los marcadores de plato llevan data-placeholder').toBe(card!.lines.length);
      } else {
        expect(card!.lines).toEqual(items.map((item) => item[lang]));
      }
    }
  }
});
