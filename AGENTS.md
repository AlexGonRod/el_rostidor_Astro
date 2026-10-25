# AGENTS.md — El Rostidor (web)

Guía para agentes y desarrolladores que trabajen en la nueva web de **El Rostidor**, tienda de comida casera para llevar en Arenys de Munt (Barcelona), abierta desde el 2002.

Este documento recoge las bases del rediseño: objetivos, stack, sistema de diseño, estructura de la página, reglas de contenido, accesibilidad, SEO y criterios de calidad. Si algo aquí entra en conflicto con una petición puntual, pregunta antes de saltártelo.

**Cómo se mantiene este archivo.** Lo genera y actualiza el agente orquestador (skill `project-orchestrator`) a partir de lo que pide el usuario, y después lanza en orden `ux-ui-designer` (diseño), `tdd-test-author` (tests en rojo), `frontend-implementer` (código en verde) y `qa-e2e-tester` (verificación independiente). El desarrollo es **TDD**: quien programa no escribe los tests que lo juzgan (sección 16). Cada sección tiene un responsable, que es el único que la reescribe; el resto solo la lee o propone cambios en el registro de decisiones (sección 15). Estado actual y próximo paso: sección 15.

---

## 1. Objetivo del proyecto

La web actual funciona como un folleto: informa, pero no ayuda a hacer lo único que el negocio necesita, que es **encargar comida**. El rediseño tiene un único objetivo de negocio:

> Que cualquier visitante pueda encargar (llamar, escribir por WhatsApp o pedir presupuesto) en menos de 10 segundos desde cualquier punto de la página, sobre todo en móvil.

Prioridades, de mayor a menor:

1. Camino directo al encargo (botón "Encarrega" siempre visible, barra de acción en móvil).
2. Carta que vende: foto y etiquetas por plato (sin precios, decisión del cliente).
3. Menús de la semana y paella/fideuà del jueves visibles y fáciles de actualizar.
4. Horarios claros, con indicador "Obert ara".
5. Confianza: historia familiar, reseñas reales, premio.
6. SEO local y accesibilidad.

## 2. Stack tecnológico

- **Astro 7** como generador estático. Sitio 100 % estático salvo que se justifique lo contrario.
- **Tailwind CSS v4**, integrado con el plugin de Vite (`@tailwindcss/vite`). Tokens definidos con `@theme` en `src/styles/global.css`, sin `tailwind.config.js`.
- **TypeScript 6** en modo estricto. Está fijado en la 6 a propósito: `astro check` todavía no soporta TypeScript 7. No actualizar hasta que Astro lo permita.
- **Pruebas:** Vitest (lógica pura) y Playwright con axe (comportamiento y accesibilidad), con flujo TDD (sección 16). Las dependencias y los scripts los crea `tdd-test-author`.
- **Astro Content Collections** (con Zod, `astro/zod`) para carta, menús, reseñas y FAQ. Usan el loader `file()` con un JSON por colección (`src/content/*.json`). Ese loader ordena por id, así que carta y FAQ llevan un campo `order` explícito; respétalo al añadir entradas. Los horarios viven en `src/data/hours.ts`.
- **`astro:assets`** (`<Image>` / `<Picture>`) para todas las imágenes: WebP/AVIF, `width`/`height` explícitos, `loading="lazy"` salvo la imagen del hero.
- **Fuentes autoalojadas** con `@fontsource` (Bricolage Grotesque y DM Sans). No cargar Google Fonts desde CDN.
- JavaScript en cliente: mínimo. Preferir HTML/CSS (`<details>`, `:target`, `:has()`). Si hace falta interactividad, un script ligero en el propio componente Astro; no introducir React/Vue/Svelte sin acuerdo previo.
- Verifica las versiones exactas con `npm view astro version` y `npm view tailwindcss version` antes de instalar.

### Comandos

```bash
npm install
npm run dev        # servidor local
npm run build      # build de producción
npm run preview    # servir el build
npm run check      # astro check: tipos y diagnósticos (debe pasar sin errores)
npm run check:placeholders   # informe de datos pendientes visibles en dist/ (tras build)
npm run check:release        # igual, pero falla si queda alguno: úsalo antes de publicar

# Pruebas (creadas por tdd-test-author)
npm run test:unit            # Vitest: contrato y pruebas propias del implementador
npm run test:contract        # solo el contrato (unitario y e2e)
npm run test:e2e             # Playwright sobre el build de producción
npm run contract:fix         # fija el candado del contrato (solo tdd-test-author)
npm run contract:verify      # falla si alguien ha tocado el contrato
```

## 3. Estructura del repositorio

```
src/
  assets/            # imágenes originales (fotos de platos, familia, hero)
  components/
    layout/          # Header, Footer, TopBar, MobileActionBar, ClosingCta
    sections/        # Hero, WeeklyMenus, Carta, Celebrations, HowToOrder,
                     # About, Reviews, Faq, Contact
    ui/              # Button, WhatsAppButton, DishCard, SectionHeading, Placeholder, OpenNow
    HomePage.astro   # compone todas las secciones; recibe `lang` ('ca' | 'es')
  content/
    carta.json       # un objeto por plato (id → datos); `order`, `featured`, sin campo `price` (el cliente no quiere precios)
    menus.json       # ids: week, weekend, thursday (platos bilingües; sin precio)
    reviews.json
    faq.json         # preguntas y respuestas bilingües, con `order`
  content.config.ts  # esquemas Zod de las colecciones
  data/
    business.ts      # nombre, dirección, teléfono, email, redes, coordenadas
    hours.ts         # horarios estructurados (fuente única de verdad)
  lib/               # módulos PUROS de lógica (reloj, zona horaria y datos inyectados).
                     # open-now.ts: zonedNow, computeOpenState, formatOpenLabel (OpenNow.astro solo toca el DOM)
  i18n/
    ca.json  es.json # textos de interfaz
    utils.ts         # helpers de traducción y rutas
  layouts/
    BaseLayout.astro # <head>, SEO, JSON-LD, fuentes, skip link
  pages/
    index.astro      # catalán (idioma por defecto, en /)
    es/index.astro   # castellano (en /es)
  styles/
    global.css       # @import "tailwindcss"; @theme { ...tokens... }
public/              # favicon, og-image, robots.txt
tests/
  unit/contract/     # Vitest. Lo escribe tdd-test-author. El implementador NO lo toca
  unit/dev/          # Vitest. Pruebas internas del implementador
  e2e/contract/      # Playwright. Lo escribe tdd-test-author. El implementador NO lo toca
  e2e/               # resto: pruebas añadidas por qa-e2e-tester
  contract.lock.json # huellas del contrato (candado)
```

Regla: **un dato, un sitio**. El teléfono, la dirección, los horarios y las redes se definen una sola vez en `src/data/` y se reutilizan en cabecera, pie, contacto, barra móvil, JSON-LD e indicador "Obert ara".

## 4. Sistema de diseño

El diseño de referencia es el lienzo **"El Rostidor — Nova home"** (versión escritorio en catalán y primera pantalla móvil en castellano). Es la fuente visual de verdad: si hay dudas de espaciado, jerarquía o tono, sigue el lienzo.

- **Enlace** (privado): https://claude.ai/artifact/2o8zJP7aBGDZ1dzesrJAFe
- **Copia en el repositorio** para agentes sin acceso al enlace: `docs/design/` (ver su `README.md`).

### 4.1 Colores (definir en `@theme`)

| Token | Valor | Uso |
|---|---|---|
| `ink` | `#1E1A17` | Texto principal, barra superior, secciones oscuras, footer |
| `muted` | `#5E564F` | Texto secundario, descripciones |
| `line` | `#E4DDD6` | Bordes, separadores, tarjetas |
| `soft` | `#F6F2EE` | Fondo de secciones alternas (menús, nosaltres, FAQ) |
| `accent` | `#B8321F` | Color de marca: botón primario, eyebrow, enlaces destacados, bandas de CTA |
| `accent-dark` | `#962716` | Hover del botón primario |
| `accent-light` | `#F0A08F` | Eyebrow y cabeceras sobre fondo oscuro |
| `open` | `#3FB868` | Punto de "Obert ara" (solo sobre fondo oscuro) |
| `on-dark` | `#F6F2EE` | Texto sobre fondos oscuros |
| `on-dark-muted` | `#CFC6BD` / `#E4DDD6` | Texto secundario sobre fondos oscuros |
| `line-dark` | `#3A332E` | Separadores en el footer |
| `ph-a` / `ph-b` | `#ECE6E0` / `#E3DCD5` | Rayas del placeholder de imagen |

Reglas:
- No introducir colores nuevos sin justificarlo. Si hace falta, se añade al `@theme`, no como valor suelto.
- Contraste mínimo WCAG AA: 4.5:1 para texto normal, 3:1 para texto de 24 px o más.
- El verde `open` no se usa como texto sobre blanco (no pasa contraste); sobre blanco, usar `ink` con el punto verde decorativo.

#### 4.1.1 Contrastes calculados (WCAG, razón de luminancia)

| Pareja (texto sobre fondo) | Razón | Uso | Cumple |
|---|---|---|---|
| `ink` sobre blanco | 17,28:1 | Texto principal | Sí (AA y AAA) |
| `ink` sobre `soft` | 15,51:1 | Texto en secciones alternas | Sí |
| `muted` sobre blanco | 7,19:1 | Descripciones, texto de «Tancat» en la tabla | Sí |
| `muted` sobre `soft` | 6,46:1 | Descripciones en secciones alternas | Sí |
| `accent` sobre blanco | 5,98:1 | Eyebrow, enlaces, texto del botón claro | Sí |
| `accent` sobre `soft` | 5,37:1 | Eyebrow en secciones alternas | Sí |
| blanco sobre `accent` | 5,98:1 | Botón primario, tarjeta del jueves, banda de cierre | Sí |
| `on-dark` sobre `accent` | 5,37:1 | Texto de la banda de cierre | Sí |
| blanco sobre `accent-dark` | 8,08:1 | Hover del botón primario | Sí |
| blanco sobre velo oscuro (`rgb(0 0 0 / .22)` sobre `accent` = `#902718`) | 8,44:1 | **Aviso de la tarjeta del jueves** y marcadores de dato pendiente sobre `accent` | Sí |
| `on-dark` sobre velo oscuro (`#902718`) | 7,57:1 | Igual, con `on-dark` | Sí |
| `on-dark` sobre `ink` | 15,51:1 | Texto en secciones oscuras | Sí |
| `on-dark-muted` (`#CFC6BD`) sobre `ink` | 10,26:1 | Texto secundario en oscuro | Sí |
| `#E4DDD6` sobre `ink` | 12,85:1 | Horarios del pie | Sí |
| `accent-light` sobre `ink` | 8,34:1 | Cabeceras del pie | Sí |
| `open` (`#3FB868`) | — | Solo punto decorativo sobre fondo oscuro; **nunca como texto** | n/a |

Regla: cualquier texto sobre `accent` usa blanco o `on-dark`; si lleva velo, siempre oscuro (nunca blanco).

### 4.2 Tipografía

- **Display** (titulares, wordmark, números grandes): *Bricolage Grotesque*, pesos 700 y 800, interlineado ajustado (≈1.05–1.1) y tracking ligeramente negativo.
- **Cuerpo e interfaz**: *DM Sans*, pesos 400, 500 y 700, interlineado 1.5.
- Escala orientativa: hero H1 64 px (36 px en móvil), H2 de sección 40 px, H3 de tarjeta 20–24 px, cuerpo 16–18 px, lead 18–20 px, eyebrow 13 px en mayúsculas con tracking `.12em`.
- Texto de cuerpo nunca por debajo de 16 px, salvo metadatos y notas (14 px mínimo).

### 4.3 Espaciado y layout

- Contenedor: `max-width: 1200px`, centrado, padding horizontal 40 px en escritorio y 16 px en móvil.
- Secciones: padding vertical 72 px en escritorio (48 px en móvil). Alternar fondo blanco y `soft`; usar `ink` y `accent` solo para bandas de énfasis (Celebraciones, cierre, footer).
- Filas de tarjetas: `flex-wrap` o grid con `minmax`, que colapsen a una columna en móvil sin romper.
- Radios: botones 6 px, tarjetas 10 px, imágenes grandes 12 px, chips y pestañas totalmente redondeados.

