/**
 * Legt dist/ an: genau die Dateien, die die App im Netz braucht.
 *
 * Warum ueberhaupt ein Schritt, wo das Projekt sonst ohne Build auskommt?
 * Weil das Ausliefern etwas anderes ist als das Entwickeln. Cloudflare laedt
 * ein Verzeichnis hoch, und dieses Verzeichnis darf nicht das Projekt selbst
 * sein - zwei Gruende, beide gemessen:
 *
 *   1. wrangler legt sein eigenes .wrangler/ in den Projektordner. Liegt der
 *      Ordner zugleich unter Beobachtung, laedt der lokale Server endlos neu
 *      ("Reloading local server" ohne Ende) und antwortet auf nichts mehr.
 *   2. Sonst gingen Werkzeuge, Tests, README und package.json mit hinaus.
 *      Oeffentlich sind sie ohnehin, aber auf der Spielseite haben sie nichts
 *      verloren.
 *
 * Kopiert wird nach einer REGEL und nicht nach einer Liste: alle Dateien der
 * obersten Ebene mit den Endungen unten, ausser Tests - dazu icons/ und
 * fonts/ vollstaendig. Eine Liste muesste man pflegen; eine neue CSS-Datei
 * waere sonst irgendwann vergessen und die Seite im Netz halb kaputt.
 */
import { readdir, rm, mkdir, cp, stat } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ZIEL = join(ROOT, 'dist');
const ENDUNGEN = new Set(['.html', '.js', '.css', '.webmanifest']);
const ORDNER = ['icons', 'fonts'];

await rm(ZIEL, { recursive: true, force: true });
await mkdir(ZIEL, { recursive: true });

const dabei = [];
for (const name of await readdir(ROOT)) {
  if (name === 'dist' || name.endsWith('.test.js')) continue;
  if (!ENDUNGEN.has(extname(name))) continue;
  if (!(await stat(join(ROOT, name))).isFile()) continue;
  await cp(join(ROOT, name), join(ZIEL, name));
  dabei.push(name);
}
for (const ordner of ORDNER) {
  await cp(join(ROOT, ordner), join(ZIEL, ordner), { recursive: true });
  dabei.push(`${ordner}/`);
}

// Die Probe aufs Exempel: ohne index.html ist es keine Seite.
if (!dabei.includes('index.html')) {
  console.error('dist/ ohne index.html - da stimmt etwas nicht.');
  process.exit(1);
}
console.log(`dist/ angelegt: ${dabei.sort().join(' ')}`);
