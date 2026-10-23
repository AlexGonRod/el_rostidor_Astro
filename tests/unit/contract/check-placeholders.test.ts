/**
 * [QA-003] El comprobador de pendientes debe detectar enlaces href="#" sin marcar (AGENTS.md §6.3.1).
 * Contrato: módulo puro `scripts/lib/placeholders.mjs` + `scripts/check-placeholders.mjs` con DIST_DIR.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const modUrl = pathToFileURL(resolve('scripts/lib/placeholders.mjs')).href;
const load = async () => (await import(/* @vite-ignore */ modUrl)) as {
  scanHtml: (html: string) => { pending: string[]; unmarkedLinks: string[] };
};

describe('[QA-003] scanHtml', () => {
  it('detecta un enlace href="#" sin marcar y devuelve su texto', async () => {
    const { scanHtml } = await load();
    const r = scanHtml('<footer><a href="#" class="x">Avís legal</a></footer>');
    expect(r.unmarkedLinks).toEqual(['Avís legal']);
    expect(r.pending).toEqual([]);
  });

  it('un enlace href="#" con data-placeholder no es «sin marcar»: cuenta como pendiente', async () => {
    const { scanHtml } = await load();
    const r = scanHtml('<a href="#" data-placeholder>Privacitat</a>');
    expect(r.unmarkedLinks).toEqual([]);
    expect(r.pending).toEqual(['Privacitat']);
  });

  it('no cuenta anclas internas reales ni enlaces con destino', async () => {
    const { scanHtml } = await load();
    const r = scanHtml('<a href="#carta">Carta</a><a href="tel:937937107">Truca</a><a href="https://x.test/">Web</a>');
    expect(r.unmarkedLinks).toEqual([]);
  });

  it('lista cada enlace sin marcar y sigue contando los textos pendientes', async () => {
    const { scanHtml } = await load();
    const r = scanHtml('<span data-placeholder>[4,X] ★</span><a href="#">Cookies</a><a href="#">Avís legal</a>');
    expect(r.unmarkedLinks).toEqual(['Cookies', 'Avís legal']);
    expect(r.pending).toEqual(['[4,X] ★']);
  });
});

describe('[QA-003] check-placeholders.mjs sobre un dist de prueba (DIST_DIR)', () => {
  let root: string;
  const script = resolve('scripts/check-placeholders.mjs');
  const run = (html: string, args: string[]) => {
    const dist = join(root, 'dist-' + Math.random().toString(36).slice(2));
    mkdirSync(dist);
    writeFileSync(join(dist, 'index.html'), html);
    return spawnSync('node', [script, ...args], { env: { ...process.env, DIST_DIR: dist }, encoding: 'utf8' });
  };
  beforeAll(() => { root = mkdtempSync(join(tmpdir(), 'placeholders-')); });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('--strict falla si solo queda un enlace href="#" sin marcar y lo nombra', () => {
    const r = run('<html><body><a href="#">Avís legal</a></body></html>', ['--strict']);
    expect(r.status).toBe(1);
    expect(r.stdout + r.stderr).toContain('Avís legal');
  });

  it('--strict falla también si el enlace está marcado (sigue siendo un pendiente)', () => {
    const r = run('<html><body><a href="#" data-placeholder>Avís legal</a></body></html>', ['--strict']);
    expect(r.status).toBe(1);
    expect(r.stdout + r.stderr).toContain('Avís legal');
  });

  it('--strict pasa con anclas internas reales y sin pendientes', () => {
    const r = run('<html><body><a href="#carta">Carta</a><a href="tel:937937107">Truca</a></body></html>', ['--strict']);
    expect(r.status).toBe(0);
  });

  it('sin --strict informa del enlace pero no falla', () => {
    const r = run('<html><body><a href="#">Cookies</a></body></html>', []);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Cookies');
  });
});