### 4.4 Componentes base

- **Botón primario**: fondo `accent`, texto blanco, 700, alto mínimo 52 px (44 px en variantes compactas), radio 6 px, hover `accent-dark`.
- **Botón secundario**: borde 2 px `ink`, fondo transparente, hover relleno `ink` con texto blanco.
- **Eyebrow**: texto en mayúsculas, 13 px, 700, color `accent`, encima de cada H2.
- **Tarjeta**: fondo blanco, borde `line`, radio 10 px, `overflow: hidden`.
- **Tag de plato**: 12 px, mayúsculas, 700, color `accent` ("Més demanat", "Especialitat", "De temporada").
- **Tarjeta de menú** (semana / fin de semana): título H3 (display 24 px), subtítulo (`muted`), lista de 3 líneas con separador `line`, y **solo un botón secundario «Encarrega»** (alto mínimo 44 px) alineado a la izquierda. Sin precio.
- **Tarjeta del jueves** (fondo `accent`, radio 10 px, padding 32 px; ver 7.4): de arriba abajo, H3 «Paella o fideuà» (display 36 px), línea de horario (17 px), **aviso de «un dia abans»** en pastilla con velo oscuro (17 px, 700, padding 12 × 16 px, radio 6 px) y **botón claro «Encarrega»** (fondo blanco, texto `accent`, alto mínimo 52 px). Jerarquía sin precio: el énfasis fuerte es el título; el aviso es el segundo nivel; el botón cierra. Contrastes en 4.1.1.
- **Tarjeta de plato**: foto o placeholder (160 px de alto), tag opcional (reserva 18 px de alto aunque no haya tag, para alinear) y nombre H3 (display 20 px). **Sin precio.** El nombre ocupa el último renglón de la tarjeta (sin margen inferior extra).
- **Botón WhatsApp**: mismas variantes que «Trucar» en su contexto (secundario sobre blanco, `outline-light` sobre `accent`, icono de la barra móvil), etiqueta visible «WhatsApp», icono SVG de burbuja con `aria-hidden="true"`, alto mínimo 44 px. Nunca verde de marca de WhatsApp (no hay colores nuevos).
- **Indicador de estado («Obert ara»)**: texto 14–16 px en 700 + punto de 10 px. Cinco estados: `open` (punto verde `open` decorativo; el texto es siempre `ink` o `on-dark`, nunca verde), `closed` (cerrado fuera de horas, punto neutro), `closedDay` (cerrado todo el día, punto neutro), `orders` (solo encargos, punto neutro) y `unknown` (reserva). La información va siempre en el texto, nunca solo en el color del punto.
- **Placeholder de imagen**: rayas diagonales `ph-a`/`ph-b` con texto en mayúsculas describiendo la foto que falta. Se usa **solo** hasta tener la foto real.
- **Iconos**: SVG en línea, trazo, `aria-hidden="true"` si son decorativos. **Nada de emojis** como iconos.

## 5. Estructura de la página (orden y anclas)

Cada sección tiene un `id` estable que se usa en el menú, la barra móvil y los CTA.

| Orden | Sección | `id` | Contenido clave |
|---|---|---|---|
| 0 | Barra superior | — | Indicador de estado (7.1: "Obert ara · fins a les 14:30", "Tancat avui · obrim dijous a les 10:30", …), dirección, teléfono, selector CA/ES |
| 1 | Cabecera (sticky) | — | Wordmark, navegación, botón **Encarrega** |
| 2 | Hero | `inici` | H1, subtítulo, CTA "Encarrega ara" y "Veure la carta", 3 sellos de confianza, foto grande |
| 3 | Menús | `menus` | Menú de la semana (**solo jueves**, 2026-10-25), menú de fin de semana, bloque destacado "Paella o fideuà" (jueves). **Sin precios**; cada tarjeta termina en «Encarrega» |
| 4 | Carta | `carta` | Pestañas por categoría, tarjetas con foto, nombre y tag (**sin precio**), nota de alérgenos |
| 5 | Celebraciones | `celebracions` | Comuniones, aniversarios, empresas, reuniones familiares + "Demana pressupost" |
| 6 | Cómo encargar | `encarrega` | 3 pasos, botones Llamar y WhatsApp (el paso 2 informa: lunes y martes cerrado, miércoles solo encargos) |
| 7 | Nosotros | `nosaltres` | Foto de la familia, historia, hitos (2002, premio 2021, km 0) |
| 8 | Opiniones | `opinions` | Nota de Google (pendiente), 3 reseñas reales de Google (ver 7.6), enlace a la ficha |
| 9 | FAQ | `faq` | 4 preguntas con `<details>` |
| 10 | Contacto | `contacte` | Horarios completos (lunes y martes «Tancat»), dirección, teléfono, WhatsApp, email, mapa, "Trucar", "WhatsApp" y "Com arribar" |
| 11 | Banda de cierre | — | "Encarrega el dinar d'avui" + Llamar / WhatsApp |
| 12 | Footer | — | Marca, redes, navegación, horarios (4 líneas, ver 7.1), contacto, enlaces legales |

Nota: el hero mantiene sus dos CTA ("Encarrega ara" y "Veure la carta") y **no** lleva botón de WhatsApp (un solo énfasis primario por vista); "Encarrega ara" lleva a `#encarrega`, donde están Llamar y WhatsApp. La cabecera tampoco lleva WhatsApp: su botón «Encarrega» lleva a la misma sección.

Navegación principal: **Carta · Menús · Celebracions · Nosaltres · Contacte** + botón **Encarrega**.

### Móvil

- Barra de acción fija en la parte inferior con tres acciones, **siempre las tres** (WhatsApp ya tiene número): **Llamar · WhatsApp · Cómo llegar** (iconos SVG + etiqueta, áreas táctiles ≥ 44 px, `padding-bottom` con `env(safe-area-inset-bottom)`). Enlace de WhatsApp con mensaje predefinido (7.3).
- Hero con CTA a ancho completo.
- Chip de estado bajo la cabecera con el texto del indicador (7.1), en sus cinco estados. En la franja de menú de la primera pantalla móvil no hay precio: solo «Menú de la semana» y «Jueves: paella o fideuà».
- La página debe funcionar bien desde 360 px de ancho, sin scroll horizontal.

## 6. Contenido

### 6.1 Idiomas

- **Catalán** es el idioma por defecto (`/`). **Castellano** en `/es`.
- Textos de interfaz en `src/i18n/ca.json` y `es.json`; contenido editable (platos, menús, FAQ, reseñas) en las colecciones de contenido con campos por idioma.
- `<html lang>` correcto en cada página, enlaces `hreflang` entre versiones y selector CA/ES que mantiene la sección actual (ancla).
- Las reseñas se muestran en su idioma original; si están en castellano dentro de la versión catalana, se indica "(original en castellà)".

### 6.2 Tono y copy

- Cercano, cálido, familiar, sin ser cursi. Frases cortas. Verbos de acción en los CTA ("Encarrega", "Truca", "Passa a recollir").
- Titular del hero: **"Cuina casolana d'Arenys, per emportar."**
- Evitar claims no verificables ("el mejor", "100 % garantizado").
- Ortografía catalana correcta: "Per què", "Arenys de Munt" (con mayúscula en Munt), "Rambla Sant Martí".
- El tono de los textos del lienzo es la referencia.

### 6.3 Datos reales del negocio

Estos datos son reales y salen de la web actual. No cambiarlos sin confirmación del cliente.

- **Dirección**: Rambla Sant Martí, 46, Arenys de Munt.
- **Teléfono**: 93 793 71 07 (`tel:937937107`).
- **WhatsApp** (dato del cliente, 2026-10-21): 659 33 12 13; en formato internacional `34659331213` (enlace `https://wa.me/34659331213`). Se muestra como «659 33 12 13».
- **Premio**: «Millor botiga de menjar per emportar», **2021** (dato del cliente, 2026-10-21; resuelve la discrepancia 2021/2022 de la web actual).
- **Email**: elrostidorarenysdemunt@gmail.com (recomendar pasar a un correo con dominio propio).
- **Redes**: Instagram `el_rostidor`, Facebook `elrostidorarenysdemunt`.
- **Horarios**:
  - **Dilluns i dimarts: tancat** (todo el día; dato del cliente, 2026-10-21).
  - Dimecres: només encàrrecs, amb trucada prèvia.
  - Dijous i divendres: 10:30 a 14:30.
  - Dissabtes, diumenges i festius: 9:00 a 15:00.
  - Festivos que caen en lunes o martes: **sin confirmar** (pendiente; hasta entonces la web muestra «cerrado» esos días).
- **Historia**: abre el 13 d'abril de 2002 en el vell mig de la Riera d'Arenys de Munt; Pere Collet con sus padres Josep y Rosa; formación en la Escola d'Hosteleria de Calella y el Gremi de Pastisseria de Barcelona; experiencia en restaurantes como l'Hispania y el Sant Pau de Carme Ruscalleda.
- **Oferta**: producto fresco y de km 0, menú de semana y de fin de semana, paella o fideuà los jueves, carta amplia, presupuestos sin compromiso.
- **Carta actual** (base para la colección `carta`):
  - Entrants: ensaladilla, rovellons a la brasa, cargols (a la llauna o guisats), salpicó de marisc, esqueixada, croquetes, bunyols de bacallà, albergínies farcides, truites variades, canelons, macarrons, lasanya, callos, calamar a la romana, musclos marinera, patates braves.
  - Principals: pollastre i conill rostit 1/4, mar i muntanya, sarsuela, peu de porc guisat, paella, fideuà, calamars farcits, bacallà (a la llauna o amb samfaina), mandonguilles amb sípia, mandonguilles, fricandó, galta a l'ast, conill a l'ast, pollastre a l'ast, melós de vedella, secret ibèric.

### 6.3.1 Política de placeholders (importante)

**No inventes datos.** Lo que no se conoce se marca entre corchetes y se lista en la sección 12 (Pendientes):

- Precios: **no se muestran en ningún sitio** (decisión del cliente, 2026-10-21; ver 6.4). Ya no hay marcador `[X,XX] €`.
- Platos del menú semanal: `[Primer plat]`, `[Segon plat]`, `[Postres]` (solo para tarjetas sin platos: el menú de la semana ya tiene los tres; el fin de semana sigue vacío).
- Postre del menú del jueves: **no está definido**; se muestra la línea «Postre» / «Postre» (dato del cliente, 2026-10-25), sin corchetes y sin marcador.
- Nota y nº de reseñas de Google: `[4,X] ★ · [N] ressenyes`.
- Hora límite de encargo de la paella, respuestas definitivas de la FAQ, puntuación y enlace de Google. Resueltos el 2026-10-21 (ya sin marcador): número de WhatsApp, horario del lunes (cerrado) y año del premio (2021).

Nunca publicar un build de producción con corchetes visibles. Todo texto entre corchetes que pase por `withPlaceholders()` (en `src/i18n/utils.ts`) y todo marcador de foto (`<Placeholder>`) lleva el atributo `data-placeholder`; `npm run check:release` falla si queda alguno en `dist/`. Para dar un dato por resuelto, quita los corchetes del JSON/i18n o sustituye el marcador por la imagen real.
Si el número de WhatsApp (`business.whatsapp`) es `null`, todos los botones de WhatsApp se ocultan automáticamente (regla que se mantiene aunque el número ya esté dado).

### 6.4 Decisiones del cliente que prevalecen (2026-10-21)

Estas decisiones mandan sobre cualquier otra línea de este documento que las contradiga (en particular 1, 3 y 12; las secciones 1 y 3 son del orquestador, ver registro de decisiones).

1. **Sin precios.** Suposición registrada: el cliente dijo «no quiere precios en los menús» y se aplica a **toda la web**: menús semanales, tarjeta del jueves **y carta de platos**. Si el cliente solo quería quitarlos de los menús y mantenerlos en la carta, se revierte en un cambio pequeño (la tarjeta de plato y el precio por línea de la carta; ver registro).
2. **WhatsApp** `34659331213`, con botones visibles (7.3).
3. **Premio**: 2021.
4. **Lunes y martes cerrado**; miércoles solo encargos (7.1).
5. **Reseñas de Google**: 3 reseñas reales copiadas el 2026-10-22 (7.6) y enlace a la ficha derivado del mapa incrustado. Siguen pendientes la puntuación y el número total de reseñas de Google, y que el cliente confirme las reseñas y el enlace.

