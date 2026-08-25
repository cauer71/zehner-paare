/**
 * Zehner-Paare – Oberflaeche.
 * Bindet die Spiellogik aus game.js an DOM, Animationen, Ton und Speicher.
 */
import {
  DIFFICULTIES, createGame, canMatch, applyMatch, refill, hint, undo, canUndo,
  breakCombo, remaining, serialize, deserialize, valuesMatch, findPair, progress,
  wertFaktor,
  partnersOf, refreshStatus, POINTS, rescue,
} from './game.js';
import { welt } from './online.js';
import { t, setzeSprache, sprache, spracheVomGeraet, SPRACHEN } from './i18n.js';

/* ---------------------------------------------------------------- Speicher */

export const VERSION = '1.10.0';

const KEY = { save: 'zp.save.v1', settings: 'zp.settings.v1', best: 'zp.best.v2',
              seen: 'zp.seen.v1', count: 'zp.count.v1' };

const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* privater Modus */ }
  },
  raw(key, fallback = null) {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  },
  setRaw(key, value) {
    try { localStorage.setItem(key, value); } catch { /* egal */ }
  },
};

const DEFAULT_SETTINGS = {
  skin: 'classic',          // classic | m3 | arcade | papier
  difficulty: 'mittel',
  diagonal: true,
  wrap: true,
  sound: true,
  vibrate: true,
  partners: false,
  theme: 'auto',
  lang: 'auto',             // auto | de | it | en
  world: true,              // weltweit mitzaehlen (siehe online.js)
  kuerzel: '',              // drei Zeichen fuer die Bestenliste, siehe unten
};

let settings = { ...DEFAULT_SETTINGS, ...(store.get(KEY.settings) ?? {}) };

// Die Partner-Markierung war in Version 1.0 voreingestellt an. Sie nimmt dem
// Spiel aber den Reiz, das Paar selbst zu finden – deshalb einmalig abschalten.
// Wer sie danach wieder einschaltet, behaelt seine Wahl.
if (!store.get('zp.migrated.partners.v1')) {
  settings.partners = false;
  store.set('zp.migrated.partners.v1', true);
  store.set(KEY.settings, settings);
}
// Den Stil "Hochkontrast" gibt es nicht mehr. Wer ihn eingestellt hatte, saehe
// sonst weiter "kontrast" im Speicher stehen: das Brett fiele auf "Original"
// zurueck, die Zeile "Aussehen" nennte aber einen Stil, den kein Chip anbietet.
// Darum die Wahl einmalig zurueckstellen.
if (settings.skin === 'kontrast') {
  settings.skin = DEFAULT_SETTINGS.skin;
  store.set(KEY.settings, settings);
}
// Vor allem anderen: die Sprache. Danach liefert t() die richtigen Saetze,
// und alles Folgende - Stilnamen, Schwierigkeitsnamen, Meldungen - stimmt.
function gewaehlteSprache() {
  return settings.lang === 'auto' || !(settings.lang in SPRACHEN)
    ? spracheVomGeraet() : settings.lang;
}
setzeSprache(gewaehlteSprache());

let best = store.get(KEY.best) ?? {};

// Der eigene Zaehler: wie viele Partien auf diesem Geraet gespielt und
// gewonnen wurden. Bleibt hier, geht nie hinaus.
let zaehler = { gespielt: 0, gewonnen: 0, ...(store.get(KEY.count) ?? {}) };

welt.schalten(settings.world);

// Die Stile liegen als eigene Stylesheets vor. Was sich darueber hinaus
// unterscheidet, steht hier: Icon-Satz und Tonstimme. Der Anzeigename kommt
// aus dem Woerterbuch - kurz fuer den Chip, lang fuer die Meldung.
const SKINS = {
  classic:  { icons: 'i', voice: 'soft' },
  m3:       { icons: 'i', voice: 'soft' },
  arcade:   { icons: 'px', voice: 'chip' },
  papier:   { icons: 'i', voice: 'soft' },
};

/** Langer Name eines Stils, fuer die Meldung nach dem Umschalten. */
function skinName(key) {
  return t(`skin.${key}.long`) !== `skin.${key}.long`
    ? t(`skin.${key}.long`) : t(`skin.${key}`);
}

/** Name einer Schwierigkeit. game.js kennt nur die Schluessel. */
function diffName(key) { return t(`diff.${key}`); }


/* ------------------------------------------------------------------- DOM */

const $ = (sel) => document.querySelector(sel);
const board = $('#board');
const boardWrap = $('#board-wrap');
const fx = $('#fx');
const live = $('#live');
const toastEl = $('#toast');
const tickerEl = $('#ticker');
const elScore = $('#stat-score');
const elLeft = $('#stat-left');
const elTime = $('#stat-time');
const elCombo = $('#combo');
const btnUndo = $('#btn-undo');
const btnHint = $('#btn-hint');
const btnRefill = $('#btn-refill');
const refillLabel = $('#btn-refill .fab__label');
const btnNew = $('#btn-new');
const refillCount = $('#refill-count');
const dlgRules = $('#dlg-rules');
const dlgSettings = $('#dlg-settings');
const dlgEnd = $('#dlg-end');
const feldKuerzelEnde = $('#end-initials-field');
const eingabeKuerzelEnde = $('#end-initials');
const eingabeKuerzelSet = $('#set-initials');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ------------------------------------------------------------- Spielstand */

let state = null;
let cellEls = new Map();   // cell.id -> Element
let selected = null;       // Index der ausgewaehlten Zelle
let locked = false;        // waehrend struktureller Animationen
let focusIndex = 0;        // fuer Tastaturbedienung
let tipsShown = 0;
let timerId = null;
let tickBase = 0;
let endHandled = false;    // Spielende nur einmal auswerten
let hintTimer = null;      // laufendes Tipp-Blinken
let hintIds = [];          // welche Kacheln blinken gerade
let recordHit = false;     // Rekord waehrend der Partie schon gefeiert?
let kuerzelStufe = null;   // zu welchem Bestwert das Feld im Enddialog gehoert

/* ---------------------------------------------------------------- Kuerzel */

/**
 * Das Kuerzel in der Bestenliste: drei Zeichen, A-Z und 0-9.
 *
 * Warum genau diese Menge und nicht alles, was eine Tastatur hergibt: der
 * Arcade-Stil setzt AUSSCHLIESSLICH die eigene Pixelschrift, und die kennt
 * Versalien, Ziffern und Satzzeichen. Ein Emoji oder ein kyrillisches Zeichen
 * waere dort still ein leerer Rahmen. Kleinbuchstaben werden gross
 * geschrieben, alles andere fallengelassen - was im Feld stehen bleibt, laesst
 * sich also in jedem Stil auch zeigen.
 *
 * Gefiltert wird auch beim LESEN aus dem Speicher: dort kann von Hand oder aus
 * einer alten Fassung anderes stehen, und in die Liste geht es ohne Umweg ins
 * Markup.
 */
const KUERZEL_ZEICHEN = 3;

function sauberesKuerzel(roh) {
  return String(roh ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, KUERZEL_ZEICHEN);
}

/**
 * Schreibt das Kuerzel fest: als Voreinstellung fuer kommende Bestwerte und,
 * wenn eine Stufe genannt ist, an deren Bestwert.
 *
 * Sofort und bei jedem Tastendruck, nicht erst auf einen Knopf: der Enddialog
 * laesst sich wegtippen, und ein Kuerzel, das dabei verloren geht, tippt
 * niemand ein zweites Mal.
 */
function setzeKuerzel(roh, stufe = null) {
  const kurz = sauberesKuerzel(roh);
  settings.kuerzel = kurz;
  saveSettings();
  if (stufe && best[stufe]) {
    if (kurz) best[stufe].kuerzel = kurz;
    else delete best[stufe].kuerzel;
    store.set(KEY.best, best);
  }
  return kurz;
}

/* ----------------------------------------------------------------- Helfer */

const cellAtIndex = (i) => state.cells[i];
const elAt = (i) => cellEls.get(state.cells[i]?.id);
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function announce(text) { live.textContent = text; }

let toastTimer = null;
function toast(text, ms = 2400) {
  toastEl.textContent = text;
  toastEl.hidden = false;
  tickerEl.classList.add('hint');          // Kombo-Plakette weicht dem Hinweis
  requestAnimationFrame(() => toastEl.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
    tickerEl.classList.remove('hint');
    setTimeout(() => { toastEl.hidden = true; }, 220);
  }, ms);
}

function buzz(pattern) {
  if (!settings.vibrate) return;
  try { navigator.vibrate?.(pattern); } catch { /* nicht unterstuetzt */ }
}

/* -------------------------------------------------------------------- Ton */

let actx = null;
function audio() {
  if (!settings.sound) return null;
  if (!actx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    actx = new Ctx();
  }
  if (actx.state === 'suspended') actx.resume().catch(() => {});
  return actx;
}

/*
 * Alle Klaenge laufen ueber einen gemeinsamen Ausgang mit weicher Begrenzung.
 * Im Spiel fallen regelmaessig drei bis vier Effekte zusammen - Treffer, Zeile
 * und Kombo-Level-Up sind der Normalfall, nicht die Ausnahme. Die tanh-Kennlinie
 * ist unter 0.3 praktisch geradlinig und faengt nur die Spitzen darueber ab.
 */
let bus = null;
function master() {
  const ctx = audio();
  if (!ctx) return null;
  if (!bus || bus.context !== ctx) {
    const clip = ctx.createWaveShaper();
    const n = 1025, k = 1.6;
    const kurve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      kurve[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    clip.curve = kurve;
    clip.oversample = '2x';
    bus = ctx.createGain();
    bus.gain.value = 1;
    bus.connect(clip).connect(ctx.destination);
  }
  return bus;
}

function tone({ freq = 440, dur = 0.12, type = 'sine', gain = 0.05, delay = 0, slideTo = null }) {
  const ctx = audio();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.014);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master());
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

/* --- Chiptune: die Stimme des Arcade-Stils -------------------------------- */

/*
 * Ein Soundchip von 1988 kannte drei Dinge: Pulswellen mit einstellbarem
 * Tastverhaeltnis, Rauschen fuer die Perkussion und harte Tonstufen. Genau das
 * wird hier nachgebaut - kein Gleiten, keine weichen Huellkurven.
 */

// Am Kontext haengen, nicht global: eine Welle gehoert immer zu ihrem Kontext.
const waveCache = new WeakMap();
/**
 * Pulswelle mit Tastverhaeltnis d (0.125 = duenn, 0.25 = mittel, 0.5 = voll) -
 * die drei Stellungen, die die Chips der Zeit kannten. Die Reihe eines
 * Rechtecks mit Tastverhaeltnis d hat die Oberwellen (2/nπ)·sin(nπd); der
 * Gleichanteil bleibt null. Neu erzeugen kostet bei fuenf Toenen je Sekunde
 * hoerbar, darum der Speicher.
 */
function pulseWave(ctx, d) {
  let je = waveCache.get(ctx);
  if (!je) { je = new Map(); waveCache.set(ctx, je); }
  if (je.has(d)) return je.get(d);
  const teil = 64;
  const real = new Float32Array(teil + 1);
  const imag = new Float32Array(teil + 1);
  for (let n = 1; n <= teil; n++) real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * d);
  const w = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  je.set(d, w);
  return w;
}

