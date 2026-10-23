/**
 * Contrato del dato de WhatsApp (AGENTS.md 6.3 y 7.3). Dato del cliente (2026-10-21): 34659331213.
 * Los criterios visibles (4 sitios, 5 enlaces, barra móvil de 3 acciones...) están en tests/e2e/contract/whatsapp.spec.ts.
 */
import { describe, it, expect } from 'vitest';

const biz = async () => await import('../../../src/data/business');

const MSG_CA = 'Hola, El Rostidor! Voldria fer un encàrrec per recollir.';
const MSG_ES = '¡Hola, El Rostidor! Me gustaría hacer un encargo para recoger.';
const URL_CA = 'https://wa.me/34659331213?text=Hola%2C%20El%20Rostidor!%20Voldria%20fer%20un%20enc%C3%A0rrec%20per%20recollir.';
const URL_ES = 'https://wa.me/34659331213?text=%C2%A1Hola%2C%20El%20Rostidor!%20Me%20gustar%C3%ADa%20hacer%20un%20encargo%20para%20recoger.';

describe('[WA-1] business.whatsapp y whatsappUrl', () => {
  it('el número está en formato internacional, solo dígitos: 34659331213', async () => {
    const { business } = await biz();
    expect(business.whatsapp).toBe('34659331213');
    expect(business.whatsapp).toMatch(/^\d+$/);
  });

  it('whatsappUrl(mensaje CA) devuelve exactamente la URL de AGENTS.md 7.3 (encodeURIComponent)', async () => {
    const { whatsappUrl } = await biz();
    expect(whatsappUrl(MSG_CA)).toBe(URL_CA);
    expect(encodeURIComponent(MSG_CA)).toBe(URL_CA.split('?text=')[1]); // los textos y las URLs del diseño son coherentes
  });

  it('whatsappUrl(mensaje ES) devuelve exactamente la URL de AGENTS.md 7.3', async () => {
    const { whatsappUrl } = await biz();
    expect(whatsappUrl(MSG_ES)).toBe(URL_ES);
    expect(encodeURIComponent(MSG_ES)).toBe(URL_ES.split('?text=')[1]);
  });

  it('sin mensaje la URL es el enlace base, sin «?text=»', async () => {
    const { whatsappUrl } = await biz();
    expect(whatsappUrl()).toBe('https://wa.me/34659331213');
  });

  it('el teléfono fijo no cambia (tel: 937937107) y no se confunde con el WhatsApp', async () => {
    const { business } = await biz();
    expect(business.phone).toBe('937937107');
    expect(business.phoneDisplay).toBe('93 793 71 07');
    expect(business.phoneE164).toBe('+34937937107');
    expect(business.phone).not.toBe(business.whatsapp);
  });
});
