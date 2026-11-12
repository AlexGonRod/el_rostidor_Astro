/**
 * Pruebas propias del implementador (tests/unit/dev) para la leyenda de alérgenos
 * de la carta: los 8 iconos con su nombre al lado junto a la frase del mostrador,
 * y los iconos pequeños de «Més plats» y de las tarjetas intactos.
 *
 * Renderiza los componentes con la Container API de Astro y comprueba el HTML.
 * La maquetación real (scroll horizontal, solape y wrap) se mide en el navegador
 * y queda como evidencia del informe, no como prueba del repositorio.
 */
import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import AllergenIcons from '../../../src/components/ui/AllergenIcons.astro';
import Carta from '../../../src/components/sections/Carta.astro';
import DishCard from '../../../src/components/ui/DishCard.astro';
import { ALLERGEN_KEYS } from '../../../src/lib/allergens';
import { dictionaries, withPlaceholders, type Lang } from '../../../src/i18n/utils';

const render = async (Component: unknown, props: Record<string, unknown>) => {
  const container = await AstroContainer.create();
  return container.renderToString(Component as never, { props });
};

/** Trozo de HTML de la leyenda: desde su marca hasta el cierre de la lista. */
const legendSlice = (html: string) => {
  const start = html.indexOf('data-allergen-legend');
  return start === -1 ? '' : html.slice(start, html.indexOf('</ul>', start));
};

const listItems = (html: string) => [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((match) => match[1]);

/** Ancho en px que el componente fija al icono. */
const iconWidth = (fragment: string) => Number(/width:\s*([\d.]+)px/.exec(fragment)?.[1] ?? NaN);

const labelTexts = (html: string) =>
  [...html.matchAll(/data-allergen-label[^>]*>([^<]*)</g)].map((match) => match[1]);

describe('leyenda de alérgenos junto a la frase de la carta', () => {
  for (const lang of ['ca', 'es'] as Lang[]) {
    it(`(${lang}) pinta los 8 alérgenos con su nombre al lado y el icono de 24 px o más`, async () => {
      const legend = legendSlice(await render(Carta, { lang }));
      expect(legend, 'la leyenda no aparece en la carta').not.toBe('');

      const items = listItems(legend);
      expect(items).toHaveLength(ALLERGEN_KEYS.length);

      for (const key of ALLERGEN_KEYS) {
        const label = dictionaries[lang].carta.allergenLabels[key];
        const item = items.find((fragment) => labelTexts(fragment).includes(label));
        expect(item, `falta «${label}» (${key}) en la leyenda ${lang}`).toBeDefined();
        expect(iconWidth(item!), `icono de «${label}» demasiado pequeño`).toBeGreaterThanOrEqual(24);
      }
    });

    it(`(${lang}) la leyenda va pegada a la frase del mostrador`, async () => {
      const html = await render(Carta, { lang });
      const phraseStart = html.indexOf(withPlaceholders(dictionaries[lang].carta.allergens).slice(0, 25));
      expect(phraseStart, 'no se encontró la frase de alérgenos').toBeGreaterThan(-1);
      const legendStart = html.indexOf('data-allergen-legend');
      expect(legendStart).toBeGreaterThan(phraseStart);
      expect(legendStart - phraseStart).toBeLessThan(500);
    });
  }

  it('la frase se pinta una sola vez y las etiquetas salen del i18n, sin corchetes', async () => {
    const html = await render(Carta, { lang: 'ca' });
    const phrase = withPlaceholders(dictionaries.ca.carta.allergens);
    expect(html.split(phrase)).toHaveLength(2);

    const labels = labelTexts(legendSlice(html));
    expect(labels).toHaveLength(ALLERGEN_KEYS.length);
    for (const key of ALLERGEN_KEYS) {
      expect(labels).toContain(dictionaries.ca.carta.allergenLabels[key]);
    }
    for (const label of labels) expect(label).not.toContain('[');
  });
});

describe('los iconos de platos y tarjetas siguen pequeños y sin etiquetas', () => {
  const expectSmallIconsWithoutLabels = (html: string) => {
    expect(html).not.toContain('data-allergen-legend');
    expect(html).not.toContain('data-allergen-label');
    const sizes = [...html.matchAll(/<img[^>]*style="([^"]*)"/g)].map((match) => match[1]);
    expect(sizes).toHaveLength(2);
    for (const style of sizes) expect(style).toContain('1.25em');
  };

  it('AllergenIcons sin showLabels no escribe etiquetas y mantiene 1.25em', async () => {
    const html = await render(AllergenIcons, { lang: 'ca', allergens: ['pescado', 'moluscos'] });
    expectSmallIconsWithoutLabels(html);
  });

  it('DishCard sin foto conserva los iconos pequeños sin etiquetas', async () => {
    const html = await render(DishCard, { lang: 'ca', name: 'Plat de prova', allergens: ['pescado', 'moluscos'] });
    expectSmallIconsWithoutLabels(html);
  });
});