## 7. Funcionalidades clave

### 7.1 Indicador "Obert ara / Tancat" y horarios

**Datos (fuente única `src/data/hours.ts`).** Lunes y martes = día **cerrado todo el día** (tipo de día nuevo, distinto de `orders` y de `unknown`); miércoles = `orders`; jueves y viernes 10:30–14:30; sábado y domingo 9:00–15:00. Ningún día queda en `unknown`: ese estado solo sirve de reserva si no hay ni un día con apertura. La zona horaria es **Europe/Madrid** (no la del navegador). La lógica vive en `src/lib/open-now.ts` (pura); el script solo la conecta al DOM.

**Suposición A (registrada):** el miércoles de solo encargos **no cuenta como apertura de local**. La «próxima apertura» salta lunes, martes y miércoles hasta el primer día con horario de local (es lo que ya hace el módulo con `orders`). El miércoles se explica aparte («Només encàrrecs · truca abans»).

**Textos finales** (`{day}` = «avui»/«hoy» si abre más tarde ese mismo día; si no, el nombre del día; `{time}` sin cero inicial):

| Estado | CA | ES |
|---|---|---|
| Abierto | Obert ara · fins a les {time} | Abierto ahora · hasta las {time} |
| Cerrado fuera de horas (día con horario) | Tancat · obrim {day} a les {time} | Cerrado · abrimos {day} a las {time} |
| **Cerrado todo el día (lunes, martes)** | **Tancat avui · obrim {day} a les {time}** | **Cerrado hoy · abrimos {day} a las {time}** |
| Solo encargos (miércoles) | Només encàrrecs · truca abans | Solo encargos · llama antes |
| Reserva (sin ningún día de apertura) | Consulta els horaris | Consulta los horarios |
| Sin JavaScript / antes de calcular | Horaris i encàrrecs | Horarios y encargos |

Claves nuevas sugeridas en i18n: `openNow.closedDay`; `contact.closed` = «Tancat» / «Cerrado». Se elimina `contact.unknownDay` («[confirmar]»).

**Criterios observables** (hora de Madrid; los instantes UTC son para los tests; octubre de 2026 en CEST = UTC+2, hasta el domingo 25-oct; desde el 26-oct, CET = UTC+1):

| # | Condición | Resultado |
|---|---|---|
| H1 | Lunes 19-oct-2026 a las 00:00 (2026-10-18T22:00Z), 12:00 (10:00Z) y 23:59 (21:59Z) | CA «Tancat avui · obrim dijous a les 10:30»; ES «Cerrado hoy · abrimos el jueves a las 10:30». Mismo texto a las tres horas. Estado `closedDay`, nunca `unknown` |
| H2 | Martes 20-oct-2026 a las 00:00 (2026-10-19T22:00Z), 12:00 y 23:59 (21:59Z) | Igual que H1 (próxima apertura jueves 10:30) |
| H3 | **Martes por la noche:** martes 23:59 y miércoles 00:00 (2026-10-20T21:59Z y 22:00Z) | 23:59 sigue «Tancat avui · obrim dijous…»; 00:00 ya dice «Només encàrrecs · truca abans». El cambio ocurre a medianoche de Madrid, no de UTC ni del navegador |
| H4 | Miércoles 21-oct-2026 a cualquier hora (00:00 a 23:59) | «Només encàrrecs · truca abans». Nunca «Obert ara» ni «Tancat» |
| H5 | Jueves 22-oct-2026 a las 00:00–10:29 | «Tancat · obrim avui a les 10:30» (ES «abrimos hoy a las 10:30») |
| H6 | Jueves 10:30 (08:30Z) y 14:29 | «Obert ara · fins a les 14:30» |
| H7 | Jueves 14:30 en punto (cierre exacto) | «Tancat · obrim divendres a les 10:30» |
| H8 | Viernes 14:30 | «Tancat · obrim dissabte a les 9:00» |
| H9 | Domingo 15:00 en punto y posterior (hasta 23:59) | «Tancat · obrim dijous a les 10:30» (salta lunes y martes cerrados y miércoles solo encargos). No usa «Tancat avui» (el domingo es día con horario) |
| H10 | Sábado 15:00 | «Tancat · obrim diumenge a les 9:00» |
| H11 | Domingo 25-oct-2026 (cambio a horario de invierno) y lunes 26-oct | Domingo 9:00–15:00 hora de Madrid correcta aunque el día tenga 25 h; el lunes 26 sigue siendo «Tancat avui · obrim dijous…» con CET |
| H12 | Navegador en otra zona (p. ej. America/New_York) con el reloj en un lunes de Madrid | El texto es el de Madrid, no el del navegador |
| H13 | Ninguno de los días tiene horario de apertura de local (datos de prueba) | «Consulta els horaris» / «Consulta los horarios» (estado de reserva) |
| H14 | `closedDay` nunca produce `{day}` = «avui» | La próxima apertura de un día cerrado es siempre otro día |

**Presentación y accesibilidad.** El punto verde (`open`) solo aparece en el estado `open`; los otros estados llevan punto neutro. El estado se entiende solo con el texto (no solo con color). El indicador se actualiza cada minuto; un cambio de estado se anuncia de forma educada (`aria-live="polite"` actual) sin robar el foco.

**Sin JavaScript.** El HTML inicial muestra «Horaris i encàrrecs» / «Horarios y encargos» y la tabla de horarios es completa y visible. El indicador no afirma «abierto» ni «cerrado» sin JS.

**Tabla de horarios (Contacto), de lunes a domingo** (la fila del domingo lleva «i festius» / «y festivos»):

| Día | CA | ES |
|---|---|---|
| Dilluns / Lunes | Tancat | Cerrado |
| Dimarts / Martes | Tancat | Cerrado |
| Dimecres / Miércoles | Només encàrrecs, trucant abans | Solo encargos, llamando antes |
| Dijous / Jueves | 10:30 a 14:30 | 10:30 a 14:30 |
| Divendres / Viernes | 10:30 a 14:30 | 10:30 a 14:30 |
| Dissabte / Sábado | 9:00 a 15:00 | 9:00 a 15:00 |
| Diumenge i festius / Domingo y festivos | 9:00 a 15:00 | 9:00 a 15:00 |

Criterios: las filas «Tancat»/«Cerrado» se escriben con texto (no solo atenuadas), con `muted` o `ink` (7,19:1 mínimo sobre blanco); ninguna fila contiene `[confirmar]` ni `data-placeholder`; el orden es lunes a domingo; coincide con el indicador (H1 a H4) y con el pie.

**Pie (4 líneas):** CA «Dl i dt: tancat» · «Dc: només encàrrecs» · «Dj i dv: 10:30 a 14:30» · «Ds, dg i festius: 9:00 a 15:00». ES «Lun y mar: cerrado» · «Mié: solo encargos» · «Jue y vie: 10:30 a 14:30» · «Sáb, dom y festivos: 9:00 a 15:00».

**Datos estructurados (JSON-LD).** `openingHoursSpecification` solo con jueves, viernes, sábado y domingo. Lunes y martes (cerrados) y miércoles (solo encargos) no aparecen.

**Festivos.** No hay calendario de festivos: un festivo que caiga en jueves o viernes mostrará el horario del día; uno que caiga en lunes o martes mostrará «cerrado». Ningún texto afirma lo contrario; el cliente debe confirmar qué hace (pendiente 4). **No automatizable:** que la tabla y el chip se lean como una sola información coherente.

### 7.2 Carta con pestañas

- Pestañas por categoría (Entrants i tapes, Plats principals; ampliable a Postres y Per compartir).
- Debe funcionar sin JS (todas las categorías visibles) y mejorarse con JS (filtrado). Pestañas como `<button>` con `aria-pressed` o patrón `role="tablist"` completo.
- Cada plato: foto (o placeholder), nombre, tag opcional, al·lèrgens, marcas "sense gluten" / "vegetarià" cuando se confirmen. **Ningún precio**: ni en la tarjeta de plato ni en la lista «Més plats» (en esa lista cada fila es nombre + tag, sin cifra a la derecha).
- Orden de la colección controlado por un campo `order`. El campo `price` desaparece del esquema y de `carta.json` (no basta con dejarlo `null`).

### 7.3 Encargos y WhatsApp

- Botones principales: **Llamar** (`tel:`), **WhatsApp**, **Demana pressupost** (ancla a `#contacte`, donde están Llamar y WhatsApp).
- **WhatsApp:** número `34659331213` (solo dígitos, sin `+` ni espacios). Enlace: `https://wa.me/34659331213?text=<mensaje codificado con encodeURIComponent>`. El mensaje va en el idioma de la página:
  - CA: «Hola, El Rostidor! Voldria fer un encàrrec per recollir.» → `https://wa.me/34659331213?text=Hola%2C%20El%20Rostidor!%20Voldria%20fer%20un%20enc%C3%A0rrec%20per%20recollir.`
  - ES: «¡Hola, El Rostidor! Me gustaría hacer un encargo para recoger.» → `https://wa.me/34659331213?text=%C2%A1Hola%2C%20El%20Rostidor!%20Me%20gustar%C3%ADa%20hacer%20un%20encargo%20para%20recoger.`
- **Dónde se muestra (cuatro sitios, todos con el mismo enlace y mensaje):**

| Sitio | Variante | Etiqueta |
|---|---|---|
| Barra móvil de acción (3 acciones: Trucar · WhatsApp · Com arribar) | icono + etiqueta | WhatsApp |
| Cómo encargar (`#encarrega`) | secundario, junto a «Trucar al 93 793 71 07» | WhatsApp |
| Contacto (`#contacte`) | secundario, entre «Trucar» y «Com arribar»; además línea de texto «WhatsApp: 659 33 12 13» (también enlace) bajo el teléfono | WhatsApp |
| Banda de cierre | `outline-light` junto a «Trucar al …» | WhatsApp |

  No hay WhatsApp en el hero ni en la cabecera (ver sección 5).
- **Criterios observables:** (1) en `/` y `/es/` hay exactamente 4 enlaces cuyo `href` empieza por `https://wa.me/34659331213` más 1 enlace de texto en Contacto (5 en total); (2) todos llevan `?text=` con el mensaje del idioma de la página, y ninguno mezcla idiomas; (3) en móvil la barra fija muestra 3 acciones y su orden es Trucar, WhatsApp, Com arribar; (4) cada enlace mide al menos 44 × 44 px; (5) ninguno tiene `href="#"` ni `data-placeholder`; (6) el número se ve escrito solo como «659 33 12 13» en Contacto; (7) `tel:` sigue siendo `937937107`.
- **Casos negativos:** si `business.whatsapp` fuese `null`, no aparece ningún botón ni enlace de WhatsApp, ni la línea de texto del número (regla existente). El número de WhatsApp no se usa como `telephone` del JSON-LD (sigue el fijo).
- Opcional en una segunda fase: formulario de encargo (nombre, teléfono, plato, cantidad, fecha y hora de recogida) con servicio externo o endpoint serverless; en ese caso añadir política de privacidad y consentimiento.

### 7.4 Menús semanales (sin precios)