/**
 * Ein Chipton. Die Huellkurve rastet ein: kurzer Anschlag, dann harter Abfall
 * - so klingt ein Kanal, den die Hardware auf null schreibt.
 */
function chip({ freq = 440, dur = 0.08, duty = 0.5, gain = 0.04, delay = 0, drop = 0, vibrato = 0 }) {
  const ctx = audio();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  osc.setPeriodicWave(pulseWave(ctx, duty));
  osc.frequency.setValueAtTime(freq, t0);
  // Tonhoehenabfall in Stufen statt als Rutsch - der Chip kannte nur Sprünge.
  if (drop) {
    const stufen = 6;
    for (let i = 1; i <= stufen; i++) {
      osc.frequency.setValueAtTime(freq * (1 - (drop * i) / stufen), t0 + (dur * i) / stufen);
    }
  }
  if (vibrato) {
    const lfo = ctx.createOscillator();
    const tiefe = ctx.createGain();
    lfo.frequency.value = 14;
    tiefe.gain.value = freq * vibrato;
    lfo.connect(tiefe).connect(osc.frequency);
    lfo.start(t0); lfo.stop(t0 + dur + 0.02);
  }
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
  g.gain.setValueAtTime(gain, t0 + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master());
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const noiseCache = new WeakMap();
/** Rauschen fuer Klicks und Schlaege - die Perkussion des Chips. */
function noise({ dur = 0.06, gain = 0.03, delay = 0, freq = 1800, q = 1 }) {
  const ctx = audio();
  if (!ctx) return;
  let noiseBuf = noiseCache.get(ctx);
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, noiseBuf);
  }
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp).connect(g).connect(master());
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/** Tonfolge im festen Raster – ein Arpeggio, wie es der Chip abspulte. */
function arp(freqs, { step = 0.045, dur = 0.05, duty = 0.5, gain = 0.035, delay = 0 } = {}) {
  freqs.forEach((f, i) => chip({ freq: f, dur, duty, gain, delay: delay + i * step }));
}

/* ------------------------------------------------------- Kleine Melodien --- */

const HALBTON = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

/** Notenname zu Frequenz, gleichstufig mit A4 = 440 Hz. 'r' ist eine Pause. */
function hz(name) {
  const m = /^([A-G]#?)(-?\d)$/.exec(name);
  if (!m) return 0;
  const halbton = HALBTON[m[1]] + (Number(m[2]) + 1) * 12;   // wie MIDI: A4 = 69
  return 440 * Math.pow(2, (halbton - 69) / 12);
}

/**
 * Spielt eine kleine Melodie. Geschrieben als "Note:Laenge"-Folge, damit man
 * sie im Quelltext lesen kann: 'C5:1 E5:1 G5:2' sind zwei kurze und ein
 * doppelt langer Ton. Laengen zaehlen in Schritten, nicht in Sekunden.
 *
 * Die Toene bekommen absichtlich eine Luecke (0.82 der Schrittlaenge): so
 * klingt ein Chip, der den Kanal zwischen zwei Noten kurz auf null schreibt.
 * Ohne die Luecke verschmiert die Tonfolge zu einem Geleier.
 */
function melodie(satz, { schritt = 0.1, duty = 0.5, gain = 0.032, delay = 0, drop = 0, halbton = 0 } = {}) {
  let t = delay;
  for (const stueck of satz.trim().split(/\s+/)) {
    const [name, len = '1'] = stueck.split(':');
    const laenge = Number(len) * schritt;
    if (name !== 'r') {
      // halbton versetzt das ganze Motiv - so klingt dasselbe Stueck je
      // Kombostufe eine Sprosse hoeher, ohne dass man es neu schreiben muss.
      chip({ freq: hz(name) * Math.pow(2, halbton / 12), dur: laenge * 0.82, duty, gain, delay: t, drop });
    }
    t += laenge;
  }
  return t - delay;      // Gesamtlaenge, damit man anschliessen kann
}

/*
 * Zwei Stimmen, eine Auswahl. Die weiche Stimme gehoert zu Original und
 * Material 3, die Chipstimme zum Automaten. Die Lautstaerken sind so gewaehlt,
 * dass Treffer + Zeile + Level-Up gleichzeitig zusammen unter 0.12 bleiben -
 * das ist der Normalfall, nicht die Ausnahme.
 */
const VOICES = {
  soft: {
    select: () => tone({ freq: 620, dur: 0.05, gain: 0.028, type: 'triangle' }),
    match: (combo = 1) => {
      const base = 540 * Math.pow(2, Math.min(combo - 1, 7) / 12);
      tone({ freq: base, dur: 0.1, type: 'triangle', gain: 0.05, slideTo: base * 1.5 });
    },
    error: () => tone({ freq: 165, dur: 0.16, type: 'square', gain: 0.035, slideTo: 120 }),
    row: () => [0, 1, 2].forEach((i) => tone({ freq: 520 + i * 180, dur: 0.11, delay: i * 0.06, gain: 0.045 })),
    refill: () => tone({ freq: 380, dur: 0.22, type: 'sawtooth', gain: 0.03, slideTo: 240 }),
    win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ freq: f, dur: 0.28, delay: i * 0.1, gain: 0.05 })),
    record: () => {
      [659, 880, 1109, 1319, 1760].forEach((f, i) => tone({ freq: f, dur: 0.34, delay: 0.5 + i * 0.09, gain: 0.05, type: 'triangle' }));
      [2093, 2637].forEach((f, i) => tone({ freq: f, dur: 0.5, delay: 0.95 + i * 0.12, gain: 0.022 }));
    },
    lose: () => [400, 320, 240].forEach((f, i) => tone({ freq: f, dur: 0.24, delay: i * 0.12, gain: 0.04, type: 'triangle' })),
    recordLive: () => {
      tone({ freq: 1046, dur: 0.16, gain: 0.04 });
      tone({ freq: 1568, dur: 0.22, delay: 0.12, gain: 0.035 });
    },
    hint: () => tone({ freq: 880, dur: 0.09, gain: 0.03 }),
    undo: () => tone({ freq: 300, dur: 0.1, gain: 0.03, type: 'triangle' }),
    rescue: () => [392, 523, 659].forEach((f, i) => tone({ freq: f, dur: 0.18, delay: i * 0.09, gain: 0.04, type: 'triangle' })),
    round: () => [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.16, delay: i * 0.08, gain: 0.042 })),
    comboUp: () => {},        // die Feier gehoert dem Automaten
  },

  chip: {
    // Kurzer Klick beim Anwaehlen, duennes Tastverhaeltnis: sehr "8 Bit".
    select: () => chip({ freq: 880, dur: 0.03, duty: 0.125, gain: 0.03 }),
    // Treffer: eine Sprosse je Kombostufe, wie der Kettenzaehler in Puyo Puyo.
    match: (combo = 1) => {
      const stufe = Math.min(combo, POINTS.maxCombo) - 1;
      const f = 523 * Math.pow(2, stufe / 7);
      chip({ freq: f, dur: 0.05, duty: 0.25, gain: 0.038 });
      chip({ freq: f * 2, dur: 0.04, duty: 0.125, gain: 0.02, delay: 0.03 });
    },
    // Fehlgriff: tiefer Ton, der in Stufen abstuerzt, dazu ein Rauschklick.
    error: () => {
      chip({ freq: 220, dur: 0.16, duty: 0.5, gain: 0.035, drop: 0.6 });
      noise({ dur: 0.05, gain: 0.02, freq: 500, q: .8 });
    },
    // Zeile geraeumt: aufsteigendes Arpeggio, hart gerastert.
    row: () => arp([523, 659, 784, 1046], { step: 0.04, dur: 0.05, duty: 0.25, gain: 0.034 }),
    // Auffuellen: das Klacken eines Muenzeinwurfs, dann ein Zwischenton.
    refill: () => {
      noise({ dur: 0.04, gain: 0.028, freq: 2600, q: 2 });
      chip({ freq: 1046, dur: 0.05, duty: 0.5, gain: 0.03, delay: 0.04 });
      chip({ freq: 1568, dur: 0.07, duty: 0.5, gain: 0.028, delay: 0.09 });
    },
    // STAGE CLEAR: aufsteigende Fanfare mit Bassgang darunter, wie die
    // Zwischenmusik nach einem geschafften Abschnitt.
    win: () => {
      melodie('G4:1 C5:1 E5:1 G5:1 E5:1 G5:2 C6:4', { schritt: 0.11, duty: 0.5, gain: 0.034 });
      melodie('C3:4 G3:3 C3:4', { schritt: 0.11, duty: 0.25, gain: 0.017 });
    },
    // EXTEND: der Lauf nach oben, den es fuer ein Extraleben gab. Setzt nach
    // der Siegfanfare ein, damit sich die beiden nicht ins Gehege kommen.
    record: () => {
      const ab = 1.25;
      melodie('C5:1 E5:1 G5:1 C6:1 E6:1 G6:1', { schritt: 0.085, duty: 0.25, gain: 0.03, delay: ab });
      chip({ freq: hz('C7'), dur: 0.5, duty: 0.5, gain: 0.028, delay: ab + 0.51, vibrato: 0.012 });
      noise({ dur: 0.14, gain: 0.014, freq: 6000, q: 1, delay: ab + 0.51 });
    },
    // GAME OVER: vier Stufen abwaerts, die letzte stuerzt weg.
    lose: () => {
      melodie('C5:2 A#4:2 G#4:2', { schritt: 0.14, duty: 0.5, gain: 0.034 });
      chip({ freq: hz('G4'), dur: 0.5, duty: 0.5, gain: 0.034, delay: 0.84, drop: 0.55 });
      melodie('C3:3 G#2:3', { schritt: 0.14, duty: 0.25, gain: 0.016, delay: 0.42 });
    },
    // Rettung: ein aufatmendes Stueck - "weiter geht's".
    rescue: () => {
      noise({ dur: 0.05, gain: 0.022, freq: 2400, q: 2 });
      melodie('G4:1 A#4:1 C5:1 D#5:1 F5:3', { schritt: 0.1, duty: 0.25, gain: 0.032, delay: 0.05 });
    },
    // Neue Runde im Endlos-Modus: kurzes "next stage".
    round: () => {
      melodie('E5:1 G5:1 C6:2 r:1 G5:1 C6:3', { schritt: 0.095, duty: 0.5, gain: 0.032 });
      melodie('C3:4 C3:4', { schritt: 0.095, duty: 0.25, gain: 0.016 });
    },
    /*
     * Kombo-Level-Up: eine Sprosse hoeher je Stufe, ab 5 ein zweiter Ton, ab 8
     * ein Arpeggio, bei 10 die grosse Fanfare mit Rauschschlag.
     */
    // Tipp: zwei kurze Blips, wie ein Automat, der auf etwas zeigt.
    hint: () => {
      chip({ freq: 1318, dur: 0.04, duty: 0.125, gain: 0.026 });
      chip({ freq: 1760, dur: 0.05, duty: 0.125, gain: 0.024, delay: 0.05 });
    },
    // Zurueck: ein Ton, der in Stufen nach unten faellt - Bandruecklauf.
    undo: () => chip({ freq: 523, dur: 0.12, duty: 0.25, gain: 0.028, drop: 0.55 }),
    // Rekord mitten im Spiel: ein kurzes Extend-Signal, kein ganzer Jingle.
    recordLive: () => {
      chip({ freq: 1046, dur: 0.09, duty: 0.5, gain: 0.03 });
      chip({ freq: 1568, dur: 0.12, duty: 0.25, gain: 0.028, delay: 0.09 });
      noise({ dur: 0.06, gain: 0.014, freq: 5000, q: 1, delay: 0.09 });
    },
    /*
     * Kombo: ein kurzes Motiv, das mit der Stufe eine Sprosse hoeher rueckt.
     * Die Versetzung folgt einer Durtonleiter (0 2 4 5 7 9 11 12 Halbtoene),
     * darum klingt die Reihe wie ein Aufstieg und nicht wie ein Sirenenlauf.
     * Kurz gehalten: bei schnellem Spiel kommt alle 300 ms der naechste
     * Treffer, ein laengeres Stueck wuerde sich stapeln.
     */
    comboUp: (level) => {
      const stufe = Math.min(level, POINTS.maxCombo);
      const LEITER = [0, 2, 4, 5, 7, 9, 11, 12];              // Stufe 2 .. 9
      const halbton = LEITER[Math.min(stufe, 9) - 2] ?? 0;

      if (stufe >= POINTS.maxCombo) {
        // MAXIMUM: acht Noten hinauf, oben zwei Akzente, dazu ein Beckenschlag.
        melodie('C5:1 G5:1 C6:1 G5:1 C6:1 E6:1 G6:2 C7:2', { schritt: 0.062, duty: 0.5, gain: 0.026 });
        noise({ dur: 0.2, gain: 0.018, freq: 900, q: 0.7 });
        noise({ dur: 0.16, gain: 0.014, freq: 5200, q: 1, delay: 0.062 * 6 });
        return;
      }
      if (stufe >= 8) {
        melodie('C5:1 E5:1 G5:1 C6:1 E6:2', { schritt: 0.05, duty: 0.5, gain: 0.03, halbton });
        noise({ dur: 0.05, gain: 0.016, freq: 3200, q: 1.5, delay: 0.2 });
      } else if (stufe >= 5) {
        melodie('C5:1 E5:1 G5:1 C6:2', { schritt: 0.055, duty: 0.5, gain: 0.032, halbton });
      } else {
        melodie('C5:1 E5:1 G5:2', { schritt: 0.055, duty: 0.25, gain: 0.032, halbton });
      }
    },
  },
};

