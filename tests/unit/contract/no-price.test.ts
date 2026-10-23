/**
 * Contrato «sin precios en toda la web» (AGENTS.md 6.4, 7.2 y 7.4; criterios P1-P4).
 * Decisión del cliente (2026-10-21): ni menús, ni tarjeta del jueves, ni carta llevan precio.
 * P1: el campo `price` no existe en carta.json ni en menus.json. P2: tampoco en el esquema Zod.
 * P3 (texto fuente): ningún diccionario ni JSON contiene «€» ni «[X,XX]». P4: `formatPrice` desaparece.
 * El render visible (sin «€» ni «[X,XX]» en la página) lo comprueba tests/e2e/contract/no-price.spec.ts.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(path, 'utf8');
const json = (path: string) => JSON.parse(read(path)) as Record<string, any>;

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}
/** Quita comentarios para que un comentario histórico no cuente como código. */
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('[P1] el campo price ha desaparecido de los JSON de contenido', () => {
  it('ningún plato de carta.json tiene la clave price (ni siquiera a null)', () => {
    const carta = json('src/content/carta.json');
    expect(Object.keys(carta).length).toBeGreaterThan(10); // el archivo sigue teniendo la carta
    const withPrice = Object.entries(carta).filter(([, dish]) => 'price' in dish).map(([id]) => id);
    expect(withPrice).toEqual([]);
  });

  it('week, weekend y thursday de menus.json no tienen la clave price y conservan sus platos (items)', () => {
    const menus = json('src/content/menus.json');
    expect(Object.keys(menus).sort()).toEqual(['thursday', 'week', 'weekend']);
    for (const [id, menu] of Object.entries(menus)) {
      expect('price' in menu, `menus.${id}.price`).toBe(false);
      expect(Array.isArray(menu.items), `menus.${id}.items`).toBe(true);
    }
  });

  it('ningún JSON de contenido contiene la clave price en ningún nivel', () => {
    for (const file of ['carta', 'menus', 'reviews', 'faq']) {
      expect(read(`src/content/${file}.json`), file).not.toMatch(/"price"\s*:/);
    }
  });
});

describe('[P2] el esquema de las colecciones no define price', () => {
  it('src/content.config.ts no declara ningún campo price (ignorando comentarios)', () => {
    const code = stripComments(read('src/content.config.ts'));
    expect(code).not.toMatch(/\bprice\b/i);
    expect(code).toMatch(/defineCollection/); // el archivo sigue definiendo las colecciones
  });
});

describe('[P3] los textos de interfaz y de contenido no llevan precio ni su marcador', () => {
  const dictionaries = ['ca', 'es'].map((lang) => [lang, read(`src/i18n/${lang}.json`)] as const);

  for (const [lang, text] of dictionaries) {
    it(`src/i18n/${lang}.json no contiene «€», «[X,XX]», «/ ració» ni la clave perServing`, () => {
      expect(text).not.toContain('€');
      expect(text).not.toContain('[X,XX]');
      expect(text).not.toMatch(/\/\s*raci(ó|o)n?/i);
      expect(text).not.toContain('perServing');
    });
  }

  it('los JSON de contenido no contienen «€» ni «[X,XX]»', () => {
    for (const file of ['carta', 'menus', 'reviews', 'faq']) {
      const text = read(`src/content/${file}.json`);
      expect(text, file).not.toContain('€');
      expect(text, file).not.toContain('[X,XX]');
    }
  });
});

describe('[P4] formatPrice y el marcador de precio han desaparecido del código', () => {
  it('src/i18n/utils no exporta formatPrice', async () => {
    const utils = (await import('../../../src/i18n/utils')) as Record<string, unknown>;
    expect(Object.keys(utils)).not.toContain('formatPrice');
    expect(typeof utils.withPlaceholders).toBe('function'); // el resto del módulo sigue ahí
  });

  it('ningún archivo de src/ menciona formatPrice ni el marcador [X,XX] ni formatea importes en EUR', () => {
    const offenders: string[] = [];
    for (const file of walk('src')) {
      if (!/\.(ts|astro|mjs|js|json|css)$/.test(file)) continue;
      const code = stripComments(read(file));
      if (/formatPrice|\[X,XX\]|currency:\s*['"]EUR['"]/.test(code)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('ningún componente recibe ni pasa una prop price', () => {
    const offenders: string[] = [];
    for (const file of walk('src/components')) {
      if (/\bprice\b/i.test(stripComments(read(file)).replace(/<!--[\s\S]*?-->/g, ''))) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
