/**
 * Zehner-Paare – Oberflaeche.
 * Bindet die Spiellogik aus game.js an DOM, Animationen, Ton und Speicher.
 */
import {
  DIFFICULTIES, createGame, canMatch, applyMatch, refill, hint, undo, canUndo,
  breakCombo, remaining, serialize, deserialize, valuesMatch, findPair, progress,
  partnersOf, refreshStatus, POINTS, rescue,
} from './game.js';

/* ---------------------------------------------------------------- Speicher */

export const VERSION = '1.2.0';

const KEY = { save: 'zp.save.v1', settings: 'zp.settings.v1', best: 'zp.best.v2', seen: 'zp.seen.v1' };

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
  skin: 'classic',          // 'classic' oder 'm3'
  difficulty: 'mittel',
  diagonal: true,
  wrap: true,
  sound: true,
  vibrate: true,
  partners: false,
  theme: 'auto',
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
let best = store.get(KEY.best) ?? {};

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
let recordHit = false;     // Rekord waehrend der Partie schon gefeiert?

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
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

const sfx = {
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
};

/* ------------------------------------------------------------- Darstellung */

/**
 * Setzt Skin und Farbschema. Die beiden Stilvarianten liegen als eigene
 * Stylesheets vor; umgeschaltet wird über deren disabled-Eigenschaft.
 */
function applyAppearance() {
  const root = document.documentElement;
  if (settings.theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', settings.theme);

  const m3 = settings.skin === 'm3';
  root.dataset.skin = m3 ? 'm3' : 'classic';
  const toggle = (id, active) => {
    const el = document.getElementById(id);
    if (el) el.disabled = !active;
  };
  toggle('css-m3', m3);
  toggle('css-m3-colors', m3);
  toggle('css-classic', !m3);
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
    ? `Zeile ${r}, Spalte ${c}, leer`
    : `Zeile ${r}, Spalte ${c}, Zahl ${cell.v}`;
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
    // Reste abgelaufener Animationen entfernen – sonst haelt "forwards" die
    // Zelle unsichtbar, statt sie als Luecke zu zeigen.
    el.classList.remove('clearing', 'bad', 'rowout');
    el.classList.toggle('empty', cell.cleared);
    el.disabled = cell.cleared;
    el.setAttribute('aria-label', labelFor(i));
    el.tabIndex = i === focusIndex ? 0 : -1;
    if (board.children[i] !== el) board.insertBefore(el, board.children[i] ?? null);
  });

  // Kantenverlauf nur zeigen, wenn das Feld tatsaechlich ueberlaeuft
  boardWrap.classList.toggle('scrollable', board.scrollHeight > boardWrap.clientHeight + 2);

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

