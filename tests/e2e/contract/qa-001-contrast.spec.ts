/**
 * [QA-001] Contraste del aviso de la tarjeta roja de la paella o fideuà del jueves
 * («Encarrega-la un dia abans i la tindràs a punt.» / «Encárgala un día antes y la tendrás lista.»).
 * AGENTS.md 4.1: contraste AA mínimo 4,5:1 para texto normal. El test se localiza por texto visible,
 * sin clases ni data-*.
 */
import { test, expect, type Locator } from '@playwright/test';

const cases = [
  { lang: 'ca', path: '/', text: 'Encarrega-la un dia abans i la tindràs a punt.' },
  { lang: 'es', path: '/es/', text: 'Encárgala un día antes y la tendrás lista.' },
];

/** Contraste WCAG entre el color del texto y el fondo efectivo (compone fondos translúcidos de los ancestros). */
async function contrastRatio(locator: Locator): Promise<{ ratio: number; fg: number[]; bg: number[] }> {
  return await locator.evaluate((el) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const toRgba = (css: string): number[] => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    // Fondo: de fuera adentro, sobre blanco.
    const chain: number[][] = [];
    for (let n: Element | null = el; n; n = n.parentElement) chain.push(toRgba(getComputedStyle(n).backgroundColor));
    let bg = [255, 255, 255];
    for (const [r, g, b, a] of chain.reverse()) bg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)];
    const [fr, fgc, fb, fa] = toRgba(getComputedStyle(el).color);
    const fg = [fr * fa + bg[0] * (1 - fa), fgc * fa + bg[1] * (1 - fa), fb * fa + bg[2] * (1 - fa)];
    const lum = (c: number[]) => {
      const [r, g, b] = c.map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const [l1, l2] = [lum(fg), lum(bg)];
    return { ratio: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05), fg, bg };
  });
}

for (const { lang, path, text } of cases) {
  test(`[QA-001] (${lang}) el aviso ${text} de la tarjeta roja del jueves tiene contraste >= 4,5:1`, async ({ page }) => {
    await page.goto(path);
    const notice = page.getByText(text, { exact: true });
    await expect(notice).toHaveCount(1);
    await notice.scrollIntoViewIfNeeded();
    await expect(notice).toBeVisible();

    const { ratio } = await contrastRatio(notice);
    expect(ratio, `contraste medido ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });
}