- Se editan en la colección `menus` (campos: tipo, platos, vigencia). **No hay campo de precio** (decisión del cliente, 6.4). El cliente debe poder actualizarlos cada semana sin tocar componentes.
- **Tarjeta de menú (semana y fin de semana):** título, subtítulo, 3 líneas de platos y botón «Encarrega». Sin cifra, sin «€» ni «/ ració». Subtítulos: semana CA «Només dijous» / ES «Solo los jueves» (decisión del cliente, 2026-10-25: el menú de la semana es solo de los jueves y sus platos son *Truita de patates* / *Tortilla de patatas*, *Paella o fideuà* y la línea «Postre» / «Postre»; la paella o fideuà aparece también en la tarjeta roja del jueves, que ya no lleva etiqueta); fin de semana CA «Dissabtes, diumenges i festius» / ES «Sábados, domingos y festivos».
- **Tarjeta roja del jueves («Paella o fideuà»)**, fondo `accent`:
  - Sin etiqueta de día: la etiqueta «Només dijous» / «Solo los jueves» se retiró el 2026-10-25 por indicación de la persona; el día lo dice el propio título del bloque y el subtítulo del menú de la semana.
  - Título: «Paella o fideuà».
  - Línea de horario: CA «De dimecres a diumenge» / ES «De miércoles a domingo» (confirmado por el cliente el 2026-10-25 como correcto).
  - **Aviso** (pastilla con velo oscuro, ver 4.1.1): CA «Encarrega-la un dia abans i la tindràs a punt.» / ES «Encárgala un día antes y la tendrás lista.» Dato del cliente (2026-10-25): resuelve el antiguo marcador `[hora límit]` / `[hora límite]`.
  - CTA: botón claro **«Encarrega»** (ca y es) a `#encarrega`. Sustituye a «Reserva la teva» por indicación del cliente; la clave `cta.reserve` queda sin uso.
  - Se elimina todo precio y «/ ració» (`menus.thursday.perServing`).
- **Criterios observables:**
  1. En las tres tarjetas, ningún texto visible contiene `€`, dígitos seguidos de `€`, `[X,XX]`, «/ ració» ni «/ ración».
  2. La tarjeta del jueves contiene, en este orden, H3, línea de horario, aviso y un único enlace «Encarrega», y **no** contiene «Només dijous» / «Solo los jueves».
  3. El contraste del aviso es ≥ 4,5:1 (blanco sobre el velo oscuro de `accent`: 8,44:1). Ya lo cubre QA-001; el contrato sigue localizando el aviso por su texto visible.
  4. El texto «Encarrega» de la tarjeta del jueves mide ≥ 44 px de alto y su contraste (texto `accent` sobre blanco) es 5,98:1.
  5. Sin datos de menú (platos vacíos), las líneas se muestran como `[Primer plat]` / `[Segon plat]` / `[Postres]` marcados como pendientes; la tarjeta mantiene el botón.
  6. A 320 px no hay desbordamiento horizontal y el botón no queda fuera de la tarjeta.
- **No automatizable:** jerarquía visual de la tarjeta (título, aviso, botón) y equilibrio sin la cifra; revisión visual a 360, 768 y 1280 px.
- No se propone ningún texto del tipo «consulta el precio»: no hace falta, porque no hay hueco que explicar. Si el cliente lo pidiera: CA «Pregunta'ns el preu» / ES «Pregúntanos el precio» (marcado como propuesta, no aplicado).

### 7.5 Premio

- Insignia del hero: CA «Millor botiga de menjar per emportar 2021» / ES «Mejor tienda de comida para llevar 2021» (sin marcador). Hito de «Nosaltres»: valor «2021», etiqueta «Millor botiga de menjar per emportar» / «Mejor tienda de comida para llevar».
- Criterios: en `/` y `/es/` no aparece `2021/22`, `[2021/22]`, `any a confirmar` ni `año a confirmar`; el año «2021» aparece en la insignia y en el hito (2 veces, además de «2002»).
- Sigue pendiente el logotipo del sello (opcional) y, si el cliente lo tiene, qué entidad concedió el premio; la web no nombra a ninguna.

### 7.6 Opiniones (reseñas reales de clientes)

- **Decisión del orquestador (2026-10-22, a petición del cliente: «las reseñas puedes cogerlas de Google»):** se sustituyen las 3 reseñas sin fuente por 3 reseñas reales de Google, copiadas **literalmente** (sin editar ni corregir), con autor. Fuente: la ficha de El Rostidor en gastroranking.es, que reproduce reseñas de Google (consultada el 2026-10-22); Google Maps no es accesible desde aquí. Solo se usan reseñas completas (las recortadas con «…» se descartan).
- Reseñas (todas en castellano; en `/` se indica «(original en castellà)»):
  1. Jose Manuel Mesa Romero: «El Rostidor, es la apuesta segura si desea comer casero de estos que están hechos con chup-chup durante horas»
  2. CAROL Hernandez: «Muy buena comida y las personas son una maravilla»
  3. Raquel Ramírez: «Las mejores manzanas de relleno de arenales de montón junto con la amabilidad de todo el equipo hace un 10 de este local»
- `src/content/reviews.json` guarda exactamente esas 3 (ids `jose-manuel`, `carol`, `raquel`; campos `author`, `lang`, `text`). Se retiran Marc, Roser Alvarez y Victor Sanchez Vendrell (sin fuente verificada).
- **Enlace «Llegir totes les ressenyes a Google →»:** pasa a `https://www.google.com/maps?cid=17428563639894031302`, con `rel="noopener"` y sin `data-placeholder`. El identificador sale del identificador de lugar del mapa que ya incrusta la web (`0xf1deb24a3d2c3bc6`, convertido a decimal); el cliente debe confirmar que abre su ficha.
- **Puntuación y n.º de reseñas** (`[4,X] ★ · [N] ressenyes a Google`): siguen como marcador pendiente. La fuente consultada da 9,6/10 y 250 opiniones, pero es un agregador y no la cifra de Google; no se publica. Mientras sea marcador, `check:release` bloquea la publicación.
- Criterios: (1) la sección muestra exactamente las 3 reseñas de arriba, con su texto literal y su autor; (2) ninguna de las reseñas retiradas aparece en la página; (3) el enlace a todas las reseñas es `https://www.google.com/maps?cid=17428563639894031302`, `rel="noopener"` y sin `data-placeholder`; (4) el número de enlaces `href="#"` sin marcar sigue en 0; (5) las reseñas son citas literales: no incumplen la regla de 6.4 si contienen la palabra «precio».
- Pregunta al cliente (ver 12.5): que confirme que las 3 reseñas y el enlace a su ficha son correctos, y la puntuación y el número total de reseñas actuales de Google.

## 8. Accesibilidad (obligatoria)

- Nivel objetivo: **WCAG 2.2 AA**.
- HTML semántico: un único `<h1>`, jerarquía de encabezados sin saltos, `<header>`, `<nav aria-label>`, `<main>`, `<section>` con encabezado, `<footer>`.
- Enlace "Saltar al contenido" como primer elemento enfocable.
- Elementos interactivos reales: `<a href>` para navegar, `<button>` para acciones. Nunca `div` con `onclick`.
- Foco visible en todos los elementos interactivos (no eliminar `outline` sin sustituirlo).
- Áreas táctiles ≥ 44 × 44 px.
- `alt` descriptivo en imágenes informativas, `alt=""` en decorativas. Iconos de solo icono con `aria-label`.
- Respetar `prefers-reduced-motion`: animaciones suaves y desactivables.
- No transmitir información solo por color.
- Los `<details>` de la FAQ deben ser operables con teclado (comportamiento nativo).

## 9. SEO y datos estructurados

- **No incluir `noimageindex`** en `meta robots`: las fotos de comida deben poder indexarse (la web actual lo tiene y hay que quitarlo).
- `<title>` y `description` orientados a búsqueda local, por ejemplo: *"Menjar per emportar a Arenys de Munt · Pollastre a l'ast, paella i menús"*.
- JSON-LD `Restaurant` o `FoodEstablishment` con nombre, dirección, teléfono, horarios (`openingHoursSpecification`), `servesCuisine`, `hasMenu`, coordenadas y `sameAs` (redes).
- Open Graph y Twitter Card con imagen propia (`public/og-image`).
- `sitemap.xml` (integración `@astrojs/sitemap`), `robots.txt`, URL canónica y `hreflang` ca/es.
- Mantener coherencia con la ficha de Google Business Profile (nombre, dirección, teléfono, horarios).
- Textos con las expresiones que la gente busca: "menjar per emportar Arenys de Munt", "pollastre a l'ast", "paella per emportar", "menú del dia".

## 10. Rendimiento

- Objetivo Lighthouse móvil: Performance ≥ 90, Accesibilidad ≥ 95, SEO ≥ 95, Best Practices ≥ 95.
- Imagen del hero: prioritaria (`loading="eager"`, `fetchpriority="high"`), el resto, lazy.
- Imágenes responsivas con `srcset`/`sizes` y `width`/`height` para evitar CLS.
- Fuentes: solo los pesos usados, `font-display: swap`, precarga del peso crítico.
- Mapa de Google: cargarlo bajo demanda (`loading="lazy"` en el iframe o botón "Carregar mapa") y siempre con enlace directo "Com arribar".
- Evitar dependencias de JS pesadas. Antes de añadir una librería, valorar si basta con CSS/HTML.

## 11. Convenciones de código

- Componentes Astro en `PascalCase.astro`; utilidades en `camelCase.ts`.
- Estilos con clases de Tailwind usando los tokens del `@theme`. Evitar valores arbitrarios (`w-[437px]`) salvo casos justificados y comentados.
- Extraer a componente cuando un patrón de clases se repita más de dos veces (botones, tarjetas, encabezados de sección).
- Sin CSS en línea, salvo valores dinámicos.
- Props tipadas con `interface Props`.
- Nada de datos de negocio hardcodeados en componentes: salen de `src/data/` o de las colecciones.
- **TDD:** todo comportamiento nuevo empieza por un test en rojo escrito por `tdd-test-author`. El implementador lo pone en verde con el código mínimo y refactoriza en verde. Nunca se modifica, desactiva ni debilita un test de contrato; si parece erróneo, se declara una disputa.
- **Código testeable:** la lógica (estado de apertura, formato de precios, constructores de URL, datos estructurados) vive en módulos puros de `src/lib/` con el reloj, la zona horaria y los datos inyectados. Los componentes y scripts solo los conectan con el DOM.
- Commits pequeños y descriptivos (convención sugerida: Conventional Commits).
- No introducir emojis en la interfaz, ni gradientes decorativos, ni sombras pesadas. El estilo es cálido, limpio y editorial, no "plantilla".

## 12. Pendientes que debe aportar el cliente

Mientras no estén resueltos, se mantienen como placeholders (ver 6.3.1).

**Abiertos**

1. ~~Precios~~ **Cancelado** por decisión del cliente (2026-10-21): no se muestran precios. Si cambiara de opinión, hay que rediseñar tarjetas de plato y menús.
2. Fotos reales: pollos en el ast (hero), platos estrella, la familia (Pere, Josep y Rosa) en el obrador, safates para celebraciones.
3. Menú de fin de semana (platos, cada semana).
4. Calendario de festivos y qué hace el local cuando un festivo cae en lunes o martes (hoy se muestra «cerrado»).
5. **Reseñas de Google: pedir al cliente** (a) que confirme que el enlace a su ficha de Google Business es correcto, (b) la puntuación y el número total de reseñas actuales, y (c) que acepta citar las 3 reseñas de 7.6 (Jose Manuel Mesa Romero, CAROL Hernandez, Raquel Ramírez). Sin (b), la puntuación queda como marcador y bloquea la publicación.
6. Logotipo del sello del premio (opcional).
7. Respuestas definitivas de la FAQ: antelación de encargos, servicio a domicilio, instrucciones de recalentado, información de alérgenos.
8. Textos legales: aviso legal, privacidad y cookies.
9. Correo con dominio propio (opcional pero recomendado).
10. Confirmar la suposición de «sin precios en toda la web» (6.4): si solo era para los menús, la carta recupera precio.

**Resueltos (2026-10-21, datos del cliente)**

- WhatsApp: 659 33 12 13 (`34659331213`).
- Año del premio: 2021.
- Horario del lunes: cerrado; martes: cerrado (antes «solo encargos»); miércoles: solo encargos.
- Precios: no se muestran.

**Resueltos (2026-10-25, datos del cliente)**

- Hora límite de encargo de la paella/fideuà del jueves: **un día antes** («Encarrega-la un dia abans i la tindràs a punt.» / «Encárgala un día antes y la tendrás lista.»). Ya no es marcador.
- Menú de la semana: solo jueves, con *Truita de patates* / *Tortilla de patatas*, *Paella o fideuà* y la línea «Postre» / «Postre» (el postre en sí no está definido).
- Línea de horario de la tarjeta roja del jueves: «De dimecres a diumenge» / «De miércoles a domingo» es correcta (confirmado por el cliente).

