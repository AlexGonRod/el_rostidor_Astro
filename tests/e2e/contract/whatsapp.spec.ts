/**
 * Contrato de WhatsApp visible (AGENTS.md 5, 6.3 y 7.3). Dato del cliente (2026-10-21): 34659331213.
 * Criterios: (1) 5 enlaces a wa.me/34659331213 (barra móvil, Cómo encargar, Contacto x2, banda de cierre);
 * (2) todos con ?text= del idioma de la página; (3) barra móvil: Trucar, WhatsApp, Com arribar, en ese orden;
 * (4) cada enlace >= 44 x 44 px; (5) ninguno con href="#" ni data-placeholder; (6) el número escrito solo en Contacto;
 * (7) tel: sigue siendo 937937107. Sin WhatsApp en el hero ni en la cabecera.
 * Localizadores por rol y nombre accesible; la barra móvil por su nombre de navegación (a11y.quickActions).
 */
import { test, expect, type Page } from '@playwright/test';

type Lang = 'ca' | 'es';
const BASE = 'https://wa.me/34659331213';
const copy = {
  ca: {
    path: '/',
    url: `${BASE}?text=Hola%2C%20El%20Rostidor!%20Voldria%20fer%20un%20enc%C3%A0rrec%20per%20recollir.`,
    bar: /Accions ràpides/,
    closing: "Encarrega el dinar d'avui",
    call: 'Trucar',
    directions: 'Com arribar',
  },
  es: {
    path: '/es/',
    url: `${BASE}?text=%C2%A1Hola%2C%20El%20Rostidor!%20Me%20gustar%C3%ADa%20hacer%20un%20encargo%20para%20recoger.`,
    bar: /Acciones rápidas/,
    closing: 'Encarga la comida de hoy',
    call: 'Llamar',
    directions: 'Cómo llegar',
  },
} as const;
const NUMBER_TEXT = '659 33 12 13';

const bar = (page: Page, lang: Lang) => page.getByRole('navigation', { name: copy[lang].bar, includeHidden: true });
const closing = (page: Page, lang: Lang) => page.getByRole('region', { name: copy[lang].closing });
const waLinks = (scope: { getByRole: Page['getByRole'] }) => scope.getByRole('link', { name: 'WhatsApp', exact: true, includeHidden: true });

