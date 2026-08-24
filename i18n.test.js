/**
 * Prueft die Woerterbuecher gegeneinander.
 *
 * Uebersetzungen gehen nicht daran kaputt, dass ein Satz unschoen klingt -
 * sie gehen daran kaputt, dass ein Platzhalter fehlt und im Bild plötzlich
 * "{score}" steht, oder dass ein Schluessel vergessen wurde und die
 * Oberflaeche halb deutsch bleibt. Genau das faengt diese Datei ab, fuer
 * jede Sprache automatisch - auch fuer die, die erst noch dazukommen.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SPRACHEN, STANDARD, t, setzeSprache, sprache, spracheVomGeraet, woerterbuch, schluessel,
} from './i18n.js';

const ANDERE = Object.keys(SPRACHEN).filter((s) => s !== STANDARD);
const platzhalter = (satz) => [...satz.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('jede Sprache kennt genau die Schluessel der Quelle', () => {
  const soll = new Set(schluessel(STANDARD));
  for (const spr of ANDERE) {
    const ist = new Set(schluessel(spr));
    const fehlen = [...soll].filter((k) => !ist.has(k));
    const zuviel = [...ist].filter((k) => !soll.has(k));
    assert.deepEqual(fehlen, [], `${spr}: fehlende Schluessel`);
    assert.deepEqual(zuviel, [], `${spr}: unbekannte Schluessel`);
  }
});

test('kein Text ist leer', () => {
  for (const spr of Object.keys(SPRACHEN))
    for (const [k, v] of Object.entries(woerterbuch(spr) ?? {}))
      assert.ok(typeof v === 'string' && v.trim().length, `${spr}/${k} ist leer`);
});

test('Platzhalter stimmen mit der Quelle ueberein', () => {
  const quelle = woerterbuch(STANDARD);
  for (const spr of ANDERE) {
    const d = woerterbuch(spr) ?? {};
    for (const [k, deutsch] of Object.entries(quelle)) {
      if (!(k in d)) continue;
      assert.deepEqual(platzhalter(d[k]), platzhalter(deutsch),
        `${spr}/${k}: Platzhalter weichen ab (${d[k]})`);
    }
  }
});

test('b-Auszeichnungen sind paarweise und gleich haeufig wie in der Quelle', () => {
  const quelle = woerterbuch(STANDARD);
  for (const spr of Object.keys(SPRACHEN)) {
    const d = woerterbuch(spr) ?? {};
    for (const [k, satz] of Object.entries(d)) {
      const auf = (satz.match(/<b>/g) ?? []).length;
      const zu = (satz.match(/<\/b>/g) ?? []).length;
      assert.equal(auf, zu, `${spr}/${k}: <b> ohne </b>`);
      if (spr !== STANDARD && quelle[k] !== undefined)
        assert.equal(auf, (quelle[k].match(/<b>/g) ?? []).length,
          `${spr}/${k}: andere Anzahl Auszeichnungen als im Deutschen`);
    }
  }
});

test('nur b als Auszeichnung, kein anderes Markup', () => {
  for (const spr of Object.keys(SPRACHEN))
    for (const [k, satz] of Object.entries(woerterbuch(spr) ?? {})) {
      const tags = [...satz.matchAll(/<\/?([a-zA-Z][\w-]*)/g)].map((m) => m[1].toLowerCase());
      for (const tag of tags) assert.equal(tag, 'b', `${spr}/${k}: <${tag}> ist nicht erlaubt`);
    }
});

test('angehaengte Teile behalten ihren Anfang', () => {
  // Diese drei werden hinten an einen anderen Satz geklebt. Ohne den
  // fuehrenden Trenner klebt das Wort am vorigen.
  for (const spr of Object.keys(SPRACHEN)) {
    const d = woerterbuch(spr) ?? {};
    for (const k of ['diff.noteClassic', 'diff.noteEndless', 'msg.refillWorth'])
      if (d[k]) assert.ok(d[k].startsWith(' · '), `${spr}/${k} faengt nicht mit " · " an`);
    if (d['set.worldOld'])
      assert.ok(d['set.worldOld'].startsWith('· '),
        `${spr}/set.worldOld faengt nicht mit "· " an`);
    for (const k of ['end.savedRefills', 'end.dilute'])
      if (d[k]) assert.ok(d[k].startsWith(' '),
        `${spr}/${k} faengt nicht mit einem Leerzeichen an`);
  }
});

test('das Malkreuz bleibt ein Malkreuz', () => {
  // × (U+00D7), nicht der Buchstabe x - im Arcade-Stil steht dafuer eine
  // eigene Glyphe, und in der Handschrift ebenso.
  const quelle = woerterbuch(STANDARD);
  for (const spr of ANDERE) {
    const d = woerterbuch(spr) ?? {};
    for (const [k, deutsch] of Object.entries(quelle)) {
      if (!d[k] || !deutsch.includes('×')) continue;
      assert.ok(d[k].includes('×'), `${spr}/${k}: Malkreuz verloren`);
    }
  }
});

test('Marken werden nicht uebersetzt', () => {
  for (const spr of Object.keys(SPRACHEN)) {
    const d = woerterbuch(spr) ?? {};
    assert.equal(d['doc.title'], 'Zehner-Paare', `${spr}: Titel geaendert`);
    assert.equal(d['skin.m3'], 'Material 3', `${spr}: Material 3 geaendert`);
  }
});

test('kurze Felder halten ihre Zeichengrenze', () => {
  // Gemessen im Browser (siehe scratchpad/passt.mjs). Das ist die grobe
  // Vorpruefung; die feine macht ueberlauf.mjs am echten Bild.
  const GRENZE = {
    'bar.undo': 18, 'bar.hint': 16, 'bar.new': 16,
    'bar.refill': 12, 'bar.rescue': 12,
    'hud.score': 18, 'hud.left': 18, 'hud.time': 9, 'hud.round': 9,
    'theme.auto': 10, 'theme.light': 10, 'theme.dark': 10,
    'skin.classic': 12, 'skin.m3': 12, 'skin.arcade': 12,
    'skin.papier': 12, 'skin.kontrast': 12,
    'diff.leicht': 14, 'diff.mittel': 14, 'diff.schwer': 14,
    'diff.klassisch': 14, 'diff.endlos': 14,
    'end.statScore': 14, 'end.statRounds': 14, 'end.statTime': 14,
    'end.statMoves': 14, 'end.statCombo': 14,
    'set.done': 16, 'set.rulesBtn': 16, 'rules.go': 16,
    'end.undo': 16, 'end.rescue': 16, 'end.again': 16, 'end.newGame': 16,
  };
  for (const spr of Object.keys(SPRACHEN)) {
    const d = woerterbuch(spr) ?? {};
    for (const [k, max] of Object.entries(GRENZE)) {
      if (!d[k]) continue;
      assert.ok(d[k].length <= max,
        `${spr}/${k}: ${d[k].length} Zeichen, erlaubt sind ${max} ("${d[k]}")`);
    }
  }
});

test('spracheVomGeraet nimmt die erste bekannte Sprache', () => {
  assert.equal(spracheVomGeraet(['it-IT', 'de-DE']), 'it');
  assert.equal(spracheVomGeraet(['de-AT']), 'de');
  assert.equal(spracheVomGeraet(['en-GB', 'it']), 'en');
  assert.equal(spracheVomGeraet(['fr-FR', 'es', 'it-CH']), 'it');
  assert.equal(spracheVomGeraet(['fr-FR']), STANDARD, 'unbekannt fuehrt zur Quelle');
  assert.equal(spracheVomGeraet([]), STANDARD);
  assert.equal(spracheVomGeraet([null, '', 'IT']), 'it', 'Grossschreibung stoert nicht');
});

test('setzeSprache nimmt nur bekannte Sprachen', () => {
  assert.equal(setzeSprache('it'), 'it');
  assert.equal(sprache(), 'it');
  assert.equal(setzeSprache('kl'), STANDARD, 'Klingonisch faellt auf die Quelle zurueck');
  setzeSprache(STANDARD);
});

test('t setzt Platzhalter ein und laesst unbekannte stehen', () => {
  setzeSprache('de');
  assert.equal(t('msg.style', { label: 'Papier' }), 'Stil: Papier');
  assert.equal(t('live.round', {}), 'Runde {n}', 'fehlender Wert bleibt sichtbar');
  assert.equal(t('gibtsnicht'), 'gibtsnicht', 'unbekannter Schluessel gibt sich selbst');
});

test('t faellt auf die Quelle zurueck, wenn ein Satz fehlt', () => {
  for (const spr of ANDERE) {
    setzeSprache(spr);
    // Jeder Schluessel muss irgendeinen Text liefern - nie den Schluessel selbst.
    for (const k of schluessel(STANDARD))
      assert.notEqual(t(k), k, `${spr}/${k} liefert den Schluessel statt Text`);
  }
  setzeSprache(STANDARD);
});