## 13. Definición de "terminado"

Una tarea de UI no está terminada hasta que:

- [ ] Se ve bien a 360, 768 y 1280 px, sin scroll horizontal.
- [ ] Respeta los tokens de color, tipografía y espaciado de este documento.
- [ ] No hay datos inventados ni corchetes de placeholder en producción.
- [ ] Teléfono, horarios y dirección salen de `src/data/`.
- [ ] Funciona con teclado y tiene foco visible; contraste AA verificado.
- [ ] Existe versión en catalán y en castellano.
- [ ] `npm run check` y `npm run build` pasan sin errores ni avisos nuevos.
- [ ] El contrato de pruebas pasa entero sobre el build de producción y está intacto (`npm run contract:verify`).
- [ ] Lighthouse móvil cumple los objetivos de la sección 10.
- [ ] El CTA de encargo sigue accesible desde cualquier punto de la página.

## 14. Qué NO hacer

- No quitar ni esconder el botón de encargo, ni la barra de acción móvil.
- No añadir `noimageindex` ni bloquear la indexación de imágenes.
- No usar emojis como iconos ni imágenes de stock genéricas de comida; si no hay foto real, usar el placeholder.
- No cargar fuentes o scripts de terceros sin necesidad (analítica, widgets, chats) ni sin aviso de cookies cuando proceda.
- No mezclar idiomas en una misma página, salvo las reseñas en su idioma original.
- No cambiar horarios, precios, dirección o teléfono sin confirmación del cliente.
- No modificar, borrar, desactivar ni debilitar tests de contrato (`tests/unit/contract/`, `tests/e2e/contract/`) ni `tests/contract.lock.json` para que pasen.
- No escribir en la misma ejecución los tests de contrato y el código que los satisface.

## 15. Estado y flujo de agentes

### Responsables por sección

| Secciones | Responsable | Los demás… |
|---|---|---|
| 1 Objetivo · 13 Definición de terminado · 14 Qué NO hacer · 15 Estado | `project-orchestrator` | leen |
| 4 Sistema de diseño · 5 Estructura de la página · 7 Funcionalidades (comportamiento) · 12 Pendientes (alta de datos) | `ux-ui-designer` | leen; el implementador propone cambios en el registro |
| 16 Pruebas: contrato de módulos y selectores · matriz criterio → test · `tests/**/contract/` y candado | `tdd-test-author` | leen; el implementador declara disputas, no edita |
| 2 Stack y comandos · 3 Estructura del repositorio · 10 Rendimiento (resultados) · 11 Convenciones de código · `tests/unit/dev/` | `frontend-implementer` | leen; el diseñador propone cambios en el registro |
| 16 Pruebas: validación y veredicto · pruebas e2e adicionales | `qa-e2e-tester` | leen; QA no modifica código de producto ni el contrato: reporta defectos al orquestador |
| 6 Contenido · 8 Accesibilidad · 9 SEO | compartidas: las define el orquestador, las concreta el diseñador, las convierte en tests el autor de pruebas y las cumple el implementador | |

### Estado

| Fase | Estado | Responsable | Notas |
|---|---|---|---|
| Brief y bases | Hecho | orquestador | Este documento |
| Diseño | Hecho para la home; cambio de requisitos del cliente (2026-10-21) diseñado y pendiente de implementar | `ux-ui-designer` | Lienzo "El Rostidor — Nova home" actualizado (sin precios, WhatsApp, horario, premio 2021, versión 9). Escritorio en catalán y primera pantalla móvil en castellano. Sin diseñar: móvil completo, páginas legales y el estado «Tancat avui» del chip (descrito en 7.1, no dibujado) |
| Contrato de pruebas (TDD) | Ampliado y en **rojo** por el cambio de requisitos del cliente (2026-10-22); QA-001/002/003 siguen en verde | `tdd-test-author` | Candado re-fijado (12 archivos). Nuevos: sin precios, WhatsApp, lunes/martes cerrados (`closedDay`), premio 2021 y reseñas reales; `open-now.test.ts` reescrito (AC-04 y H1..H14). Detalle en la sección 16 |
| Implementación | Cambio de requisitos del cliente (2026-10-22) implementado (sin precios, WhatsApp, premio 2021, lunes/martes cerrados, reseñas reales); contrato en verde (97 unitarios; e2e de contrato completos), `contract:verify` OK, `check` 0 errores, build OK | `frontend-implementer` | `npx playwright test`: 338 pasan, 8 fallan en `tests/e2e/open-now-browser.spec.ts` (casos obsoletos «lunes sin confirmar» y «martes solo encargos»; los actualiza QA, ver sección 16). 56 datos pendientes visibles por idioma/página en `check:placeholders`, 0 enlaces `href="#"` sin marcar |
| QA | **Aprobado** (2026-10-22, ciclo 3 de 3, regresión del cambio del cliente) | `qa-e2e-tester` | 0 defectos. Contrato en verde e intacto; suite completa 436 pasan, 0 fallan, 196 omitidas por diseño. Los 56 datos pendientes del cliente siguen bloqueando solo la publicación (`check:release`). Ver «Veredicto de QA» en la sección 16 |
| Publicación | Pendiente | — | Bloqueada hasta pendientes en 0 (`npm run check:release`), contrato en verde e intacto (`npm run contract:verify`) y QA con veredicto Aprobado |

**Próximo paso:** el cliente aporta los datos de la sección 12 y las fotos reales; después, hosting y dominio.

### Cómo decide el orquestador qué skill lanzar

| Petición del usuario | Skill | Después |
|---|---|---|
| Auditar, analizar o proponer mejoras de algo existente | `ux-ui-designer` (auditoría) | — |
| Diseñar, wireframe, mockup, sistema de diseño | `ux-ui-designer` | Si el usuario quiere construirlo: `tdd-test-author` → `frontend-implementer` → `qa-e2e-tester` |
| Construir o montar una web sin diseño previo | `ux-ui-designer` | `tdd-test-author` → `frontend-implementer` → `qa-e2e-tester` |
| Construir según un diseño ya aprobado | `tdd-test-author` | `frontend-implementer` → `qa-e2e-tester` |
| Cambio visual, de estructura o de textos | `ux-ui-designer` | `tdd-test-author` (tests del cambio) → `frontend-implementer` → `qa-e2e-tester` |
| Bug | `tdd-test-author` (test que lo reproduce, en rojo) | `frontend-implementer` lo corrige → `qa-e2e-tester` (regresión) |
| Cambio técnico sin comportamiento nuevo (rendimiento, dependencias, refactor) | `frontend-implementer` (el contrato existente debe seguir en verde) | `qa-e2e-tester` (regresión) |
| Proteger con tests código que ya existe | `tdd-test-author` (caracterización, en verde) | — |
| Comprobar que lo construido respeta el diseño | `ux-ui-designer` (revisión) | `frontend-implementer` corrige las desviaciones |
| Probar, validar o dar el visto bueno a lo construido | `qa-e2e-tester` | Si hay defectos: `frontend-implementer` los corrige (con test de regresión de `tdd-test-author` cuando proceda) y QA re-verifica (máximo 3 ciclos) |

Flujo estándar: `ux-ui-designer` → puerta de diseño → `tdd-test-author` (rojo) → puerta de rojo → `frontend-implementer` (verde y refactor) → puerta de verde (el orquestador ejecuta `contract:verify`) → `qa-e2e-tester` → publicación. Disputas sobre tests: el implementador las declara y el orquestador las devuelve al autor de pruebas.