function voice() { return VOICES[SKINS[settings.skin]?.voice] ?? VOICES.soft; }

// Die Aufrufstellen bleiben unveraendert; welche Stimme spielt, entscheidet der Stil.
const sfx = {
  select: () => voice().select(),
  match: (combo) => voice().match(combo),
  error: () => voice().error(),
  row: () => voice().row(),
  refill: () => voice().refill(),
  win: () => voice().win(),
  record: () => voice().record(),
  lose: () => voice().lose(),
  recordLive: () => voice().recordLive(),
  hint: () => voice().hint(),
  undo: () => voice().undo(),
  rescue: () => voice().rescue(),
  round: () => voice().round(),
  comboUp: (level) => voice().comboUp(level),
};

/* ---------------------------------------------------------------- Sprache */

/**
 * Schreibt alle Texte des Markups neu. Vier Attribute, vier Ziele:
 *
 *   data-i18n        -> textContent
 *   data-i18n-html   -> innerHTML  (nur fuer Saetze mit <b> aus dem eigenen
 *                       Woerterbuch; es kommt nichts von aussen herein)
 *   data-i18n-aria   -> aria-label
 *   data-i18n-title  -> title
 *
 * Das laeuft bei jedem Sprachwechsel ueber die ganze Seite. Bei knapp 80
 * Stellen ist das billiger, als einzelne Verweise zu pflegen - und es kann
 * nichts vergessen werden.
 */
function applyTexts() {
  const doc = document;
  doc.documentElement.lang = SPRACHEN[sprache()]?.htmlLang ?? 'de';
  doc.title = t('doc.title');
  const beschreibung = doc.querySelector('meta[name="description"]');
  if (beschreibung) beschreibung.setAttribute('content', t('doc.description'));

  // Die zwei Sprueche der Arcade-Attract-Zeile stehen in CSS-Eigenschaften,
  // weil sie aus ::after-Inhalt kommen. Die Anfuehrungszeichen gehoeren dazu:
  // content erwartet eine Zeichenkette.
  const wurzel = doc.documentElement;
  wurzel.style.setProperty('--attract-1', JSON.stringify(t('arcade.attract1')));
  wurzel.style.setProperty('--attract-2', JSON.stringify(t('arcade.attract2')));

  const manifest = doc.querySelector('link[rel="manifest"]');
  if (manifest) manifest.href = `manifest.${sprache()}.webmanifest`;

  for (const el of doc.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of doc.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
  for (const el of doc.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
  for (const el of doc.querySelectorAll('[data-i18n-title]')) el.setAttribute('title', t(el.dataset.i18nTitle));
}

/**
 * Stellt die Sprache um und zeichnet alles neu, was Text enthaelt: Markup,
 * Statuszeile, Kacheln (deren aria-label), Blaetter, Enddialog.
 */
function applyLanguage() {
  setzeSprache(gewaehlteSprache());
  applyTexts();
  renderBoard();          // die Vorlesetexte der Kacheln haengen an der Sprache
  updateStats();
  renderSettings();
}

/* ------------------------------------------------------------- Darstellung */

/**
 * Tauscht die Symbole. Die weichen Material-Symbole passen nicht in einen
 * Automaten, darum gibt es einen zweiten Sprite mit Pixelformen; die href-Ziele
 * unterscheiden sich nur im Vorsatz (#i-undo <-> #px-undo).
 */
function applyIconSet(skin) {
  const want = SKINS[skin]?.icons ?? 'i';
  for (const use of document.querySelectorAll('use[href^="#i-"], use[href^="#px-"]')) {
    const name = use.getAttribute('href').replace(/^#(?:i|px)-/, '');
    // Fehlt eine Pixelform, bleibt das weiche Symbol stehen - lieber ein
    // stilfremdes Zeichen als ein leeres Kaestchen.
    const next = document.getElementById(`${want}-${name}`) ? `#${want}-${name}` : `#i-${name}`;
    if (use.getAttribute('href') !== next) use.setAttribute('href', next);
  }
}


/**
 * Setzt Skin und Farbschema. Die beiden Stilvarianten liegen als eigene
 * Stylesheets vor; umgeschaltet wird über deren disabled-Eigenschaft.
 */
let bootTimer = null;
let letzterSkin = null;
function applyAppearance() {
  const root = document.documentElement;
  if (settings.theme === 'auto' || settings.skin === 'arcade') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', settings.theme);

  const skin = SKINS[settings.skin] ? settings.skin : 'classic';
  root.dataset.skin = skin;
  const toggle = (id, active) => {
    const el = document.getElementById(id);
    if (el) el.disabled = !active;
  };
  toggle('css-classic', skin === 'classic');
  toggle('css-m3', skin === 'm3');
  toggle('css-m3-colors', skin === 'm3');
  toggle('css-arcade', skin === 'arcade');
  toggle('css-papier', skin === 'papier');
  applyIconSet(skin);
  // Der Automat geht an: einmal die Roehre aufreissen lassen. Nur beim echten
  // Wechsel - beim Laden liefe der Blitz sonst bei jedem Start.
  const wechsel = letzterSkin !== null && letzterSkin !== skin;
  letzterSkin = skin;
  if (skin === 'arcade' && wechsel && !reduceMotion.matches) {
    root.classList.remove('crt-on');
    void root.offsetWidth;
    root.classList.add('crt-on');
    clearTimeout(bootTimer);
    bootTimer = setTimeout(() => root.classList.remove('crt-on'), 700);
  } else {
    root.classList.remove('crt-on');
  }
  updateThemeColor();
}

/** Die Farbe der Browserleiste folgt dem tatsächlichen Seitenhintergrund. */
function updateThemeColor() {
  // Zwei Bilder warten: direkt nach dem Umschalten ist das neue Stylesheet
  // noch nicht angewandt und der Hintergrund käme durchsichtig zurück.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const bg = getComputedStyle(document.body).backgroundColor;
    if (meta && bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) meta.setAttribute('content', bg);
  }));
}

function createCellEl() {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'cell';
  el.tabIndex = -1;
  return el;
}

function labelFor(i) {
  const cols = state.cols;
  const r = Math.floor(i / cols) + 1;
  const c = (i % cols) + 1;
  const cell = state.cells[i];
  return cell.cleared
    ? t('cell.labelEmpty', { row: r, col: c })
    : t('cell.label', { row: r, col: c, v: cell.v });
}

/**
 * Bringt das DOM mit dem Zustand in Deckung.
 * Verschobene Zellen werden per FLIP animiert, neue koennen einfliegen.
 */
function normalizeFocus() {
  if (!state.cells.length) { focusIndex = 0; return; }
  if (focusIndex >= state.cells.length) focusIndex = state.cells.length - 1;
  if (!state.cells[focusIndex]?.cleared) return;
  const free = state.cells.findIndex((c) => !c.cleared);
  focusIndex = free >= 0 ? free : 0;
}

function renderBoard({ enterFrom = -1 } = {}) {
  board.style.setProperty('--cols', state.cols);
  // Lag der Fokus im Feld? Nach dem Entfernen von Zellen faellt er sonst auf <body>.
  const hadFocus = board.contains(document.activeElement);
  normalizeFocus();

  const before = new Map();
  if (!reduceMotion.matches) {
    for (const [id, el] of cellEls) before.set(id, el.getBoundingClientRect());
  }

  const liveIds = new Set(state.cells.map((c) => c.id));
  for (const [id, el] of [...cellEls]) {
    if (!liveIds.has(id)) { el.remove(); cellEls.delete(id); }
  }

  state.cells.forEach((cell, i) => {
    let el = cellEls.get(cell.id);
    if (!el) {
      el = createCellEl();
      cellEls.set(cell.id, el);
      if (enterFrom >= 0 && i >= enterFrom) {
        el.classList.add('enter');
        el.style.animationDelay = `${Math.min((i - enterFrom) * 18, 420)}ms`;
        el.addEventListener('animationend', () => {
          el.classList.remove('enter');
          el.style.animationDelay = '';
        }, { once: true });
      }
    }
    el.dataset.i = String(i);
    el.textContent = cell.cleared ? '' : String(cell.v);
    // Der Stil "Papier" streicht gestrichene Zahlen durch, statt sie
    // wegzunehmen; dafuer muss der Wert an der Zelle bleiben. Die anderen
    // Stile lesen das Attribut nicht.
    el.dataset.v = String(cell.v);
    // Reste abgelaufener Animationen entfernen – sonst haelt "forwards" die
    // Zelle unsichtbar, statt sie als Luecke zu zeigen.
    el.classList.remove('clearing', 'bad', 'rowout');
    if (!hintIds.includes(cell.id)) el.classList.remove('hinted');
    el.classList.toggle('empty', cell.cleared);
    el.disabled = cell.cleared;
    el.setAttribute('aria-label', labelFor(i));
    el.tabIndex = i === focusIndex ? 0 : -1;
    if (board.children[i] !== el) board.insertBefore(el, board.children[i] ?? null);
  });

  // Kantenverlauf nur zeigen, wenn das Feld tatsaechlich ueberlaeuft. Gefragt
  // wird der Rahmen, nicht das Feld: das Feld fuellt den Rahmen aus und laeuft
  // selbst nie ueber, sein scrollHeight ist also immer seine eigene Hoehe.
  boardWrap.classList.toggle('scrollable',
    boardWrap.scrollHeight > boardWrap.clientHeight + 2);

  if (hadFocus && !document.querySelector('dialog[open]')) {
    const el = elAt(focusIndex);
    if (el && !board.contains(document.activeElement)) el.focus({ preventScroll: true });
  }

  if (!reduceMotion.matches) {
    for (const [id, el] of cellEls) {
      const b = before.get(id);
      if (!b) continue;
      const a = el.getBoundingClientRect();
      const dx = b.left - a.left;
      const dy = b.top - a.top;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
          { duration: 280, easing: 'cubic-bezier(.2,.9,.3,1)' },
        );
      }
    }
  }
}

