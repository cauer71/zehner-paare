# Zehner-Paare

**Spielen: https://cauer71.github.io/Mathe-Kreuz/** – die Seite lässt sich auf Android und iOS
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
| Klassisch | 3 × 9 | 5× | Papier-Original: Ziffern von 1 bis 19 ohne 10 |

Diagonale und Zeilenumbruch lassen sich in den Einstellungen abschalten – das Video, das die
Vorlage war, zeigt nur waagrecht und senkrecht.

## Bedienung

* Zahl antippen, Partner antippen. Nochmal auf dieselbe Zahl tippen hebt die Auswahl auf.
* **Tipp** hebt ein spielbares Paar hervor, **Zurück** nimmt Züge zurück.
* Tastatur: Pfeiltasten bewegen den Fokus, Leertaste/Enter wählt aus, `h` = Tipp, `u` = zurück,
  `Esc` = Auswahl aufheben.
* Punkte: 10 pro Paar, mal Kombofaktor (bis ×5) für Treffer in Folge, +25 je geräumter Zeile,
  Bonus fürs Leerräumen und für ungenutztes Auffüllen.

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
| `mathe-kreuz/` | das ältere Mathe-Kreuz-Projekt (Vite + React), nicht Teil der Seite |
| `game.test.js` | Regeltests |
| `app.js` | Oberfläche: Rendering, FLIP-Animationen, Ton, Speicher |
| `index.html` | Markup inkl. Regel-, Einstellungs- und Enddialog |
| `classic.css`, `material3.css`, `m3-colors.css` | die beiden Stile und die erzeugten M3-Farbrollen |
| `sw.js` | Offline-Cache |

Die Logik in `game.js` kennt kein DOM: `createGame`, `canMatch`, `applyMatch`, `refill`,
`findPair`, `undo`. Wer eine andere Oberfläche bauen will, braucht nur diese Datei.

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
