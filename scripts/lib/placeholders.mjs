// Análisis puro del HTML de un build para detectar datos pendientes (AGENTS.md §6.3.1 y §16).

const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/**
 * @param {string} html
 * @returns {{ pending: string[]; unmarkedLinks: string[] }}
 *  - pending: texto de cada elemento con `data-placeholder` (span, div, a, p, li, strong, button...).
 *  - unmarkedLinks: texto de cada `<a href="#">` sin `data-placeholder`, en orden de aparición.
 */
export function scanHtml(html) {
  const pending = [...html.matchAll(/<(span|div|a|p|li|strong|em|button|figure)\b[^>]*\bdata-placeholder\b[^>]*>(.*?)<\/\1>/gs)].map((m) =>
    stripTags(m[2]),
  );
  const unmarkedLinks = [...html.matchAll(/<a\b([^>]*)>(.*?)<\/a>/gs)]
    .filter(([, attrs]) => /\bhref\s*=\s*(?:"#"|'#'|#(?=[\s>]|$))/.test(attrs) && !/\bdata-placeholder\b/.test(attrs))
    .map(([, , inner]) => stripTags(inner));
  return { pending, unmarkedLinks };
}