/** Ein Anteil als ganze Prozent, fuer die Meldung nach dem Auffuellen. */
function prozent(anteil) {
  return Math.round(anteil * 100);
}

/** Am Automaten hat der Zaehler feste Stellen: 000450 statt 450. */
function zahl(n, stellen = 6) {
  return settings.skin === 'arcade' ? String(n).padStart(stellen, '0') : String(n);
}

function updateStats({ bumpScore = false } = {}) {
  elScore.textContent = zahl(state.score);
  elLeft.textContent = zahl(remaining(state), 3);
  // In der Sackgasse wird aus dem Auffuell-Knopf der Rettungsknopf. Der
  // Enddialog laesst sich wegtippen - ohne das hier waere die Rettung dann
  // nicht mehr erreichbar.
  const rettungDa = state.status === 'stuck' && state.rescuesLeft > 0;
  refillLabel.textContent = rettungDa ? t('bar.rescue') : t('bar.refill');
  refillCount.hidden = rettungDa;
  refillCount.textContent = String(state.refillsLeft);
  btnRefill.classList.toggle('fab--rescue', rettungDa);
  if (rettungDa) btnRefill.classList.add('urge');
  btnRefill.disabled = rettungDa
    ? false
    : state.refillsLeft <= 0 || state.status !== 'playing';
  // In der Sackgasse ist Zurueck der zweite Ausweg – der Enddialog bietet ihn
  // an, also darf der Knopf darunter nicht gesperrt sein.
  btnUndo.disabled = !canUndo(state) || state.status === 'won';
  btnHint.disabled = state.status !== 'playing';
  if (bumpScore) {
    elScore.classList.remove('bump');
    void elScore.offsetWidth;
    elScore.classList.add('bump');
  }
  const record = best[state.difficulty];
  const note = $('#stat-best');
  const card = $('#card-score');
  if (note) {
    if (!record) {
      note.textContent = t('hud.noRecord');
      card?.classList.remove('beaten');
    } else if (state.score > record.score) {
      note.textContent = settings.skin === 'arcade'
        ? t('hud.recordBeatenArcade', { score: zahl(record.score) })
        : t('hud.recordBeaten', { score: record.score });
      card?.classList.add('beaten');
      if (!recordHit && state.status === 'playing') {
        recordHit = true;
        toast(t('msg.recordLive', { score: record.score }));
        sfx.recordLive();
        buzz([15, 40, 15]);
      }
    } else {
      note.textContent = settings.skin === 'arcade'
        ? t('hud.recordArcade', { score: zahl(record.score) })
        : t('hud.record', { score: record.score });
      card?.classList.remove('beaten');
    }
  }

  const labelTime = $('#label-time');
  if (labelTime) {
    labelTime.textContent = state.endless ? t('hud.round') : t('hud.time');
    if (state.endless) elTime.textContent = String(state.round);
  }

  const pf = document.getElementById('progress-fill');
  if (pf) {
    let anteil = progress(state);
    // Im Automaten sitzt der Balken in 10px-Fassungen. steps() in der
    // Ueberblendung teilt nur den Sprung, nicht die Skala - die Kanten laegen
    // also beliebig. Darum hier auf ganze Fassungen runden.
    if (settings.skin === 'arcade') {
      const breite = pf.parentElement?.clientWidth ?? 0;
      const fassungen = Math.max(1, Math.round(breite / 10));
      anteil = Math.round(anteil * fassungen) / fassungen;
    }
    pf.style.width = `${(anteil * 100).toFixed(2)}%`;
  }
  if (state.combo >= 2) {
    elCombo.textContent = t('combo.badge', { n: Math.min(state.combo, POINTS.maxCombo) });
    elCombo.classList.add('show');
  } else {
    elCombo.classList.remove('show');
  }
}

/* ---------------------------------------------------------------- Effekte */

function centerOf(el) {
  const r = el.getBoundingClientRect();
  const w = boardWrap.getBoundingClientRect();
  return {
    x: r.left - w.left + boardWrap.scrollLeft + r.width / 2,
    y: r.top - w.top + boardWrap.scrollTop + r.height / 2,
  };
}

/**
 * Nimmt ein Effektelement wieder weg, sobald seine Animation zu Ende ist.
 * Der Wecker daneben ist kein Luxus: setzt ein Stil das Element auf
 * display:none - so wie alle ausser Material 3 die Wellen -, laeuft nie
 * eine Animation, animationend bleibt aus und die Elemente sammeln sich
 * an. Bisher tat das die Welle bei jedem Antippen.
 */
function abraeumen(el, spaetestens) {
  const weg = () => el.remove();
  el.addEventListener('animationend', weg, { once: true });
  setTimeout(weg, spaetestens);
}

function burstAt(el) {
  if (reduceMotion.matches || !el) return;
  const { x, y } = centerOf(el);
  const ring = document.createElement('span');
  ring.className = 'burst';
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  fx.appendChild(ring);
  abraeumen(ring, 1200);

  for (let k = 0; k < 6; k++) {
    const s = document.createElement('span');
    const angle = (Math.PI * 2 * k) / 6 + Math.random();
    const dist = 22 + Math.random() * 20;
    s.className = 'spark';
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    fx.appendChild(s);
    abraeumen(s, 1200);
  }
}

function floaterAt(el, text) {
  if (reduceMotion.matches) return;
  const { x, y } = centerOf(el);
  const f = document.createElement('span');
  f.className = 'floater';
  f.textContent = text;
  f.style.left = `${x}px`;
  f.style.top = `${y}px`;
  fx.appendChild(f);
  abraeumen(f, 2000);
}

/* ------------------------------------------- Kombo-Level-Up (Coin-Op) --- */

/*
 * Der Wunsch war die Feier aus den Automaten. Was die wirklich taten:
 * Sprite-Zoom in ganzen Stufen (Space Harrier, OutRun), Farbzyklus im
 * Palette-RAM (Robotron 2084), ein Versatz in den Scroll-Registern fuers
 * Ruckeln (CPS-1) und bei der Hoechststufe die Palette kurz auf Weiss.
 * Was sie ausserdem taten - den Bildstopp von Pac-Man - bleibt draussen: er
 * wuerde die Eingabe blockieren, und genau das darf hier nie passieren.
 */

const comboPop = $('#combo-pop');

let comboLevel = 1;    // Stufe, die schon gefeiert wurde; 0 oder 1 = keine Kombo
let popToken = 0;      // laufende Nummer, entwertet Nachlaeufer eines abgeloesten Pops
const fxLog = [];      // nur fuer die automatische Pruefung

/** Der Schriftzug je Kombostufe. Steht im Woerterbuch, je Sprache eigen. */
function popWort(level) {
  // Faellt der Schluessel weg - etwa weil eine Sprache eine Stufe vergisst -,
  // steht sonst "combo.pop.7" im Bild. Dann lieber die schlichte Plakette.
  const schluessel = `combo.pop.${level}`;
  const wort = t(schluessel, { n: level });
  return wort === schluessel ? t('combo.badge', { n: level }) : wort;
}
/*
 * Wie lange die Einblendung steht. Der Anschlag dauert nur rund 220 ms, den
 * Rest steht die Schrift unbewegt da: bei 1600 ms sind das gut 1090 ms zum
 * Lesen. Kuerzer war es vorher (220-460 ms) - da konnte man nichts entziffern.
 * Die Zahlen muessen zu --pop-dur in arcade.css passen.
 */
const POP_MS = { 2: 1600, 3: 1600, 4: 1600, 5: 1600, 6: 1600, 7: 1600, 8: 1600, 9: 1600, 10: 2000 };
// Stufe -> [Dauer, Weite] des Ruettlers. Unter 5 wird nicht geruettelt.
const POP_SHAKE = { 5: [120, 2], 6: [120, 2], 7: [140, 3], 8: [160, 3], 9: [160, 3], 10: [200, 4] };

/** Feiert genau eine Stufe. Blockiert nichts: kein locked, keine Wartezeit. */
function playComboPop(level) {
  fxLog.push({ art: 'combo-pop', level, t: Math.round(performance.now()) });
  sfx.comboUp(level);
  buzz(level >= 10 ? [18, 30, 18, 30, 40] : level >= 5 ? [10, 25, 14] : 8);
  if (!comboPop) return;

  const meine = ++popToken;
  comboPop.textContent = popWort(level);
  comboPop.dataset.level = String(level);
  tickerEl.classList.add('pop');      // die kleine Plakette weicht
  // Abloesen statt stapeln: Klasse weg, Umbruch erzwingen, Klasse neu. Ohne
  // das Erzwingen fasst der Browser beides zusammen und nichts passiert.
  comboPop.classList.remove('show');
  void comboPop.offsetWidth;
  comboPop.classList.add('show');
  setTimeout(() => {
    if (meine !== popToken) return;
    comboPop.classList.remove('show');
    tickerEl.classList.remove('pop');
  }, (POP_MS[level] ?? 240) + 40);

  // Der Hoechststand blitzt den ganzen Bildschirm weiss.
  if (level >= POINTS.maxCombo && !reduceMotion.matches) {
    const root = document.documentElement;
    root.classList.remove('max-flash-on');
    void root.offsetWidth;
    root.classList.add('max-flash-on');
    setTimeout(() => { if (meine === popToken) root.classList.remove('max-flash-on'); }, 160);
  }

  const ruettler = POP_SHAKE[level];
  if (ruettler && !reduceMotion.matches) {
    const [ms, weite] = ruettler;
    document.body.style.setProperty('--shake-dur', `${ms}ms`);
    document.body.style.setProperty('--shake-amp', `${weite}px`);
    document.body.classList.remove('shake');
    void document.body.offsetWidth;
    document.body.classList.add('shake');
    setTimeout(() => { if (meine === popToken) document.body.classList.remove('shake'); }, ms + 20);
  }
}

/**
 * Nach einem Treffer aufrufen. Feuert nur bei einem echten Stufenanstieg –
 * ab Kombo 11 steht der Faktor bei 10 still, dann kommt also nichts mehr.
 */
/** Meldet zurueck, ob die Stufe wirklich gestiegen ist und gefeiert wurde. */
function comboStep(level) {
  const gestiegen = level > comboLevel && level >= 2 && settings.skin === 'arcade';
  if (gestiegen) playComboPop(level);
  comboLevel = level;
  return gestiegen;
}

