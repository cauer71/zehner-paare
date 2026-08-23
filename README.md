# Zehner-Paare

**Spielen: https://cauer71.github.io/zehner-paare/** – die Seite lässt sich auf Android und iOS
zum Startbildschirm hinzufügen und läuft danach ohne Browserleiste und offline.

Ein Nachbau des klassischen Zahlen-Streichspiels (bekannt als *Number Match*, *Numberzilla*
oder als Papier-Original *Take Ten*) als statische Web-App – ohne Build-Schritt, ohne
Abhängigkeiten, ausgelegt aufs Smartphone.

## Regeln

Zwei Zahlen dürfen weggestrichen werden, wenn **beides** stimmt:

1. **Wert** – die Zahlen sind gleich (7 & 7) **oder** ergeben zusammen 10 (3 + 7, 6 + 4).
   `5 & 5` erfüllt beides.
2. **Nachbarschaft** – sie liegen
   * in Leserichtung hintereinander (waagrecht, auf Wunsch auch über das Zeilenende hinweg),
   * senkrecht übereinander, oder
   * diagonal übers Eck.

Bereits gestrichene Felder zählen dabei nicht mehr: man sieht durch sie hindurch. Deshalb
entstehen mit jedem Zug neue Paare – die Reihenfolge der Züge entscheidet über das Spiel.

Eine vollständig geleerte Zeile verschwindet, der Rest rutscht nach. Geht kein Zug mehr,
hängt **Auffüllen** alle verbliebenen Zahlen in Leserichtung noch einmal hinten an; das
Guthaben dafür ist begrenzt. Wer das Feld leer räumt, gewinnt.

## Schwierigkeitsgrade

| Grad | Feld | Auffüllen | Erzeugung |
|---|---|---|---|
| Leicht | 6 × 9 | 5× | paarweise aufgebaut, geht immer auf |
| Mittel | 8 × 9 | 4× | paarweise aufgebaut |
| Schwer | 10 × 9 | 3× | gleichverteilt zufällig |
| Klassisch | 3 × 9 | 5× | Papier-Original: Ziffern von 1 bis 19 ohne 10 – immer dasselbe Feld |
| Endlos | 6 × 9 | 3× | leeres Feld heißt neue Runde: 3 frische Zeilen, ein Auffüllen zurück, +200 Punkte |

Diagonale und Zeilenumbruch lassen sich in den Einstellungen abschalten – das Video, das die
Vorlage war, zeigt nur waagrecht und senkrecht.

## Bedienung

* Zahl antippen, Partner antippen. Nochmal auf dieselbe Zahl tippen hebt die Auswahl auf.
* **Tipp** hebt ein spielbares Paar hervor, **Zurück** nimmt Züge zurück.
* Tastatur: Pfeiltasten bewegen den Fokus, Leertaste/Enter wählt aus, `h` = Tipp, `u` = zurück,
  `Esc` = Auswahl aufheben.
* Geht nichts mehr und ist das Auffüll-Guthaben leer, gibt es einmal pro Partie die
  **Rettung**: die übrigen Zahlen kommen noch einmal aufs Feld.
* Punkte: 10 pro Paar, mal Kombofaktor (bis **×10**) für Treffer in Folge, +25 je geräumter
  Zeile und +50 Zuschlag je zusätzlicher Zeile im selben Zug, +100 fürs Leerräumen, +150 je
  ungenutztem Auffüllen, +200 je Endlos-Runde. Ein Fehlversuch oder ein Auffüllen setzt den
  Kombofaktor zurück; ein Tipp kostet nichts.
* Der Bestwert der Stufe steht während des Spiels in der Punktekarte – und wird gefeiert,
  sobald er fällt.
* Wer seinen Bestwert einer Stufe schlägt, bekommt am Ende eine eigene kleine Feier:
  Strahlenkranz hinter dem Pokal, goldenes Konfetti, hochlaufende Punktzahl.

Spielstand, Einstellungen und Bestwerte liegen im `localStorage` des Geräts. Die Seite lässt
sich als App zum Startbildschirm hinzufügen und läuft dank Service Worker auch offline.

## Als App installieren

Die Seite ist eine vollwertige Web-App (PWA):

* **Android / Chrome:** beim Öffnen erscheint ein Installationsbanner, oder in den
  **Einstellungen → App → „Zum Startbildschirm hinzufügen“**. Langes Drücken auf das
  App-Symbol bietet danach Kurzbefehle für die drei Schwierigkeitsgrade.
* **iOS / Safari:** unten auf **Teilen → Zum Home-Bildschirm**. Startbilder für die gängigen
  iPhone-Größen liegen bei, hell und dunkel.

Mitgeliefert sind Icons in allen nötigen Größen samt maskierbarer Variante für Android,
`apple-touch-icon` für iOS und ein Service Worker für den Offline-Betrieb.

Erzeugt werden die Bilddateien aus einer Quelle:

```bash
node tools/make-icons.mjs      # Icons, maskierbare Varianten, iOS-Startbilder
python3 tools/optimize-pngs.py # auf 256 Farben verkleinern
```

## Entwicklung

Keine Abhängigkeiten, kein Bundler. Lokal starten:

```bash
npm start          # oder: python3 -m http.server 4173
# http://localhost:4173/
```

Regeltests (21 Stück, decken Nachbarschaften, Zeilenentfernung, Auffüllen, Undo und
Serialisierung ab):

```bash
npm test           # oder: node --test game.test.js
```

## Aufbau