### Registro de decisiones

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-10-15 | Stack: Astro + Tailwind | Petición del usuario |
| 2026-10-16 | Astro 7 con TypeScript 6 fijado | `astro check` no soporta TypeScript 7 todavía |
| 2026-10-16 | Campo `order` explícito en carta y FAQ | El loader `file()` ordena por id (alfabético) |
| 2026-10-16 | Botones de WhatsApp ocultos mientras `business.whatsapp` sea `null` | No mostrar un botón que no funciona |
| 2026-10-16 | Estilo de datos pendientes sobre fondos oscuros, fuera de `@layer` | Las utilidades de Tailwind ganaban a la capa base y el texto quedaba invisible |
| 2026-10-16 | Reseñas mostradas como extractos atribuidos a Google | Pendiente de que el cliente confirme la fuente y enlace a la ficha |
| 2026-10-18 | Se incorpora el rol de QA (`qa-e2e-tester`) con pruebas e2e en Playwright y se añade a la puerta de publicación | Verificar de forma independiente lo que construye el implementador |
| 2026-10-19 | Desarrollo con TDD: nueva skill `tdd-test-author` escribe el contrato de tests en rojo; `frontend-implementer` lo pone en verde sin poder modificarlo; el candado `contract:verify` lo comprueba | Si quien programa escribe también los tests, estos se amoldan a su implementación y dejan de comprobar el requisito |
| 2026-10-19 | La lógica se extrae a módulos puros de `src/lib/` con reloj, zona horaria y datos inyectados | Permite probarla con Vitest sin navegador. Aplica primero a «Obert ara» |
| 2026-10-19 | La home actual se mantiene sin contrato hasta una pasada de caracterización | Se construyó antes de adoptar TDD; los tests de caracterización dan red de seguridad antes de refactorizar |
| 2026-10-19 | Contrato de `open-now`: `zonedNow`, `computeOpenState` y `formatOpenLabel` devuelven estado estructurado; la etiqueta se formatea aparte | Probar la lógica sin depender de textos i18n; formato de `time` sin cero inicial como el script actual |
| 2026-10-20 | Extraído `src/lib/open-now.ts`; el script de `OpenNow.astro` solo lee `data-config`, llama al módulo y pinta | Contrato AC-01..AC-07 (34 tests en verde); la lógica es la del script original, sin cambios de comportamiento |
| 2026-10-20 | QA-001: los marcadores `[...]` de la tarjeta roja del jueves usan velo oscuro (`rgb(0 0 0 / .22)`) con texto `on-dark`, regla `.on-accent span[data-placeholder]` en `global.css` (fuera de `@layer`) | El velo blanco de `.on-dark` aclaraba el fondo y dejaba 4,0:1; con el velo oscuro supera 4,5:1. Sin colores nuevos en `@theme`; `.on-dark` sigue igual en fondos `ink` |
| 2026-10-20 | Las pruebas `home-regression.spec.ts` de áreas táctiles (44 px) y de `href="#"` sin marcar se mantienen en rojo | Documentan QA-002 y QA-003; no se relaja la aserción para que pasen |
| 2026-10-20 | `open-now-browser.spec.ts` usa `page.clock.install` y zonas horarias de navegador distintas de Madrid | El resultado debe depender de Europe/Madrid, no del navegador |
| 2026-10-20 | QA-002 y QA-003 pasan de `home-regression.spec.ts` al contrato (`tests/e2e/contract/qa-002-*`, `qa-003-*`) y se añade `tests/unit/contract/check-placeholders.test.ts`; candado re-fijado (5 archivos) | Son regresiones de defectos de código; no deben poder relajarse. Se quitan de la suite de QA para no duplicar |
| 2026-10-20 | Contrato nuevo `scripts/lib/placeholders.mjs` (`scanHtml`) y `DIST_DIR` en `check-placeholders.mjs`; un `<a href="#" data-placeholder>` cuenta como pendiente en `check:release` | El comprobador estaba acoplado a `dist/` y a una regex; se necesita probar que detecta enlaces sin marcar. Asunción: marcar un enlace no lo da por resuelto |
| 2026-10-20 | QA-002/QA-003 corregidos (ciclo 2): `scripts/lib/placeholders.mjs` (`scanHtml`), `check-placeholders.mjs` usa `DIST_DIR` e informa/falla por enlaces `href="#"` sin marcar; los 4 `href="#"` (Reviews, 3 legales del pie) llevan `data-placeholder`; áreas táctiles >= 44 px con `min-h-11`/`min-w-11` en selector CA/ES, wordmark, navegación/teléfono/email/legales del pie, teléfono y email de Contacto y resumen de la FAQ (el padding pasa del `<details>` al `<summary>`) | Sin cambios de tokens ni de jerarquía; variaciones visuales mínimas: barra superior sin padding vertical (la altura la da el selector de 44 px), interlineado del pie algo mayor. El regex de pendientes admite también `a`, `p`, `li`, `strong`, `em`, `button`, `figure` |
| 2026-10-19 | QA-001 se prueba con contraste calculado en el navegador (fondos translúcidos compuestos), localizado por texto | No acoplar el test a clases ni a `data-*`; admite cualquier corrección válida (cambio de fondo o de color) |
| 2026-10-21 | Nueva `tests/e2e/layout-viewports.spec.ts` (solo proyecto desktop, ancho fijado en el test; 44 px solo a <= 390 px; capturas solo con `SHOT_DIR`) | Cubrir 320 y 1920 px y detectar regresiones de relleno sin duplicar el contrato de móvil (Pixel 7) |
| 2026-10-21 | Cambio de requisitos del cliente (6.4): la decisión del cliente prevalece sobre lo escrito en AGENTS.md | Petición del cliente |
| 2026-10-21 | **Sin precios en toda la web** (menús, tarjeta del jueves y carta). Suposición: «precios en los menús» se interpreta como todos los precios | Evitar contradecir al cliente con una carta con precios; reversible. Se eliminan los marcadores `[X,XX] €`, `/ ració` y el campo `price` de `carta.json` y `menus.json` y del esquema; se eliminan `formatPrice` y su uso. Propuesta al orquestador: reescribir la prioridad 2 de la sección 1 («foto, precio y etiquetas» → «foto y etiquetas») y los comentarios de `carta.json`/`menus.json` de la sección 3 |
| 2026-10-21 | Tarjeta del jueves sin precio: aviso de hora límite en pastilla con velo oscuro y botón claro «Encarrega» (antes «Reserva la teva») | El aviso pasa a ser el segundo nivel de jerarquía; contraste 8,44:1 (con marcador) y 5,98:1 (sin él). El cliente pide el CTA «Encarrega». `cta.reserve` queda sin uso |
| 2026-10-21 | Subtítulo del menú de la semana «De dimecres a divendres» (suposición B) | Con el martes cerrado, «de dimarts a divendres» deja de ser cierto. A confirmar con el cliente |
| 2026-10-21 | WhatsApp `34659331213` con mensaje predefinido CA/ES; 4 botones + línea de texto en Contacto; sin WhatsApp en hero ni cabecera | Dato del cliente. Un solo énfasis primario en el hero; el encargo sigue a un toque (barra móvil) o dos (cabecera → `#encarrega`) |
| 2026-10-21 | Premio: 2021 | Dato del cliente; resuelve la discrepancia 2021/2022 de la web actual. No se cambia el nombre del premio |
| 2026-10-21 | Lunes y martes cerrado todo el día; nuevo estado `closedDay` («Tancat avui · obrim {day} a les {time}»); `unknown` pasa a ser solo reserva | Dato del cliente. Un día cerrado todo el día no puede decir «obrim avui». Suposición A: el miércoles de solo encargos no cuenta como apertura de local. **Afecta al contrato**: AC-04 («lunes sin confirmar no afirma nada») y los casos de martes `orders` cambian; lo reescribe `tdd-test-author` |
| 2026-10-21 | El paso 2 de «Cómo encargar» pasa a «Dilluns i dimarts, tancat. Els dimecres, només sota encàrrec.» / «Lunes y martes, cerrado. Los miércoles, solo bajo encargo.» | Coherencia con el horario nuevo |
| 2026-10-21 | Reseñas: se mantienen las 3 del JSON como pendientes de verificar; puntuación y enlace pendientes | AGENTS.md no dice que sean reales ni su origen (solo «pendiente de que el cliente confirme la fuente»). Google Maps no es accesible desde aquí. El lienzo tenía dos citas con texto distinto al del JSON: se alinea con el JSON |
| 2026-10-22 | Reseñas: se sustituyen las 3 sin fuente por 3 reales de Google (literales) y el enlace a la ficha deja de ser pendiente; puntuación y n.º siguen pendientes | El cliente pidió usar las reseñas de Google. Fuente: gastroranking.es (agregador que cita Google); Google Maps no es accesible. Solo reseñas completas. Enlace por `cid` derivado del mapa ya incrustado, a confirmar por el cliente |
| 2026-10-22 | `tdd-test-author`, modo contrato (cambio del cliente): `open-now.test.ts` reescrito (AC-04, AC-08, AC-09; H1..H14), nuevos `no-price`, `whatsapp`, `reviews` (unitarios) y `no-price`, `whatsapp`, `hours-closed-days`, `award-reviews` (e2e); candado re-fijado | Traducir 6.3, 6.4 y 7.1..7.6 a tests en rojo. El intento anterior (interrumpido) se revisó y se conservó entero; se corrigieron comprobaciones sin efecto (WA-6 pasaba sin enlaces) y se completaron los e2e que citaban sus comentarios |
| 2026-10-22 | Contrato de tipos: `DayRule` gana `{ kind: 'closed' }`, `OpenState` gana `closedDay` (con `today: false`) y `OpenNowText` gana `closedDay`; `data-state` del indicador = estado del módulo | Es lo que dicta 7.1 (estado `closedDay`); el atributo ya existía y los tests e2e lo leen |
| 2026-10-22 | Suposiciones del autor de pruebas: (a) el botón de las tarjetas en castellano admite «Encarrega» y «Encarga» (7.4 dice «Encarrega (ca y es)», pero el diccionario usa «Encarga»); (b) el subtítulo «De dimecres a divendres» se prueba como criterio aunque es la suposición B, a confirmar; (c) 7.1 llama «actual» al `aria-live="polite"` del indicador, pero el código no lo tiene: se exige (`aria-live` o `role="status"`); (d) el año «2021» aparece exactamente 2 veces en el texto visible | Ambigüedades de AGENTS.md; si alguna es errónea, el orquestador o el diseñador la corrige y se re-fija el candado |
| 2026-10-21 | Lienzo de referencia actualizado desde aquí (versión 9) y copia en `docs/design/` sincronizada | El lienzo era editable por su propietario |
| 2026-10-21 | QA-004 corregido: en `WeeklyMenus.astro` el precio de las tarjetas de menú lleva `whitespace-nowrap`, el contenedor precio/botón pasa a `flex-wrap` con `gap-x-4 gap-y-3` y, en la tarjeta del jueves, `[X,XX] €` y `/ ració` son dos tramos `nowrap` que pueden separarse entre sí | A 320 px en ca el «€» bajaba junto al botón. Ahora precio y moneda no se parten y el botón se recoloca debajo sin desbordar; sin cambios de tokens ni de diseño a >= 360 px. Comprobado con el marcador y con un precio de prueba (`12,50 €`) solo en local, sin dejarlo en el código |
| 2026-10-22 | El orquestador reescribe la prioridad 2 de la sección 1 y el comentario de `carta.json` de la sección 3 (sin precios). Se omite la parada de aprobación tras el diseño: el cambio lo dictó el cliente y es reversible; las suposiciones quedan en el registro para revisión del usuario | Evitar un viaje de ida y vuelta por un cambio pequeño; todo queda en git con etiqueta `gate-diseño-2` |
| 2026-10-22 | Implementación del cambio del cliente: `DayRule` `closed` y estado `closedDay` en `src/lib/open-now.ts`; `hours.ts` con lunes y martes cerrados; `business.whatsapp = '34659331213'`, `whatsappDisplay` y `googleListingUrl`; nuevo `ui/WhatsAppButton.astro` (4 sitios + línea de texto en Contacto); `price` y `formatPrice` eliminados; aviso del jueves en pastilla (`menus.thursday.notice`) y botón «Encarrega» (`cta.reserve` eliminada, `cta.whatsappMessage` añadida); `aria-live="polite"` en el texto del indicador; premio 2021; 3 reseñas reales y enlace a la ficha | Poner en verde el contrato gate-rojo-3. Desviación: el botón de las tarjetas sigue siendo «Encarga» en castellano (valor de `cta.order`; el contrato admite ambos). **Conflicto fuera del contrato:** `tests/e2e/open-now-browser.spec.ts` (QA) espera `unknown` el lunes y `orders` el martes; con el horario nuevo fallan 8 casos (obsoletos, ya anunciados en la sección 16) |
| 2026-10-25 | El menú de la semana pasa a ser solo de los jueves: subtítulo «Només dijous» / «Solo los jueves» y platos *Truita de patates* / *Tortilla de patatas*, *Paella o fideuà* y el postre pendiente (`[Postres]` / `[Postre]`). La tarjeta roja del jueves no cambia | Dato del cliente; sustituye la suposición B («De dimecres a divendres»). La paella o fideuà aparece en las dos tarjetas a propósito (la roja sigue siendo el bloque destacado de encargo). Contrato actualizado (`no-price.spec.ts`, `[P7]`) y candado re-fijado; `[P10]` se acota a cada tarjeta porque el menú de la semana ya tiene platos reales, y la regresión de QA corrige el texto del horario del jueves, que ya estaba en rojo en `v2` desde `bd106b4`. Tarea crew `tsk_01M5T1TXEQYZ4B83A3EFCJNN72` |
| 2026-10-25 | Red card del jueves: se retira la etiqueta «Només dijous» / «Solo los jueves» y el aviso pasa a «Encarrega-la un dia abans i la tindràs a punt.» / «Encárgala un día antes y la tendrás lista.» | Indicación de la persona. El día ya lo dicen el título del bloque y el subtítulo del menú de la semana; el aviso resuelve el pendiente `[hora límit]`. Contrato actualizado (`no-price.spec.ts` `[P8]`, `qa-001-contrast.spec.ts`) y regresión de QA (`client-changes-regression.spec.ts`) con una aserción nueva de que la tarjeta roja no lleva etiqueta; candado re-fijado. Tarea crew `tsk_01M5THASHSR5W1P7GGGBQANKVW` |
| 2026-10-25 | Postre del menú del jueves: la línea pasa a «Postre» / «Postre» (sin corchetes ni marcador), porque el postre en sí no está definido. La línea de horario de la tarjeta roja («De dimecres a diumenge» / «De miércoles a domingo») se confirma como correcta | Indicación de la persona. `check:placeholders` deja de contar el postre; el contrato `[P10]` ya compara las líneas con `menus.json`, así que no cambia y el candado queda igual |

## 16. Pruebas (TDD y QA)

Esta sección la comparten tres responsables, cada uno en su parte. Mientras no exista la suite, el estado del contrato y de QA es «Ninguno».

### Estructura de pruebas

Ver el árbol `tests/` en la sección 3. `contract/` es de `tdd-test-author`; `unit/dev/` es del implementador; el resto de `e2e/` es de QA.

### Candado del contrato

`npm run contract:fix` fija las huellas (solo `tdd-test-author`). `npm run contract:verify` comprueba que ningún test de contrato se ha modificado, borrado ni añadido sin registrar. El orquestador lo ejecuta en la puerta de verde y QA, antes de validar.

### Contrato de módulos y selectores

**Módulo `src/lib/open-now.ts`** (puro: sin DOM, sin `Date.now()`, sin leer la zona del navegador; no muta sus argumentos). Los tipos `DayRule` son los de `src/data/hours.ts`.

```ts
export type OpenState =
  | { state: 'open'; until: string }                                   // 'HH:MM' de cierre, sin cero inicial ('9:00', '14:30')
  | { state: 'closed'; next: { day: number; time: string; today: boolean } } // cerrado fuera de horas en un día CON horario; day = getDay() 0..6
  | { state: 'closedDay'; next: { day: number; time: string; today: false } } // NUEVO: día cerrado todo el día (lunes, martes); la próxima apertura nunca es hoy
  | { state: 'orders' }                                                // día de solo encargos
  | { state: 'unknown' };                                              // reserva: ningún día de la semana tiene horario de apertura de local

export interface OpenNowText { open: string; closed: string; closedDay: string; orders: string; unknown: string; today: string } // {time} y {day} como marcadores

export function zonedNow(now: Date, timezone: string): { day: number; minutes: number }; // día 0 = domingo; minutos desde las 00:00 en esa zona
export function computeOpenState(hours: Record<number, DayRule>, now: Date, timezone: string): OpenState;
export function formatOpenLabel(state: OpenState, text: OpenNowText, days: string[]): string;
```

