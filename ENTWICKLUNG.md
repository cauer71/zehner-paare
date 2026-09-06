# Zehner-Paare – Handbuch für die Weiterentwicklung

Für jemanden, der das Spiel übernimmt. Hier steht, **wie es gebaut ist, warum
es so gebaut ist und was man besser nicht anfasst, ohne vorher zu messen.**

Die [README](README.md) erklärt das Spiel – Regeln, Stile, Sprachen und die
Begründungen hinter der Balance. Dieses Handbuch erklärt den Bau.

Stand: Fassung **1.22.2**. Wo etwas seit kurzem anders ist als früher, steht
das dabei – die Vorgeschichte erklärt oft, warum eine Stelle so aussieht.

---

## Inhalt

1. [In fünf Minuten lauffähig](#in-fünf-minuten-lauffähig)
2. [Grundentscheidungen](#grundentscheidungen)
3. [Landkarte](#landkarte)
4. [Die Spiellogik: `game.js`](#die-spiellogik-gamejs)
5. [Die Oberfläche: `app.js`](#die-oberfläche-appjs)
6. [Der Vertrag zwischen JS und Markup](#der-vertrag-zwischen-js-und-markup)
7. [Die vier Stile](#die-vier-stile)
8. [Drei Sprachen: `i18n.js`](#drei-sprachen-i18njs)
9. [Die Weltrangliste](#die-weltrangliste)
10. [Was im Speicher liegt](#was-im-speicher-liegt)
11. [Erzeugte Dateien](#erzeugte-dateien)
12. [Prüfungen](#prüfungen)
13. [Veröffentlichen](#veröffentlichen)
14. [Regeln, die man nicht brechen sollte](#regeln-die-man-nicht-brechen-sollte)
15. [Fallen, die schon jemand getreten hat](#fallen-die-schon-jemand-getreten-hat)
16. [Rezepte](#rezepte)
17. [Bewusst nicht gemacht](#bewusst-nicht-gemacht)

---

## In fünf Minuten lauffähig

```bash
git clone https://github.com/cauer71/zehner-paare
cd zehner-paare
npm start                      # python3 -m http.server 4173
# http://localhost:4173/ öffnen
```

Das genügt zum Spielen und Entwickeln: **das Spiel selbst hat keinen
Bauschritt.** Was im Repo liegt, ist das, was der Browser lädt – kein Bundler,
kein Transpiler, keine Laufzeit-Abhängigkeit.

```bash
npm test                       # 79 Tests, < 3 s, braucht nichts außer Node
```

Die Weltrangliste antwortet dabei nicht: sie liegt hinter `/api/`, und ein
schlichter Dateiserver hat die nicht. **Das ist Absicht** – siehe
[Die Weltrangliste](#die-weltrangliste). Wer sie mitentwickeln will:

```bash
npm run build && npx wrangler dev     # Spiel und Schnittstelle zusammen,
                                      # mit lokaler D1-Datenbank
```

Für die Bildschirm-Prüfungen einmalig einen Chromium besorgen:

```bash
npm i -D playwright-core
npx playwright install chromium       # oder einen vorhandenen nutzen:
CHROMIUM=/pfad/zu/chrome npm run check:ueberlauf
```

> **Warum nichts davon in `devDependencies` steht:** damit ein Klon ohne
> `npm install` sofort spielbar und testbar ist. Nur wer Bildschirm- oder
> Datenbankprüfungen fahren will, installiert etwas.

---

## Grundentscheidungen

Diese vier prägen alles Weitere. Wer sie kippt, baut ein anderes Projekt.

**Kein Bauschritt für das Spiel.** Der Quelltext *ist* die Auslieferung. Das
kostet Bequemlichkeiten (kein JSX, kein Sass, keine Pakete) und spart die ganze
Werkzeugkette samt ihrer Alterung. `npm run build` gibt es trotzdem – es
kopiert nur die auszuliefernden Dateien nach `dist/`, es übersetzt nichts.

**Keine Laufzeit-Abhängigkeiten.** Alles, was der Browser braucht, liegt im
Repo: Schriften, Symbole, Farben, Töne. Kein CDN, kein Fremd-Skript. Das Spiel
läuft vollständig offline; die einzige Verbindung nach außen ist die
abschaltbare Weltrangliste.

**Die Spiellogik kennt kein DOM.** `game.js` ist eine reine Zustandsmaschine.
Deshalb sind die Regeln in Node testbar und in Sekunden über hunderttausend
Partien simulierbar – die Grundlage jeder Balance-Aussage im Projekt.

**Nichts wird geschätzt, was man messen kann.** Punktebalance, Platzbedarf von
Beschriftungen, Kontrastwerte, das Verhalten der Datenbank unter zwei
gleichzeitigen Spielern: für alles gibt es ein Werkzeug unter `tools/`, das
eine Zahl liefert. Fast jede Zahl im Code hat einen Kommentar, der sagt, woher
sie kommt. Wenn du eine änderst, miss nach.

---

## Landkarte

### Das Spiel (läuft im Browser)

| Datei | Zeilen | Inhalt |
|---|---:|---|
| `game.js` | 643 | Spiellogik, DOM- und sprachfrei. Regeln, Punkte, Auffüllen, Rettung, Endlos, Aufbau-Choreografie, Speicherformat |
| `app.js` | 2592 | Oberfläche: Rendern, Animationen, Ton, Eingaben, Dialoge, Einstellungen, Kürzel |
| `i18n.js` | 736 | drei Wörterbücher à 171 Sätze und der Platzhalter-Ersetzer |
| `online.js` | 299 | Anbindung der Weltrangliste, anonym und abschaltbar |
| `index.html` | – | das gesamte Markup inkl. aller Dialoge und beider Icon-Sprites |
| `sw.js` | 90 | Offline-Speicher; holt eigenen Code am Browserspeicher **vorbei** |
| `classic.css` · `material3.css` + `m3-colors.css` · `arcade.css` · `papier.css` | – | die vier Stile |

### Die Weltrangliste (läuft bei Cloudflare)

| Datei | Zeilen | Inhalt |
|---|---:|---|
| `worker.js` | 229 | zwei Adressen: `GET /api/welt`, `POST /api/partie`; alles andere sind die Dateien |
| `migrations/0001_schema.sql` | 38 | zwei Tabellen: `rekorde` (jede je erreichte Bestmarke) und `zaehler` |
| `migrations/0002_uebernahme.sql` | 89 | die Übernahme der Werte aus dem alten Zählerdienst |
| `wrangler.jsonc` | 53 | Bindung an D1, Ausliefern von `dist/` |

### Tests und Werkzeuge

| Datei | Inhalt |
|---|---|
| `game.test.js` | Regeln, Punkte, Aufbau, Speicherformat |
| `i18n.test.js` | die Wörterbücher gegeneinander |
| `online.test.js` | die **zwei Grenzen**, an denen Fremdes ins Spiel kommt: `pruefePartie` (worker) und `hoechster`/`uebernehmen`/`besteListe` (online.js) |
| `tools/build-dist.mjs` | legt `dist/` an – nach Regel, nicht nach Liste |
| `tools/check-ueberlauf.mjs` | läuft irgendwo Text aus seinem Feld? 3 Sprachen × 4 Breiten × 4 Stile × Spiellagen |
| `tools/check-platz.mjs` | wie viel Text passt in ein Feld – als Zahl |
| `tools/check-welt.mjs` | startet `wrangler dev` mit lokaler D1 und spielt die Fälle durch |
| `tools/gen-*.py` · `gen-*.mjs` · `make-icons.mjs` | Erzeuger für Schriften, Symbole, Farben, Manifeste, Icons |
| `.github/workflows/pages.yml` | Tests + Veröffentlichung auf GitHub Pages |
| `.github/workflows/abnahme-live.yml` | Abnahme der **fertigen** Seite an beiden Adressen, nur lesend |

**Ladereihenfolge im Browser:** `index.html` → Kopfskript (setzt Stil, Farbschema,
Sprache und Manifest-Verweis **vor dem ersten Bild**) → `app.js` als Modul →
`app.js` importiert `game.js`, `i18n.js`, `online.js`.

---

## Die Spiellogik: `game.js`

### Die Regel

Zwei Zahlen dürfen weggestrichen werden, wenn sie

1. **gleich** sind **oder zusammen 10** ergeben, **und**
2. **benachbart** sind.

Benachbart heißt (`forwardNeighbours`): in **Leserichtung** die nächste noch
stehende Zahl (mit `wrap` auch über das Zeilenende hinweg), **senkrecht** die
nächste darunter, und optional **diagonal** über beide Ecken. Bereits
gestrichene Felder zählen nicht – man sieht durch sie hindurch. `wrap` und
`diagonal` liegen im Zustand, nicht im Modul.

`forwardNeighbours` liefert nur Nachbarn mit größerem Index; das halbiert die
Suche und macht jedes Paar eindeutig. `neighboursOf` liefert beide Richtungen
(für die Partner-Markierung), `partnersOf` nur die passenden.

### Die Schnittstelle

```js
// Aufbau
createGame({ difficulty, diagonal, wrap, seed })   -> state
createRng(seed)                                     // mulberry32, reproduzierbar
generateValues({ rows, cols, mode }, rng)           // mode: balanced|random|classic
aufbauSchritte(werte, rng, paarbar?)                // Choreografie, siehe unten

// Abfragen (verändern nichts)
rowCount · remaining · progress · valuesMatch · canMatch · canUndo
forwardNeighbours · neighboursOf · partnersOf
findPair(state)          // erstes spielbares Paar oder null
allPairs(state)
wertFaktor(state)        // wie viel ein Treffer gerade wert ist

// Züge (verändern den Zustand)
applyMatch(state, i, j)  -> { ok, points, bonus, multiplier, removedRows, round, status }
refill(state) · rescue(state)   -> { ok, from, added, status }
undo · breakCombo · hint · nextRound(state, seed) · refreshStatus

// Speicherformat
serialize(state) -> string       // ohne history
deserialize(text) -> state|null  // trägt fehlende Felder nach
```

### Der Zustand

Ein einziges einfaches Objekt, JSON-fähig, ohne Klassen und ohne Verweise nach
außen. Wer eine andere Oberfläche bauen will, braucht nur diese Datei.

| Feld | Bedeutung |
|---|---|
| `version` | Formatversion (`1`); `deserialize` weist alles andere ab |
| `difficulty` `cols` `diagonal` `wrap` `seed` | Aufbau der Partie |
| `cells` | `[{ id, v, cleared }]` – **eine flache Liste**, Zeilen ergeben sich aus `cols` |
| `nextId` | nächste freie Zell-Id; Ids bleiben stabil, das braucht die FLIP-Animation |
| `seen` | wie viele Zahlen insgesamt aufs Feld kamen |
| `ausgeteilt` / `geholt` | dieselbe Zahl, aufgeteilt nach **wer** sie brachte: das Spiel (Startfeld, neue Runden) oder der Spieler (Auffüllen, Rettung). Grundlage von `wertFaktor` |
| `clearedCount` | wie viele weg sind |
| `endless` `newRows` `refillPerRound` `refillMax` `round` | Endlos-Modus |
| `score` `moves` `matches` `combo` `bestCombo` | Punkte und Verlauf |
| `refillsLeft` `refillsUsed` `rescuesLeft` `rescuesUsed` `hintsUsed` `undosUsed` | Guthaben und Statistik |
| `elapsed` | Spielzeit in Sekunden (die Oberfläche zählt hoch) |
| `status` | `'playing'` \| `'won'` \| `'stuck'` |
| `history` | Schnappschüsse fürs Zurücknehmen; wird **nicht** mitgespeichert |

Drei Felder setzt die Oberfläche, nicht die Logik: `gezaehlt`, `siegGezaehlt`
und `weltGezaehlt` merken sich, dass diese Partie schon gezählt wurde – siehe
[`zaehlePartie`](#die-oberfläche-appjs).

### Ältere Spielstände

`deserialize` ist die einzige Stelle, die alte Speicherstände kennt. Sie trägt
fehlende Felder mit `??` nach:

```js
const ausgeteilt = data.ausgeteilt ?? seen;
const geholt = data.geholt ?? 0;        // im Zweifel "nichts geholt"
```

**Wer ein Feld hinzufügt, trägt es hier nach** – sonst bricht eine laufende
Partie beim nächsten Update. Der Zweifelsfall wird immer zugunsten des Spielers
entschieden.

### Punkte

```js
POINTS = { pair: 10, maxCombo: 10, row: 25, multiRow: 50,
           win: 100, refillLeft: 150, round: 200, invitedWeight: 1.5 }
```

Ein Zug bringt `pair × min(combo, maxCombo)`, dazu `row` je geräumter Zeile und
`multiRow` je *zusätzlicher* Zeile im selben Zug. Beim Sieg kommen `win` und
`refillLeft` je gespartem Auffüllen dazu, im Endlos-Modus `round` je Runde.

Und dann die Stelle, an der die meisten Fehler passieren werden:

```js
export function wertFaktor(state) {
  if (!state.geholt) return 1;
  return state.ausgeteilt / (state.ausgeteilt + POINTS.invitedWeight * state.geholt);
}
```

**Warum das existiert:** Auffüllen hängt die übrigen Zahlen noch einmal an,
*verdoppelt* also das Feld. Fünfmal Auffüllen vor dem ersten Zug macht aus 54
Zahlen 1728 – in der Oberfläche nachgetippt, nicht gerechnet – und aus 3100
Punkten rund 53 000, in „Leicht" sogar 91 000. Ohne diesen Faktor wäre der
Weltrekord keine Frage des Könnens, sondern von fünf Tipps auf denselben Knopf.
**Und ein Weltrekord lässt sich nicht zurücknehmen.**

**Warum das Gewicht 1,5 ist und nicht 1:** der Kombo-Anlauf (×1, ×2 … ×10)
fällt einmal je Partie an und verteilt sich auf einem aufgeblähten Feld auf
hunderte Treffer statt auf vierzig. Gemessen über 300 Partien × 5 Stufen × 4
Spielweisen lag Schummeln bei Gewicht 1,0 noch 6–11 % vorn, bei 1,25 gleichauf,
bei 1,5 klar hinten (77–84 % von sauberem Spiel). Sauberes Spiel kostet der
Faktor 1–2 %, im Endlos-Modus 5 %.

**Neue Runden im Endlos-Modus zählen nicht als „geholt".** Sie sind der Lohn
fürs leergeräumte Feld, nicht eine Einladung des Spielers.

Der Regressionstest steht in `game.test.js`: *„fünfmal Auffüllen zu Beginn
bringt weniger als sauberes Spiel"*, über vier Stufen und je zwölf Saaten.

### Die Aufbau-Choreografie

`aufbauSchritte(werte, rng, paarbar)` gibt je Feldposition eine Gruppennummer
zurück. Die Oberfläche baut das Feld danach auf: **paarweise**, in zufälliger
Reihenfolge, über das ganze Feld verteilt.

Der Sinn: rückwärts gelesen ist der Aufbau eine Lösung. Wer zusieht, sieht
Paare entstehen und kann das Feld hinterher in derselben Ordnung abtragen – die
Nachbarschaft muss er sich selbst dazu suchen. `paarbar` schließt Stellen von
der Paarung aus, ohne sie aus dem Aufbau zu nehmen: bei einem fortgesetzten
Spielstand sind das die bereits gestrichenen Zahlen.

### Schwierigkeitsgrade

```js
DIFFICULTIES = {
  leicht:    { rows: 6,  cols: 9, mode: 'balanced', refills: 5 },
  mittel:    { rows: 8,  cols: 9, mode: 'balanced', refills: 4 },
  schwer:    { rows: 10, cols: 9, mode: 'random',   refills: 3 },
  klassisch: { rows: 3,  cols: 9, mode: 'classic',  refills: 5 },
  endlos:    { rows: 6,  cols: 9, mode: 'balanced', refills: 3,
               endless: true, newRows: 3, refillPerRound: 1 },
}
```

Kein Anzeigename: **das Modul ist sprachfrei.** Wie eine Stufe heißt, steht in
`i18n.js` unter `diff.<schlüssel>`.

`mode: 'classic'` erzeugt immer dieselbe Folge (die Ziffern von 1 bis 19 ohne
die 10) – das ist das Original und kein Fehler. Es wurde zweimal als Bug
gemeldet; der Hinweistext sagt es inzwischen dazu (`diff.noteClassic`).

> **Achtung, dateiübergreifend:** die Liste der Stufen steht ein zweites Mal in
> `worker.js` (`STUFEN`). Was dort nicht steht, kommt nicht in die Datenbank.

---

## Die Oberfläche: `app.js`

Eine Datei, rund 2600 Zeilen, in beschriftete Abschnitte geteilt. Die
Reihenfolge im Text ist auch die Reihenfolge der Ausführung:

| Zeile | Abschnitt | Inhalt |
|---:|---|---|
| 14 | Speicher | `store`, Schlüssel, `DEFAULT_SETTINGS`, Aufräumen alter Einträge |
| 109 | DOM | alle Element-Verweise an einer Stelle |
| 140 | Spielstand | `state`, Auswahl, Sperre, Merker |
| 165 | Kürzel | drei Zeichen für die Bestenliste, Filterung beim Schreiben **und** Lesen |
| 202 | Helfer | Zahl- und Zeitformate |
| 229 | Ton | WebAudio, zwei Stimmen (`soft`, `chip`), kleine Melodien |
| 579 | Sprache | `applyTexts`, `applyLanguage`, Erkennung |
| 629 | Darstellung | Stile, Symbole, HUD |
| 728 | Aufbau des Feldes | `renderBoard`, FLIP, die Aufbau-Choreografie |
| 1153 | Effekte | Ringe, Funken, Flieger, `abraeumen` |
| 1213 | Kombo-Level-Up | die Coin-Op-Inszenierung |
| 1393 | Spielablauf | Auswahl, Zug, Kombo |
| 1522 | Aktionen | Tipp, Auffüllen, Rettung, Zurück, Neues Spiel |
| 1716 | Ende | `zaehlePartie`, `endGame`, Enddialog, Rekordfeier |
| 1825 | Timer | |
| 1853 | Speichern | `save` (verzögert) und `saveNow` (sofort) |
| 1884 | Dialoge | Blätter auf und zu |
| 1909 | Einstellungen | Rendern, Gruppen, Bestenliste, alle Schalter |
| 2318 | Bedienung | Zeiger, Tastatur |
| 2464 | Installation | `beforeinstallprompt` |
| 2523 | Start | Spielstand laden, Servicearbeiter, `window.__zp` |

### Das Brett

`renderBoard` arbeitet **inkrementell**, nicht durch Neuaufbau:

1. Lagen aller vorhandenen Zellen merken (`getBoundingClientRect`).
2. Zellen entfernen, die es nicht mehr gibt.
3. Fehlende anlegen, vorhandene aktualisieren (`data-i`, `data-v`, Klassen,
   Vorlesetext).
4. Neue Lagen messen und die Differenz als Anfangsverschiebung animieren –
   **FLIP**. Deshalb müssen die Zell-Ids stabil bleiben; darum `nextId`.

Bei `prefers-reduced-motion` entfallen Schritt 1 und 4 komplett.

Eine Zelle ist ein `<button class="cell">` mit `tabIndex = -1`; die Tastatur
läuft über einen Roving-Fokus, nicht über die Tabulatorkette (54 bis 1728
Tabstopps wären unbenutzbar).

### Effekte und ihr Aufräumen

`ripple`, `burst`, `spark`, `floater` und das Konfetti sind kurzlebige Elemente
im `#fx`-Behälter. Sie räumen sich über `abraeumen(el, spaetestens)` selbst weg:

```js
function abraeumen(el, spaetestens) {
  const weg = () => el.remove();
  el.addEventListener('animationend', weg, { once: true });
  setTimeout(weg, spaetestens);          // Sicherung
}
```

**Die Sicherung ist nicht überflüssig:** `animationend` feuert nie, wenn ein
Stil das Element auf `display: none` setzt oder die Animation abschaltet. Ohne
Zeitgeber sammelten sich die Elemente.

### Das Spielende

```js
zaehlePartie(won, zaehlt)   // zählt – einmal je Partie
endGame(won)                // wertet aus, feiert, zeigt den Enddialog
```

Die Trennung ist wichtig und hat zwei Gründe:

* **`endGame` läuft mehrfach für dieselbe Partie.** Sackgasse → Enddialog →
  Rettung → weiterspielen → wieder Ende. Auch „Zurück" aus dem Enddialog setzt
  `endHandled` zurück. Die Merker `state.gezaehlt` / `siegGezaehlt` /
  `weltGezaehlt` sorgen dafür, dass trotzdem einmal gezählt wird; sie liegen an
  der **Partie** und werden mitgespeichert, ein Neuladen zählt also nicht
  doppelt.
* **Es gibt ein Ende ohne Enddialog.** Wer die Diagonale ausschaltet und damit
  in die Sackgasse gerät, hat die Partie gespielt – aber der Dialog geht dort
  bewusst nicht auf, weil sich die Regel zurückstellen lässt. `applyRuleChange`
  ruft deshalb `zaehlePartie` direkt.

Nach dem Setzen der Merker wird **sofort** gesichert (`saveNow`), nicht über die
220-ms-Verzögerung von `save`: sonst läge die Zählung schon draußen und der
Merker noch nicht, und ein Neuladen im Fenster dazwischen zählte doppelt.

### Der Testhaken

`window.__zp` gibt `state`, `comboLevel`, die Aktionen (`onCellActivate`,
`doHint`, `doRefill`, `doUndo`, `doRescue`, `newGame`), `toast`, `renderBoard`,
`sfx`, `findPair`, `canMatch`, `remaining` und `VERSION` heraus. Darüber steuern
alle Browser-Prüfungen das Spiel.

**Wichtig:** zwischen zwei Zügen muss man warten – das Spiel sperrt sich
während der Animationen (`locked`), synchron hintereinander gerufene Züge
werden verschluckt.

---

## Der Vertrag zwischen JS und Markup

`app.js` sucht Elemente über feste Ids. Wer im Markup umbenennt, muss hier
nachziehen. Vollständige Liste:

```
board board-wrap ticker fx live toast combo combo-pop progress-fill record-wave
stat-score stat-left stat-time stat-diff stat-world card-score label-time
btn-new btn-undo btn-hint btn-refill refill-count btn-settings btn-rules
dlg-rules dlg-settings dlg-end
end-title end-text end-stats end-badge end-record end-score
end-initials end-initials-field
btn-end-new btn-end-undo btn-end-rescue btn-rules-2
seg-difficulty seg-skin seg-theme seg-lang skin-note lang-note theme-field
difficulty-note version install-field install-note btn-install
opt-diagonal opt-wrap opt-partners opt-sound opt-vibrate opt-world set-initials
grp-best top-title top-list top-none world-list world-count
```

`end-score` steht **nicht** im Markup: der Enddialog baut seine Kacheln in
`#end-stats` selbst zusammen und vergibt die Id dabei – sie wird für das
Hochzählen der Punktzahl gebraucht. Wer `#end-stats` umbaut, nimmt sie mit.

Klassen, die `app.js` setzt oder liest – jeder Stil muss sie kennen:

```
empty · sel · hint · hinted · partner · clearing · enter · rowout · pop · run
show · shake · bump · urge · beaten · is-beaten · is-record · record-pop
rekord · sad · closing · scrollable · fab--rescue · button--filled
max-flash-on · crt-on
```

Elemente, die `app.js` selbst erzeugt (nur im JS, nicht im Markup):

```
cell · ripple · burst · spark · floater · confetti
```

(`cell` setzt `createCellEl` über `className`, alle übrigen laufen über
`classList` – wer nach ihnen greppt, findet `cell` deshalb woanders.)

Datenattribute: `data-value` (Chips und Segmente), `data-close` (schließt den
Dialog), `data-i18n`, `data-i18n-html`, `data-i18n-aria`, `data-i18n-title`.
An den Zellen: `data-i` (Index) und `data-v` (Wert – der Papier-Stil zeigt damit
die durchgestrichene Zahl über `content: attr(data-v)`).

---

## Die vier Stile

Jeder Stil ist **ein vollständiges Stylesheet**, kein Aufsatz auf einem
gemeinsamen Grundgerüst. Absicht: Arcade und Papier haben so wenig gemeinsam,
dass jede geteilte Basis nur ein Feld für Überschreibungen gewesen wäre.

> Es gab einmal einen fünften, **Hochkontrast**. Er ist mit Fassung 1.19
> weggefallen – vier gepflegte Stile sind besser als fünf halbe. Wer ihn
> zurückholen will, findet ihn im Verlauf (`git log -- kontrast.css`).

**Umgeschaltet wird über `link.disabled`,** nicht durch Nachladen: alle
Stylesheets werden geladen, alle bis auf eines sind abgeschaltet. Umschalten
kostet dadurch kein Nachladen und flackert nicht. Das Kopfskript in
`index.html` setzt schon **vor dem ersten Bild** Stil, Farbschema, Sprache und
den Verweis auf das passende Manifest – sonst blitzt der falsche Stil auf.

`document.documentElement.dataset.skin` trägt den Namen zusätzlich für
Selektoren. In `app.js` steht je Stil nur noch, was **nicht** CSS ist:

```js
const SKINS = {
  classic:  { icons: 'i',  voice: 'soft' },
  m3:       { icons: 'i',  voice: 'soft' },
  arcade:   { icons: 'px', voice: 'chip' },
  papier:   { icons: 'i',  voice: 'soft' },
};
```

`icons` wählt zwischen den beiden Sprites in `index.html` (weiche
Material-Symbole `#i-…`, Pixelsymbole `#px-…`), `voice` zwischen den beiden
Tonstimmen. Der Anzeigename kommt aus `i18n.js`.

### Was ein neuer Stil leisten muss

* alle Klassen aus dem [Vertrag](#der-vertrag-zwischen-js-und-markup),
* die Gruppenblöcke `.group`, `.group__head`, `.group__title`, `.group__now`,
  `.group__arrow`, `.group__body`,
* **die feste Blatthöhe** – ohne sie wandert der angetippte Gruppentitel beim
  Aufklappen aus dem Bild (gemessen bis −348 px):

  ```css
  #dlg-settings { height: min(92dvh, 900px); }
  #dlg-settings .sheet__body { flex: 1 1 auto; min-height: 0; }
  ```

* ein Verhalten bei `prefers-reduced-motion`,
* Farbschema hell **und** dunkel (Ausnahme Arcade: immer dunkel; das Kopfskript
  setzt `data-theme` dort gar nicht erst).

Danach `npm run check:ueberlauf` über alle drei Sprachen. Ein neuer Stil mit
anderen Schriftgrößen kippt Beschriftungen, die vorher passten.

### Besonderheiten

**Arcade** setzt *ausschließlich* die Pixelschrift `zp-pixel`. Deren Em ist 8
Pixelzeilen hoch, also müssen **alle Schriftgrößen Vielfache von 8 px** sein.
Fehlt ein Zeichen, erscheint still ein leerer Rahmen – dagegen prüft der
Erzeuger. Aus demselben Grund darf ein Kürzel nur A–Z und 0–9 enthalten. Die
beiden Lauftexte zieht der Stil aus CSS-Eigenschaften (`--attract-1`,
`--attract-2`), die `app.js` aus dem Wörterbuch füllt; deutscher Text im
Stylesheet würde einen Sprachwechsel nicht mitmachen.

**Papier** zeichnet das Karo aus `box-shadow` je Zelle und die Bleistiftziffern
mit `zp-hand`. Die Schrift enthält nur Ziffern und Rechenzeichen – deshalb wird
sie *nur* dort gesetzt, wo ausschließlich Zahlen stehen; alles andere fällt auf
Nunito zurück.

---

## Drei Sprachen: `i18n.js`

Ein eigenes Modul, kein Fremdpaket. 171 Sätze je Sprache:

```
doc 2 · a11y 14 · cell 2 · hud 6 · bar 5 · combo 10 · msg 19 · fx 2 · live 8
diff 8 · skin 6 · arcade 2 · theme 3 · rules 18 · set 44 · end 22
```

```js
t('msg.refilled', { n: 12, left: 3 })     // Platzhalter in {geschweiften}
setzeSprache('it') · sprache() · spracheVomGeraet() · SPRACHEN · STANDARD
```

**Statischer Text hängt im Markup**, über vier Attribute:

| Attribut | wirkt auf |
|---|---|
| `data-i18n` | `textContent` |
| `data-i18n-html` | `innerHTML` – nur für Sätze mit `<b>` aus dem eigenen Wörterbuch |
| `data-i18n-aria` | `aria-label` |
| `data-i18n-title` | `title` |

`applyTexts()` läuft vier Schleifen darüber und setzt zusätzlich `lang`,
`document.title`, die Meta-Beschreibung, den Manifest-Verweis und die
Arcade-Lauftexte. Alles Dynamische geht durch `t()`.

**Spracherkennung:** die erste Sprache aus `navigator.languages`, die das Spiel
kennt (`de-AT` zählt als Deutsch – es wird nur der Teil vor dem Bindestrich
betrachtet). Die Einstellung `auto` bleibt am Gerät und merkt auch einen
Wechsel dort ohne Neuladen (`languagechange`).

### Regeln für neue Sätze

`i18n.test.js` erzwingt sie – die Tests sind die Dokumentation:

* **Schlüsselgleichheit:** jede Sprache hat exakt dieselben Schlüssel, keiner leer.
* **Platzhaltergleichheit:** `{n}` in einer Sprache heißt `{n}` in allen.
* **Nur `<b>`** als Auszeichnung, paarig, in gleicher Anzahl wie im Deutschen.
* **Angehängte Teile behalten ihren Anfang** (`" · "` bzw. ein führendes
  Leerzeichen) – sie werden hinten an andere Sätze geklebt.
* **Das Malkreuz bleibt ×** (U+00D7), nicht der Buchstabe x.
* **Marken werden nicht übersetzt:** `doc.title`, `skin.m3`.
* **Zeichengrenzen** für kurze Felder – die grobe Vorprüfung; die feine macht
  `check-ueberlauf.mjs` am echten Bild.

Nach jeder Textänderung:

```bash
npm test                                        # Wörterbücher gegeneinander
node tools/gen-manifests.mjs                    # falls doc.* betroffen
python3 tools/gen-pixelfont.py                  # prüft die Zeichenabdeckung
npm run check:ueberlauf                         # am echten Bild
```

---

## Die Weltrangliste

Der einzige Weg nach außen. Abschaltbar, anonym, und das Spiel funktioniert
ohne sie unverändert.

### Zwei Adressen, mehr nicht

```
GET  /api/welt      Weltrekord je Stufe samt Kürzel, Bestenliste je Stufe, Zähler
POST /api/partie    eine beendete Partie – zählt mit, trägt einen Rekord ein,
                    und antwortet mit demselben Stand wie /api/welt
```

Dass `POST /api/partie` den neuen Stand gleich zurückgibt, spart nach jeder
Partie den zweiten Ruf. Und `/api/welt` liefert **alles** auf einmal, auch die
Bestenlisten, die nur sieht wer die Einstellungen aufschlägt: knapp zwei
Kilobyte, dafür steht die Liste sofort da – auch beim Umschalten der Stufe und
auch ohne Netz, weil das Spiel den ganzen Stand auf dem Merkzettel behält.

### Warum eine Datenbank

Vorher lag die Rangliste in einem öffentlichen Zählerdienst, der nur „plus
eins" kann. Was das kostete: der Punktestand als Startwert eines eigens
angelegten Zählernamens, ein zweiter Zähler als Zeiger darauf, das Kürzel als
Zahl zur Basis 37 daneben, eine Rückwärtssuche über vier Nummern gegen
verfallende Schlüssel, eine eigene Bremse gegen die Drosselung – und trotzdem
blieb ein Loch: „lies den Höchststand, vergleiche, schreib nur wenn größer" ging
dort nur als selbstgebautes Compare-and-Set über 409er.

Hier ist es **ein SQL-Satz**:

```sql
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
SELECT ?1, ?2, ?3, ?4, 'spiel'
 WHERE ?2 > COALESCE((SELECT MAX(punkte) FROM rekorde WHERE stufe = ?1), 0)
```

Lesen, Vergleichen und Schreiben in derselben Anweisung. Zwei Spieler, die im
selben Augenblick fertig werden, können sich nicht mehr überschreiben. **Das
ist der ganze Grund für den Umzug** – und die Frage, die `check-welt.mjs` zuerst
prüft.

### Das Schema

`rekorde` hält **jeden** je erreichten Rekord, nicht nur den höchsten. Damit ist
der Weltrekord ein `MAX()` und die Bestenliste ein `ORDER BY`, ohne dass etwas
nachgeführt werden muss. `zaehler` ist eine Zeile je Zähler (`spiele`, `siege`)
– ein dritter kommt ohne Schemaänderung dazu.

Zwei Eigenheiten, die man kennen muss:

* **Die Bestenliste zeigt nur Einträge mit Kürzel.** Sie ist eine Liste von
  Namen; eine Zeile ohne Namen sagt darin nichts. Dadurch kann der Weltrekord
  einer Stufe **nicht** in ihrer eigenen Bestenliste stehen (Mittel steht auf
  einem Wert aus der Zeit vor den Kürzeln). Gewollt: die Zeile darüber nennt
  weiterhin den wahren Rekord.
* **`herkunft`** unterscheidet `'spiel'` von `'abacus'` – so bleibt
  nachvollziehbar, was aus dem alten Dienst übernommen wurde
  (`migrations/0002_uebernahme.sql`).

### Die einzige Grenze nach innen

`pruefePartie()` in `worker.js` ist die **einzige** Stelle, an der Fremdes in
die Datenbank übergeht. Sie ist deshalb eigens exportiert und in Node geprüft
(`online.test.js`). Sie besteht auf Typen statt umzurechnen:

```js
// String(['mittel']) waere 'mittel' - ein Array haette als Stufe durchgesehen.
const stufe = typeof koerper?.stufe === 'string' ? koerper.stufe : '';
// Number('') ist 0 und Number(null) auch - beides waere ein gueltiger Stand.
const punkte = typeof koerper?.punkte === 'number' ? koerper.punkte : NaN;
```

`PUNKTE_MAX` (eine Million) ist **kein Schutz gegen Betrug** – ohne Anmeldung
kann jeder eintragen, was er will, und das steht so in der Oberfläche. Es ist
eine Schranke gegen Unsinn.

### Der Client: `online.js`

```js
welt.schalten(an)        // Schalter; aus = keine einzige Anfrage
welt.zwischenstand()     // letzter bekannter Stand – sofort, auch offline
welt.veraltet()          // älter als 5 Minuten?
welt.lesen() · welt.partieBeendet({...})
hoechster · uebernehmen · besteListe    // exportiert, weil geprüft
```

**Gerufen wird relativ** – dort, wo die Seite liegt, liegt auch die
Schnittstelle. Die eine Ausnahme ist GitHub Pages: dort liegen nur die Dateien,
und von dort geht der Ruf an die feste Adresse `https://10.auer.page`.

Herum und nicht andersherum, aus einem konkreten Grund: mit „immer die feste
Adresse, außer zu Hause" hätte **jeder lokale Server in die echte Datenbank
geschrieben**, sobald man eine Partie zu Ende spielt. Ein Probelauf darf keine
Weltrekorde erzeugen. So läuft der Ruf beim Entwickeln ins Leere, wenn keine
Schnittstelle daneben liegt – der harmlose Fall.

Geholt wird **erst, wenn jemand die Gruppe „Bestwerte" aufschlägt** – nicht beim
Programmstart. Die Bedingung auf das offene Blatt in `initGruppen` ist dabei
nicht überflüssig: `el.open = …` löst selbst ein `toggle` aus.

---

## Was im Speicher liegt

Alles unter `zp.` in `localStorage`. `store.get/set` verschlucken jede Ausnahme
(privater Modus, voller Speicher) – das Spiel läuft dann ohne Gedächtnis weiter.

| Schlüssel | Inhalt |
|---|---|
| `zp.settings.v1` | alle Einstellungen inkl. Kürzel (`DEFAULT_SETTINGS` gibt die Form vor) |
| `zp.save.v1` | laufende Partie, `serialize(state)` |
| `zp.welt.v1` | letzter bekannter Weltstand (Rekorde, Bestenlisten, Zähler, Lesezeitpunkt) |
| `zp.groups.v1` | welche Einstellungsgruppen offen sind, als JSON-Liste |
| `zp.seen.v1` | Regeldialog schon gesehen? |
| `zp.migrated.partners.v1` | einmalige Migration (Partner-Markierung aus) |

Zwei Schlüssel gibt es **nicht mehr** und `app.js` räumt sie beim Start weg:
`zp.best.v2` (Bestwerte je Gerät, bis 1.17) und `zp.count.v1` (Strichliste der
hier gespielten Partien, bis 1.18). Gespielt wird gegen die Welt; eine zweite,
private Rangliste daneben war eine zuviel.

Beim Ändern eines Formats: **Zahl im Schlüssel hochsetzen** oder beim Lesen
nachtragen. Nie ein bestehendes Format umdeuten.

---

## Erzeugte Dateien

Diese Dateien werden **nicht von Hand gepflegt**. Wer sie ändert, ändert sie im
Erzeuger und lässt ihn neu laufen.

| Datei | Erzeuger | Neu laufen lassen, wenn … |
|---|---|---|
| `dist/` | `npm run build` | vor jedem Ausliefern (macht Cloudflare selbst) |
| `manifest.{de,it,en}.webmanifest` | `npm run gen:manifests` | sich `doc.*` oder die Kurzbefehle ändern |
| `m3-colors.css` | `tools/gen-m3-colors.mjs` | der Quellton geändert wird |
| `fonts/zp-pixel.woff2` | `python3 tools/gen-pixelfont.py` | **nach jeder Textänderung** |
| `fonts/zp-hand.woff2` | `python3 tools/gen-handfont.py` | Ziffernform oder Strichstärke |
| Pixel-Sprite in `index.html` | `python3 tools/gen-pixelicons.py` | ein Symbol dazukommt |
| `icons/*` | `node tools/make-icons.mjs` + `optimize-pngs.py` | das Icon sich ändert |

**Die Pixelschrift ist ein Sonderfall.** Der Erzeuger prüft, ob die Schrift
jedes Zeichen abdeckt, das im Spiel vorkommt – aus den **Wörterbüchern** *und*
aus dem **fest im Markup stehenden Text** – und bricht sonst mit Rückgabewert 1
ab. Ohne diese Prüfung erscheinen fehlende Zeichen im Arcade-Stil still als
leerer Rahmen; genau so waren einmal 15 italienische Stellen kaputt.

Läuft der Erzeuger durch, ohne dass sich die Abdeckung geändert hat, ist die
neue Datei trotzdem ein paar Bytes anders (Bau-Rauschen) – dann mit
`git checkout` zurücknehmen.

`tools/build-dist.mjs` kopiert **nach einer Regel und nicht nach einer Liste**:
alle Dateien der obersten Ebene mit den bekannten Endungen, außer Tests und
`worker.js`, dazu `icons/` und `fonts/` vollständig. Eine Liste müsste man
pflegen; eine neue CSS-Datei wäre sonst irgendwann vergessen.

---

## Prüfungen

| Werkzeug | Aufruf | Was es beweist | Dauer |
|---|---|---|---|
| Tests | `npm test` | 79 Tests: Regeln, Punkte, Aufbau, Speicherformat, Wörterbücher, **die Grenze zur Datenbank** | < 3 s |
| Überlauf | `npm run check:ueberlauf` | kein Text verlässt sein Feld – 3 Sprachen × 4 Breiten × 4 Stile × Spiellagen | ~6 min |
| Platz | `npm run check:platz` | wie viel Text in ein Feld passt – als Zahl. Schreibt `tools/budget.json` | ~1 min |
| Weltrangliste | `npm run check:welt` | startet `wrangler dev` mit **lokaler** D1 und spielt die Fälle durch, allen voran zwei gleichzeitige Rekorde | ~5 min |
| Fertige Seite | Workflow `abnahme-live.yml` | die veröffentlichte Seite an **beiden** Adressen gegen die echte Datenbank, nur lesend | ~2 min |

`check-welt.mjs` rührt die echte Datenbank **nicht** an – es startet eine
lokale und räumt sie hinterher weg. Die Live-Abnahme schreibt ebenfalls nichts:
ein Zählruf würde die Weltzahlen mit einer Partie füllen, die niemand gespielt
hat, und womöglich einen Weltrekord auf einen Botwert setzen.

### Die wichtigste Regel über Prüfungen

> **Eine Prüfung, die aus dem falschen Grund besteht, ist schlimmer als keine.**

Das ist im Projekt mehrfach passiert und jedes Mal repariert worden: eine
Strafpause aus einem vorherigen Abschnitt ließ zwei folgende bestehen, ohne dass
irgendetwas geprüft wurde. Ein Hilfsmittel meldete „gewonnen", weil noch die
*vorige* Partie im Zustand stand. Und die Live-Abnahme hat sich einmal selbst um
den Verstand geprüft, weil eine Adresse einen Schlussstrich zu viel hatte.

Wenn du eine Prüfung schreibst, stelle sicher, dass sie **fehlschlägt, wenn du
den Fehler absichtlich einbaust.**

---

## Veröffentlichen

Das Spiel liegt an **zwei Orten**:

| Ort | Was dort liegt | Wie es hinkommt |
|---|---|---|
| **10.auer.page** (Cloudflare Workers) | Spiel **und** Schnittstelle **und** Datenbank | `npm run build`, dann `npx wrangler deploy` – bei Cloudflare als „Build command" und „Deploy command" hinterlegt |
| **cauer71.github.io/zehner-paare/** | nur die Dateien | Push auf `main`, `pages.yml` fährt vorher `npm test` |

Von GitHub Pages aus ruft das Spiel die Schnittstelle über Kreuz bei
`10.auer.page` – das hängt an einem CORS-Kopf im Worker und fällt sonst still
aus. Die Live-Abnahme prüft deshalb **beide** Adressen.

Datenbankänderungen laufen über `migrations/` (`npx wrangler d1 migrations
apply zehner-paare`). Die Migrationen müssen ein zweites Einspielen aushalten –
`0002_uebernahme.sql` tut das ausdrücklich.

**Die Version steht an drei Stellen** und muss übereinstimmen:

```
app.js         export const VERSION = '1.22.2';      // Anzeige in den Einstellungen
sw.js          const CACHE = 'zehner-paare-1.22.2';  // erzwingt neuen Speicher
package.json   "version": "1.22.2"
```

Der Name des Speichers ist der wichtigste: er löst beim Aktivieren das
Aufräumen der alten Fassung aus.

---

## Regeln, die man nicht brechen sollte

Jede hat einen gemessenen Grund. Wer sie ändern will, misst neu.

1. **`game.js` bleibt DOM-frei und sprachfrei.** Sonst fallen Simulation und
   Tests weg – und damit jede Balance-Aussage.
2. **Zell-Ids bleiben stabil.** Ohne sie springen die Kacheln statt zu gleiten.
3. **`deserialize` trägt jedes neue Feld nach.**
4. **Der Wertfaktor bleibt.** Ohne ihn ist der Weltrekord eine Frage von fünf
   Tipps auf „Auffüllen" – und ein Weltrekord lässt sich nicht zurücknehmen.
5. **Effektelemente brauchen die Zeitgeber-Sicherung.**
6. **Die Weltrangliste darf das Spiel nie aufhalten** – kein `await` im
   Spielfluss, jede Anfrage mit Zeitgrenze, jeder Fehler verschluckt.
7. **Der Schalter „Weltweit mitzählen" muss wirklich alles abstellen.**
8. **`pruefePartie` bleibt die einzige Tür in die Datenbank** – und besteht auf
   Typen statt umzurechnen.
9. **Ein lokaler Server schreibt nie in die echte Datenbank.** Deshalb der
   relative Ruf; siehe [online.js](#der-client-onlinejs).
10. **Die Einstellungsblätter behalten ihre feste Höhe**, und die Gruppen
    schließen sich nicht von selbst.
11. **Kein deutscher Text in Stylesheets oder JS-Konstanten.**
12. **Nach jeder Textänderung: Pixelschrift-Erzeuger und Überlaufprüfung.**

---

## Fallen, die schon jemand getreten hat

**`getComputedStyle(el).font` liefert bei diesen Schriftstapeln `""`.** Ein
Messstand, der das in ein Canvas schreibt, misst dann Times. Die Einzelfelder
kopieren (`fontFamily`, `fontSize`, `fontWeight`, …).

**Bei `1fr`-Rasterspalten und `flex: 1` meldet der Knopf nie einen Überlauf** –
es wächst die Spur, dann die Leiste, dann die Seite. Deshalb misst
`check-ueberlauf.mjs` zuerst, ob die **Seite** waagrecht scrollt.

**`page.tap()` scrollt das Ziel vorher ins Bild.** Wer Bewegung misst, misst
dann den eigenen Prüfstand.

**Zeilen zählt man mit `Range.getClientRects().length`,** nicht über
`line-height`.

**`el.open = …` löst ein `toggle`-Ereignis aus.**

**Messungen mitten in einer Einblende-Animation lügen.** Erst abwarten.

**`fetch()` geht durch den Zwischenspeicher des Browsers.** GitHub Pages
schickt zehn Minuten Haltbarkeit mit; der Servicearbeiter legte die *alte*
`app.js` als frisch ab, und ein Speicher mit neuem Namen konnte mit **altem**
Inhalt entstehen. Darum holt `sw.js` eigenen Programmcode mit `cache: 'reload'`.

**`wrangler` legt sein `.wrangler/` in den Projektordner.** Liegt der zugleich
unter Beobachtung, lädt der lokale Server endlos neu. Darum wird `dist/`
ausgeliefert und nicht das Projekt.

**Ein Schlussstrich zu viel in einer Adresse** macht aus `$SEITE/api/welt` ein
`…//api/welt` – und die Abnahme prüft sich selbst um den Verstand.

---

## Rezepte

### Einen Schwierigkeitsgrad hinzufügen

1. `DIFFICULTIES` in `game.js` erweitern.
2. **`STUFEN` in `worker.js`** – was dort fehlt, kommt nicht in die Datenbank.
3. `diff.<schlüssel>` in allen drei Wörterbüchern (Zeichengrenze 14).
4. Chip im Markup unter `#seg-difficulty` mit `data-value="<schlüssel>"`.
5. `npm test`; Weltrekorde und Bestenlisten richten sich automatisch nach
   `Object.keys(DIFFICULTIES)`.
6. Balance simulieren, bevor du sie behauptest.

### Einen Stil hinzufügen

1. `<link id="css-…" rel="stylesheet" href="…" disabled>` in `index.html`.
2. Im Kopfskript und in `applyAppearance` in die `toggle`-Liste aufnehmen.
3. Eintrag in `SKINS` (Symbolsatz, Tonstimme).
4. `skin.<name>` in allen drei Wörterbüchern (Zeichengrenze 12) und ein Chip
   unter `#seg-skin`.
5. Den [Klassenvertrag](#der-vertrag-zwischen-js-und-markup) vollständig
   bedienen, inklusive Gruppenblock und fester Blatthöhe.
6. `npm run check:ueberlauf`.

### Eine Sprache hinzufügen

1. `SPRACHEN` in `i18n.js` erweitern, Wörterbuch vollständig anlegen.
2. Chip unter `#seg-lang` – mit eigenem `lang`-Attribut und **unübersetzt**.
3. Sprachliste im Kopfskript von `index.html` ergänzen.
4. `npm run gen:manifests` und `python3 tools/gen-pixelfont.py`.
5. `node tools/check-ueberlauf.mjs de it en xx`.

### Eine Einstellung hinzufügen

1. Feld in `DEFAULT_SETTINGS`.
2. Markup in die passende Gruppe (`switch-row` + `switch`).
3. `renderSettings` setzt den Zustand, ein `change`-Horcher schreibt ihn zurück
   und ruft `saveSettings()`.
4. Soll sie in der Kopfzeile stehen: `renderGroupSummaries` ergänzen.
5. Beeinflusst sie das Spiel: `applyRuleChange` benutzen – es rechnet den Status
   neu und behandelt den Übergang in die Sackgasse.

### Etwas an der Datenbank ändern

1. Neue Datei `migrations/000N_….sql`, **ein zweites Einspielen muss sie
   aushalten** (`IF NOT EXISTS`, `INSERT … WHERE NOT EXISTS`).
2. `npx wrangler d1 migrations apply zehner-paare --local` und
   `npm run check:welt`.
3. Erst dann ohne `--local`.

---

## Bewusst nicht gemacht

Damit niemand es „repariert", ohne den Grund zu kennen:

* **Keine Anmeldung.** Damit kann jeder eintragen, was er will – der Preis
  dafür, dass niemand ein Konto braucht. Steht so in der Oberfläche.
* **Keine private Bestenliste neben der Weltrangliste.** Es gab sie bis 1.18;
  zwei Ranglisten nebeneinander waren eine zuviel.
* **Kein Enddialog beim Spielende durch Regelwechsel.** Die Regel lässt sich
  zurückstellen; ein Dialog nach einem Schalterklick wäre eine Überraschung.
  Gezählt wird die Partie trotzdem.
* **Die Bestenliste zeigt keine Einträge ohne Kürzel** – auch dann nicht, wenn
  dadurch der Weltrekord selbst fehlt.
* **Kein Mischen beim Auffüllen.** Es höbe die Siegquote um 6–9 Punkte und
  nähme dem Spiel das Vorausplanen.
* **Der klassische Modus hat immer dasselbe Startfeld.** Das ist das Original.
