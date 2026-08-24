/**
 * Prueft die Umrechnung des Kuerzels fuer die Weltliste.
 *
 * Der Zaehlerdienst haelt nur Zahlen (siehe online.js). Das Kuerzel geht
 * darum als Zahl hinaus, und diese Umrechnung ist die einzige Stelle, an der
 * aus drei Zeichen eine Zahl und zurueck wird. Geht sie schief, steht in der
 * Weltliste ein falscher Name - und zwar still, ohne Fehlermeldung.
 *
 * Das Zusammenspiel mit dem Dienst prueft tools/check-welt.mjs im Browser.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { alsZahl, alsKuerzel } from './online.js';

const ZEICHEN = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

test('leer bleibt leer, und die Null bleibt frei', () => {
  // Ein fehlender Zaehler kommt beim Lesen als 0 zurueck. Darum darf kein
  // Kuerzel auf 0 abbilden - sonst waere "kein Kuerzel" dasselbe wie "AAA".
  assert.equal(alsZahl(''), 0);
  assert.equal(alsZahl(null), 0);
  assert.equal(alsZahl(undefined), 0);
  assert.equal(alsKuerzel(0), '');
  for (const z of ZEICHEN) assert.ok(alsZahl(z) > 0, `${z} darf nicht 0 werden`);
});

test('jedes moegliche Kuerzel kommt unveraendert zurueck', () => {
  let geprueft = 0;
  for (const a of ZEICHEN) {
    assert.equal(alsKuerzel(alsZahl(a)), a);
    geprueft++;
    for (const b of ZEICHEN) {
      assert.equal(alsKuerzel(alsZahl(a + b)), a + b);
      geprueft++;
      for (const c of ZEICHEN) {
        assert.equal(alsKuerzel(alsZahl(a + b + c)), a + b + c);
        geprueft++;
      }
    }
  }
  // 36 + 36² + 36³ = 47988 Kuerzel, alle drei Laengen.
  assert.equal(geprueft, 47988);
});

test('kein Wert sprengt die drei Stellen', () => {
  // Groesster Wert: 36*37² + 36*37 + 36 = 50652. Ein Zaehler darf niemals
  // groesser werden, sonst passt er nicht mehr in drei Zeichen.
  assert.equal(alsZahl('ZZZ'), 50652);
  for (const k of ['ZZZ', '999', 'A0Z', '00Z']) assert.ok(alsZahl(k) <= 50652);
});

test('Kleinbuchstaben werden gross, Ueberlanges wird abgeschnitten', () => {
  assert.equal(alsKuerzel(alsZahl('cau')), 'CAU');
  assert.equal(alsKuerzel(alsZahl('CAUER')), 'CAU');
});

test('Unbrauchbares aus dem Netz gilt als kein Kuerzel', () => {
  // Der Wert kommt von einem fremden Dienst: er kann alles sein, und was
  // nicht in drei Stellen passt, darf nicht zu erfundenen Zeichen fuehren.
  for (const wert of [-1, -50652, 50653, 1e9, NaN, Infinity, null, undefined, 'abc'])
    assert.equal(alsKuerzel(wert), '', `${wert} muesste als kein Kuerzel gelten`);
});

test('Zeichen ausserhalb von A-Z 0-9 fallen weg', () => {
  // Die Oberflaeche filtert schon, aber hier endet auch, was aus einem alten
  // Speicher oder von Hand kommt.
  assert.equal(alsZahl('ÄÖÜ'), 0);
  assert.equal(alsKuerzel(alsZahl('C-U')), 'CU');
});