| Datei | Inhalt |
|---|---|
| `game.js` | reine Spiellogik, DOM-frei und damit in Node testbar |
| `icons/` | App-Icons, maskierbare Varianten, iOS-Startbilder, Screenshots fürs Manifest |
| `manifest.webmanifest` | Web-App-Manifest inkl. Kurzbefehlen |
| `game.test.js` | Regeltests |
| `app.js` | Oberfläche: Rendering, FLIP-Animationen, Ton, Speicher |
| `index.html` | Markup inkl. Regel-, Einstellungs- und Enddialog |
| `classic.css`, `material3.css`, `m3-colors.css` | die beiden Stile und die erzeugten M3-Farbrollen |
| `sw.js` | Offline-Cache |

Die Logik in `game.js` kennt kein DOM: `createGame`, `canMatch`, `applyMatch`, `refill`,
`rescue`, `nextRound`, `findPair`, `undo`. Wer eine andere Oberfläche bauen will, braucht nur
diese Datei.

Kombo-Plakette und Hinweise haben eine eigene, feste Zeile zwischen Fortschrittsbalken und
Brett (`.ticker`). Vorher schwebten beide über dem Feld und verdeckten je nach Bildschirmhöhe
bis zu 14 Kacheln – ausgerechnet die eben angehängten.

## Zwei Stile

Unter **Einstellungen → Darstellung** lässt sich zwischen zwei Oberflächen umschalten:

* **Original** (Voreinstellung) – warmes Papierweiß, runde weiße Spielsteine, beschriftete
  Knopfleiste, Schrift Nunito.
* **Material 3** – Farbrollen nach Material You, Top App Bar, Bottom App Bar mit erweitertem
  FAB, modale Bottom Sheets mit Griff, Chips, Switches, Snackbar, Zustandsebenen und Ripple,
  Schrift Roboto, Icons aus den Material Symbols (Rounded).

Beide Stile laufen auf demselben Markup; umgeschaltet wird über `disabled` an den beiden
Stylesheets, ein kleines Skript im `<head>` setzt die Wahl noch vor dem ersten Rendern, damit
nichts aufblitzt. Die Wahl liegt wie alle Einstellungen im `localStorage`.

Die Material-3-Farbtokens in `m3-colors.css` sind nicht von Hand gepflegt, sondern aus dem
Quellton `#EF7D31` berechnet (Schema *Vibrant*, wie es Material You tut) – siehe
[`tools/gen-m3-colors.mjs`](tools/gen-m3-colors.mjs).

| Datei | Inhalt |
|---|---|
| `classic.css` | Skin „Original" |
| `material3.css` | Skin „Material 3" |
| `m3-colors.css` | erzeugte Farbrollen (hell und dunkel) |

## Schriften und Lizenzen

* **Nunito** (`fonts/nunito-latin-var.woff2`, 39 kB) – SIL Open Font License 1.1,
  Volltext in [`fonts/OFL.txt`](fonts/OFL.txt).
* **Roboto** (`fonts/roboto-latin-var.woff2`, 43 kB) und die **Material Symbols** im
  Icon-Sprite der `index.html` – Apache License 2.0, Volltext in
  [`fonts/APACHE-2.0.txt`](fonts/APACHE-2.0.txt).

## Herkunft

Das Spiel entstand als Nachbau eines Videos und lag anfangs im Repo
[`cauer71/Mathe-Kreuz`](https://github.com/cauer71/Mathe-Kreuz); dort liegt weiterhin das
ältere Mathe-Kreuz-Projekt (Vite + React). Die Historie ist vollständig mit umgezogen.

## Wie die Balance zustande kam

Die Zahlen sind nicht geraten, sondern gemessen: eine Simulation spielt die echte Logik
(`game.js`) über hunderte Partien pro Stufe, mit mehreren Spielweisen – von „erstes Paar
nehmen" bis „einen Zug vorausdenken" – und mit einer einstellbaren Fehlerrate als Ersatz für
menschliche Fehlgriffe. Daraus stammen unter anderem diese Entscheidungen:

* **Kombofaktor bis ×10 statt ×5.** Bei ×5 lag ein fehlerfreier Lauf nur 42–54 % über einem
  schlampigen, bei ×10 sind es 105–136 %. Erst dadurch schlägt Können auf die Punktzahl durch.
* **Endlos-Modus.** Auf den festen Feldern ist die Punktzahl fast determiniert (Median 1750 bei
  Leicht, Spanne nur ±3 %) – ein Bestwert ist da kein Ziel. Ein Endlos-Lauf hält im Mittel
  6 Runden, streut aber von 1 bis 26 und von 1180 bis 30370 Punkten.
* **Zuschlag für Doppelzeilen.** Zwei Zeilen in einem Zug kommen 1,5–2× pro Partie vor und sind
  planbar – der einzige rein strategische Hebel auf die Punktzahl.
* **Die Rettung.** Wer verliert, verliert fast immer knapp: über 600 Partien pro Stufe lagen
  bei einer Niederlage im Median noch **4** Zahlen auf dem Feld, in 83 % der Fälle sechs oder
  weniger. Das war reine Pechsache, kein Spielfehler. Eine einzige Rettung pro Partie – die
  letzten Zahlen kommen noch einmal aufs Feld – hebt die Siegquote von 86/76/62 % auf
  88/82/71 % (Leicht/Mittel/Schwer) und greift in 12–27 % der Partien.
* **150 statt 50 Punkte je gespartem Auffüllen.** Roh sammelt ein durchgefülltes Spiel sogar
  etwas *mehr* Punkte als ein sauberes – mehr Zahlen heißt mehr Züge. Mit 50 Punkten war beides
  gleichauf, mit 150 liegt sauberes Spiel rund 18 % vorn. Erst damit knackt man den Bestwert
  durch Können statt durch ein schlechtes Feld.
* **Verworfen: das Mischen beim Auffüllen.** Klang plausibel, brachte messbar nichts
  (Siegquote 77 → 81 % bei Schwer, sonst identisch).
