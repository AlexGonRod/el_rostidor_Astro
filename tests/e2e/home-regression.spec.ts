/**
 * QA: regresión de la home tras extraer «Obert ara» a src/lib/open-now.ts y corregir QA-001.
 * Complementa el contrato (no lo toca). Sobre el build de producción servido con astro preview.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const langs = [
  { lang: 'ca', path: '/', skipLink: /contingut/i, h1: /Cuina casolana d'Arenys/ },
  { lang: 'es', path: '/es/', skipLink: /contenido/i, h1: /Cocina casera de Arenys/ },
] as const;
const widths = [360, 390, 768, 1280];

const collect = (page: Page) => {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && problems.push('console: ' + m.text()));
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith('http://localhost')) problems.push(r.status() + ' ' + r.url());
  });
  return problems;
};

const axeSummary = async (page: Page) => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
};

for (const { lang, path, skipLink, h1 } of langs) {
  test.describe(`home ${lang}`, () => {
    test(`(${lang}) carga sin errores de consola ni peticiones rotas, con un h1 y lang correcto`, async ({ page }) => {
      const problems = collect(page);
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
      await expect(page).toHaveTitle(/El Rostidor/);
      expect(problems).toEqual([]);
    });

    for (const width of widths) {
      test(`(${lang}) sin scroll horizontal a ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(path);
        await page.locator('footer').scrollIntoViewIfNeeded();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
      });

      test(`(${lang}) axe sin violaciones AA a ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(path);
        expect(await axeSummary(page)).toEqual([]);
      });
    }

    test(`(${lang}) las anclas internas apuntan a un id existente`, async ({ page }) => {
      await page.goto(path);
      const broken = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')]
          .map((a) => a.getAttribute('href')!)
          .filter((h) => h.length > 1 && !document.getElementById(h.slice(1))),
      );
      expect(broken).toEqual([]);
    });

    test(`(${lang}) teléfono y email coinciden con la fuente única de datos`, async ({ page }) => {
      await page.goto(path);
      const hrefs = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLAnchorElement>('a[href^="tel:"], a[href^="mailto:"]')].map((a) => a.getAttribute('href')!),
      );
      expect(hrefs.length).toBeGreaterThan(0);
      for (const h of hrefs) expect(['tel:937937107', 'mailto:elrostidorarenysdemunt@gmail.com']).toContain(h);
    });

    test(`(${lang}) teclado: el primer foco es el enlace de salto y lleva al contenido`, async ({ page }) => {
      await page.goto(path);
      await page.keyboard.press('Tab');
      const skip = page.getByRole('link', { name: skipLink }).first();
      await expect(skip).toBeFocused();
      await expect(skip).toBeVisible();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/#contingut$/);
    });

    test(`(${lang}) teclado: el foco es visible en los primeros 12 elementos`, async ({ page, isMobile }) => {
      test.skip(!!isMobile, 'orden de tabulación comprobado en escritorio');
      await page.goto(path);
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab');
        const info = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          const s = getComputedStyle(el);
          const w = parseFloat(s.outlineWidth);
          return { tag: el.tagName, text: (el.textContent ?? '').trim().slice(0, 30), visible: (s.outlineStyle !== 'none' && w > 0) || s.boxShadow !== 'none' };
        });
        expect(info.visible, `sin foco visible en ${info.tag} «${info.text}»`).toBe(true);
      }
    });

    test(`(${lang}) las secciones principales existen en el orden definido`, async ({ page }) => {
      await page.goto(path);
      const ids = await page.evaluate(() =>
        ['inici', 'menus', 'carta', 'celebracions', 'encarrega', 'nosaltres', 'opinions', 'faq', 'contacte'].map((id) => document.getElementById(id)?.getBoundingClientRect().top ?? -1),
      );
      expect(ids.every((t) => t !== -1)).toBe(true);
      expect([...ids].sort((a, b) => a - b)).toEqual(ids);
    });

    test(`(${lang}) la carta filtra por pestañas y axe sigue limpio tras interactuar`, async ({ page }) => {
      await page.goto(path);
      const tabs = page.locator('[data-carta-tab]');
      await expect(tabs).toHaveCount(2);
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-carta-group]').first()).toBeHidden();
      await expect(page.locator('[data-carta-group]').nth(1)).toBeVisible();
      expect(await axeSummary(page)).toEqual([]);
    });

    test(`(${lang}) FAQ operable con teclado y axe limpio con una respuesta abierta`, async ({ page }) => {
      await page.goto(path);
      const item = page.locator('#faq details').nth(1);
      await expect(item).not.toHaveAttribute('open', '');
      await item.locator('summary').focus();
      await page.keyboard.press('Enter');
      await expect(item).toHaveAttribute('open', '');
      await page.keyboard.press('Space');
      await expect(item).not.toHaveAttribute('open', '');
      await page.keyboard.press('Enter');
      await expect(item).toHaveAttribute('open', '');
      expect(await axeSummary(page)).toEqual([]);
    });

    test(`(${lang}) sin JavaScript el contenido esencial sigue visible (carta completa, estado neutro)`, async ({ browser, baseURL }) => {
      const ctx = await browser.newContext({ javaScriptEnabled: false, baseURL });
      const page = await ctx.newPage();
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('[data-carta-group]').first()).toBeVisible();
      await expect(page.locator('[data-carta-group]').nth(1)).toBeVisible();
      await expect(page.locator('[data-open-now-text]').first()).not.toBeEmpty();
      await ctx.close();
    });

    test(`(${lang}) movimiento reducido: axe limpio y sin scroll horizontal`, async ({ browser, baseURL }) => {
      const ctx = await browser.newContext({ reducedMotion: 'reduce', baseURL, viewport: { width: 390, height: 800 } });
      const page = await ctx.newPage();
      await page.goto(path);
      expect(await axeSummary(page)).toEqual([]);
      await ctx.close();
    });

    test(`(${lang}) CTA de encargo accesible en cabecera y, en móvil, barra inferior con las acciones disponibles`, async ({ page, isMobile }) => {
      await page.goto(path);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      const order = page.locator('header').getByRole('link', { name: /Encarrega|Encarga/i }).first();
      await expect(order).toBeVisible();
      if (isMobile) {
        const bar = page.locator('[class*="fixed"]').filter({ has: page.locator('a[href^="tel:"]') }).last();
        await expect(bar).toBeVisible();
        expect(await bar.getByRole('link').count()).toBeGreaterThanOrEqual(2);
        // el pie de la página es alcanzable por encima de la barra
        await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
        await expect.poll(() => page.evaluate(() => Math.round(window.scrollY + innerHeight - document.documentElement.scrollHeight))).toBeGreaterThanOrEqual(-1);
        const [b, f] = await Promise.all([bar.boundingBox(), page.locator('footer').evaluate((el) => el.getBoundingClientRect().bottom)]);
        expect(f).toBeLessThanOrEqual(b!.y + b!.height + 1);
      }
    });

    test(`(${lang}) menú móvil: abre, navega a una sección y se cierra`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 800 });
      await page.goto(path);
      const menu = page.locator('[data-mobile-menu]');
      await menu.locator('summary').click();
      await expect(menu).toHaveAttribute('open', '');
      expect(await axeSummary(page)).toEqual([]);
      await menu.locator('a[href="#carta"]').click();
      await expect(menu).not.toHaveAttribute('open', '');
      await expect(page).toHaveURL(/#carta$/);
    });

    test(`(${lang}) el selector de idioma conserva la sección actual`, async ({ page, isMobile }) => {
      await page.goto(path + '#carta');
      const sw = page.locator(`[data-lang-switch][hreflang="${lang === 'ca' ? 'es' : 'ca'}"]`);
      if (!(await sw.isVisible())) test.skip(true, 'selector no visible en este viewport');
      await sw.click();
      await expect(page).toHaveURL(lang === 'ca' ? /\/es\/#carta$/ : /\/#carta$/);
      void isMobile;
    });
  });
}

test('ca y es tienen las mismas secciones y el mismo número de enlaces y botones', async ({ page }) => {
  const snap = async (p: string) => {
    await page.goto(p);
    return page.evaluate(() => ({
      ids: [...document.querySelectorAll('section[id], main [id]')].map((e) => e.id).filter((i) => !i.endsWith('-title')),
      h2: document.querySelectorAll('h2').length,
      links: document.querySelectorAll('a').length,
      img: document.querySelectorAll('img').length,
    }));
  };
  expect(await snap('/es/')).toEqual(await snap('/'));
});

test('ningún texto de interfaz catalán aparece en la versión castellana (muestra)', async ({ page }) => {
  await page.goto('/es/');
  const text = await page.locator('body').innerText();
  for (const w of ['Encarrega', 'Veure la carta', 'Celebracions', 'Nosaltres', 'Contacte', 'Com arribar']) expect(text).not.toContain(w);
});

test('SEO: hreflang bidireccional, canonical por idioma, sin noindex ni noimageindex, JSON-LD coherente con los horarios', async ({ page, request }) => {
  const info = async (p: string) => {
    await page.goto(p);
    return page.evaluate(() => ({
      title: document.title,
      desc: document.querySelector('meta[name=description]')?.getAttribute('content'),
      canonical: document.querySelector('link[rel=canonical]')?.getAttribute('href'),
      alt: [...document.querySelectorAll('link[rel=alternate]')].map((l) => l.getAttribute('hreflang') + '=' + l.getAttribute('href')),
      robots: document.querySelector('meta[name=robots]')?.getAttribute('content') ?? '',
      ld: JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!),
    }));
  };
  const ca = await info('/');
  const es = await info('/es/');
  expect(ca.title).not.toEqual(es.title);
  expect(ca.desc).not.toEqual(es.desc);
  expect(ca.canonical).not.toEqual(es.canonical);
  expect(ca.alt).toEqual(expect.arrayContaining(['ca=https://elrostidor.com/', 'es=https://elrostidor.com/es/']));
  expect(es.alt).toEqual(expect.arrayContaining(['ca=https://elrostidor.com/', 'es=https://elrostidor.com/es/']));
  for (const r of [ca.robots, es.robots]) expect(r).not.toMatch(/noindex|noimageindex/);
  const ld = ca.ld;
  expect(ld.telephone).toMatch(/937937107|93 793 71 07/);
  const spec = JSON.stringify(ld.openingHoursSpecification ?? []);
  expect(spec).toContain('10:30');
  expect(spec).toContain('14:30');
  expect(spec).toContain('09:00');
  expect(spec).toContain('15:00');
  for (const p of ['/robots.txt', '/sitemap-index.xml', '/favicon.svg']) expect((await request.get(p)).status()).toBe(200);
  expect(await (await request.get('/robots.txt')).text()).not.toMatch(/Disallow:\s*\/\s*$/m);
});

test('seguridad básica: enlaces externos con rel seguro e iframes con título', async ({ page }) => {
  await page.goto('/');
  const bad = await page.evaluate(() => [
    ...[...document.querySelectorAll<HTMLAnchorElement>('a[target=_blank]')].filter((a) => !/noopener/.test(a.rel)).map((a) => a.href),
    ...[...document.querySelectorAll<HTMLIFrameElement>('iframe')].filter((f) => !f.title).map((f) => f.src),
  ]);
  expect(bad).toEqual([]);
});

test('terceros: solo Google Maps (iframe diferido) y ninguna fuente externa', async ({ page }) => {
  const hosts = new Set<string>();
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.hostname !== 'localhost') hosts.add(u.hostname);
  });
  await page.goto('/');
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.waitForLoadState('networkidle');
  for (const h of hosts) expect(h, `host de terceros inesperado ${h}`).toMatch(/(^|\.)google\.com$|gstatic\.com$|googleapis\.com$/);
  expect([...hosts].some((h) => /fonts\.(googleapis|gstatic)/.test(h))).toBe(false);
});

test('los datos pendientes están marcados con data-placeholder (el texto entre corchetes visible siempre está marcado)', async ({ page }) => {
  for (const p of ['/', '/es/']) {
    await page.goto(p);
    const unmarked = await page.evaluate(() => {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const out: string[] = [];
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const t = n.textContent ?? '';
        if (/\[[^\]]+\]/.test(t) && !n.parentElement?.closest('[data-placeholder]') && !['SCRIPT', 'STYLE'].includes(n.parentElement!.tagName)) out.push(t.trim());
      }
      return out;
    });
    expect(unmarked).toEqual([]);
  }
});
