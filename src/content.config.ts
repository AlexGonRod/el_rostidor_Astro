import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const bilingual = z.object({ ca: z.string(), es: z.string() });

/** Un plato de la carta (sin precios: decisión del cliente, AGENTS.md 6.4). */
const carta = defineCollection({
  loader: file('src/content/carta.json'),
  schema: z.object({
    /** Orden de aparición dentro de su categoría (el loader de archivo ordena por id). */
    order: z.number(),
    name: z.string(),
    category: z.enum(['entrants', 'principals']),
    tag: z.enum(['popular', 'specialty', 'seasonal']).optional(),
    /** Los destacados se muestran como tarjeta con foto; el resto, en la lista compacta. */
    featured: z.boolean().default(false),
    /** Nombre de archivo dentro de src/assets/dishes/ (opcional). */
    photo: z.string().optional(),
    glutenFree: z.boolean().default(false),
    vegetarian: z.boolean().default(false),
  }),
});

/** Menú de la semana, de fin de semana y paella del jueves (ids: week, weekend, thursday). */
const menus = defineCollection({
  loader: file('src/content/menus.json'),
  schema: z.object({
    items: z.array(bilingual).default([]),
  }),
});

const reviews = defineCollection({
  loader: file('src/content/reviews.json'),
  schema: z.object({
    author: z.string(),
    text: z.string(),
    lang: z.enum(['ca', 'es']),
  }),
});

const faq = defineCollection({
  loader: file('src/content/faq.json'),
  schema: z.object({
    order: z.number(),
    question: bilingual,
    answer: bilingual,
  }),
});

export const collections = { carta, menus, reviews, faq };
