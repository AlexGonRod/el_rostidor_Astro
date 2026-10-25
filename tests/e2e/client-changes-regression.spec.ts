/**
 * QA ciclo 3 (regresión de los cambios del cliente, AGENTS.md 6.4, 7.1, 7.3-7.6) en 320, 360, 390, 768, 1280 y 1920 px, en ca y es.
 * Complementa el contrato (no lo duplica): combinaciones de viewport e idioma, texto residual de precios,
 * coherencia de horarios entre indicadores, tabla, pie y JSON-LD, contraste real de la pastilla del jueves y capturas por sección.
 * Capturas solo con SHOT_DIR=<carpeta>. Se ejecuta solo en el proyecto «desktop» (el ancho se fija aquí).
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
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
};

const REVIEWS = [
  ['Jose Manuel Mesa Romero', 'El Rostidor, es la apuesta segura si desea comer casero de estos que están hechos con chup-chup durante horas'],
  ['CAROL Hernandez', 'Muy buena comida y las personas son una maravilla'],
  ['Raquel Ramírez', 'Las mejores manzanas de relleno de arenales de montón junto con la amabilidad de todo el equipo hace un 10 de este local'],
];
const closedTxt = { ca: 'Tancat avui · obrim dijous a les 10:30', es: 'Cerrado hoy · abrimos el jueves a las 10:30' };
const ordersTxt = { ca: 'Només encàrrecs · truca abans', es: 'Solo encargos · llama antes' };

const shot = async (page: Page, name: string, target?: ReturnType<Page['locator']>) => {
  const dir = process.env.SHOT_DIR;
  if (!dir) return;
  if (target) {
    await target.scrollIntoViewIfNeeded();
    await target.screenshot({ path: `${dir}/${name}.png` });
  } else await page.screenshot({ path: `${dir}/${name}.png` });
};

for (const { lang, path } of langs) {
  test.describe(`(${lang}) cambios del cliente`, () => {
    test.skip(({ isMobile }) => isMobile, 'el ancho se fija en el proyecto desktop');

    test('ningún texto, atributo, metadato ni JSON-LD menciona precios', async ({ page }) => {
      await page.goto(path);
      const html = await page.content();
      const body = await page.evaluate(() => {
        const clone = document.body.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('blockquote, script, style').forEach((n) => n.remove()); // reseñas = citas literales (7.6)
        return clone.textContent ?? '';
      });
      const attrs = await page.evaluate(() =>
        [...document.querySelectorAll('[alt],[title],[aria-label],meta[content]')]
          .map((e) => e.getAttribute('alt') ?? e.getAttribute('title') ?? e.getAttribute('aria-label') ?? e.getAttribute('content') ?? ''),
      );
      const re = /€|\beuros?\b|\bpreus?\b|\bprecios?\b|\bprice|\[X,XX\]|\/\s*raci[óo]n?|\bcobr|tarifa/i;
      expect(body.match(re)?.[0] ?? null).toBeNull();
      expect(attrs.filter((a) => re.test(a))).toEqual([]);
      expect(html).not.toMatch(/priceRange|"price"|"offers"/i);
    });

    test('ningún texto presenta el martes como día de encargos ni mezcla «cerrar» con «encargos»', async ({ page }) => {
      await page.goto(path);
      const text = await page.evaluate(() => document.body.innerText);
      // por frases y líneas: la tabla de horarios pone «Dimarts» y «Dimecres» en filas contiguas
      for (const line of text.split(/[.\n]/)) expect(line).not.toMatch(/(dimarts|martes).{0,40}(encàrrec|encargo)|(encàrrec|encargo).{0,40}(dimarts|martes)/i);
      expect(text).not.toMatch(/\[confirmar\]|consulta els horaris|consulta los horarios/i);
      expect(text).not.toMatch(/2021\/22|any a confirmar|año a confirmar/i);
      // «cerrar»/«tancar» como verbo (en vez de «cerrado/tancat») no debe aparecer en el contenido
      expect(text).not.toMatch(/\b(cerrar|tancar|cierra|tanca|cerramos|tanquem)\b/i);
    });

    test('el subtítulo del menú de la semana es «Només dijous» / «Solo los jueves» y no habla de martes', async ({ page }) => {
      await page.goto(path);
      const card = page.getByRole('heading', { level: 3, name: /Menú de la (setmana|semana)/ }).locator('xpath=ancestor::*[.//a][1]');
      await expect(card).toContainText(lang === 'ca' ? 'Només dijous' : 'Solo los jueves');
      await expect(card).not.toContainText(/dimarts|martes/i);
    });

    test('horarios: tabla, pie y JSON-LD coinciden (lunes y martes cerrados, miércoles solo encargos, sin lunes ni martes en JSON-LD)', async ({ page }) => {
      await page.goto(path);
      const rows = await page.locator('#contacte table tr').evaluateAll((trs) => trs.map((tr) => (tr.textContent ?? '').replace(/\s+/g, ' ').trim()));
      expect(rows).toHaveLength(7);
      const cerrado = lang === 'ca' ? 'Tancat' : 'Cerrado';
      expect(rows[0]).toMatch(new RegExp(`^${lang === 'ca' ? 'Dilluns' : 'Lunes'}\\s*${cerrado}$`));
      expect(rows[1]).toMatch(new RegExp(`^${lang === 'ca' ? 'Dimarts' : 'Martes'}\\s*${cerrado}$`));
      expect(rows[2]).toContain(lang === 'ca' ? 'Només encàrrecs, trucant abans' : 'Solo encargos, llamando antes');
      expect(rows[3]).toContain('10:30 a 14:30');
      expect(rows[4]).toContain('10:30 a 14:30');
      expect(rows[5]).toContain('9:00 a 15:00');
      expect(rows[6]).toContain('9:00 a 15:00');
      const footer = (await page.locator('footer').innerText()).replace(/\s+/g, ' ');
      const lines = lang === 'ca'
        ? ['Dl i dt: tancat', 'Dc: només encàrrecs', 'Dj i dv: 10:30 a 14:30', 'Ds, dg i festius: 9:00 a 15:00']
        : ['Lun y mar: cerrado', 'Mié: solo encargos', 'Jue y vie: 10:30 a 14:30', 'Sáb, dom y festivos: 9:00 a 15:00'];
      for (const l of lines) expect(footer).toContain(l);
      const ld = await page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent ?? '{}')));
      const specs = ld.flatMap((d) => d.openingHoursSpecification ?? []);
      const days = specs.map((s: { dayOfWeek: string }) => s.dayOfWeek).sort();
      expect(days).toEqual(['Friday', 'Saturday', 'Sunday', 'Thursday']);
      for (const s of specs) {
        const exp = s.dayOfWeek === 'Thursday' || s.dayOfWeek === 'Friday' ? ['10:30', '14:30'] : ['09:00', '15:00'];
        expect([s.opens, s.closes]).toEqual(exp);
      }
      expect(JSON.stringify(ld)).not.toMatch(/Monday|Tuesday|Wednesday/);
    });

    test('premio 2021 en la insignia del hero y en el hito, sin marcador', async ({ page }) => {
      await page.goto(path);
      const hero = await page.locator('#inici li').allInnerTexts();
      expect(hero.filter((t) => /2021/.test(t))).toHaveLength(1);
      await expect(page.locator('#nosaltres dt, #nosaltres dd').filter({ hasText: '2021' })).toHaveCount(1);
      await expect(page.locator('#inici [data-placeholder], #nosaltres [data-placeholder]').filter({ hasText: /2021|premi/i })).toHaveCount(0);
    });

    test('reseñas: 3 de Google literales con autor y enlace a la ficha', async ({ page }) => {
      await page.goto(path);
      const quotes = await page.locator('#opinions blockquote').evaluateAll((qs) =>
        qs.map((q) => ({ t: (q.textContent ?? '').replace(/^[\s«»"“”]+|[\s«»"“”]+$/g, ''), fig: (q.closest('figure, li')?.textContent ?? '').replace(/\s+/g, ' ') })),
      );
      expect(quotes).toHaveLength(3);
      for (const [author, text] of REVIEWS) {
        const q = quotes.find((x) => x.t === text);
        expect(q, `reseña de ${author}`).toBeDefined();
        expect(q!.fig).toContain(author);
      }
      const link = page.locator('#opinions a[href*="google.com/maps"]');
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute('href', 'https://www.google.com/maps?cid=17428563639894031302');
      await expect(link).toHaveAttribute('rel', /noopener/);
      await expect(link).not.toHaveAttribute('data-placeholder', /.*/);
      const all = await page.locator('#opinions').innerText();
      for (const gone of ['Marc', 'Roser', 'Victor']) expect(all).not.toContain(gone);
    });

    test('los indicadores de horario de toda la página coinciden entre sí en lunes, martes, miércoles y jueves', async ({ browser, baseURL }) => {
      const cases: [string, string, string][] = [
        ['2026-10-19T10:00:00Z', 'closedDay', closedTxt[lang]],
        ['2026-10-20T10:00:00Z', 'closedDay', closedTxt[lang]],
        ['2026-10-21T10:00:00Z', 'orders', ordersTxt[lang]],
        ['2026-10-22T09:00:00Z', 'open', lang === 'ca' ? 'Obert ara · fins a les 14:30' : 'Abierto ahora · hasta las 14:30'],
      ];
      for (const [iso, state, txt] of cases) {
        const ctx = await browser.newContext({ baseURL, timezoneId: 'America/New_York' });
        const page = await ctx.newPage();
        await page.clock.install({ time: new Date(iso) });
        await page.goto(path);
        await expect(page.locator('[data-open-now]').first()).toHaveAttribute('data-state', state);
        const texts = await page.locator('[data-open-now-text]').allTextContents();
        const states = await page.locator('[data-open-now]').evaluateAll((els) => els.map((e) => e.getAttribute('data-state')));
        expect(new Set(texts.map((t) => t.trim()))).toEqual(new Set([txt]));
        expect(new Set(states)).toEqual(new Set([state]));
        await ctx.close();
      }
    });
  });

  for (const w of widths) {
    test.describe(`(${lang}) ${w}px`, () => {
      test.skip(({ isMobile }) => isMobile, 'el ancho se fija en el proyecto desktop');

      test('tarjeta del jueves: orden H3, horario, aviso, un único «Encarrega» y sin etiqueta; contraste real de la pastilla ≥ 4,5:1 y sin desbordar', async ({ page }) => {
        await gotoAt(page, path, w);
        const h3 = page.getByRole('heading', { level: 3, name: 'Paella o fideuà' });
        const card = h3.locator('xpath=ancestor::*[.//a][1]');
        await expect(card).toBeVisible();
        const res = await card.evaluate((el, lng) => {
          const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
          const lum = (r: number, g: number, b: number) => {
            const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
            return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
          };
          // fondo efectivo: compone fondos translúcidos desde la raíz hasta el elemento
          const bgOf = (node: Element) => {
            const chain: Element[] = [];
            for (let n: Element | null = node; n; n = n.parentElement) chain.unshift(n);
            let [r, g, b] = [255, 255, 255];
            for (const n of chain) {
              const [cr, cg, cb, ca = 1] = parse(getComputedStyle(n).backgroundColor);
              if (getComputedStyle(n).backgroundColor === 'rgba(0, 0, 0, 0)') continue;
              r = cr * ca + r * (1 - ca); g = cg * ca + g * (1 - ca); b = cb * ca + b * (1 - ca);
            }
            return [r, g, b];
          };
          const ratio = (node: Element) => {
            const [fr, fg, fb, fa = 1] = parse(getComputedStyle(node).color);
            const [br, bg, bb] = bgOf(node);
            const [r, g, b] = [fr * fa + br * (1 - fa), fg * fa + bg * (1 - fa), fb * fa + bb * (1 - fa)];
            const l1 = lum(r, g, b), l2 = lum(br, bg, bb);
            return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          };
          const all = [...el.querySelectorAll<HTMLElement>('*')].filter((e) => e.children.length === 0 && (e.textContent ?? '').trim());
          const cands = [...el.querySelectorAll<HTMLElement>('*')].filter((e) => /Encarrega-la|Encárgala/.test(e.textContent ?? '') && ![...e.children].some((c) => /Encarrega-la|Encárgala/.test(c.textContent ?? '')));
          const notice = cands[0];
          const texts = all.map((e) => (e.textContent ?? '').trim());
          const links = el.querySelectorAll('a');
          const cr = el.getBoundingClientRect();
          const btn = links[0].getBoundingClientRect();
          return {
            texts, links: links.length, linkText: links[0].textContent?.trim(), href: links[0].getAttribute('href'),
            noticeRatio: notice ? ratio(notice) : null, btnH: btn.height, btnInside: btn.left >= cr.left - 1 && btn.right <= cr.right + 1,
            overflow: el.scrollWidth - el.clientWidth, lng,
          };
        }, lang);
        expect(res.links).toBe(1);
        expect(res.linkText).toBe(lang === 'ca' ? 'Encarrega' : 'Encarga'); // 7.4 dice «Encarrega» (ca y es), pero el contrato admite «Encarga» en castellano (cta.order)
        expect(res.href).toBe('#encarrega');
        expect(res.noticeRatio).not.toBeNull();
        expect(res.noticeRatio!).toBeGreaterThanOrEqual(4.5);
        expect(res.btnH).toBeGreaterThanOrEqual(44);
        expect(res.btnInside).toBe(true);
        expect(res.overflow).toBeLessThanOrEqual(0);
        // Orden vertical: título < horario < aviso (la etiqueta «Només dijous» / «Solo los jueves» ya no está en la tarjeta roja).
        const iTitle = res.texts.findIndex((t) => /^Paella o fideuà$/.test(t));
        const iSchedule = res.texts.findIndex((t) => /De dimecres a diumenge|De miércoles a domingo/.test(t));
        const iNotice = res.texts.findIndex((t) => /Encarrega-la|Encárgala/.test(t));
        expect(iTitle).toBeGreaterThanOrEqual(0);
        expect(iSchedule).toBeGreaterThan(iTitle);
        expect(iNotice).toBeGreaterThan(iSchedule);
        expect(res.texts.filter((t) => /Només dijous|Solo los jueves/.test(t))).toEqual([]);
        await expect(card).not.toContainText(/Només dijous|Solo los jueves/);
        await shot(page, `c3-${lang}-${w}-jueves`, card);
      });

      test('menús y carta sin precios visibles; capturas', async ({ page }) => {
        await gotoAt(page, path, w);
        for (const id of ['menus', 'carta']) {
          const t = await page.locator(`#${id}`).innerText();
          expect(t).not.toMatch(/€|\d+[.,]\d{2}\s*€?\b/);
        }
        await shot(page, `c3-${lang}-${w}-menus`, page.locator('#menus'));
        await shot(page, `c3-${lang}-${w}-carta`, page.locator('#carta'));
      });

      test('botones de WhatsApp: enlace correcto, visibles >= 44 px (≤768) y barra móvil con 3 acciones', async ({ page }) => {
        await gotoAt(page, path, w);
        const info = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLAnchorElement>('a[href*="wa.me"]')].map((a) => {
            const r = a.getBoundingClientRect();
            const cs = getComputedStyle(a);
            return { href: a.getAttribute('href') ?? '', visible: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0, w: Math.round(r.width), h: Math.round(r.height), inBar: !!a.closest('nav') };
          }),
        );
        expect(info).toHaveLength(5);
        for (const i of info) expect(i.href.startsWith('https://wa.me/34659331213?text=')).toBe(true);
        const visible = info.filter((i) => i.visible);
        expect(visible.length).toBeGreaterThanOrEqual(3);
        if (w <= 768) for (const i of visible.filter((v) => !(v.w < 44 && v.h < 44 && false))) {
          // el enlace de texto bajo el teléfono es inline dentro de párrafo; el resto de botones debe medir 44
          if (i.h < 44 || i.w < 44) expect(`${i.href} ${i.w}x${i.h}`).toBe('>=44');
        }
        const nav = page.getByRole('navigation', { name: /Accions ràpides|Acciones rápidas/ });
        if (w <= 768) {
          await expect(nav).toBeVisible();
          const labels = await nav.getByRole('link').allInnerTexts();
          expect(labels.map((l) => l.trim())).toEqual(lang === 'ca' ? ['Trucar', 'WhatsApp', 'Com arribar'] : ['Llamar', 'WhatsApp', 'Cómo llegar']);
          await page.evaluate(() => window.scrollTo(0, 0));
          await shot(page, `c3-${lang}-${w}-barra`);
        } else await expect(nav).toBeHidden();
        await shot(page, `c3-${lang}-${w}-encarrega`, page.locator('#encarrega'));
      });

      test('capturas: hero/premio, nosotros, reseñas, contacto y pie; sin desbordes en esas secciones', async ({ page }) => {
        await gotoAt(page, path, w);
        const over = await page.evaluate(() => ['inici', 'nosaltres', 'opinions', 'contacte'].map((id) => { const e = document.getElementById(id)!; return `${id}:${e.scrollWidth - e.clientWidth}`; }));
        for (const o of over) expect(Number(o.split(':')[1])).toBeLessThanOrEqual(0);
        await shot(page, `c3-${lang}-${w}-hero`, page.locator('#inici'));
        await shot(page, `c3-${lang}-${w}-nosaltres`, page.locator('#nosaltres'));
        await shot(page, `c3-${lang}-${w}-opinions`, page.locator('#opinions'));
        await shot(page, `c3-${lang}-${w}-contacte`, page.locator('#contacte'));
        await shot(page, `c3-${lang}-${w}-footer`, page.locator('footer'));
      });

      test('axe WCAG 2.2 AA en lunes (cerrado todo el día) y miércoles (solo encargos)', async ({ browser, baseURL }) => {
        for (const iso of ['2026-10-19T10:00:00Z', '2026-10-21T10:00:00Z']) {
          const ctx = await browser.newContext({ baseURL, viewport: { width: w, height: heights[w] } });
          const page = await ctx.newPage();
          await page.clock.install({ time: new Date(iso) });
          await page.goto(path);
          await page.evaluate(() => document.fonts.ready);
          const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
          expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
          await ctx.close();
        }
      });
    });
  }
}
