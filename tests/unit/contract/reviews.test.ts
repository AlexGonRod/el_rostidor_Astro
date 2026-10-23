/**
 * Contrato de los datos de reseñas (AGENTS.md 7.6): src/content/reviews.json guarda exactamente 3 reseñas
 * reales de Google, copiadas literalmente. Lo visible (texto, autor, enlace a la ficha) está en
 * tests/e2e/contract/award-reviews.spec.ts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const reviews = () => JSON.parse(readFileSync('src/content/reviews.json', 'utf8')) as Record<string, { author: string; lang: string; text: string }>;

describe('[RV-D1] src/content/reviews.json: las 3 reseñas reales, literales', () => {
  it('contiene exactamente los ids jose-manuel, carol y raquel', () => {
    expect(Object.keys(reviews()).sort()).toEqual(['carol', 'jose-manuel', 'raquel']);
  });

  it('Jose Manuel Mesa Romero: texto literal, en castellano', () => {
    expect(reviews()['jose-manuel']).toEqual({
      author: 'Jose Manuel Mesa Romero',
      lang: 'es',
      text: 'El Rostidor, es la apuesta segura si desea comer casero de estos que están hechos con chup-chup durante horas',
    });
  });

  it('CAROL Hernandez: texto literal, en castellano (autor en mayúsculas tal cual)', () => {
    expect(reviews().carol).toEqual({ author: 'CAROL Hernandez', lang: 'es', text: 'Muy buena comida y las personas son una maravilla' });
  });

  it('Raquel Ramírez: texto literal, en castellano', () => {
    expect(reviews().raquel).toEqual({
      author: 'Raquel Ramírez',
      lang: 'es',
      text: 'Las mejores manzanas de relleno de arenales de montón junto con la amabilidad de todo el equipo hace un 10 de este local',
    });
  });

  it('las reseñas antiguas (Marc, Roser Alvarez, Victor Sanchez Vendrell) se han retirado', () => {
    const raw = readFileSync('src/content/reviews.json', 'utf8');
    for (const old of ['"marc"', '"roser"', '"victor"', 'Marc', 'Roser', 'Victor', 'Cada domingo encargamos', 'Nunca tienen un no por respuesta', 'muy bien de precio']) {
      expect(raw).not.toContain(old);
    }
  });

  it('el esquema de la colección sigue pidiendo author, text y lang (sin campos nuevos obligatorios)', () => {
    for (const review of Object.values(reviews())) expect(Object.keys(review).sort()).toEqual(['author', 'lang', 'text']);
  });
});
