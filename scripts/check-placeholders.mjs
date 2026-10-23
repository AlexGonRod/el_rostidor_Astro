// Informa de los datos pendientes del cliente que siguen visibles en el build.
// Uso:
//   npm run build && npm run check:placeholders            → informe (no falla)
//   npm run build && npm run check:release                 → falla si queda algún pendiente o un enlace href="#" sin marcar
// DIST_DIR cambia la carpeta analizada (por defecto dist/).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { scanHtml } from './lib/placeholders.mjs';

const dist = process.env.DIST_DIR ? resolve(process.env.DIST_DIR) : new URL('../dist/', import.meta.url).pathname;
const strict = process.argv.includes('--strict');

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* htmlFiles(full);
    else if (entry.endsWith('.html')) yield full;
  }
}

const label = (file) => file.replace(dist, 'dist').replace(/^dist\/?/, 'dist/');
let total = 0;
let unmarked = 0;
try {
  for (const file of htmlFiles(dist)) {
    const { pending, unmarkedLinks } = scanHtml(readFileSync(file, 'utf8'));
    total += pending.length;
    unmarked += unmarkedLinks.length;
    if (!pending.length && !unmarkedLinks.length) continue;
    console.log(`\n${label(file)}: ${pending.length} pendientes, ${unmarkedLinks.length} enlaces href="#" sin marcar`);
    for (const text of [...new Set(pending)].slice(0, 12)) console.log(`  · ${text}`);
    for (const text of unmarkedLinks) console.log(`  ! enlace href="#" sin data-placeholder: ${text}`);
  }
} catch {
  console.error(`No existe ${dist}. Ejecuta antes \`npm run build\`.`);
  process.exit(1);
}

console.log(`\nTotal de datos pendientes visibles: ${total}`);
console.log(`Enlaces href="#" sin marcar: ${unmarked}`);
if (strict && (total > 0 || unmarked > 0)) {
  console.error('Quedan datos pendientes o enlaces vacíos: no publicar todavía (AGENTS.md 6.3.1).');
  process.exit(1);
}