/**
 * Kombo von aussen gesetzt: Fehlgriff, Auffuellen, Rettung, Zurueck, neues
 * Spiel, Spielende, Laden. Kein Effekt, nur den Stand nachziehen – und alles
 * Laufende abraeumen.
 *
 * Warum das noetig ist: refill() nullt die Kombo, der Schnappschuss davor
 * traegt aber den alten Wert. Ein Zurueck hebt die Kombo also wieder an. Ein
 * Haken in updateStats() wuerde daraus einen Level-Up aus dem Nichts machen.
 */
function syncComboLevel() {
  comboLevel = Math.min(state?.combo ?? 0, POINTS.maxCombo);
  popToken += 1;
  comboPop?.classList.remove('show');
  tickerEl.classList.remove('pop');
  document.body.classList.remove('shake');
  document.documentElement.classList.remove('max-flash-on');
}

function confetti({ gold = false } = {}) {
  if (reduceMotion.matches) return;
  const wrap = document.createElement('div');
  wrap.className = 'confetti';
  // Die Farben stecken im Inline-Stil und sind darum per CSS nicht erreichbar –
  // der Automat bekommt hier seine Neonpalette.
  const arcade = settings.skin === 'arcade';
  const colors = gold
    ? (arcade ? ['#ffdd00', '#ffaa00', '#ff55aa', '#ffffff']
              : ['#f5c451', '#ffd97a', '#e8a33d', '#fff0c2', '#ef7d31'])
    : (arcade ? ['#55eeff', '#55ff55', '#ffdd00', '#ff55aa']
              : ['#ef7d31', '#f5c451', '#16a37b', '#2b8fd6']);
  for (let i = 0; i < (gold ? 80 : 46); i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}vw`;
    p.style.background = colors[i % colors.length];
    p.style.animationDuration = `${1.1 + Math.random() * 1.1}s`;
    p.style.animationDelay = `${Math.random() * 0.35}s`;
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  try {
    if (typeof wrap.showPopover === 'function') { wrap.popover = 'manual'; wrap.showPopover(); }
  } catch { /* aeltere Browser zeigen es einfach darunter */ }
  setTimeout(() => wrap.remove(), 2800);
}

/* ------------------------------------------------------------ Spielablauf */

function clearSelection() {
  selected = null;
  // Ueber die Elemente statt ueber Indizes: nach einer entfernten Zeile zeigen
  // alte Indizes auf fremde Zellen.
  for (const el of cellEls.values()) el.classList.remove('sel', 'partner');
}

function select(i) {
  clearSelection();
  selected = i;
  const el = elAt(i);
  el?.classList.add('sel');
  if (settings.partners) {
    for (const j of partnersOf(state, i)) elAt(j)?.classList.add('partner');
  }
  sfx.select();
  buzz(8);
  announce(t('live.selected', { v: state.cells[i].v }));
}

function flash(el, cls, ms) {
  if (!el) return;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

function rejectPair(i, j) {
  const a = state.cells[i];
  const b = state.cells[j];
  flash(elAt(i), 'bad', 360);
  flash(elAt(j), 'bad', 360);
  breakCombo(state);
  sfx.error();
  syncComboLevel();
  buzz([12, 40, 12]);
  if (tipsShown < 3) {
    tipsShown += 1;
    toast(valuesMatch(a.v, b.v)
      ? t('msg.pairNotAdjacent', { a: a.v, b: b.v })
      : t('msg.pairNoMatch', { a: a.v, b: b.v }));
  }
  clearSelection();
  updateStats();
}

function doMatch(i, j) {
  const elI = elAt(i);
  const elJ = elAt(j);
  const values = [state.cells[i].v, state.cells[j].v];
  const res = applyMatch(state, i, j);
  if (!res.ok) return;

  clearSelection();
  elI?.classList.add('clearing');
  elJ?.classList.add('clearing');
  burstAt(elI);
  burstAt(elJ);
  floaterAt(elJ, `+${res.points}`);
  // Steigt die Kombo, uebernimmt ihre Melodie; sonst der schlichte Treffer.
  // Beides gleichzeitig waeren zwei Tonfolgen uebereinander - Matsch.
  if (!comboStep(res.multiplier)) sfx.match(res.multiplier);
  buzz(14);
  announce(t('live.cleared', { a: values[0], b: values[1], points: res.points }));
  updateStats({ bumpScore: true });

  const structural = res.removedRows.length > 0 || !!res.round;
  if (structural) {
    locked = true;
    sfx.row();
    floaterAt(elI, res.removedRows.length > 1
      ? t('fx.rowsFree', { n: res.removedRows.length }) : t('fx.rowFree'));
  }

  const liveIds = new Set(state.cells.map((c) => c.id));
  const orphans = [...cellEls].filter(([id]) => !liveIds.has(id)).map(([, el]) => el);

  const finish = () => {
    renderBoard(res.round ? { enterFrom: 0 } : {});
    locked = false;
    updateStats();
    if (res.round) {
      toast(t('msg.round', { n: res.round.round, bonus: res.round.bonus }), 3000);
      sfx.round();
      buzz([20, 50, 20]);
      announce(t('live.round', { n: res.round.round }));
    }
    afterMove();
  };

  const delay = reduceMotion.matches ? 0 : 320;
  setTimeout(() => {
    for (const el of orphans) if (!el.classList.contains('clearing')) el.classList.add('rowout');
    if (orphans.length && !reduceMotion.matches) setTimeout(finish, 240);
    else finish();
  }, delay);
}

function afterMove() {
  save();
  if (state.status === 'won') { endGame(true); return; }
  if (state.status === 'stuck') { endGame(false); return; }
  if (!findPair(state)) {
    btnRefill.classList.add('urge');
    toast(t('msg.noMoveRefill'), 3200);
  } else {
    btnRefill.classList.remove('urge');
  }
}

function onCellActivate(i) {
  if (locked || !state || state.status !== 'playing') return;
  const cell = state.cells[i];
  if (!cell || cell.cleared) return;
  clearHint();          // wer selbst tippt, braucht den Fingerzeig nicht mehr
  focusIndex = i;
  if (selected === null) { select(i); return; }
  if (selected === i) { clearSelection(); return; }
  if (canMatch(state, selected, i)) doMatch(selected, i);
  else rejectPair(selected, i);
}

/* ---------------------------------------------------------------- Aktionen */

/**
 * Beendet ein laufendes Blinken. Wird bei jeder Berührung des Feldes gerufen:
 * sobald der Spieler handelt, hat der Tipp seinen Zweck erfuellt. Frueher hing
 * das Blinken an einem Zeitgeber je Kachel - raeumte man das Paar sofort weg,
 * blinkten die leeren Fassungen die restlichen Sekunden weiter.
 */
function clearHint() {
  clearTimeout(hintTimer);
  hintTimer = null;
  for (const id of hintIds) cellEls.get(id)?.classList.remove('hinted');
  hintIds = [];
}

function doHint() {
  if (locked || state.status !== 'playing') return;
  const pair = hint(state);
  if (!pair) {
    toast(state.refillsLeft > 0 ? t('msg.noMoveRefill') : t('msg.noMove'));
    return;
  }
  clearSelection();
  clearHint();
  hintIds = pair.map((i) => state.cells[i].id);
  for (const i of pair) {
    const el = elAt(i);
    if (!el) continue;
    el.classList.remove('hinted');
    void el.offsetWidth;
    el.classList.add('hinted');
  }
  hintTimer = setTimeout(clearHint, 3400);
  const el = elAt(pair[0]);
  el?.scrollIntoView({ block: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  sfx.hint();
  announce(t('live.hint', { a: state.cells[pair[0]].v, b: state.cells[pair[1]].v }));
  save();
}

function doRefill() {
  if (locked || state.status !== 'playing') return;
  const res = refill(state);
  if (!res.ok) { toast(t('msg.noRefill')); return; }
  clearSelection();
  clearHint();
  syncComboLevel();
  btnRefill.classList.remove('urge');
  renderBoard({ enterFrom: res.from });
  updateStats();
  sfx.refill();
  buzz(20);
  announce(t('live.refilled', { n: res.added }));
  // Auffuellen holt Zahlen aufs Feld und senkt dafuer den Wert eines Treffers
  // (siehe wertFaktor in game.js). Wer das nicht erfaehrt, wundert sich nur
  // ueber kleinere Zahlen an den Feldern - also dazusagen.
  toast(t('msg.refilled', { n: res.added, left: state.refillsLeft })
    + t('msg.refillWorth', { p: prozent(wertFaktor(state)) }));
  elAt(res.from)?.scrollIntoView({ block: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  save();
  if (state.status === 'stuck') endGame(false);
}

/**
 * Rettung: In der Sackgasse kommen die letzten Zahlen noch einmal aufs Feld.
 * Fast jede verlorene Partie endet mit einer Handvoll Zahlen kurz vor dem Ziel –
 * das war der frustrierendste Moment im Spiel.
 */
function doRescue() {
  const res = rescue(state);
  if (!res.ok) return;
  closeSheet(dlgEnd);
  clearSelection();
  endHandled = false;
  clearHint();
  syncComboLevel();
  btnRefill.classList.remove('urge');
  renderBoard({ enterFrom: res.from });
  updateStats();
  startTimer();
  sfx.rescue();
  buzz([12, 30, 12]);
  announce(t('live.rescued', { n: res.added }));
  toast(t('msg.rescue'), 2800);
  elAt(res.from)?.scrollIntoView({ block: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  save();
  // Auch nach der Rettung kann es sofort wieder aus sein
  if (state.status === 'stuck') endGame(false);
}

function doUndo() {
  if (locked || !canUndo(state)) return;
  clearSelection();
  undo(state);
  clearHint();
  state.status = 'playing';
  endHandled = false;
  syncComboLevel();
  renderBoard();
  updateStats();
  btnRefill.classList.remove('urge');
  sfx.undo();
  announce(t('live.undone'));
  save();
}

function newGame(difficulty = settings.difficulty) {
  settings.difficulty = difficulty;
  store.set(KEY.settings, settings);
  state = createGame({ difficulty, diagonal: settings.diagonal, wrap: settings.wrap });
  cellEls.forEach((el) => el.remove());
  cellEls = new Map();
  selected = null;
  focusIndex = 0;
  tipsShown = 0;
  clearHint();
  locked = false;
  endHandled = false;
  recordHit = false;
  btnRefill.classList.remove('urge');
  renderBoard();
  updateStats();
  syncComboLevel();
  startTimer(true);
  save();
  announce(t('live.newGame', { label: diffName(difficulty) }));
  // "Warum kommen immer dieselben Zahlen?" - weil das in Klassisch so
  // gehoert: das Startfeld ist die Ziffernfolge 1 bis 19 ohne 10, jedes Mal
  // dieselbe. Das steht zwar unter den Schwierigkeiten, aber wer auf "Neu"
  // tippt, schaut nicht in die Einstellungen. Also hier, im Moment der Frage.
  if (difficulty === 'klassisch') toast(t('msg.classicFixed'));
}

/**
 * Eine Partie zaehlen - einmal, egal wie oft sie endet.
 *
 * Die Merker haengen an der PARTIE, nicht am Aufrufer: das Spielende laeuft
 * mehrfach fuer dieselbe Partie, wenn man aus der Sackgasse die Rettung nimmt
 * oder aus dem Enddialog zurueckgeht. Ohne die Merker haette eine Partie mit
 * Rettung zwei- oder dreifach gezaehlt. Serialisiert werden sie mit, ein neu
 * geladener Spielstand zaehlt also nicht noch einmal.
 *
 * Gerufen wird das auch aus applyRuleChange: wer die Diagonale ausschaltet
 * und damit in die Sackgasse geraet, hat diese Partie gespielt - dort geht
 * aber bewusst kein Enddialog auf (die Regel laesst sich zurueckstellen),
 * also muss das Zaehlen von der Anzeige getrennt sein.
 */
function zaehlePartie(won, zaehlt) {
  if (!state.gezaehlt) {
    state.gezaehlt = true;
    zaehler.gespielt += 1;
  }
  const ersterSieg = won && !state.siegGezaehlt;
  if (ersterSieg) {
    state.siegGezaehlt = true;
    zaehler.gewonnen += 1;
  }
  store.set(KEY.count, zaehler);
  saveNow();                    // Merker und Zaehler zusammen, nicht versetzt

  // Weltweit mitzaehlen. Bewusst ohne await: das Ergebnis interessiert erst,
  // wenn jemand die Bestwerte aufschlaegt, und ein lahmes Netz darf den
  // Enddialog nicht aufhalten. Der Punktestand geht bei JEDEM Ende hinaus -
  // nach einer Rettung ist er hoeher, und dann soll auch der Rekord stimmen.
  // neuePartie haengt am WELT-Merker, nicht am eigenen: geht der Ruf verloren
  // (Netz weg, oder Strafpause nach einer 429), soll das naechste Ende
  // derselben Partie nachzaehlen. Der eigene Zaehler stimmt ohnehin.
  welt.partieBeendet({ stufe: state.difficulty, punkte: state.score, zaehlt,
                       kuerzel: sauberesKuerzel(settings.kuerzel),
                       neuePartie: !state.weltGezaehlt, gewonnen: ersterSieg })
    .then((ergebnis) => {
      if (ergebnis?.gezaehlt) { state.weltGezaehlt = true; saveNow(); }
      if (dlgSettings.open) renderBest();
    })
    .catch(() => {});
}

/** Laesst eine Zahl hochlaufen – der kleine Trommelwirbel am Spielende. */
function countUp(el, to, ms = 900) {
  if (!el) return;
  if (reduceMotion.matches || to <= 0) { el.textContent = zahl(to); return; }
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / ms);
    el.textContent = zahl(Math.round(to * (1 - Math.pow(1 - t, 3))));
    if (t < 1) requestAnimationFrame(tick);
  };
  el.textContent = zahl(0);
  requestAnimationFrame(tick);
}

/* ------------------------------------------------------------------- Ende */

function endGame(won) {
  // Bei schnellen Zuegen sind mehrere Treffer gleichzeitig in der Animation und
  // jeder meldet sich am Ende. Ohne diese Sperre liefe die Auswertung mehrfach:
  // der zweite Durchlauf saehe den gerade geschriebenen Bestwert und wuerde die
  // Feier wieder zuruecknehmen, dazu doppeltes Konfetti und doppelter Klang.
  if (endHandled) return;
  endHandled = true;
  stopTimer();
  state.combo = 0;
  elCombo.classList.remove('show');
  syncComboLevel();
  const label = diffName(state.difficulty);
  const key = state.difficulty;
  const previous = best[key];
  // Im Endlos-Modus endet jeder Lauf in der Sackgasse – dort zaehlt der
  // erreichte Punktestand trotzdem als Bestwert.
  const zaehlt = won || state.endless;
  const isRecord = zaehlt && (!previous || state.score > previous.score);
  if (zaehlt) {
    if (isRecord) {
      // Das Kuerzel des letzten Mals kommt gleich mit: wer allein spielt,
      // muss es nie wieder anfassen, und auf einem geteilten Geraet
      // ueberschreibt es der Naechste im Feld unten im Dialog.
      best[key] = { score: state.score, time: Math.round(state.elapsed), at: Date.now(),
                    round: state.endless ? state.round : undefined,
                    kuerzel: sauberesKuerzel(settings.kuerzel) || undefined };
    }
    store.set(KEY.best, best);
  }

  zaehlePartie(won, zaehlt);

  $('#end-badge').querySelector('use').setAttribute('href', won ? '#i-trophy' : '#i-sad');
  $('#end-badge').classList.toggle('sad', !won);
  $('#end-title').textContent = won ? t('end.won')
    : (state.endless ? t('end.endlessOver', { n: state.round }) : t('end.stuck'));
  // Der Bonus fuers Sparen ist die einzige Stellschraube, mit der man den
  // Bestwert durch Koennen statt durch Glueck knackt – also benennen.
  const gespart = state.refillsLeft > 0
    ? t('end.savedRefills', { n: state.refillsLeft,
                              points: state.refillsLeft * POINTS.refillLeft })
    : '';
  // Die Verwaesserung erklaert den Punktestand und gehoert darum in JEDEN
  // Enddialog. Der Sparbonus dagegen nur in den gewonnenen: bei einer
  // Niederlage gibt es ihn nicht, ihn zu nennen waere eine falsche Auskunft.
  const verwaessert = state.geholt > 0
    ? t('end.dilute', { p: prozent(wertFaktor(state)) })
    : '';
  $('#end-text').textContent = (won
    ? (isRecord
        ? (previous ? t('end.wonBest', { label, prev: previous.score })
                    : t('end.wonFirst', { label }))
        : t('end.wonClean', { label })) + gespart
    : (state.status === 'stuck' && state.rescuesLeft > 0
        ? t('end.rescueOffer', { n: remaining(state) })
        : state.endless
          ? t('end.endlessTip', { n: state.round })
          : t('end.deadEnd'))) + verwaessert;
  $('#end-stats').innerHTML = [
    [t('end.statScore'), zahl(state.score), ' id="end-score"'],
    state.endless ? [t('end.statRounds'), state.round]
                  : [t('end.statTime'), fmtTime(state.elapsed)],
    [t('end.statMoves'), state.matches],
    [t('end.statCombo'), `×${Math.min(state.bestCombo, POINTS.maxCombo)}`],
  ].map(([k, v, attr = '']) => `<div><dt>${k}</dt><dd${attr}>${v}</dd></div>`).join('');
  // Nach einem Sieg lockt "Nochmal", in der Sackgasse ist Weiterspielen das
  // bessere Angebot – der jeweils sinnvollere Knopf wird der gefuellte.
  const btnUndoEnd = $('#btn-end-undo');
  const btnNewEnd = $('#btn-end-new');
  const btnRescueEnd = $('#btn-end-rescue');
  const rettungDa = !won && state.status === 'stuck' && state.rescuesLeft > 0;
  btnRescueEnd.hidden = !rettungDa;
  btnRescueEnd.classList.toggle('button--filled', rettungDa);
  btnUndoEnd.hidden = won || !canUndo(state);
  btnUndoEnd.classList.toggle('button--filled', !won && !rettungDa);
  btnNewEnd.classList.toggle('button--filled', won);
  btnNewEnd.textContent = won ? t('end.again') : t('end.newGame');

  // Bestwert: eigenes Band, Strahlenkranz, goldenes Konfetti, hochlaufende Punktzahl
  const ribbon = $('#end-record');
  ribbon.hidden = !isRecord;
  dlgEnd.classList.toggle('is-record', isRecord);
  if (isRecord) {
    const plus = previous ? state.score - previous.score : 0;
    ribbon.textContent = plus > 0 ? t('end.recordPlus', { plus }) : t('end.record');
  }
  // Das Kuerzelfeld gehoert zum Bestwert - ohne Bestwert ist nichts
  // einzutragen. Der Fokus bleibt bewusst weg: eine Tastatur, die sich
  // ueber die Feier schiebt, hat niemand verlangt, und vorbelegt ist das
  // Feld ohnehin.
  kuerzelStufe = isRecord ? key : null;
  feldKuerzelEnde.hidden = !isRecord;
  if (isRecord) eingabeKuerzelEnde.value = best[key].kuerzel ?? '';

  if (won || (state.endless && isRecord)) {
    confetti({ gold: isRecord });
    sfx.win();
    buzz([20, 60, 20, 60, 40]);
    if (isRecord) { sfx.record(); buzz([20, 50, 20, 50, 20, 50, 90]); }
  } else {
    sfx.lose();
    buzz([40, 80, 40]);
  }
  setTimeout(() => {
    openSheet(dlgEnd);
    if (won) countUp($('#end-score'), state.score, isRecord ? 1100 : 700);
  }, won && !reduceMotion.matches ? 620 : 0);
  save();
  renderBest();
}

/* ------------------------------------------------------------------ Timer */

function startTimer(reset = false) {
  stopTimer();
  if (reset) state.elapsed = 0;
  tickBase = Date.now();
  timerId = setInterval(() => {
    if (document.hidden || state.status !== 'playing') return;
    state.elapsed += (Date.now() - tickBase) / 1000;
    tickBase = Date.now();
    if (!state.endless) elTime.textContent = fmtTime(state.elapsed);
  }, 500);
  elTime.textContent = state.endless ? String(state.round) : fmtTime(state.elapsed);
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

document.addEventListener('visibilitychange', () => {
  tickBase = Date.now();
  if (document.hidden) save();
});

/* -------------------------------------------------------------- Speichern */

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => store.setRaw(KEY.save, serialize(state)), 220);
}

/**
 * Sofort sichern, ohne die 220 ms abzuwarten.
 *
 * Gebraucht beim Spielende: dort werden Merker gesetzt, die sagen "diese
 * Partie ist gezaehlt". Der Zaehler selbst liegt sofort im Speicher. Wer die
 * Seite in dem Fenster dazwischen neu laedt, haette eine Partie mit Merker
 * im Zaehler, aber ohne Merker im Spielstand - und zaehlte sie noch einmal.
 */
function saveNow() {
  clearTimeout(saveTimer);
  store.setRaw(KEY.save, serialize(state));
}

function load() {
  const restored = deserialize(store.raw(KEY.save));
  if (!restored || restored.status === 'won') return false;
  state = restored;
  state.diagonal = settings.diagonal;
  state.wrap = settings.wrap;
  settings.difficulty = state.difficulty in DIFFICULTIES ? state.difficulty : settings.difficulty;
  return true;
}

/* ----------------------------------------------------------------- Dialoge */

function openSheet(dlg) {
  if (dlg.open) return;
  dlg.showModal();
  // Ohne das landet der Fokus auf dem Schliessen-Kreuz und malt dort einen Ring.
  dlg.focus({ preventScroll: true });
  dlg.querySelector('.sheet__body')?.scrollTo({ top: 0 });
}

function closeSheet(dlg) {
  if (!dlg.open) return;
  if (reduceMotion.matches) { dlg.close(); return; }
  dlg.classList.add('closing');
  setTimeout(() => { dlg.classList.remove('closing'); dlg.close(); }, 190);
}

for (const dlg of [dlgRules, dlgSettings, dlgEnd]) {
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) closeSheet(dlg);          // Klick auf den Hintergrund
    if (e.target.closest('[data-close]')) closeSheet(dlg);
  });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeSheet(dlg); });
}

/* ----------------------------------------------------------- Einstellungen */

function renderSettings() {
  for (const btn of document.querySelectorAll('#seg-difficulty button')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.value === settings.difficulty));
  }
  for (const btn of document.querySelectorAll('#seg-theme button')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.value === settings.theme));
  }
  for (const btn of document.querySelectorAll('#seg-skin button')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.value === settings.skin));
  }
  for (const btn of document.querySelectorAll('#seg-lang button')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.value === settings.lang));
  }
  const arcade = settings.skin === 'arcade';
  $('#theme-field').hidden = arcade;
  $('#skin-note').hidden = !arcade;
  $('#lang-note').textContent = settings.lang === 'auto'
    ? t('set.langAutoNote', { label: SPRACHEN[sprache()].label })
    : '';
  $('#lang-note').hidden = settings.lang !== 'auto';
  $('#opt-diagonal').checked = settings.diagonal;
  $('#opt-wrap').checked = settings.wrap;
  $('#opt-partners').checked = settings.partners;
  $('#opt-sound').checked = settings.sound;
  $('#opt-vibrate').checked = settings.vibrate;
  // Nicht ueberschreiben, waehrend jemand darin tippt: der Zeiger sprang
  // sonst ans Ende, sobald irgendetwas anderes ein Neuzeichnen ausloest.
  if (document.activeElement !== eingabeKuerzelSet)
    eingabeKuerzelSet.value = sauberesKuerzel(settings.kuerzel);
  refreshInstallUi();
  const stamp = $('#version');
  if (stamp) stamp.textContent = `Zehner-Paare ${VERSION}`;
  const d = DIFFICULTIES[settings.difficulty];
  $('#difficulty-note').textContent =
    t('diff.note', { rows: d.rows, cols: d.cols, refills: d.refills })
    + (settings.difficulty === 'klassisch' ? t('diff.noteClassic') : '')
    + (settings.difficulty === 'endlos'
        ? t('diff.noteEndless', { rows: d.newRows, refills: d.refillPerRound }) : '');
  renderGroupSummaries();
  renderBest();
}

/**
 * Was in jeder Gruppenkopfzeile rechts steht. Ohne das muesste man jede
 * Gruppe aufklappen, nur um zu sehen, was eingestellt ist - dann waere mit
 * dem Zusammenklappen nichts gewonnen.
 */
function renderGroupSummaries() {
  const an = [];
  if (settings.diagonal) an.push(t('set.nowDiagonal'));
  if (settings.wrap) an.push(t('set.nowWrap'));
  if (settings.partners) an.push(t('set.nowPartners'));
  setzeNow('#now-game', [diffName(settings.difficulty), ...an].join(' · '));

  const farbe = settings.skin === 'arcade' ? null : t(`theme.${settings.theme}`);
  setzeNow('#now-look', [t(`skin.${settings.skin}`), farbe].filter(Boolean).join(' · '));

  const ton = [];
  if (settings.sound) ton.push(t('set.optSound'));
  if (settings.vibrate) ton.push(t('set.optVibrate'));
  setzeNow('#now-sound', ton.length ? ton.join(' · ') : t('set.nowNothing'));

  setzeNow('#now-lang', settings.lang === 'auto'
    ? `${t('set.langAuto')} · ${SPRACHEN[sprache()].label}`
    : SPRACHEN[settings.lang]?.label ?? '');

  const wieViele = Object.keys(DIFFICULTIES).filter((k) => best[k]).length;
  setzeNow('#now-best', wieViele
    ? t('set.nowBest', { n: wieViele, von: Object.keys(DIFFICULTIES).length })
    : t('set.nowNoBest'));
}

function setzeNow(sel, text) {
  const el = $(sel);
  if (el) el.textContent = text;
}

function renderBest() {
  // sauberesKuerzel filtert hier ein zweites Mal: was aus dem Speicher kommt,
  // geht ohne Umweg ins Markup.
  $('#best-list').innerHTML = Object.entries(DIFFICULTIES).map(([key]) => {
    const b = best[key];
    const wer = b ? sauberesKuerzel(b.kuerzel) : '';
    return `<li><span>${diffName(key)}</span><span class="best-list__who">${wer}</span>`
      + `<b>${b ? `${zahl(b.score)} · ${fmtTime(b.time)}` : '–'}</b></li>`;
  }).join('');
  $('#own-count').textContent =
    t('set.ownCount', { n: zaehler.gespielt, g: zaehler.gewonnen });
  renderWorld();
}

/**
 * Die Weltzahlen. Gezeigt wird immer der letzte bekannte Stand - auch ohne
 * Netz, auch sofort beim Aufklappen. Nachgeladen wird nur, wenn er alt ist,
 * und das Ergebnis kommt hier von selbst wieder an.
 */
function renderWorld() {
  const liste = $('#world-list');
  const note = $('#world-count');
  if (!liste || !note) return;
  $('#opt-world').checked = settings.world;

  const w = welt.zwischenstand();
  liste.innerHTML = Object.keys(DIFFICULTIES).map((key) => {
    const r = w.rekorde[key];
    // Auch hier gefiltert: der Wert kommt vom fremden Dienst und geht ohne
    // Umweg ins Markup.
    const wer = r ? sauberesKuerzel(w.wer?.[key]) : '';
    return `<li><span>${diffName(key)}</span><span class="best-list__who">${wer}</span>`
      + `<b>${r ? zahl(r) : '–'}</b></li>`;
  }).join('');

  if (!settings.world) { note.textContent = t('set.worldOff'); return; }
  if (w.spiele === null) {
    // "Noch keine Weltwerte geladen" waere falsch, wenn oben schon ein Rekord
    // steht: der kann vom eigenen Eintrag kommen, ohne dass je gelesen wurde.
    // Dann sagt die Liste selbst, was bekannt ist, und der Satz entfaellt.
    const etwasBekannt = Object.keys(w.rekorde).some((k) => w.rekorde[k] > 0);
    note.textContent = etwasBekannt ? '' : t('set.worldWaiting');
    return;
  }
  // Die Zahl der Siege kennt man erst, wenn einmal gelesen oder eine Partie
  // gewonnen wurde - bis dahin steht nur die Zahl der Partien da. Lieber ein
  // kuerzerer Satz als eine erfundene Null.
  // Ohne zahl(): die Nullen davor sind die Sprache des Punktezaehlers am
  // Automaten (siehe zahl()), in einem Satz waere "000037 Partien" nur
  // seltsam. Die Bestwerte darueber sind Punktestaende und bleiben aufgefuellt.
  note.textContent = (w.siege === null
    ? t('set.worldGames', { n: w.spiele })
    : t('set.worldCount', { n: w.spiele, g: w.siege }))
    // Nur ein wirklich gemessenes Alter anzeigen.
    + (Number.isFinite(w.alter) && w.alter > 60000
        ? ' ' + t('set.worldOld', { min: Math.round(w.alter / 60000) })
        : '');
  // Hinweis: set.worldOld faengt selbst mit " · " an, siehe i18n.test.js.
}

/**
 * Holt die Weltzahlen, wenn sie alt sind. Aufgerufen beim Aufschlagen der
 * Gruppe - nicht beim Start des Spiels: wer nur spielen will, soll auf
 * niemanden warten und niemandem etwas schicken muessen.
 */
let weltLaeuft = false;
function weltFrischen() {
  if (!settings.world || weltLaeuft || !welt.veraltet()) return;
  weltLaeuft = true;
  welt.lesen(Object.keys(DIFFICULTIES))
    .then((neu) => { if (neu) renderWorld(); })
    .catch(() => {})
    .finally(() => { weltLaeuft = false; });
}

function saveSettings() {
  store.set(KEY.settings, settings);
}

$('#seg-difficulty').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const value = btn.dataset.value;
  if (value === settings.difficulty && state.moves === 0) return;
  if (state.moves > 0 && state.status === 'playing' &&
      !confirm(t('msg.confirmNew'))) return;
  newGame(value);
  renderSettings();
});

$('#seg-skin').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || btn.dataset.value === settings.skin) return;
  settings.skin = btn.dataset.value;
  applyAppearance();
  saveSettings();
  renderSettings();
  renderBoard();
  updateStats();
  toast(t('msg.style', { label: skinName(settings.skin) }));
});

$('#seg-theme').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  settings.theme = btn.dataset.value;
  applyAppearance();
  saveSettings();
  renderSettings();
});

$('#seg-lang').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || btn.dataset.value === settings.lang) return;
  settings.lang = btn.dataset.value;
  saveSettings();
  applyLanguage();
  toast(t('msg.language', { label: SPRACHEN[sprache()].label }));
});

// Wer die Sprache dem Geraet ueberlaesst, soll es auch merken, wenn sie sich
// dort aendert - ohne die Seite neu zu laden.
window.addEventListener('languagechange', () => {
  if (settings.lang === 'auto') applyLanguage();
});

/*
 * Welche Gruppe der Einstellungen offen ist, bleibt gemerkt. Sonst muss man
 * bei jedem Oeffnen wieder dieselbe aufklappen. Es ist immer hoechstens eine
 * offen - das ist der Sinn der Sache, sonst waere die Liste wieder lang.
 */
const GRUPPEN = ['grp-game', 'grp-look', 'grp-sound', 'grp-lang', 'grp-best'];
let getippteGruppe = null;      // Kopfzeile und ihre Lage vor dem Tipp

/**
 * Haelt die angetippte Kopfzeile an ihrem Platz. Aufklappen soll nur nach
 * UNTEN wachsen - der Finger liegt auf dem Titel, und der soll dort bleiben.
 *
 * Zwei Dinge standen dem im Weg, beide gemessen:
 *
 *  1. Das Blatt war so hoch wie sein Inhalt. Ein Bottom Sheet ist unten
 *     verankert, also wanderte beim Wachsen seine Oberkante nach oben - bis
 *     zu 164 px. Dagegen steht jetzt die feste Blatthoehe im Stylesheet.
 *  2. Es war immer nur eine Gruppe offen. Schloss sich dabei eine Gruppe
 *     OBERHALB der angetippten, fiel Inhalt darueber weg und alles darunter
 *     rutschte hoch - bis zu 650 px.
 *
 * Punkt 2 laesst sich NICHT durch Nachfuehren beheben. Wenn der Inhalt ueber
 * der Kopfzeile verschwindet, muesste man nach oben scrollen, um sie unten zu
 * halten - bei scrollTop 0 gibt es dorthin nichts mehr. Genau der haeufigste
 * Fall (die offene Gruppe steht oben, man tippt eine weiter unten an) ist
 * damit unloesbar. Deshalb schliessen sich die anderen Gruppen nicht mehr von
 * selbst: was oberhalb steht, bleibt stehen, und die angetippte Gruppe geht
 * darunter auf. Wer aufraeumen will, klappt selbst zu.
 *
 * Das Nachfuehren bleibt als Sicherung fuer den einen Rest: klappt man weit
 * unten gescrollt seine eigene Gruppe zu, schrumpft der Inhalt und der
 * Browser begrenzt scrollTop - dann rutscht doch etwas.
 */
function haltePosition(kopf) {
  const koerper = dlgSettings.querySelector('.sheet__body');
  if (!koerper || !getippteGruppe) return;
  const verschoben = kopf.getBoundingClientRect().top - getippteGruppe.oben;
  if (!verschoben) return;
  koerper.scrollTop += verschoben;
}

function initGruppen() {
  // Welche Gruppen offen waren, steht als Liste im Speicher. Voreingestellt
  // ist "Spiel" offen: das ist die Gruppe, um die es meistens geht.
  let offen;
  try { offen = JSON.parse(store.raw('zp.groups.v1', '')) ; } catch { offen = null; }
  if (!Array.isArray(offen)) offen = ['grp-game'];

  for (const id of GRUPPEN) {
    const el = document.getElementById(id);
    if (!el) continue;
    const kopf = el.querySelector('summary');
    el.open = offen.includes(id);

    // Im Abfangen, also bevor <details> selbst umschaltet. Ein Tastendruck
    // auf die Kopfzeile loest ebenfalls ein click aus, damit ist auch die
    // Bedienung ohne Finger abgedeckt.
    kopf?.addEventListener('click', () => {
      getippteGruppe = { id, oben: kopf.getBoundingClientRect().top };
    }, true);

    el.addEventListener('toggle', () => {
      store.setRaw('zp.groups.v1', JSON.stringify(
        GRUPPEN.filter((g) => document.getElementById(g)?.open)));
      if (kopf && getippteGruppe?.id === id) haltePosition(kopf);
      // Die Weltzahlen erst holen, wenn jemand sie auch sehen will. Die
      // Bedingung auf das offene Blatt ist nicht ueberfluessig: initGruppen
      // setzt beim Start el.open, und schon das loest ein toggle aus - ohne
      // die Bedingung wuerde also jeder Programmstart Anfragen hinausschicken,
      // obwohl niemand nach den Weltzahlen gefragt hat.
      if (id === 'grp-best' && el.open && dlgSettings.open) weltFrischen();
    });
  }
}

/** Nach einer Regelaenderung kann aus einer Sackgasse wieder ein Spiel werden – und umgekehrt. */
function applyRuleChange(message) {
  clearSelection();
  const before = state.status;
  if (state.status !== 'won') refreshStatus(state);
  if (state.status === 'playing') endHandled = false;
  saveSettings();
  updateStats();
  save();
  toast(message);
  if (before !== 'playing' && state.status === 'playing') {
    btnRefill.classList.remove('urge');
    startTimer();
  } else if (state.status === 'stuck' && before === 'playing') {
    btnRefill.classList.add('urge');
    stopTimer();
    // Kein Enddialog: die Regel laesst sich zurueckstellen, und dann geht es
    // weiter. Gespielt ist die Partie aber, also zaehlt sie - einmal, dafuer
    // sorgen die Merker in zaehlePartie.
    zaehlePartie(false, state.endless);
  }
}

$('#opt-diagonal').addEventListener('change', (e) => {
  settings.diagonal = e.target.checked;
  state.diagonal = settings.diagonal;
  applyRuleChange(t(settings.diagonal ? 'msg.diagonalOn' : 'msg.diagonalOff'));
});

$('#opt-wrap').addEventListener('change', (e) => {
  settings.wrap = e.target.checked;
  state.wrap = settings.wrap;
  applyRuleChange(t(settings.wrap ? 'msg.wrapOn' : 'msg.wrapOff'));
});

$('#opt-partners').addEventListener('change', (e) => {
  settings.partners = e.target.checked;
  saveSettings();
  if (selected !== null) select(selected);
});

$('#opt-sound').addEventListener('change', (e) => {
  settings.sound = e.target.checked;
  saveSettings();
  if (settings.sound) sfx.select();
});

$('#opt-vibrate').addEventListener('change', (e) => {
  settings.vibrate = e.target.checked;
  saveSettings();
  buzz(20);
});

/**
 * Ein Anschlag in einem der beiden Kuerzelfelder.
 *
 * Zurueckgeschrieben wird nur, wenn der Filter wirklich etwas veraendert hat:
 * jedes unnoetige Setzen von value schiebt den Schreibzeiger ans Ende.
 */
function kuerzelGetippt(feld, stufe) {
  const kurz = setzeKuerzel(feld.value, stufe);
  if (feld.value !== kurz) feld.value = kurz;
  // Das andere Feld zieht mit - sonst stehen zwei verschiedene Kuerzel da.
  const anderes = feld === eingabeKuerzelEnde ? eingabeKuerzelSet : eingabeKuerzelEnde;
  anderes.value = kurz;
  renderBest();
}

// Im Enddialog gehoert das Getippte zum frisch aufgestellten Bestwert, in den
// Einstellungen ist es die Voreinstellung fuer den naechsten.
eingabeKuerzelEnde.addEventListener('input',
  () => kuerzelGetippt(eingabeKuerzelEnde, kuerzelStufe));
eingabeKuerzelSet.addEventListener('input',
  () => kuerzelGetippt(eingabeKuerzelSet, null));

$('#opt-world').addEventListener('change', (e) => {
  settings.world = e.target.checked;
  welt.schalten(settings.world);
  saveSettings();
  renderWorld();
  weltFrischen();
});

/* ------------------------------------------------------------- Bedienung */

board.addEventListener('click', (e) => {
  const el = e.target.closest('.cell');
  if (!el) return;
  onCellActivate(Number(el.dataset.i));
});

board.addEventListener('keydown', (e) => {
  const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -state.cols, ArrowDown: state.cols };
  if (!(e.key in steps)) return;
  e.preventDefault();
  const step = steps[e.key];
  let next = focusIndex;
  // Bis zum naechsten spielbaren Feld weitergehen, leere ueberspringen.
  // Links/rechts folgen der Leserichtung, also auch ueber das Zeilenende hinaus.
  for (let guard = 0; guard < state.cells.length; guard++) {
    next += step;
    if (next < 0 || next >= state.cells.length) return;
    if (!state.cells[next].cleared) break;
  }
  if (state.cells[next]?.cleared) return;
  focusIndex = next;
  for (const c of cellEls.values()) c.tabIndex = -1;
  const el = elAt(focusIndex);
  if (el) { el.tabIndex = 0; el.focus(); }
});

btnUndo.addEventListener('click', doUndo);
btnHint.addEventListener('click', doHint);
btnRefill.addEventListener('click', () => {
  if (state.status === 'stuck' && state.rescuesLeft > 0) doRescue();
  else doRefill();
});
btnNew.addEventListener('click', () => {
  if (state.moves > 0 && state.status === 'playing' &&
      !confirm(t('msg.confirmNew'))) return;
  newGame();
});

$('#btn-rules').addEventListener('click', () => openSheet(dlgRules));
$('#btn-rules-2').addEventListener('click', () => { closeSheet(dlgSettings); setTimeout(() => openSheet(dlgRules), 210); });
$('#btn-settings').addEventListener('click', () => {
  renderSettings();
  openSheet(dlgSettings);
  if (document.getElementById('grp-best')?.open) weltFrischen();
});
$('#btn-end-new').addEventListener('click', () => { closeSheet(dlgEnd); newGame(); });
$('#btn-end-undo').addEventListener('click', () => { closeSheet(dlgEnd); doUndo(); startTimer(); });
$('#btn-end-rescue').addEventListener('click', doRescue);

document.addEventListener('keydown', (e) => {
  if (e.target.closest('dialog') || e.target.matches('input, textarea')) return;
  if (e.key === 'h') doHint();
  if (e.key === 'u' || (e.key === 'z' && (e.metaKey || e.ctrlKey))) doUndo();
  if (e.key === 'Escape') clearSelection();
});

// Ton erst nach der ersten Nutzergeste anlegen (Autoplay-Regeln der Browser).
window.addEventListener('pointerdown', () => audio(), { once: true });

/* Ripple: die Zustandsebene aus Material 3 bekommt ihren Anschlag am Beruehrpunkt. */
const RIPPLE_TARGETS = '.icon-button, .button, .fab, .chip, .segmented button, .cell';
document.addEventListener('pointerdown', (e) => {
  if (reduceMotion.matches) return;
  const el = e.target.closest(RIPPLE_TARGETS);
  if (!el || el.disabled) return;
  const box = el.getBoundingClientRect();
  const size = Math.max(box.width, box.height) * 2;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - box.left - size / 2}px`;
  ripple.style.top = `${e.clientY - box.top - size / 2}px`;
  el.appendChild(ripple);
  abraeumen(ripple, 1200);
}, { passive: true });