Semántica (es la del script actual de `OpenNow.astro`, que debe quedar como simple conector con el DOM):
- Abierto si `apertura <= minutos < cierre` en la zona indicada; en el cierre exacto ya está cerrado.
- Hoy `orders`: devuelve `orders`. Hoy `unknown` (regla de día sin datos): devuelve `unknown`.
- **Hoy `closed` (regla de `hours.ts`, día cerrado todo el día): devuelve `closedDay` con `next` = el siguiente día con regla `open` (de mañana en adelante, hasta 7 días; saltando `closed`, `orders` y `unknown`), con `today: false`. Si no hay ningún día `open` en la semana: `unknown` (reserva, H13).**
- Hoy `open` antes de abrir: `closed` con `next = { day: hoy, time: apertura, today: true }`.
- Tras el cierre: busca de mañana en adelante (hasta 7 días) el primer día `open`, saltándose `orders` y `unknown`; si no hay ninguno, `unknown`.
- `time` y `until` quitan el cero inicial (`09:00` -> `9:00`).
- `formatOpenLabel` sustituye `{time}` y `{day}`; `{day}` = `text.today` si `next.today`, si no `days[next.day]`. `closedDay` usa `text.closedDay` («Tancat avui · obrim {day} a les {time}»), no `text.closed`.
- Los diccionarios `src/i18n/ca.json` y `es.json` definen `openNow.closedDay` con los textos de 7.1 (la clave forma parte del contrato de `OpenNowText`).
- Ejemplo nuevo: lunes 2026-10-19T10:00Z, Madrid -> `{ state: 'closedDay', next: { day: 4, time: '10:30', today: false } }`; miércoles 00:00 de Madrid (2026-10-20T22:00Z) -> `{ state: 'orders' }`.
- Ejemplos: jueves 2026-10-15T10:00Z, Madrid -> `{ state: 'open', until: '14:30' }`; domingo 2026-10-18T13:00Z -> `{ state: 'closed', next: { day: 4, time: '10:30', today: false } }`.

**Módulo `scripts/lib/placeholders.mjs`** (puro, ESM; lo usa `scripts/check-placeholders.mjs`):

```js
export function scanHtml(html: string): { pending: string[]; unmarkedLinks: string[] };
```
- `pending`: texto (sin etiquetas, recortado) de cada elemento con `data-placeholder`, incluido un `<a href="#" data-placeholder>` (conserva la lógica actual para `span`/`div`).
- `unmarkedLinks`: texto de cada `<a href="#">` que NO lleva `data-placeholder`, en orden de aparición. Las anclas reales (`#carta`), `tel:`, `mailto:` y `https:` no cuentan.
- `scripts/check-placeholders.mjs` lee `DIST_DIR` (por defecto `dist/`), imprime los enlaces sin marcar con su texto, y con `--strict` sale con código 1 si hay `pending` o `unmarkedLinks`; sin `--strict` sale con 0.
- Ejemplo: `scanHtml('<a href="#">Cookies</a>')` -> `{ pending: [], unmarkedLinks: ['Cookies'] }`.

**Datos `src/data/hours.ts`** (cambio 2026-10-22):

```ts
export type DayRule =
  | { kind: 'open'; open: string; close: string }
  | { kind: 'closed' }      // NUEVO: cerrado todo el día
  | { kind: 'orders' }
  | { kind: 'unknown' };    // solo reserva: ningún día queda en unknown en los datos publicados
```
`hours[1]` y `hours[2]` (lunes, martes) = `{ kind: 'closed' }`; `hours[3]` = `{ kind: 'orders' }`; jueves y viernes `10:30`-`14:30`; sábado y domingo `09:00`-`15:00`. `timezone`, `weekOrder` y `schemaDay` no cambian.

**Datos `src/data/business.ts`**: `business.whatsapp === '34659331213'` (solo dígitos) y `whatsappUrl(message?: string): string | null` -> `https://wa.me/34659331213` o, con mensaje, `https://wa.me/34659331213?text=<encodeURIComponent(message)>` (URLs exactas de 7.3). `business.phone` sigue siendo `937937107`.

**Contenido y código sin precio** (`tests/unit/contract/no-price.test.ts`): ni `carta.json` ni `menus.json` tienen la clave `price` (ni a `null`); `src/content.config.ts` no declara `price`; `src/i18n/utils.ts` no exporta `formatPrice`; ningún archivo de `src/` contiene `formatPrice`, `[X,XX]` ni `currency: 'EUR'`; los diccionarios no contienen `€`, `[X,XX]`, `/ ració`/`/ ración` ni la clave `perServing`; ningún componente tiene una prop `price`. **Reseñas** (`tests/unit/contract/reviews.test.ts`): `reviews.json` = ids `jose-manuel`, `carol`, `raquel`, campos exactos `author`, `lang` (`es`), `text` (literales de 7.6).

**Selectores** (los e2e de contrato usan roles y texto visible; solo dependen de estos atributos):
- `[data-open-now]` con `data-state` = estado del módulo (`open`, `closed`, `closedDay`, `orders`, `unknown`; `idle` sin JS) y `[data-open-now-text]` con el texto (ya existen). El punto decorativo es el primer descendiente `[aria-hidden="true"]` de `[data-open-now]`; en `open` su fondo es `#3FB868`. El texto del indicador o un ancestro lleva `aria-live="polite"` (o `role="status"`) (7.1; **hoy no existe, aunque 7.1 lo da por «actual»: lo añade el implementador**).
- Anclas de sección existentes: `#inici`, `#menus`, `#carta`, `#encarrega`, `#nosaltres`, `#opinions`, `#contacte`; la banda de cierre es una región (`section` con `aria-labelledby`) con el nombre de su H2; la barra móvil es `nav` con nombre `a11y.quickActions` («Accions ràpides» / «Acciones rápidas»).
- Tarjetas de menú: se localizan por el texto de su H3 («Menú de la setmana», «Menú de cap de setmana», «Paella o fideuà») y su ancestro más cercano con un enlace; el botón se llama «Encarrega» (en castellano se admite también «Encarga», el valor actual de `cta.order`) y lleva `href="#encarrega"`.
- Tabla de horarios: `<table>` de `#contacte` con 7 `<tr>`, cada una con una celda de cabecera (`th`) y una de valor (`td`), de lunes a domingo.
- Reseñas: `<blockquote>` dentro de `#opinions` (texto) y su `figure`/`li` ancestro (autor y aviso «(original en castellà)»). Insignia del hero: `<li>` dentro de `#inici`; hitos: `<dt>`/`<dd>` dentro de `#nosaltres`.
- Selector QA-001: el aviso se localiza por su texto visible («Encarrega-la un dia abans i la tindràs a punt.» en `/`, «Encárgala un día antes y la tendrás lista.» en `/es/`); no exige atributos `data-*` ni clases.

### Matriz criterio → test

| Criterio | Test | Nivel |
|---|---|---|
| AC-01 `zonedNow` da día y minutos en la zona inyectada (caracterización) | `tests/unit/contract/open-now.test.ts` | Unitario |
| AC-02 Dentro del horario: abierto hasta el cierre (caracterización) | `tests/unit/contract/open-now.test.ts` | Unitario |
| AC-03 Cerrado y próxima apertura, bordes de apertura y cierre (caracterización) | `tests/unit/contract/open-now.test.ts` | Unitario |
| AC-04 (reescrito 2026-10-22) Lunes y martes `closedDay` todo el día, miércoles `orders`; H1..H4, H13, H14; el cambio ocurre a medianoche de Madrid | `tests/unit/contract/open-now.test.ts` | Unitario |
| AC-08 `hours.ts`: lunes y martes `closed`, ningún día `unknown` | `tests/unit/contract/open-now.test.ts` | Unitario |
| AC-09 Textos finales del indicador (7.1, H1..H11) con los diccionarios reales; `openNow.closedDay` | `tests/unit/contract/open-now.test.ts` | Unitario |
| AC-05 Cambios de hora de España (29-mar y 25-oct-2026), también con lunes y martes cerrados (H11) | `tests/unit/contract/open-now.test.ts` | Unitario |
| AC-06 Reloj, zona y horarios inyectados; función pura; el lunes de Madrid manda sobre el domingo de Nueva York (H12) | `tests/unit/contract/open-now.test.ts` | Unitario |
| AC-07 Textos de estado (`formatOpenLabel`) (caracterización) | `tests/unit/contract/open-now.test.ts` | Unitario |
| QA-002 Áreas táctiles >= 44 x 44 px en móvil: todos los enlaces, botones y resúmenes visibles (ca y es, solo móvil) | `tests/e2e/contract/qa-002-touch-targets.spec.ts` | E2E |
| QA-003 Ningún `a[href="#"]` sin `data-placeholder` en la home (ca y es) | `tests/e2e/contract/qa-003-placeholder-links.spec.ts` | E2E |
| QA-003 El comprobador de pendientes detecta enlaces `href="#"` sin marcar (`scanHtml` y `check:release` con `DIST_DIR`) | `tests/unit/contract/check-placeholders.test.ts` | Unitario |
| QA-001 Contraste >= 4,5:1 del aviso («Encarrega-la un dia abans…» / «Encárgala un día antes…») en la tarjeta roja del jueves (ca y es, escritorio y móvil) | `tests/e2e/contract/qa-001-contrast.spec.ts` | E2E |
| P1 El campo `price` desaparece de `carta.json` y `menus.json` | `tests/unit/contract/no-price.test.ts` | Unitario |
| P2 El esquema Zod no define `price` | `tests/unit/contract/no-price.test.ts` | Unitario |
| P3 Diccionarios y JSON sin `€`, `[X,XX]`, `/ ració`, `perServing` | `tests/unit/contract/no-price.test.ts` | Unitario |
| P4 `formatPrice`, `[X,XX]` y la prop `price` desaparecen del código | `tests/unit/contract/no-price.test.ts` | Unitario |
| P5 Ninguna página muestra `€`, `[X,XX]`, `/ ració` ni cifra con moneda (7.4 criterio 1) | `tests/e2e/contract/no-price.spec.ts` | E2E |
| P6 La carta no muestra precio (tarjetas y lista «Més plats») (7.2) | `tests/e2e/contract/no-price.spec.ts` | E2E |
| P7 Tarjetas de menú: subtítulo («Només dijous» / «Solo los jueves» en la semana), 3 líneas, un único «Encarrega» >= 44 px (7.4) | `tests/e2e/contract/no-price.spec.ts` | E2E |
| P8 Tarjeta del jueves: H3, horario, aviso (bloque propio) y un único «Encarrega», en orden; sin etiqueta de día y sin «Reserva la teva» (7.4 criterios 2 y 4) | `tests/e2e/contract/no-price.spec.ts` | E2E |
| P9 A 320 px las tarjetas no desbordan (7.4 criterio 6; caracterización, ya en verde) | `tests/e2e/contract/no-price.spec.ts` | E2E |
| P10 Líneas de menú vacías -> marcadores pendientes con `data-placeholder`; con platos, los platos (7.4 criterio 5; caracterización, ya en verde) | `tests/e2e/contract/no-price.spec.ts` | E2E |
| WA-1 `business.whatsapp` y `whatsappUrl` (URLs exactas 7.3) | `tests/unit/contract/whatsapp.test.ts` | Unitario |
| WA-2 5 enlaces `wa.me/34659331213`, todos con el mensaje del idioma de la página, sin mezclar | `tests/e2e/contract/whatsapp.spec.ts` | E2E |
| WA-3 Botón «WhatsApp» en barra móvil, Cómo encargar, Contacto (entre Trucar y Com arribar, más línea de texto) y banda de cierre; ninguno en hero ni cabecera | `tests/e2e/contract/whatsapp.spec.ts` | E2E |
| WA-4 Barra móvil: Trucar, WhatsApp, Com arribar, en ese orden, fija | `tests/e2e/contract/whatsapp.spec.ts` | E2E |
| WA-5 Cada enlace de WhatsApp visible >= 44 x 44 px | `tests/e2e/contract/whatsapp.spec.ts` | E2E |
| WA-6 Ningún enlace de WhatsApp es `href="#"` ni `data-placeholder` | `tests/e2e/contract/whatsapp.spec.ts` | E2E |
| WA-7 El número «659 33 12 13» solo se escribe en Contacto | `tests/e2e/contract/whatsapp.spec.ts` | E2E |
| WA-8 `tel:937937107` intacto; el JSON-LD conserva el fijo (caracterización, ya en verde) | `tests/e2e/contract/whatsapp.spec.ts` | E2E |
| H1..H12 Indicador en el navegador con reloj controlado y zona distinta de Madrid (lunes/martes `closedDay`, miércoles `orders`, medianoche, cambio de hora, «nunca abrimos hoy» un día cerrado) | `tests/e2e/contract/hours-closed-days.spec.ts` | E2E |
| 7.1 Punto verde solo en `open`; anuncio educado (`aria-live`); sin JS «Horaris i encàrrecs» y tabla completa | `tests/e2e/contract/hours-closed-days.spec.ts` | E2E |
| 7.1 Tabla de horarios (Tancat lunes y martes, sin marcadores), pie de 4 líneas, paso 2 de «Cómo encargar» | `tests/e2e/contract/hours-closed-days.spec.ts` | E2E |
| 7.1 JSON-LD solo con jueves a domingo (caracterización, ya en verde) | `tests/e2e/contract/hours-closed-days.spec.ts` | E2E |
| AW-1..AW-3 Premio 2021: insignia del hero, hito de Nosaltres, «2021» exactamente 2 veces, sin `2021/22` ni «a confirmar» (7.5) | `tests/e2e/contract/award-reviews.spec.ts` | E2E |
| RV-D1 `reviews.json`: exactamente 3 reseñas literales, antiguas retiradas (7.6) | `tests/unit/contract/reviews.test.ts` | Unitario |
| RV-1, RV-3 Opiniones muestra las 3 reseñas con texto y autor literales; las antiguas no aparecen | `tests/e2e/contract/award-reviews.spec.ts` | E2E |
| RV-2 «(original en castellà)» solo en la versión catalana (caracterización, ya en verde) | `tests/e2e/contract/award-reviews.spec.ts` | E2E |
| RV-4, RV-5 Enlace a la ficha `https://www.google.com/maps?cid=17428563639894031302`, `rel="noopener"`, sin `data-placeholder`; ningún `href="#"` en Opiniones | `tests/e2e/contract/award-reviews.spec.ts` | E2E |

