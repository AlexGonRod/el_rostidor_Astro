import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['tests/unit/contract', 'tests/e2e/contract'];
const lockFile = 'tests/contract.lock.json';

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

const current = Object.fromEntries(
  roots.flatMap((root) => [...walk(root)]).map((file) => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]),
);

if (process.argv.includes('--write')) {
  writeFileSync(lockFile, JSON.stringify(current, null, 2) + '\n');
  console.log('Contrato fijado: ' + Object.keys(current).length + ' archivos');
  process.exit(0);
}
if (!existsSync(lockFile)) {
  console.error('No hay contrato fijado. Lo fija tdd-test-author con --write.');
  process.exit(1);
}
const locked = JSON.parse(readFileSync(lockFile, 'utf8'));
const problems = [];
for (const file of new Set([...Object.keys(locked), ...Object.keys(current)])) {
  if (!(file in current)) problems.push('eliminado: ' + file);
  else if (!(file in locked)) problems.push('nuevo sin registrar: ' + file);
  else if (locked[file] !== current[file]) problems.push('modificado: ' + file);
}
if (problems.length) {
  console.error('El contrato de pruebas ha cambiado:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('Contrato de pruebas intacto');
