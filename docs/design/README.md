# Diseño de referencia

Fuente visual de verdad del proyecto: el lienzo **"El Rostidor — Nova home"**.

- **Enlace (privado, solo lo abre su propietario):** https://claude.ai/artifact/2o8zJP7aBGDZ1dzesrJAFe
- **Copia en el repositorio** (para que un agente sin acceso al enlace pueda leerla):
  - `Main.dc.html`: home de escritorio en catalán (1360 px de ancho).
  - `Mobile.dc.html`: primera pantalla móvil en castellano (390 × 844).
  - `canvas.json`: disposición de los tableros.

Son archivos de lienzo, no páginas listas para abrir: necesitan el motor del editor de diseño para renderizarse. Se pueden leer como HTML con estilos en línea para consultar medidas, colores, textos y estructura.

Si el diseño cambia, el diseñador actualiza esta carpeta y lo registra en `AGENTS.md`.

## Addendum 2026-10-21: cambio de requisitos del cliente

El lienzo (enlace de arriba) era editable por su propietario y **se ha actualizado desde aquí** (versión 9); las copias `Main.dc.html` y `Mobile.dc.html` de esta carpeta están sincronizadas con esa versión. Cambios respecto a la versión anterior:

- **Sin precios**: fuera `[XX,XX] €` y `[X,XX] €` de las tarjetas de menú, de la tarjeta del jueves (`/ ració`) y de las tarjetas de plato; en móvil, la franja del menú dice solo «Jueves: paella o fideuà». Tarjeta del jueves: etiqueta, título, horario, **aviso de hora límite en pastilla con velo oscuro** y botón claro **«Encarrega»** (antes «Reserva la teva»).
- **Subtítulo del menú de la semana**: «De dimecres a divendres» (suposición; a confirmar).
- **WhatsApp**: botones con enlace real `wa.me/34659331213` y mensaje predefinido; en Contacto, botón nuevo y línea «WhatsApp: 659 33 12 13».
- **Premio**: «2021» en la insignia del hero y en el hito de Nosaltres (antes `[any a confirmar]` y `[2021/22]`).
- **Horario**: lunes y martes «Tancat» (la tabla ya lo mostraba), pie con 4 líneas («Dl i dt: tancat», «Dc: només encàrrecs», …) y paso 2 de «Cómo encargar» actualizado.
- **Reseñas**: las citas de Marc y Roser se alinean con `src/content/reviews.json`; la maqueta tenía redacciones distintas.

**No dibujado en el lienzo** (solo especificado en `AGENTS.md`, 7.1): los textos del indicador «Obert ara» en el estado «Tancat avui · obrim dijous a les 10:30». La barra superior y el chip móvil siguen mostrando el ejemplo «Obert ara · fins a les 14:30».