for (const lang of ['ca', 'es'] as const) {
  const c = copy[lang];

  test(`[WA-2] (${lang}) hay exactamente 5 enlaces a wa.me/34659331213 y todos llevan el mensaje de ${lang} codificado`, async ({ page }) => {
    await page.goto(c.path);
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') ?? '').filter((h) => /wa\.me|whatsapp/i.test(h)));
    expect(hrefs).toHaveLength(5);
    for (const href of hrefs) expect(href).toBe(c.url);
  });

  test(`[WA-2] (${lang}) ningún enlace de WhatsApp mezcla idiomas ni usa un mensaje del otro idioma`, async ({ page }) => {
    await page.goto(c.path);
    const other = copy[lang === 'ca' ? 'es' : 'ca'].url.split('?text=')[1];
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href*="wa.me"]')].map((a) => a.getAttribute('href') ?? ''));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).not.toContain(other);
      expect(href.startsWith(`${BASE}?text=`)).toBe(true);
    }
  });

  test(`[WA-3] (${lang}) los cuatro sitios con botón «WhatsApp»: barra móvil, Cómo encargar, Contacto y banda de cierre`, async ({ page }) => {
    await page.goto(c.path);
    // Barra móvil: está en el DOM en todos los viewports (se muestra solo en móvil).
    await expect(waLinks(bar(page, lang))).toHaveCount(1);
    await expect(waLinks(bar(page, lang))).toHaveAttribute('href', c.url);
    await expect(waLinks(page.locator('#encarrega'))).toHaveCount(1);
    await expect(waLinks(page.locator('#encarrega'))).toHaveAttribute('href', c.url);
    await expect(waLinks(page.locator('#contacte'))).toHaveCount(1);
    await expect(waLinks(page.locator('#contacte'))).toHaveAttribute('href', c.url);
    await expect(waLinks(closing(page, lang))).toHaveCount(1);
    await expect(waLinks(closing(page, lang))).toHaveAttribute('href', c.url);
    // Exactamente 4 botones con esa etiqueta en toda la página.
    await expect(waLinks(page)).toHaveCount(4);
  });

  test(`[WA-3] (${lang}) Contacto: botón WhatsApp entre «${c.call}» y «${c.directions}» y línea «WhatsApp: ${NUMBER_TEXT}» también enlazada`, async ({ page }) => {
    await page.goto(c.path);
    const contact = page.locator('#contacte');
    const names = await contact
      .getByRole('link')
      .evaluateAll((els, wanted) => els.map((a) => (a.textContent ?? '').replace(/\s+/g, ' ').trim()).filter((t) => wanted.includes(t)), [c.call, 'WhatsApp', c.directions]);
    expect(names).toEqual([c.call, 'WhatsApp', c.directions]);

    const line = contact.getByRole('link', { name: new RegExp(NUMBER_TEXT) });
    await expect(line).toHaveCount(1);
    await expect(line).toHaveAttribute('href', c.url);
    await expect(line).toContainText('WhatsApp');
  });

  test(`[WA-3] (${lang}) no hay WhatsApp en el hero ni en la cabecera (un solo énfasis primario; el encargo va a #encarrega)`, async ({ page }) => {
    await page.goto(c.path);
    await expect(page.locator('#inici a[href*="wa.me"]')).toHaveCount(0);
    await expect(page.locator('header a[href*="wa.me"]')).toHaveCount(0);
    await expect(page.locator('#inici').getByRole('link', { name: /WhatsApp/ })).toHaveCount(0);
    await expect(page.locator('header').getByRole('link', { name: /WhatsApp/ })).toHaveCount(0);
  });

  test(`[WA-4] (${lang}) barra móvil fija con 3 acciones en este orden: ${c.call}, WhatsApp, ${c.directions}`, async ({ page, isMobile }) => {
    test.skip(!isMobile, 'criterio solo móvil');
    await page.goto(c.path);
    const links = bar(page, lang).getByRole('link', { includeHidden: true });
    await expect(links).toHaveCount(3);
    await expect(links.nth(0)).toHaveAccessibleName(c.call);
    await expect(links.nth(1)).toHaveAccessibleName('WhatsApp');
    await expect(links.nth(2)).toHaveAccessibleName(c.directions);
    await expect(links.nth(0)).toHaveAttribute('href', 'tel:937937107');
    await expect(links.nth(1)).toHaveAttribute('href', c.url);
    await expect(links.nth(2)).toHaveAttribute('href', /google\.com\/maps/);

    // Visible y fija abajo, también tras desplazarse; los tres enlaces en una fila, de izquierda a derecha.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    const boxes = [];
    for (const i of [0, 1, 2]) {
      await expect(links.nth(i)).toBeVisible();
      boxes.push((await links.nth(i).boundingBox())!);
    }
    expect(boxes[0].x).toBeLessThan(boxes[1].x);
    expect(boxes[1].x).toBeLessThan(boxes[2].x);
    expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(4);
    expect(Math.abs(boxes[1].y - boxes[2].y)).toBeLessThan(4);
    const viewport = page.viewportSize()!;
    for (const box of boxes) expect(box.y + box.height).toBeGreaterThan(viewport.height - 100);
  });

  test(`[WA-5] (${lang}) cada enlace de WhatsApp visible mide al menos 44 x 44 px`, async ({ page }) => {
    await page.goto(c.path);
    const sizes = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLAnchorElement>('a[href*="wa.me"]')]
        .filter((a) => {
          const r = a.getBoundingClientRect();
          const cs = getComputedStyle(a);
          return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0 && (a.offsetParent !== null || cs.position === 'fixed' || !!a.closest('nav'));
        })
        .map((a) => {
          const r = a.getBoundingClientRect();
          return { name: (a.textContent ?? '').replace(/\s+/g, ' ').trim(), w: Math.round(r.width), h: Math.round(r.height) };
        }),
    );
    expect(sizes.length, 'hay enlaces visibles').toBeGreaterThanOrEqual(4);
    expect(sizes.filter((s) => s.w < 44 || s.h < 44)).toEqual([]);
  });

  test(`[WA-6] (${lang}) ningún enlace de WhatsApp es href="#" ni está marcado como dato pendiente`, async ({ page }) => {
    await page.goto(c.path);
    const all = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLAnchorElement>('a[href*="wa.me"]')].map((a) => ({
        text: (a.textContent ?? '').trim(),
        bad: a.getAttribute('href') === '#' || !!a.closest('[data-placeholder]') || !!a.querySelector('[data-placeholder]'),
      })),
    );
    expect(all, 'hay 5 enlaces de WhatsApp que comprobar').toHaveLength(5);
    expect(all.filter((a) => a.bad).map((a) => a.text)).toEqual([]);
  });

  test(`[WA-7] (${lang}) el número se escribe como «${NUMBER_TEXT}» solo en Contacto`, async ({ page }) => {
    await page.goto(c.path);
    const counts = await page.evaluate((needle) => {
      const count = (text: string) => text.split(needle).length - 1;
      const body = document.body.textContent ?? '';
      return { body: count(body), contact: count(document.querySelector('#contacte')?.textContent ?? ''), raw: /34659331213/.test(body.replace(/\s+/g, '')) };
    }, NUMBER_TEXT);
    expect(counts.contact).toBeGreaterThanOrEqual(1);
    expect(counts.body).toBe(counts.contact);
    expect(counts.raw, 'el número internacional no se muestra como texto').toBe(false);
  });

  test(`[WA-8] (${lang}) el teléfono fijo sigue siendo tel:937937107; ningún tel: usa el WhatsApp; el JSON-LD conserva el fijo`, async ({ page }) => {
    await page.goto(c.path);
    const tel = await page.evaluate(() => [...document.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href')));
    expect(tel.length).toBeGreaterThan(3);
    for (const href of tel) expect(href).toBe('tel:937937107');
    const ld = await page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent ?? '').join('\n'));
    expect(ld).toContain('937937107');
    expect(ld).not.toContain('659331213');
  });
}
