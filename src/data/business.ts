/**
 * Datos del negocio: fuente única de verdad.
 * Cabecera, pie, contacto, barra móvil y JSON-LD leen de aquí.
 * No modificar sin confirmación del cliente.
 */
export const business = {
  name: 'El Rostidor',
  foundingDate: '2002-04-13',
  foundedYear: 2002,

  address: {
    street: 'Rambla Sant Martí, 46',
    city: 'Arenys de Munt',
    region: 'Barcelona',
    country: 'ES',
    // postalCode: pendiente de confirmar
  },
  geo: { lat: 41.609875, lng: 2.540879 },

  phone: '937937107',
  phoneDisplay: '93 793 71 07',
  phoneE164: '+34937937107',
  email: 'elrostidorarenysdemunt@gmail.com',

  /**
   * Número de WhatsApp en formato internacional, solo dígitos (dato del cliente, 2026-10-21).
   * Si fuese null, ningún botón ni enlace de WhatsApp se muestra.
   */
  whatsapp: '34659331213' as string | null,
  whatsappDisplay: '659 33 12 13',

  social: {
    instagram: 'https://www.instagram.com/el_rostidor/',
    facebook: 'https://www.facebook.com/elrostidorarenysdemunt/',
  },

  /** Ficha de Google Business (cid derivado del mapa incrustado; el cliente debe confirmarlo). */
  googleListingUrl: 'https://www.google.com/maps?cid=17428563639894031302',

  directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=41.609875,2.540879',
  mapEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d186.44512029911772!2d2.5408787073923023!3d41.609875070914555!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12bb367f40328761%3A0xf1deb24a3d2c3bc6!2sEl%20Rostidor!5e0!3m2!1ses!2ses!4v1727702006106!5m2!1ses!2ses',
} as const;

export function whatsappUrl(message?: string): string | null {
  if (!business.whatsapp) return null;
  const base = `https://wa.me/${business.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