function updateStats({ bumpScore = false } = {}) {
  elScore.textContent = String(state.score);
  elLeft.textContent = String(remaining(state));
  // In der Sackgasse wird aus dem Auffuell-Knopf der Rettungsknopf. Der
  // Enddialog laesst sich wegtippen - ohne das hier waere die Rettung dann
  // nicht mehr erreichbar.
  const rettungDa = state.status === 'stuck' && state.rescuesLeft > 0;
  refillLabel.textContent = rettungDa ? 'Rettung' : 'Auffüllen';
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
      note.textContent = 'noch kein Rekord';
      card?.classList.remove('beaten');
    } else if (state.score > record.score) {
      note.textContent = `Rekord ${record.score} geknackt`;
      card?.classList.add('beaten');
      if (!recordHit && state.status === 'playing') {
        recordHit = true;
        toast(`Rekord! ${record.score} Punkte übertroffen`);
        tone({ freq: 1046, dur: 0.16, gain: 0.04 });
        tone({ freq: 1568, dur: 0.22, delay: 0.12, gain: 0.035 });
        buzz([15, 40, 15]);
      }
    } else {
      note.textContent = `Rekord ${record.score}`;
      card?.classList.remove('beaten');
    }
  }

  const labelTime = $('#label-time');
  if (labelTime) {
    labelTime.textContent = state.endless ? 'Runde' : 'Zeit';
    if (state.endless) elTime.textContent = String(state.round);
  }

  const pf = document.getElementById('progress-fill');
  if (pf) pf.style.width = `${Math.round(progress(state) * 100)}%`;
  if (state.combo >= 2) {
    elCombo.textContent = `Kombo ×${Math.min(state.combo, POINTS.maxCombo)}`;
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

function burstAt(el) {
  if (reduceMotion.matches || !el) return;
  const { x, y } = centerOf(el);
  const ring = document.createElement('span');
  ring.className = 'burst';
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  fx.appendChild(ring);
  ring.addEventListener('animationend', () => ring.remove(), { once: true });

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
    s.addEventListener('animationend', () => s.remove(), { once: true });
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
  f.addEventListener('animationend', () => f.remove(), { once: true });
}

function confetti({ gold = false } = {}) {
  if (reduceMotion.matches) return;
  const wrap = document.createElement('div');
  wrap.className = 'confetti';
  const colors = gold
    ? ['#f5c451', '#ffd97a', '#e8a33d', '#fff0c2', '#ef7d31']
    : ['#ef7d31', '#f5c451', '#16a37b', '#2b8fd6'];
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
  announce(`${state.cells[i].v} ausgewählt`);
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
  buzz([12, 40, 12]);
  if (tipsShown < 3) {
    tipsShown += 1;
    toast(valuesMatch(a.v, b.v)
      ? `${a.v} und ${b.v} passen – nur nicht benachbart.`
      : `${a.v} und ${b.v} – weder gleich noch Summe 10.`);
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
  sfx.match(res.multiplier);
  buzz(14);
  announce(`${values[0]} und ${values[1]} gestrichen, ${res.points} Punkte`);
  updateStats({ bumpScore: true });

  const structural = res.removedRows.length > 0 || !!res.round;
  if (structural) {
    locked = true;
    sfx.row();
    floaterAt(elI, res.removedRows.length > 1 ? `${res.removedRows.length} Zeilen!` : 'Zeile frei!');
  }

  const liveIds = new Set(state.cells.map((c) => c.id));
  const orphans = [...cellEls].filter(([id]) => !liveIds.has(id)).map(([, el]) => el);

  const finish = () => {
    renderBoard(res.round ? { enterFrom: 0 } : {});
    locked = false;
    updateStats();
    if (res.round) {
      toast(`Runde ${res.round.round} · +${res.round.bonus} · ein Auffüllen zurück`, 3000);
      sfx.row();
      buzz([20, 50, 20]);
      announce(`Runde ${res.round.round}`);
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
    toast('Kein Zug mehr – bitte auffüllen.', 3200);
  } else {
    btnRefill.classList.remove('urge');
  }
}

function onCellActivate(i) {
  if (locked || !state || state.status !== 'playing') return;
  const cell = state.cells[i];
  if (!cell || cell.cleared) return;
  focusIndex = i;
  if (selected === null) { select(i); return; }
  if (selected === i) { clearSelection(); return; }
  if (canMatch(state, selected, i)) doMatch(selected, i);
  else rejectPair(selected, i);
}

/* ---------------------------------------------------------------- Aktionen */

function doHint() {
  if (locked || state.status !== 'playing') return;
  const pair = hint(state);
  if (!pair) {
    toast(state.refillsLeft > 0 ? 'Kein Zug mehr – bitte auffüllen.' : 'Kein Zug mehr möglich.');
    return;
  }
  clearSelection();
  for (const i of pair) {
    const el = elAt(i);
    if (!el) continue;
    el.classList.remove('hinted');
    void el.offsetWidth;
    el.classList.add('hinted');
    setTimeout(() => el.classList.remove('hinted'), 3400);
  }
  const el = elAt(pair[0]);
  el?.scrollIntoView({ block: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  tone({ freq: 880, dur: 0.09, gain: 0.03 });
  announce(`Tipp: ${state.cells[pair[0]].v} und ${state.cells[pair[1]].v}`);
  save();
}

function doRefill() {
  if (locked || state.status !== 'playing') return;
  const res = refill(state);
  if (!res.ok) { toast('Kein Auffüllen mehr übrig.'); return; }
  clearSelection();
  btnRefill.classList.remove('urge');
  renderBoard({ enterFrom: res.from });
  updateStats();
  sfx.refill();
  buzz(20);
  announce(`${res.added} Zahlen angehängt`);
  toast(`${res.added} Zahlen angehängt · noch ${state.refillsLeft}×`);
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
  btnRefill.classList.remove('urge');
  renderBoard({ enterFrom: res.from });
  updateStats();
  startTimer();
  sfx.refill();
  buzz([12, 30, 12]);
  announce(`Rettung: ${res.added} Zahlen noch einmal auf dem Feld`);
  toast('Rettung! Noch eine Chance.', 2800);
  elAt(res.from)?.scrollIntoView({ block: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  save();
  // Auch nach der Rettung kann es sofort wieder aus sein
  if (state.status === 'stuck') endGame(false);
}

function doUndo() {
  if (locked || !canUndo(state)) return;
  clearSelection();
  undo(state);
  state.status = 'playing';
  endHandled = false;
  renderBoard();
  updateStats();
  btnRefill.classList.remove('urge');
  tone({ freq: 300, dur: 0.1, gain: 0.03, type: 'triangle' });
  announce('Zug zurückgenommen');
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
  locked = false;
  endHandled = false;
  recordHit = false;
  btnRefill.classList.remove('urge');
  renderBoard();
  updateStats();
  startTimer(true);
  save();
  announce(`Neues Spiel: ${DIFFICULTIES[difficulty].label}`);
}

/** Laesst eine Zahl hochlaufen – der kleine Trommelwirbel am Spielende. */
function countUp(el, to, ms = 900) {
  if (!el) return;
  if (reduceMotion.matches || to <= 0) { el.textContent = String(to); return; }
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / ms);
    el.textContent = String(Math.round(to * (1 - Math.pow(1 - t, 3))));
    if (t < 1) requestAnimationFrame(tick);
  };
  el.textContent = '0';
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
  const label = DIFFICULTIES[state.difficulty]?.label ?? state.difficulty;
  const key = state.difficulty;
  const previous = best[key];
  // Im Endlos-Modus endet jeder Lauf in der Sackgasse – dort zaehlt der
  // erreichte Punktestand trotzdem als Bestwert.
  const zaehlt = won || state.endless;
  const isRecord = zaehlt && (!previous || state.score > previous.score);
  if (zaehlt) {
    if (isRecord) {
      best[key] = { score: state.score, time: Math.round(state.elapsed), at: Date.now(),
                    round: state.endless ? state.round : undefined };
    }
    store.set(KEY.best, best);
  }

  $('#end-badge').querySelector('use').setAttribute('href', won ? '#i-trophy' : '#i-sad');
  $('#end-badge').classList.toggle('sad', !won);
  $('#end-title').textContent = won ? 'Feld leer geräumt!'
    : (state.endless ? `Lauf beendet · Runde ${state.round}` : 'Keine Züge mehr');
  // Der Bonus fuers Sparen ist die einzige Stellschraube, mit der man den
  // Bestwert durch Koennen statt durch Glueck knackt – also benennen.
  const gespart = state.refillsLeft > 0
    ? ` ${state.refillsLeft}× Auffüllen gespart: +${state.refillsLeft * POINTS.refillLeft}.`
    : '';
  $('#end-text').textContent = won
    ? (isRecord
        ? (previous ? `${label} · dein bisher bester Lauf, vorher ${previous.score}.`
                    : `${label} · dein erster Sieg auf dieser Stufe.`)
        : `Sauber gespielt bei ${label}.`) + gespart
    : (state.status === 'stuck' && state.rescuesLeft > 0
        ? `Nur noch ${remaining(state)} Zahlen – die Rettung legt sie dir noch einmal aufs Feld.`
        : state.endless
          ? `Bis Runde ${state.round} gekommen. Ein Zug zurück hält den Lauf am Leben.`
          : 'Kein Paar mehr übrig und kein Auffüllen mehr. Nimm einen Zug zurück oder starte neu.');
  $('#end-stats').innerHTML = [
    ['Punkte', state.score, ' id="end-score"'],
    state.endless ? ['Runden', state.round] : ['Zeit', fmtTime(state.elapsed)],
    ['Züge', state.matches],
    ['Beste Kombo', `×${Math.min(state.bestCombo, POINTS.maxCombo)}`],
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
  btnNewEnd.textContent = won ? 'Nochmal' : 'Neues Spiel';

  // Bestwert: eigenes Band, Strahlenkranz, goldenes Konfetti, hochlaufende Punktzahl
  const ribbon = $('#end-record');
  ribbon.hidden = !isRecord;
  dlgEnd.classList.toggle('is-record', isRecord);
  if (isRecord) {
    const plus = previous ? state.score - previous.score : 0;
    ribbon.textContent = plus > 0 ? `★ Neuer Bestwert · +${plus}` : '★ Neuer Bestwert';
  }

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
  $('#opt-diagonal').checked = settings.diagonal;
  $('#opt-wrap').checked = settings.wrap;
  $('#opt-partners').checked = settings.partners;
  $('#opt-sound').checked = settings.sound;
  $('#opt-vibrate').checked = settings.vibrate;
  refreshInstallUi();
  const stamp = $('#version');
  if (stamp) stamp.textContent = `Zehner-Paare ${VERSION}`;
  const d = DIFFICULTIES[settings.difficulty];
  $('#difficulty-note').textContent =
    `${d.rows} × ${d.cols} Felder · ${d.refills}× Auffüllen`
    + (settings.difficulty === 'klassisch' ? ' · immer dasselbe Startfeld, das Papier-Original (1–19 ohne 10)' : '')
    + (settings.difficulty === 'endlos' ? ` · je Runde ${d.newRows} neue Zeilen, +${d.refillPerRound}× Auffüllen, kein Ende` : '');
  renderBest();
}

function renderBest() {
  $('#best-list').innerHTML = Object.entries(DIFFICULTIES).map(([key, d]) => {
    const b = best[key];
    return `<li><span>${d.label}</span><b>${b ? `${b.score} · ${fmtTime(b.time)}` : '–'}</b></li>`;
  }).join('');
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
      !confirm('Neues Spiel starten? Die laufende Partie geht verloren.')) return;
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
  toast(settings.skin === 'm3' ? 'Stil: Material 3' : 'Stil: Original');
});

$('#seg-theme').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  settings.theme = btn.dataset.value;
  applyAppearance();
  saveSettings();
  renderSettings();
});

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
  }
}