No automatizables (para QA o diseño): estética y jerarquía visual de la tarjeta del jueves sin precio (7.4), equilibrio de las tarjetas a 360, 768 y 1280 px, lectura con lector de pantalla, que la tabla y el chip se lean como una sola información (7.1), el estilo `outline-light` del botón de la banda de cierre y que el icono de WhatsApp no use el verde de marca. Fuera del contrato: la puntuación y el n.º de reseñas de Google (siguen pendientes), el calendario de festivos, el resto de criterios de la home.

### Comandos y entorno de pruebas

- `npm run test:unit` (Vitest), `npm run test:contract` (contrato unitario + e2e), `npm run test:e2e` (Playwright, todo `tests/e2e`).
- E2E sobre el build: `npm run build && npx astro preview --background`, luego `CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e`, y `npx astro preview stop`. Playwright usa `http://localhost:4321` (`BASE_URL` lo sustituye). No ejecutar `playwright install`.
- Estado actual (2026-10-22, cambio de requisitos del cliente): **verdes** (caracterización y guardas): QA-001, QA-002, QA-003, `check-placeholders` (8) y 47 de `open-now` (los AC-01..AC-09 que no dependen de `closedDay`), más guardas e2e que ya cumplen (P9, P10, WA-8, RV-2, JSON-LD, punto verde, sin JS, miércoles y jueves a domingo). **En rojo por razón válida** (falta la funcionalidad): 39 unitarios (21 de `open-now` por `closedDay` y `hours.ts`, 9 de `no-price`, 5 de `reviews`, 4 de `whatsapp`) y los e2e de `no-price`, `whatsapp`, `award-reviews` y de lunes/martes de `hours-closed-days` (precio visible, subtítulo del menú, botón «Reserva la teva», WhatsApp inexistente, premio con marcador, reseñas antiguas, enlace `href="#"`, tabla y pie con `[confirmar]`/líneas antiguas, `aria-live` ausente). Mientras estén en rojo, `npm run check` (tipos) falla en `open-now.test.ts` porque `DayRule` y `OpenState` aún no tienen `closed`/`closedDay`: es esperado y debe quedar limpio al llegar a verde.
- Conflicto con la suite de QA (no es del contrato): `tests/e2e/open-now-browser.spec.ts` espera `unknown` el lunes y `orders` el martes (casos «lunes (sin confirmar)» y «martes (solo encargos)»), y `home-regression.spec.ts` puede asumir precios o marcadores antiguos. Con el horario nuevo esos casos quedan obsoletos; los actualiza `qa-e2e-tester`, no el implementador.

### Validación (QA)

Parte que escribe y mantiene `qa-e2e-tester`; su suite no sustituye al contrato, lo complementa con recorridos de usuario y revisión visual, y no toca `tests/**/contract/`.

- **Herramienta:** Playwright (`@playwright/test`) con `@axe-core/playwright` para accesibilidad. Pruebas en `tests/e2e/`, configuración en `playwright.config.ts`.
- **Qué se prueba:** el build de producción servido con `astro preview`, en escritorio (1280 px) y móvil (Pixel 7), en catalán y castellano.
- **Entorno:** el entorno de agentes trae Chromium preinstalado y sin descarga de navegadores: ejecutar con `CHROMIUM_PATH=/opt/pw-browsers/chromium`. No ejecutar `playwright install`. En Astro 7, `astro preview` se pone en segundo plano: arrancarlo antes con `npx astro preview --background` y pararlo al terminar con `npx astro preview stop`.
- **Comandos:** `npm run test:e2e` lo crea `tdd-test-author` junto al resto de scripts de pruebas; QA solo añade `npm run test:e2e:report` y avisa en su parte. `playwright.config.ts` tiene `testDir: './tests/e2e'`, así que una ejecución incluye contrato y pruebas de QA.
- **Cobertura mínima:** humo y consola limpia, navegación y anclas, acción principal en escritorio y móvil, pestañas y acordeones, mejora progresiva sin JavaScript, indicador «Obert ara» con reloj controlado, idiomas, accesibilidad con axe, scroll horizontal, SEO y datos estructurados, ausencia de datos pendientes en release.
- **Veredicto:** Aprobado, Aprobado con reservas o Rechazado, con la lista de defectos. La publicación requiere Aprobado.

**Suite de QA (2026-10-20; ciclo 2, 2026-10-21: añadido `tests/e2e/layout-viewports.spec.ts`, desbordes, 44 px a 320-390, barra fija y axe a 320, 360, 390, 768, 1280 y 1920 px en ca y es; capturas con `SHOT_DIR=<carpeta>`).** `tests/e2e/home-regression.spec.ts` (humo, consola, scroll horizontal a 360/390/768/1280, axe AA tras interactuar, teclado, anclas, idiomas, SEO, terceros, seguridad básica, datos pendientes marcados, sin JS, movimiento reducido, barra móvil, menú móvil, selector de idioma) y `tests/e2e/open-now-browser.spec.ts` (reloj controlado, 9 casos x 2 idiomas con zona del navegador distinta de Madrid, cambio de hora, actualización por minuto, coherencia entre indicadores, axe abierto/cerrado). Ambos se revisaron y se conservan. Ejecución completa: 146 pruebas, **140 pasan, 6 fallan** (QA-002 y QA-003), 4 omitidas por diseño (orden de tabulación solo en escritorio; áreas táctiles solo en móvil). Más 34 unitarios y 4 e2e del contrato en verde. `npm run check`: 0 errores; `contract:verify`: intacto. Solo Chromium; el script `test:e2e:report` no se ha añadido (el reporter es `list`).

**Ciclo 3 (2026-10-22, regresión del cambio del cliente).** `open-now-browser.spec.ts`: actualizadas solo las 8 ejecuciones obsoletas (lunes `unknown` y martes `orders` pasan a `closedDay` con «Tancat avui · obrim dijous a les 10:30» / «Cerrado hoy · abrimos el jueves a las 10:30»; AGENTS 6.4 y 7.1) y añadidos los casos H3 (martes 23:59 y miércoles 00:00 Madrid con navegador en New York), H4 (miércoles 12:00) y H11 (lunes 26-oct con CET). Nuevo `tests/e2e/client-changes-regression.spec.ts` (74 pruebas en desktop, ancho fijado por prueba): ningún texto, atributo, metadato ni JSON-LD con precios; ningún martes como día de encargos; sin «cerrar/tancar» como verbo; subtítulo «De dimecres a divendres»; tabla, pie y JSON-LD coherentes (JSON-LD solo jueves a domingo); premio 2021; 3 reseñas literales con autor y enlace a la ficha; los indicadores de toda la página coinciden entre sí (lunes, martes, miércoles, jueves, con zona del navegador distinta); tarjeta del jueves (orden, un solo enlace, contraste real de la pastilla calculado componiendo el velo ≥ 4,5:1, botón ≥ 44 px dentro de la tarjeta); WhatsApp (5 enlaces correctos, visibles ≥ 44 px hasta 768 px, barra con 3 acciones en orden); axe en lunes y miércoles; capturas por sección con `SHOT_DIR`. Ejecución completa: 436 pasan, 0 fallan, 196 omitidas (solo móvil/solo escritorio y capturas sin `SHOT_DIR`); unitarios 97/97; `contract:verify` intacto; `check` 0 errores.

### Veredicto de QA

**Aprobado** (2026-10-22, ciclo 3 de 3). Ningún defecto abierto (ni bloqueante, alto, medio ni bajo). Contrato en verde e intacto (97 unitarios y e2e de contrato en las dos plantillas de proyecto), suite propia en verde. Los 56 datos pendientes del cliente (`[..]`: puntuación y nº de reseñas, hora límite, FAQ, fotos, legales) son esperados y bloquean solo la publicación (`check:release` falla por ellos, 0 enlaces `href="#"` sin marcar).

- **Sin precios:** nada con «€», «precio/preu», `price`/`offers` en texto visible, atributos, metadatos ni JSON-LD (las reseñas, citas literales, quedan fuera de la regla).
- **WhatsApp:** 5 enlaces `wa.me/34659331213?text=…` en ca y es; todos los visibles miden ≥ 44 px a 320-768 px; barra móvil Trucar, WhatsApp, Com arribar; oculta a 1280 y 1920 px.
- **Horarios:** lunes y martes `closedDay`, miércoles `orders`, cambio a medianoche de Madrid, coherentes entre barra superior, hero/indicadores, tabla de Contacto, pie y JSON-LD (solo jueves, viernes, sábado y domingo). QA-004 queda sin objeto (ya no hay precio).
- **Jueves:** pastilla ≥ 4,5:1 en los 6 anchos y 2 idiomas; botón «Encarrega»/«Encarga» ≥ 44 px dentro de la tarjeta; sin desbordes.
- **Reseñas y premio:** 3 reseñas literales con autor y enlace `google.com/maps?cid=17428563639894031302` con `rel="noopener"`; 2021 en insignia y hito.
- **Visual:** capturas revisadas a 320, 360, 390, 768, 1280 y 1920 px en ca y es: sin cortes, solapes ni texto invisible.

**Observaciones (no defectos):**
1. AGENTS 7.4 dice que el botón de las tarjetas es «Encarrega» en ca y es, pero en castellano el producto muestra «Encarga» (correcto y admitido por el contrato). Corregir el texto del documento (responsable de la sección).
2. La suposición B («De miércoles a viernes») convive con el miércoles «solo encargos»: es coherente con 6.4, pero el cliente debe confirmarla (pendiente 3).
3. La barra móvil sigue visible a 768 px (diseño solo define escritorio y móvil).
4. El mapa incrustado aparece vacío en el entorno de pruebas (sin red a Google); no verificable aquí.

**Sin cubrir:** lector de pantalla, Lighthouse y rendimiento en dispositivo real, navegadores distintos de Chromium, festivos, el mapa incrustado, que el enlace a la ficha de Google abra la ficha correcta y que las 3 reseñas coincidan con Google (lo confirma el cliente).
