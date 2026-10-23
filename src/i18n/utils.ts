import ca from './ca.json';
import es from './es.json';

export type Lang = 'ca' | 'es';
export const langs: Lang[] = ['ca', 'es'];
export const defaultLang: Lang = 'ca';

/** El tipo del diccionario sale del catalán; el castellano debe tener las mismas claves. */
export type Dictionary = typeof ca;
export const dictionaries: Record<Lang, Dictionary> = { ca, es };

export const homePath = (lang: Lang): string => (lang === 'ca' ? '/' : '/es/');
export const otherLang = (lang: Lang): Lang => (lang === 'ca' ? 'es' : 'ca');

/** Sustituye {clave} por su valor. */
export function fmt(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * Política de placeholders (AGENTS.md 6.3.1): todo texto entre corchetes es un
 * dato pendiente del cliente. Se marca con data-placeholder para poder
 * detectarlo en el build (`npm run check:placeholders`).
 * Devuelve HTML seguro: úsalo con set:html.
 */
export function withPlaceholders(text: string): string {
  return escapeHtml(text).replace(
    /\[([^\]]+)\]/g,
    '<span data-placeholder class="rounded-sm bg-accent/10 px-1 text-accent">[$1]</span>',
  );
}
