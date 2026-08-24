#!/usr/bin/env node
/**
 * Erzeugt je Sprache ein Web-App-Manifest aus i18n.js.
 *
 * Ein Manifest kann sich nicht selbst uebersetzen: name, description und die
 * Kurzbefehle stehen als feste Zeichenketten darin, und der Browser liest
 * genau die Datei, auf die <link rel="manifest"> zeigt. Also gibt es drei
 * Dateien, und app.js haengt den Verweis beim Sprachwechsel um. Damit steht
 * im Installationsdialog und auf dem Startbildschirm derselbe Text wie im
 * Spiel - sonst waere die Mehrsprachigkeit an der Haustuer zu Ende.
 *
 * Die Texte kommen aus dem Woerterbuch, nicht aus einer zweiten Quelle:
 * sonst laufen sie irgendwann auseinander.
 *
 * Aufruf:  node tools/gen-manifests.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const { SPRACHEN, setzeSprache, t } = await import(join(WURZEL, 'i18n.js'));

/** Die Vorlage: alles, was nicht Text ist, steht hier einmal. */
const vorlage = JSON.parse(await readFile(join(WURZEL, 'manifest.webmanifest'), 'utf8'));

// Welche Stufen als Kurzbefehl auf dem Startbildschirm liegen.
const KURZ = ['leicht', 'mittel', 'schwer'];

let geschrieben = 0;
for (const [code, info] of Object.entries(SPRACHEN)) {
  setzeSprache(code);
  const m = {
    ...vorlage,
    name: t('doc.title'),
    short_name: t('doc.title'),
    description: t('doc.description'),
    lang: info.htmlLang,
    shortcuts: KURZ.map((stufe, i) => ({
      ...(vorlage.shortcuts?.[i] ?? {}),
      name: `${t('a11y.new')} – ${t(`diff.${stufe}`)}`,
      short_name: t(`diff.${stufe}`),
      url: `./?neu=${stufe}`,
    })),
  };
  const datei = join(WURZEL, `manifest.${code}.webmanifest`);
  await writeFile(datei, JSON.stringify(m, null, 2) + '\n');
  geschrieben++;
  console.log(`manifest.${code}.webmanifest: ${m.name} · ${m.shortcuts.length} Kurzbefehle`);
}
console.log(`${geschrieben} Manifeste geschrieben`);