/* ------------------------------------------------- Installation als App */

let installPrompt = null;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: minimal-ui)').matches ||
  navigator.standalone === true;

// iPadOS meldet sich als Mac, verrät sich aber über die Berührungspunkte.
const isApplePhone = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function refreshInstallUi() {
  const field = $('#install-field');
  const button = $('#btn-install');
  const note = $('#install-note');
  if (!field) return;

  if (isStandalone()) {                       // läuft bereits als App
    field.hidden = true;
    return;
  }
  if (installPrompt) {                        // Android, Chrome, Edge …
    field.hidden = false;
    button.hidden = false;
    note.textContent = t('set.installNote');
    return;
  }
  if (isApplePhone()) {                       // iOS kennt keinen Installationsdialog
    field.hidden = false;
    button.hidden = true;
    note.textContent = t('set.installIos');
    return;
  }
  field.hidden = true;
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  refreshInstallUi();
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  refreshInstallUi();
  toast(t('msg.installed'));
});

$('#btn-install')?.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  refreshInstallUi();
});

/* ------------------------------------------------------------------ Start */

applyAppearance();

/** App-Kurzbefehle (?neu=leicht) starten direkt eine Partie. */
function difficultyFromUrl() {
  const wanted = new URLSearchParams(location.search).get('neu');
  if (!wanted || !(wanted in DIFFICULTIES)) return null;
  history.replaceState(null, '', location.pathname);   // Adresse wieder aufräumen
  return wanted;
}