$('#opt-diagonal').addEventListener('change', (e) => {
  settings.diagonal = e.target.checked;
  state.diagonal = settings.diagonal;
  applyRuleChange(settings.diagonal ? 'Diagonale Paare erlaubt.' : 'Diagonale Paare aus.');
});

$('#opt-wrap').addEventListener('change', (e) => {
  settings.wrap = e.target.checked;
  state.wrap = settings.wrap;
  applyRuleChange(settings.wrap ? 'Zeilenumbruch zählt als Nachbarschaft.' : 'Zeilenumbruch aus.');
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
      !confirm('Neues Spiel starten? Die laufende Partie geht verloren.')) return;
  newGame();
});

$('#btn-rules').addEventListener('click', () => openSheet(dlgRules));
$('#btn-rules-2').addEventListener('click', () => { closeSheet(dlgSettings); setTimeout(() => openSheet(dlgRules), 210); });
$('#btn-settings').addEventListener('click', () => { renderSettings(); openSheet(dlgSettings); });
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
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
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
    note.textContent = 'Danach startet das Spiel ohne Browserleiste und läuft auch offline.';
    return;
  }
  if (isApplePhone()) {                       // iOS kennt keinen Installationsdialog
    field.hidden = false;
    button.hidden = true;
    note.textContent = 'In Safari unten auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen. '
      + 'Danach startet das Spiel ohne Browserleiste und läuft auch offline.';
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
  toast('Liegt jetzt auf dem Startbildschirm.');
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
renderBoard();
updateStats();
renderSettings();
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
  onCellActivate, doHint, doRefill, doUndo, doRescue, newGame, toast, renderBoard,
  findPair, canMatch, remaining, VERSION,
};