const requested = difficultyFromUrl();
if (requested) settings.difficulty = requested;
if (requested || !load()) {
  state = createGame({
    difficulty: settings.difficulty,
    diagonal: settings.diagonal,
    wrap: settings.wrap,
  });
  if (requested) saveSettings();
}
applyTexts();         // muss vor dem ersten Zeichnen laufen
initGruppen();
renderBoard();
updateStats();
renderSettings();
syncComboLevel();     // ein geladener Spielstand kann mitten in einer Kombo stehen
startTimer();

if (state.status === 'stuck') {
  // Wer in der Sackgasse aufgehoert hat, bekommt beim Wiederkommen dieselben
  // Auswege angeboten wie im Moment des Steckenbleibens – Rettung inklusive.
  endGame(false);
} else if (state.status === 'playing' && !findPair(state)) {
  btnRefill.classList.add('urge');
}

if (!store.get(KEY.seen)) {
  store.set(KEY.seen, true);
  openSheet(dlgRules);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline optional */ });
  });
}

// Fuer Tests aus dem Browser heraus
window.__zp = {
  get state() { return state; },
  get comboLevel() { return comboLevel; },
  fx: fxLog,
  onCellActivate, doHint, doRefill, doUndo, doRescue, newGame, toast, renderBoard, sfx,
  findPair, canMatch, remaining, VERSION,
};
