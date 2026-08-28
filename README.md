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
| Klassisch | 3 × 9 | 5× | Papier-Original: Ziffern von 1 bis 19 ohne 10 – **immer dasselbe Feld** |
| Endlos | 6 × 9 | 3× | leeres Feld heißt neue Runde: 3 frische Zeilen, ein Auffüllen zurück, +200 Punkte |

„Klassisch" ist mit Absicht kein Zufallsfeld: auf dem Papier schreibt man 1 bis 19 (ohne die
10) der Reihe nach ins Raster, und genau das steht dort – Zeile für Zeile

```
1 2 3 4 5 6 7 8 9
1 1 1 2 1 3 1 4 1
5 1 6 1 7 1 8 1 9
```

Dieselbe Aufgabe jedes Mal heißt: der Rekord dieser Stufe vergleicht wirklich das Können und
nicht das Glück. Weil das nach einem Fehler aussieht, wenn man mehrmals auf „Neu" tippt, sagt
das Spiel es beim Start einer Klassisch-Partie kurz an. Die vier anderen Stufen würfeln jedes
Mal neu.

Diagonale und Zeilenumbruch lassen sich in den Einstellungen abschalten – das Video, das die
Vorlage war, zeigt nur waagrecht und senkrecht.

## Wie ein neues Feld entsteht

Ein neues Feld liegt nicht einfach da, es baut sich über **eine Sekunde** auf – und die
Reihenfolge ist der eigentliche Witz daran. Sie ist ausdrücklich *nicht* die Leserichtung:
gebaut wird **paarweise**. Je Schritt kommen zwei Zahlen, die zusammenpassen – gleich oder
Summe zehn – und beide bekommen **dieselbe Verzögerung**, erscheinen also im selben
Augenblick. An zwei weit auseinanderliegenden Stellen, denn der Partner wird unter allen
passenden ausgelost und die Schrittfolge danach gemischt.

Der Aufbau springt so über Zeilen **und** Spalten: erste Zahl irgendwo oben, die nächste vier
Zeilen tiefer, die nächste am anderen Rand. Das ist Absicht. Ein Feld, das sich Zeile für
Zeile füllt, sieht man nichts an.

Was da aufblitzt, ist also keine Zierde, sondern die Lösung – rückwärts gelesen ist der
Aufbau ein Weg durch das Feld. Wer hinsieht, sieht Paare entstehen und weiß es noch, wenn das
Feld ruhig daliegt und alle Kacheln gleich aussehen. Ein Geheimnis, das man erraten kann, ohne
dass es jemand erklären muss. Und es verrät noch keinen *Zug*: gebraucht wird zusätzlich die
Nachbarschaft. Der Hinweis hilft, er spielt nicht für einen.

Das gilt in **jeder** Stufe. In „Schwer" und „Klassisch" sind die Zahlen nicht paarweise
*entstanden* – aber Paare liegen auch dort im Feld, und die werden nachträglich gesucht
(`aufbauSchritte()` in `game.js`). Die Spiellage selbst bleibt davon unberührt: „Klassisch"
ist weiter die Ziffernfolge 1 bis 19, nur das Hinschreiben folgt jetzt den Paaren statt der
Zeile.

### Die eine Sekunde ist überall dieselbe

Gemeint ist die Zeit bis **fertig**, nicht bis die letzte Zahl *anfängt* zu kommen – und sie
gilt in jeder Stufe und in jedem Stil gleich. Das ist nicht von selbst so: jeder Stil hat
seine eigene Einflugdauer (Arcade 240 ms, Papier 300, Original 340, Material 3 400). Startete
die letzte Zahl erst bei 1000 ms, stünde das Feld je nach Stil zwischen 1240 und 1400 ms –
vier verschiedene Zeiten, keine davon eine Sekunde. Darum wird die Einflugdauer vom Ende
abgezogen: die letzte Zahl startet bei 1000 minus Einflugdauer und steht punktgenau bei 1000.

Was sich ändert, ist nur, wie **dicht** die Schritte liegen: 14 Schritte in „Klassisch",
47 in „Schwer", und beim Auffüllen so viele, wie Zahlen nachkommen. Die Spanne selbst bleibt.

Ein paar Dinge, die dazugehören:

* **Die Uhr läuft erst danach.** Während des Aufbaus lässt sich nichts spielen, also darf er
  auch nicht auf die Zeit gehen – sonst kostete jede Partie eine Sekunde Bestwert.
* **Abkürzen jederzeit.** Ein Tipp aufs Feld oder eine beliebige Taste stellt alles sofort
  hin. Dieser erste Tipp wählt bewusst noch **keine** Kachel: man soll nicht auf eine Zahl
  treffen, die man im selben Augenblick erst zu sehen bekommt.
* **Gesperrt, solange es läuft.** Die Kacheln liegen schon im DOM und wären sonst
  anklickbar, bevor man ihre Zahl sehen kann.
* **Wer keine Bewegung will, bekommt keine.** Bei `prefers-reduced-motion` liegt das Feld
  sofort vollständig da.
* **Auch beim Start.** Nicht nur nach „Neu": wer die App öffnet, sieht das Feld ebenso
  entstehen, statt es fertig vorgesetzt zu bekommen. Bei einem fortgesetzten Spielstand
  werden die Schritte über die Zahlen neu geteilt, die noch **da** sind – die im Spielstand
  gespeicherten gehören zum ursprünglichen Feld, und nach einer halben Partie ist von vielen
  Paaren nur noch eine Hälfte übrig. Gestrichene Zahlen kommen als eigene Schritte mit; ein
  Paar mit einer Zahl, die es nicht mehr gibt, wäre gelogen. (Das rettet auch Spielstände aus
  Fassungen vor 1.12, denen die Schrittnummern ganz fehlen – die fielen sonst auf die
  Leserichtung zurück.)
* **Zwei Ausnahmen**, und in beiden wäre der Aufbau schlicht nicht zu sehen: beim allerersten
  Besuch liegt das Regelblatt darüber, und wer in der Sackgasse aufgehört hat, bekommt zuerst
  den Enddialog.
* **Auch beim Auffüllen und bei der Rettung.** Die nachgelegten Zahlen kommen ebenso
  paarweise herein, gepaart nur unter *sich* – sie landen ja zusammen auf dem Feld. Wo sie
  landen, ändert das nicht: angehängt wird weiter in Leserichtung, man kann also weiter
  vorausplanen, was wo hinkommt. Nur die Reihenfolge, in der sie sichtbar werden, folgt den
  Paaren.

Jeder Stil bringt seine eigene Handschrift mit, weil der Aufbau die vorhandene
`.cell.enter`-Animation benutzt: im Original fallen die Kacheln herein, im Arcade-Stil
rasten sie in vier Stufen ein, auf dem Papier werden die Ziffern geschrieben.

## Bedienung

* Zahl antippen, Partner antippen. Nochmal auf dieselbe Zahl tippen hebt die Auswahl auf.
* **Tipp** hebt ein spielbares Paar hervor, **Zurück** nimmt Züge zurück.
* Tastatur: Pfeiltasten bewegen den Fokus, Leertaste/Enter wählt aus, `h` = Tipp, `u` = zurück,
  `Esc` = Auswahl aufheben.
* Geht nichts mehr und ist das Auffüll-Guthaben leer, gibt es einmal pro Partie die
  **Rettung**: die übrigen Zahlen kommen noch einmal aufs Feld.
* **Auffüllen führt nie in eine sofortige Sackgasse.** Die übrigen Zahlen werden in
  Leserichtung angehängt – wie im Original, man kann also vorausplanen, was wo landet. Nur wenn
  genau das ein Feld ohne einen einzigen Zug ergäbe, werden sie paarweise angeordnet: ein
  Auffüllen, das sofort tot ist, kostet ein Guthaben und fühlt sich wie ein Fehler des Spiels
  an. Gemessen greift das in 32 bis 60 von 500 Partien und verschiebt die Siegquote um höchstens
  einen Punkt (85/79/58 % → 86/79/58 %).
* Punkte: 10 pro Paar, mal Kombofaktor (bis **×10**) für Treffer in Folge, +25 je geräumter
  Zeile und +50 Zuschlag je zusätzlicher Zeile im selben Zug, +100 fürs Leerräumen, +150 je
  ungenutztem Auffüllen, +200 je Endlos-Runde. Ein Fehlversuch oder ein Auffüllen setzt den
  Kombofaktor zurück; ein Tipp kostet nichts.
* Unter der Punktzahl steht der **Weltrekord** der Stufe samt Kürzel dessen, der ihn hält,
  unter der Zahl der übrigen Kacheln die eingestellte **Schwierigkeit**. Fällt der Weltrekord,
  läuft eine goldene Welle über das Feld – und **ab da ist der Punktestand selbst gefärbt**,
  bis die Partie zu Ende ist. Siehe [Wenn ein Rekord fällt](#wenn-ein-rekord-fällt).
* Beide Kärtchen sind **antippbar**: das Punktekärtchen führt zu den Weltrekorden, das
  mittlere zur Schwierigkeit. Beides steht dort, wo die Zahl darüber herkommt.
* Ein Weltrekord am Ende bekommt eine eigene Feier: Strahlenkranz hinter dem Pokal, goldenes
  Konfetti, hochlaufende Punktzahl und ein goldenes Band, das es auch sagt.
* **Nur Weltrekorde.** Bestwerte dieses Geräts führt das Spiel nicht mehr (bis 1.17 gab es
  sie): zwei Ranglisten nebeneinander waren eine zuviel, und die kleinere war die, die außer
  einem selbst nie jemand sieht. Gespielt wird gegen die Welt.
* **Kürzel in der Weltliste.** Zu einem Weltrekord gehören drei Zeichen: `A`–`Z` und `0`–`9`,
  wie am Automaten. Das Feld steht im Enddialog unter den Zahlen und noch einmal in den
  **Einstellungen → Weltrekorde**, dort auch ohne neuen Rekord. Vorbelegt ist es mit dem
  letzten Kürzel – wer allein spielt, fasst es nie wieder an; auf einem geteilten Gerät
  schreibt der Nächste sein eigenes hinein. Gespeichert wird bei jedem Tastendruck und nicht
  erst auf einen Knopf: der Enddialog lässt sich wegtippen, und ein Kürzel, das dabei
  verloren geht, tippt niemand ein zweites Mal. Kleinbuchstaben werden groß geschrieben,
  alles andere fällt weg – die Zeichenmenge ist die der eigenen Pixelschrift, und was die
  nicht kennt, stünde im Arcade-Stil still als leerer Rahmen da. Wer einen **Weltrekord**
  aufstellt, nimmt sein Kürzel mit in die Weltliste – sonst bleibt es auf dem Gerät (siehe
  [Die Weltrangliste](#die-weltrangliste)).

Die **Einstellungen** stehen in fünf aufklappbaren Gruppen – Spiel, Darstellung, Ton &
Vibration, Sprache, Weltrekorde. Vorher war es eine Liste von sieben Abschnitten am Stück, die
auf einem Handy nicht mehr auf einen Blick passte. Es ist immer höchstens eine Gruppe offen,
und welche das war, bleibt gemerkt. Damit man zum Nachsehen nicht aufklappen muss, steht in
jeder Kopfzeile rechts der aktuelle Zustand („Mittel · Diagonal · Umbruch", „Papier · Auto",
„Automatisch · Deutsch"). Gebaut mit `<details>`/`<summary>` – Tastatur und Vorlesehilfe
kommen damit von Haus aus zurecht, ohne eine Zeile Skript für das Auf und Zu.

Spielstand, Einstellungen und der letzte bekannte Stand der Weltzahlen liegen im
`localStorage` des Geräts. Die Seite lässt
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

## Veröffentlichen

Die Seite liegt an zwei Orten: auf **<https://10.auer.page>** (Cloudflare Workers, dort auch
die Datenbank hinter der Weltrangliste) und auf **GitHub Pages**
(`.github/workflows/pages.yml`, bei jedem Push auf `main`). Die Pages-Fassung holt ihre
Weltzahlen über Kreuz von `10.auer.page`; sonst sind beide dieselbe Datei.

| Feld im Cloudflare-Assistenten | Wert |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

`npm run build` legt `dist/` an: alle Dateien der obersten Ebene mit den Endungen `.html`,
`.js`, `.css`, `.webmanifest` (ohne Tests), dazu `icons/` und `fonts/`. Kopiert wird nach
dieser **Regel** und nicht nach einer Liste – eine Liste müsste man pflegen, und eine neue
CSS-Datei wäre irgendwann vergessen und die Seite im Netz halb kaputt. Genau eine Ausnahme
steht als Name im Werkzeug: `worker.js` ist Servercode und darf nicht unter den Dateien
liegen, die jeder herunterladen kann. Die Abnahme prüft das eigens (`/worker.js` → 404).

Zwei Dinge, die dabei auffielen und beide gemessen sind:

* **Das Projektverzeichnis selbst darf nicht das Asset-Verzeichnis sein.** `wrangler` legt
  sein `.wrangler/` mitten hinein, beobachtet den Ordner gleichzeitig und lädt den lokalen
  Server dann endlos neu („Reloading local server“ ohne Ende), bis er auf keine Anfrage mehr
  antwortet. Mit `dist/` daneben ist Ruhe – und Werkzeuge, Tests und README gehen ohnehin
  nicht mit hinaus.
* **`/index.html` beantwortet Cloudflare mit einer 307 auf `/`** (`html_handling:
  auto-trailing-slash`). Der Service Worker legt genau diese Adresse in seinen
  Offline-Speicher, und ein Speicher, der zur Hälfte fehlschlägt, gilt in `sw.js`
  ausdrücklich als gar keiner. Nachgesehen mit einem echten Browser gegen `wrangler dev`:
  der Arbeiter meldet sich an, wird `activated` und legt seine 22 Dateien an, `/index.html`
  darunter. Die Umleitung stört also nicht.

Die Domain hängt man im Dashboard an den Worker (**Settings → Domains & Routes → Add →
Custom domain**) und nicht in `wrangler.jsonc`: so lässt sie sich ändern, ohne den Code
anzufassen. Alle Pfade im Projekt sind relativ (`./`), die Seite läuft deshalb genauso im
Wurzelverzeichnis einer eigenen Domain wie im Unterordner von GitHub Pages.

Was beim Umzug **nicht** mitkommt: `localStorage` gehört zur Herkunft, auf einer neuen Domain
fängt das Spiel also ohne Spielstand, ohne Einstellungen und ohne Kürzel an. Die Weltrekorde
sind davon unberührt – die liegen in der Datenbank, nicht am Gerät und nicht an der Domain.

Die Datenbank wird einmal angelegt und danach über Migrationen fortgeschrieben:

```bash
npx wrangler d1 create zehner-paare        # die database_id kommt in wrangler.jsonc
npx wrangler d1 migrations apply zehner-paare            # lokal
npx wrangler d1 migrations apply zehner-paare --remote   # in der Wolke
```

`migrations/` ist damit die Wahrheit über das Schema – nicht ein Zustand, den jemand einmal
im Dashboard hergestellt hat und den niemand mehr nachvollziehen kann.

## Entwicklung

Keine Abhängigkeiten, kein Bundler. Lokal starten:

```bash
npm start          # oder: python3 -m http.server 4173
# http://localhost:4173/
```

Regeltests (21 Stück, decken Nachbarschaften, Zeilenentfernung, Auffüllen, Undo und
Serialisierung ab):

```bash
npm test               # Regeltests, Woerterbuchtests und die Grenze zur Datenbank
npm run check:welt     # Weltrangliste gegen eine lokale D1 (braucht npx und playwright-core)
npm run check:platz    # wie viel Platz hat jedes Feld? (braucht playwright-core)
npm run check:ueberlauf  # laeuft irgendwo Text aus seinem Feld?
npm run gen:manifests  # die drei Manifeste aus i18n.js neu schreiben
```

## Aufbau

| Datei | Inhalt |
|---|---|
| `game.js` | reine Spiellogik, DOM-frei und damit in Node testbar |
| `icons/` | App-Icons, maskierbare Varianten, iOS-Startbilder, Screenshots fürs Manifest |
| `manifest.webmanifest` | Web-App-Manifest inkl. Kurzbefehlen |
| `game.test.js` | Regeltests |
| `app.js` | Oberfläche: Rendering, FLIP-Animationen, Ton, Speicher |
| `i18n.js` | die drei Sprachen und der Platzhalter-Ersetzer |
| `online.js` | die Weltrangliste von der Seite aus gesehen (anonym, abschaltbar) |
| `worker.js` | die Weltrangliste von der Serverseite: zwei Adressen über D1 |
| `migrations/` | das Datenbankschema und die Übernahme des alten Bestands |
| `i18n.test.js` | prüft die Wörterbücher gegeneinander |
| `online.test.js` | prüft die zwei Grenzen zur Weltliste: was hineindarf, was angezeigt wird |
| `index.html` | Markup inkl. Regel-, Einstellungs- und Enddialog |
| `classic.css`, `material3.css`, `m3-colors.css`, `arcade.css`, `papier.css` | die vier Stile und die erzeugten M3-Farbrollen |
| `sw.js` | Offline-Cache |
| `manifest.{de,it,en}.webmanifest` | erzeugt aus `i18n.js`, je Sprache eines |
| `tools/` | Erzeuger (M3-Farbrollen, Pixelschrift, Handschrift, Pixel-Icons, App-Icons, Manifeste, `build-dist.mjs`) und Prüfungen (`check-ueberlauf.mjs`, `check-platz.mjs`, `check-welt.mjs`) |
| `wrangler.jsonc` | Cloudflare Workers: `worker.js` davor, `dist/` als Dateien dahinter, D1 daneben |

Die Logik in `game.js` kennt kein DOM: `createGame`, `canMatch`, `applyMatch`, `refill`,
`rescue`, `nextRound`, `findPair`, `undo`. Wer eine andere Oberfläche bauen will, braucht nur
diese Datei.

Kombo-Plakette und Hinweise haben eine eigene, feste Zeile zwischen Fortschrittsbalken und
Brett (`.ticker`). Vorher schwebten beide über dem Feld und verdeckten je nach Bildschirmhöhe
bis zu 14 Kacheln – ausgerechnet die eben angehängten.

Die Rekordwelle (`.record-wave`) liegt **neben** dem Brett im selben Rahmen, nicht darin:
`renderBoard()` sortiert die Kacheln nach ihrer Position (`board.insertBefore(el,
board.children[i])`) und würde ein fremdes Kind bei jedem Zug umhängen. Damit sie trotzdem
deckungsgleich mit dem Brett liegt, bekommt der Rahmen dieselbe Spaltenzahl gesetzt
(`--cols`) und die Welle dieselbe Breitenformel – je Stil eine, denn Polster und Eckradius
sind je Stil andere. Nachgemessen: Welle und Brett liegen auf denselben vier Werten.

Das Brett wächst mit seinen Zeilen. Vorher stand `align-items: stretch` am Rahmen
(`.board-wrap`): das Feld bekam damit genau die sichtbare Höhe, und jede Zeile, die durch
Auffüllen dazukam, lag außerhalb seiner Fläche. Nach zwei, drei Auffüllen sah man Kacheln
ohne Brett darunter – die abgerundete Unterkante mitten im Bild, im Arcade-Stil dazu die
Lichterkette quer über dem Feld. Jetzt hängt das Feld oben (`align-items: start`) und holt
sich die freie Fläche über `min-height: 100%`: ein kurzes Feld füllt den Platz wie vorher,
ein langes wächst darüber hinaus, gescrollt wird im Rahmen. Auch der weiche Rand oben und
unten wird jetzt am Rahmen gemessen und nicht mehr am Feld – das Feld läuft ja nicht mehr
über. (Der Papier-Stil hatte `start` von Anfang an, weil das Blatt dort oben hängen soll;
ihm ist das nie passiert.)

**Am Rechner passt sich das Feld in die Höhe ein.** Auf dem Handy ist die *Breite* der
Anschlag: neun Spalten auf 390 px ergeben Kacheln von rund 38 px, und kommen durch Auffüllen
mehr Zeilen dazu, als auf den Schirm passen, wird gescrollt – so ist es gedacht. Am Rechner
ist es umgekehrt, und da war es kaputt: `--cell-max` deckelt die Kachel bei 64 px, das
Fenster ist breit genug, und stattdessen geht die Höhe aus. Gemessen in „Schwer": bei
1440 × 900 scrollte der Rahmen um 57 px, bei 1280 × 720 um 105 – die unterste Zeile lag
außerhalb des Bildes.

`brettEinpassen()` in `app.js` rechnet die Kachel deshalb zusätzlich aus der freien Höhe
zurück und setzt `--cell-max` am Rahmen. Polster und Abstände kommen dabei aus dem laufenden
Stylesheet und nicht aus einer Tabelle im Skript – nur so stimmt die Rechnung in allen vier
Stilen, die alle andere Werte haben (der Automat 6 px Polster und 2 px Abstand, das Papier
gar keins). Zwei Grenzen: **nur verkleinern**, sonst sähe dasselbe Spiel auf einem hohen
Schirm anders aus als gedacht; und **nicht unter 34 px** – passt es nur mit unleserlichen
Zahlen, ist Scrollen das kleinere Übel. Genau das ist der Fall auf einem 320er nach mehreren
Auffüllen, und dort bleibt darum alles, wie es war.

Nachgerechnet wird bei jedem Zeichnen und über einen `ResizeObserver` auf dem Rahmen – nicht
über `resize` am Fenster: der Beobachter greift auch dort, wo das Fenster gleich bleibt und
der Platz trotzdem ein anderer wird (eine nachgeladene Schrift, die die Kopfzeile um zwei
Pixel verschiebt; die ein- und ausfahrende Adressleiste am Handy; ein Wechsel der sicheren
Ränder beim Drehen). Eine Rückkopplung gibt es nicht: die Höhe des Rahmens kommt aus dem
Flexlayout und nicht aus seinem Inhalt.

| Fenster | Stufe | vorher | nachher |
|---|---|---|---|
| 1280 × 800 | Mittel | 25 px Scroll | Kachel 59 px, passt |
| 1440 × 900 | Schwer | 57 px Scroll | Kachel 56 px, passt |
| 1280 × 720 | Schwer | 105 px Scroll | Kachel 38 px, passt |
| 1920 × 1080 | Schwer | passte schon | unverändert 62 px |
| 320 × 568 | Schwer | Scroll | Scroll (unter der Grenze) |

## Drei Sprachen

Deutsch, Italienisch, Englisch. Beim ersten Start nimmt das Spiel die erste Sprache aus
`navigator.languages`, die es kennt – `de-AT` und `de-CH` zählen als Deutsch, weil nur der Teil
vor dem Bindestrich betrachtet wird. Unter **Einstellungen → Sprache** lässt sich das
festnageln; „Automatisch" bleibt am Gerät und merkt auch einen Wechsel dort, ohne Neuladen
(`languagechange`).

Alles liegt in [`i18n.js`](i18n.js): 172 Sätze je Sprache, ein Ersetzer für `{platzhalter}`,
kein Fremdpaket. Statischer Text hängt über vier Attribute im Markup – `data-i18n`
(textContent), `data-i18n-html` (für die Sätze mit `<b>`), `data-i18n-aria`, `data-i18n-title` –,
alles Dynamische geht durch `t()`. `game.js` kennt gar keinen Text mehr: die Schwierigkeiten
heißen dort nur noch nach ihrem Schlüssel.

Auch das Manifest ist übersetzt. Es kann sich nicht selbst umschalten, darum gibt es drei
Dateien, erzeugt von [`tools/gen-manifests.mjs`](tools/gen-manifests.mjs) aus demselben
Wörterbuch; das Kopfskript hängt `<link rel="manifest">` schon vor dem ersten Bild um. So steht
im Installationsdialog und auf dem Startbildschirm derselbe Text wie im Spiel.

### Dass der Text nie aus seinem Feld läuft

Das ist bei drei Sprachen die eigentliche Arbeit, und sie wird nicht nach Augenmaß gemacht.

Zuerst **gemessen, wie viel Platz ein Feld hat** – nicht gerechnet. Der erste Versuch, die
Budgets aus Polstern und Rasterspalten herzuleiten, war um mehr als das Doppelte falsch: bei
`grid-template-columns: repeat(4, 1fr)` und `flex: 1` wächst nämlich nicht der Knopf über
seinen Rand, sondern die Spur – und damit die Leiste und die Seite. Der Knopf allein meldet
dann nie einen Überlauf. Ein Skript schreibt darum immer längeren Text in jedes Feld und
schaut, wann *irgendetwas* davon anschlägt. Ergebnis für die engste Stelle, die untere
Knopfleiste bei 320 px, wo die Beschriftung auf `nowrap` steht:

| Feld | Platz |
|---|---|
| Zurück / Tipp / Neu | 16–18 Zeichen |
| Auffüllen / Rettung | 12 Zeichen |
| Zeit / Runde | 9 Zeichen |
| Punkte / Übrig | 18 Zeichen |
| Kombo-Plakette | 30 Zeichen |

Diese Zahlen standen als harte Vorgabe in der Übersetzung, und dieselben Grenzen prüft
`i18n.test.js` bei jedem Testlauf nach. Danach wird jede einzelne Beschriftung **im Browser
eingesetzt** und geprüft, ob sie anschlägt – über 320/360/390 px und alle vier Stile.

Zum Schluss die Abnahme über alles ([`tools/check-ueberlauf.mjs`](tools/check-ueberlauf.mjs)):
**drei Sprachen × vier Bildschirmbreiten × vier Stile × sieben Spiellagen = 336 Zustände.** Je
Zustand fünf Fragen ohne Auslegungsspielraum:

1. Scrollt die Seite waagrecht? Das ist die wichtigste Frage – siehe oben, bei `1fr` und
   `flex: 1` schlägt nicht der Knopf an, sondern die Seite.
2. Ist bei einem begrenzten Feld der Inhalt breiter als das Feld? `scrollWidth > clientWidth`
   verrät das auch bei `overflow: visible`.
3. Braucht eine Beschriftung mehr Zeilen als vorgesehen? Exakt gezählt über
   `Range.getClientRects()` – jede Zeile ist ein eigenes Rechteck. Über die Zeilenhöhe zu
   rechnen ging schief, weil `line-height` mal `normal` und mal eine Zahl ist.
4. Verlässt eine Einblendung den Meldungsstreifen über dem Brett?
5. Liegt eine Kachel außerhalb des Bretts? Gemessen wird die Geometrie – Unterkante der
   letzten Kachel gegen Unterkante des Bretts – und nicht `scrollHeight`: das zählt im
   Arcade-Stil die Polsterung mit und meldete auch ein Brett, an dem nichts falsch ist.

Die Höhenfrage hat mich dabei zweimal etwas gelehrt. Der erste Durchlauf meldete in **jeder**
Sprache gleich, dass im Hochkontrast die Ziffer 3 px höher sei als ihre Kachel. Nachgemessen:
die Zeilenschachtel ist bei `line-height: 1` 27,7 px hoch, der **Schriftkasten** von Nunito
aber 1,37 em, also 38 px – und der ragt 1,3 px über den Rahmen. Was da hinausragt, ist
allerdings leerer Raum über und unter der Ziffer, keine Farbe. Die Prüfung fragt darum jetzt
nach der **Farbausdehnung** (`actualBoundingBoxAscent/Descent` aus der Kanvas-Metrik) statt
nach der Schachtel: sie soll melden, wenn Schrift ihr Feld verlässt, und nicht, wenn eine
Schrift viel Luft mitbringt.

Die erste Fassung dieser Messung war dann selbst falsch – sie schätzte die Zeilenzahl aus
`scrollHeight` und zählte eine Zeile zu viel, was aus 3 px plötzlich 17 machte. Deshalb steht
im Prüfskript nur noch **eine** Quelle für die Zeilenzahl, dieselbe `Range`-Zählung wie für
Frage 3. Eine Prüfung, die falsch alarmiert, ist keine Prüfung – nur eine, die man ignoriert.

Zwei echte Funde kamen dabei heraus, beide hausgemacht:

* In **Material 3** war der Stil-Umschalter eine einzeilige Pille mit `overflow: hidden`. Mit
  dem fünften Stil reichte der Platz nicht mehr, und „Material 3" wurde **abgeschnitten** –
  eingeschleppt beim Bau von Papier und Kontrast. Der Umschalter ist jetzt eine
  umbrechende Chip-Reihe; das entspricht auch der Material-Empfehlung ab vier Optionen.
* Die **Pixelschrift des Arcade-Stils kannte keine Akzentbuchstaben.** Italienisch braucht
  à è é ì ù und die französischen Anführungszeichen – an 15 sichtbaren Stellen wären leere
  Kästchen erschienen, ohne jede Fehlermeldung. Die Diakritika sind jetzt eine Tabelle
  (Umlautpunkte, Gravis, Akut) statt eines Wahrheitswerts, und
  [`tools/gen-pixelfont.py`](tools/gen-pixelfont.py) **bricht ab**, wenn ein Wörterbuch ein
  Zeichen braucht, das die Schrift nicht hat. Eine vierte Sprache kann so nicht mehr still
  Löcher reißen.

Dabei fiel auch auf, dass „★ EINWURF FREI ★" als deutscher Text mitten in `arcade.css` stand
und beim Sprachwechsel stehenblieb. Die beiden Attract-Sprüche kommen jetzt aus dem
Wörterbuch, über CSS-Eigenschaften.

## Vier Stile

Unter **Einstellungen → Darstellung** lässt sich zwischen vier Oberflächen umschalten:

* **Original** (Voreinstellung) – warmes Papierweiß, runde weiße Spielsteine, beschriftete
  Knopfleiste, Schrift Nunito.
* **Material 3** – Farbrollen nach Material You, Top App Bar, Bottom App Bar mit erweitertem
  FAB, modale Bottom Sheets mit Griff, Chips, Switches, Snackbar, Zustandsebenen und Ripple,
  Schrift Roboto, Icons aus den Material Symbols (Rounded).
* **Arcade** – ein Spielautomat von 1989: Neon auf Schwarz, eigene Pixelschrift, Pixel-Icons,
  Bildröhren-Raster, laufende Lichterkette, Sternenfeld, Chiptune. Siehe unten.
* **Papier & Bleistift** – das Rechenheft, aus dem das Spiel kommt: Karo, handgeschriebene
  Ziffern, gestrichene Zahlen bleiben stehen. Im Dunkeln Tafel und Kreide. Siehe unten.

Alle Stile laufen auf demselben Markup; umgeschaltet wird über `disabled` an den
Stylesheets, ein kleines Skript im `<head>` setzt die Wahl noch vor dem ersten Rendern, damit
nichts aufblitzt. Die Wahl liegt wie alle Einstellungen im `localStorage`. Was sich über das
Stylesheet hinaus unterscheidet – Icon-Satz und Tonstimme – steht in einer Tabelle `SKINS`
in `app.js`, nicht verstreut in Abfragen.

Die Material-3-Farbtokens in `m3-colors.css` sind nicht von Hand gepflegt, sondern aus dem
Quellton `#EF7D31` berechnet (Schema *Vibrant*, wie es Material You tut) – siehe
[`tools/gen-m3-colors.mjs`](tools/gen-m3-colors.mjs).

| Datei | Inhalt |
|---|---|
| `classic.css` | Skin „Original" |
| `material3.css` | Skin „Material 3" |
| `m3-colors.css` | erzeugte Farbrollen (hell und dunkel) |
| `arcade.css` | Skin „Arcade" |
| `papier.css` | Skin „Papier & Bleistift" |

Dass ein neuer Stil *vollständig* ist, wird nicht per Augenschein entschieden: ein Prüfskript
erntet in allen Stilen jedes Element mit stabilem Pfad und vergleicht. Für „Papier & Bleistift"
hieß das: **296 Elemente, keines fehlt, keines unsichtbar, keines in einer fremden Schrift,
keines ohne Fläche, Rahmen oder Linie.**

Beim Bau der Stile fiel noch eine Falle auf, die alle angeht: Ein Effektelement wird
abgeräumt, wenn seine Animation zu Ende ist – setzt ein Stil es aber auf `display:none`, wie
alle außer Material 3 die Material-Welle, läuft nie eine Animation, `animationend` bleibt aus
und die Elemente sammeln sich an. `abraeumen()` in `app.js` hat darum zusätzlich einen Wecker.

Einen fünften Stil gab es eine Zeit lang: **Hochkontrast** – schwarz, weiß, ein Gelb, dicke
Rahmen, große Ziffern, keine Bewegung. Mit 1.11.0 ist er entfallen; wer ihn eingestellt hatte,
steht nach dem Update wieder auf „Original". Weiter oben im Text kommt er noch als Fundstelle
zweier Prüfungen vor – die Geschichten dazu stimmen, den Stil selbst gibt es nicht mehr.

## Der Arcade-Stil

Absichtlich dick aufgetragen: Kitsch mit Regeln.

* **Palette in Automatenfarbtiefe.** Jeder Kanal ein Vielfaches von `0x11` (4 Bit, wie CPS-1),
  Neon nur auf Schwarz, kein Grauwert als Fläche. Zustände unterscheiden sich über die
  Neonrolle und die Rahmenform, nie über eine Aufhellung – dadurch bleiben sie auch ohne
  Farbunterscheidung auseinanderzuhalten: `.sel` = Ring außen, `.partner` = Ring innen,
  `.hinted` = blinkend, `.bad` = Ring plus Ruckeln.
* **Eigene Pixelschrift** `ZP Pixel` (1,8 kB), erzeugt von
  [`tools/gen-pixelfont.py`](tools/gen-pixelfont.py) aus 5×7-Bitmustern. Das Em-Quadrat
  umfasst genau 8 Pixelzeilen, ein Schriftpixel ist also ein Achtel der Schriftgröße – darum
  sind **alle** Größen im Stylesheet Vielfache von 8 px, sonst zerfließt das Raster. Für die
  Kachelziffern gibt es deshalb kein `clamp()`, sondern drei Stufen über Container-Abfragen.
* **Eigene Pixel-Icons**, erzeugt von
  [`tools/gen-pixelicons.py`](tools/gen-pixelicons.py) aus ASCII-Rastern; der Pfad wird
  gerechnet, nicht getippt. Bei aktivem Arcade tauscht `applyIconSet()` alle `<use href="#i-…">`
  auf `#px-…`; fehlt eine Pixelform, bleibt das weiche Symbol stehen.
* **Bewegung springt.** `steps()` überall statt weicher Kurven – ein Sprite wird getauscht, es
  interpoliert nicht. Kombo-Level-Up: Sprite-Zoom wie in den Sega-Super-Scaler-Automaten,
  Farbzyklus wie im Palette-RAM von Robotron 2084, Bildschirmruckeln wie in den CPS-1-Titeln,
  bei ×10 der Weißblitz. Der Bildstopp von Pac-Man ist bewusst *nicht* dabei: er würde die
  Eingabe blockieren.
* **Die Einblendung sitzt nicht im Spielfeld.** Sie steht in der Meldungszeile zwischen
  Fortschrittsbalken und Brett – dort ist nichts anzutippen und nichts abzulesen. Mitten im Feld
  stand sie einem schnellen Spieler im Weg: Tipper hat sie nie abgefangen, aber sie verdeckte
  die Kacheln, und genau die will man sehen. Gemessen über drei Bildschirmbreiten, zwei
  Schwierigkeiten und vier Kombostufen: **keine einzige verdeckte Kachel**. Solange sie steht,
  weicht die kleine Kombo-Plakette – dieselbe Zahl doppelt wäre nur Unruhe.
* **Der Anschlag knallt, gelesen wird im Stehen.** Die Einblendung zoomt in rund 220 ms herein
  und bleibt dann **unbewegt und voll deckend stehen** – gemessen 1,27 s (bei ×10 1,9 s), davon
  über eine Sekunde völlig still. Alles Flackernde, Wackelnde und der Farbzyklus laufen nur im
  Anschlag; danach steht die Schrift in der Ruhefarbe ihrer Stufe (kalt nach heiß: Cyan, Grün,
  Gelb, Amber, Magenta). Vorher standen die Texte 220–460 ms – zu kurz zum Lesen.
* **Kleine Melodien für die besonderen Momente.** Notiert als lesbare Tonfolge
  (`'G4:1 C5:1 E5:1 G5:1 …'`, gleichstufig mit A4 = 440 Hz), gespielt mit Pulswelle und
  Bassgang: *Stage Clear* nach dem Leerräumen, *Extend* wenn der Weltrekord fällt (setzt erst nach
  der Siegfanfare ein, damit sich beide nicht ins Gehege kommen), *Game Over* mit abstürzendem
  Schlusston, dazu je ein Stück für die Rettung und für eine neue Endlos-Runde. Die Töne haben
  absichtlich eine Lücke zwischen sich – so klingt ein Chip, der den Kanal kurz auf null
  schreibt.
* **Jede Kombostufe hat ihr eigenes Motiv.** Drei Noten ab ×2, vier ab ×5, fünf ab ×8, bei ×10
  die große Fanfare. Dasselbe Motiv rückt je Stufe eine Sprosse höher, und zwar entlang einer
  Durtonleiter (0 2 4 5 7 9 11 12 Halbtöne) – dadurch klingt die Reihe wie ein Aufstieg und
  nicht wie ein Sirenenlauf. Steigt die Kombo, spielt die Melodie **statt** des Trefferklangs:
  beides zusammen wären zwei Tonfolgen übereinander. Kurz gehalten, weil bei schnellem Spiel
  alle 300 ms der nächste Treffer kommt.
* **Chiptune** als zweite Tonstimme: Pulswellen mit 12,5/25/50 % Tastverhältnis über
  `PeriodicWave`, gefiltertes Rauschen für die Perkussion, Tonhöhenabfall in Stufen statt als
  Rutsch. Alles läuft über einen Sammelausgang mit weicher Begrenzung, weil Treffer + Zeile +
  Level-Up regelmäßig zusammenfallen.
* **Immer dunkel.** Eine Röhre in einem dunklen Raum hat keine Hell-Variante; die
  Hell/Dunkel-Umschaltung wird bei aktivem Arcade ausgeblendet.
* **`prefers-reduced-motion` schaltet jede Dauerbewegung ab** – Sternenfeld, Lichterkette,
  Laufschrift, Flackern, Ruckeln, Einschaltblitz. Der Stil bleibt vollständig lesbar, er steht
  dann nur still.

## Der Papier-Stil

Das Spiel kommt vom Papier – die Schwierigkeit „Klassisch" ist genau das Original vom Block.
Dieser Stil bringt es dorthin zurück.

* **Handgeschriebene Ziffern.** Eine eigene Schrift `ZP Hand` (4,9 kB), erzeugt von
  [`tools/gen-handfont.py`](tools/gen-handfont.py). Jede Ziffer ist eine Handvoll
  Stützpunkte, durch die eine Catmull-Rom-Kurve gelegt wird; die wird abgetastet, leicht
  gewellt, nach rechts geneigt und dann zur Strichkontur aufgeblasen – je Teilstück ein
  Rechteck, an Enden und scharfen Knicken ein Kreis, alles im selben Drehsinn, damit die
  Überlappungen unter der Nonzero-Regel zu einer Fläche verschmelzen. So sagt man dem
  Erzeuger, **wo der Stift langfährt**, statt Bézier-Griffe zu raten. Die Schrift kennt nur
  Ziffern und Rechenzeichen und steht darum ausschließlich an Stellen, an denen nichts als
  Zahlen steht – Buchstaben bleiben Nunito.
* **Gestrichen statt weg.** Der wichtigste Unterschied: eine aufgelöste Zahl verschwindet
  nicht, sie bekommt einen Bleistiftstrich. Das Blatt füllt sich im Lauf einer Partie, und man
  sieht am Ende, wie weit man gekommen ist. Dafür führt `app.js` an jeder Kachel ein
  `data-v` mit; die anderen Stile lesen es nicht.
* **Das Karo entsteht aus den Kacheln.** Jede zeichnet ihre obere und linke Kante als
  Innenschatten, die Außenkanten kommen vom Rahmen des Bretts. Damit sitzt das Raster
  *immer* exakt auf den Zellen, egal wie breit sie gerade sind – eine Hintergrundgrafik mit
  gerechneter Schrittweite hätte man bei jeder Spaltenzahl neu justieren müssen.
* **Der Stift markiert, statt zu füllen.** Ausgewählt = mit dem Stift eingekringelt (eine
  unregelmäßige Ellipse aus vier verschiedenen Eckradien), Tipp = doppelt eingekringelt in
  Blau, möglicher Partner = grüner Strich darunter, danebengegriffen = rot und zuckend.
  Auch die Knöpfe, Karten und Kästchen sind mit demselben Kniff „von Hand gezogen".
* **Im Dunkeln wird das Heft zur Tafel.** Dunkelgrün, Kreide, dasselbe Karo in Weiß. Der helle
  Papierschein fällt weg – er hob den Hintergrund an und drückte die Kartenbeschriftung auf
  3,4:1.

## Wenn ein Rekord fällt

### Wo der Weltrekord steht

Die drei Kärtchen über dem Brett sind gleich gebaut: **Titel, Zahl, eine Zeile darunter.**

| | Punkte | Übrig | Zeit |
|---|---|---|---|
| Zahl | Punktestand | übrige Kacheln | Spielzeit (in Endlos: Runde) |
| Zeile darunter | `Welt 4155 CHR` | `Mittel` | – |

Unter der Punktzahl steht also der **Weltrekord** der gespielten Stufe samt Kürzel dessen, der
ihn hält; im Arcade-Stil `WR 004155 CHR`, in der Sprache eines Automaten. Dort und nicht
anderswo, aus drei Gründen: es ist dieselbe Größe wie der Punktestand darüber – ein Wert, den
es zu schlagen gilt. Der Meldungsstreifen über dem Brett (`.ticker`) ist besetzt, dort liegen
Kombo-Plakette und Einblendungen, beide mittig. Und auf dem Brett selbst wäre er im Weg, das
ist Spielfläche.

Unter der Zahl der übrigen Kacheln steht die eingestellte **Schwierigkeit**. Sonst müsste man
dafür die Einstellungen aufmachen.

Die dritte Zeile ist **immer da, auch wenn sie leer bleibt** – im Zeit-Kärtchen ist sie das
immer, im Punktekärtchen dann, wenn kein Weltwert bekannt ist (Schalter aus, noch nie gelesen,
Stufe ohne Eintrag). Ihre Höhe ist reserviert (`min-height`), und das ist der ganze Grund: die
drei Kärtchen liegen in einer Reihe und werden auf dieselbe Höhe gezogen. Wäre die Zeile mal da
und mal nicht, hätten sie verschieden viel Inhalt – die Zahlen darüber stünden auf verschiedener
Höhe, und unter den kürzeren klaffte eine leere Fläche. Genau so sah es zwischendurch aus.

Die Zeile ist außerdem **so groß, wie sie sein darf**, statt fest: `clamp(9px, 2.3vw, 11px)`.
Gemessen passen in ein Kärtchen bei 320 px rund 79 px Text und bei 390 px rund 103 px, und
`Mondo 4155 CHR` – der breiteste wirkliche Fall aus drei Sprachen – braucht bei 9 px genau
noch 320 px. Nachgezählt über drei Sprachen, vier Breiten und alle Stile: der wirkliche Fall
steht überall einzeilig. Fünf- und sechsstellige Stände nehmen auf dem 320er zwei Zeilen –
nie drei, die Abnahme bleibt also grün –, und dafür die Zeile auf allen kleinen Schirmen zu
verkleinern lohnt einen Punktestand nicht, den bisher niemand erreicht hat. Der Automat bleibt
bei festen 8 px: seine Pixelschrift will ganze Pixel, und dort ist die Zahl ohnehin immer
sechsstellig aufgefüllt.

Die Zeile bleibt immer **einzeilig**; ein angehängtes „geknackt" bräuchte im schmalen Kärtchen
eine zweite. Dass die Marke gefallen ist, sagt die Farbe (siehe unten). Gemessen ist das mit
`check-ueberlauf.mjs`, dessen Weltliste ohnehin den breitesten Fall stellt: sechsstellige Zahl
plus Kürzel, in drei Sprachen, vier Breiten ab 320 px und allen vier Stilen.

### Auf dem Gerät steht nichts mehr

Bis 1.17 führte das Spiel neben dem Weltrekord eine zweite Liste: den eigenen Bestwert je
Stufe, auf dem Gerät gespeichert. Dazu kam eine Strichliste, wie viele Partien hier gespielt
und gewonnen wurden. Beides ist weg – die Bestwerte mit 1.18, die Strichliste mit 1.19 –,
mitsamt Anzeige, eigener Feier und den Einträgen im `localStorage`: `zp.best.v2` und
`zp.count.v1` werden beim Start einmal weggeräumt.

Der Grund ist derselbe wie beim Feld: zwei Ranglisten nebeneinander waren eine zuviel, und die
kleinere war die, die außer einem selbst nie jemand sieht. Es gibt jetzt genau eine Rangliste,
und die steht online. In den Einstellungen bleibt darum nur, was mit ihr zu tun hat: die
Weltrekorde je Stufe, die weltweite Zahl der Partien, der Schalter – und das **Kürzel**, das
Einzige in der Gruppe, das noch auf dem Gerät liegt. Es muss dort liegen: ohne Konto gibt es
keinen anderen Ort, an dem eine Unterschrift stehen könnte.

Damit hängt alles an einer Marke – und das macht die Oberfläche einfacher, nicht ärmer: ein
Band im Enddialog statt zwei, eine Feier statt zwei Größen, ein Kürzel statt eines je Stufe,
eine Liste statt zweier mit Überschriften dazwischen.

### Zwei antippbare Kärtchen

Das **Punktekärtchen** führt in die Einstellungen zu den **Weltrekorden**, das **mittlere** zur
**Schwierigkeit**. Beides steht dort, wo die Zahl darüber herkommt, und beides war vorher nur
über das Zahnrad und zwei weitere Tipps erreichbar. Die aufgeschlagene Gruppe wird dabei nach
oben geholt – Weltrekorde stehen ganz unten im Blatt, und wer über das Kärtchen kommt, will sie
sehen und nicht suchen.

Kein `<button>`, sondern `role="button"` mit `tabindex="0"`: die Kärtchen sind in vier Stilen
durchgestaltet, ein Knopf brächte seine eigenen Vorgaben mit. Was ein Knopf geschenkt bekommt,
kostet dann drei Zeilen Skript: ein `<div>` hört von sich aus weder auf Enter noch auf die
Leertaste, also liegt neben dem `click` noch ein `keydown`.

Weil der Weltrekord jetzt im Spielfeld steht, werden die Weltzahlen auch **beim Start**
geholt und nicht mehr nur beim Aufschlagen der Weltrekorde. Gewartet wird darauf nach wie vor
nicht: das Feld liegt sofort da, die Zeile kommt nach, und ohne Netz bleibt der letzte
bekannte Stand stehen. Wer den Schalter ausmacht, schickt weiterhin keine einzige Anfrage.

### Die Welle – und was danach bleibt

Fällt der Weltrekord, läuft **einmal eine goldene Welle über das Feld**, das Feld glüht nach,
die Punktekarte schlägt aus – dort ist die Zahl ja eingeschlagen –, dazu goldenes Konfetti,
ein eigener Klang und sieben Vibrationsstöße. Eineinhalb Sekunden, einmal je Partie.

Und dann bleibt etwas: **ab da trägt der Punktestand selbst die Rekordfarbe**, bis die Partie
zu Ende ist. Die Welle ist der Augenblick, die Farbe der Zustand – man sieht bei jedem Zug,
dass hier gerade ein Rekordlauf läuft. Ein Zug zurück nimmt sie nicht wieder weg; „ab da"
heißt ab da. Der Merker dafür hängt am Spielstand und nicht an einer Modulvariablen, also
überlebt er auch das Weglegen und Wiederaufnehmen einer Partie.

Die Farbe ist je Stil eine eigene, und zwar dieselbe für Punktestand, Weltzeile und Rand des
Kärtchens – eine Farbe für einen Zustand:

| Stil | Rekordfarbe | warum |
|---|---|---|
| Original | `#b8801f` | Gold, dieselbe Familie wie das goldene Konfetti |
| Material 3 | `--md-sys-color-tertiary` | die dritte Rolle des Systems, dort schon die Rekordfarbe |
| Automat | `--magenta-t` | in der Palette ausdrücklich „Kombo, Rekord" – und **nicht** Gelb: die Punktzahl ist dort ohnehin gelb |
| Papier | `#9a6a12` | ein Buntstift neben dem Bleistift |

Die Feier hält nichts auf: kein `locked`, keine Wartezeit, das Spiel läuft weiter. Wer
`prefers-reduced-motion` gesetzt hat, bekommt Ton und Vibration, aber keine Bewegung.

Auch die Welle hat je Stil ihre eigene Fassung. Im Automaten ist sie ein Balken, der in harten
`steps()` durchs Bild fährt, dazu blinkt der Rahmen gelb/orange; auf dem Papier ist sie ein
Textmarker, der einmal quer über die Seite gezogen wird, und das Feld bekommt einen Rand aus
demselben Stift.

Zwei Dinge, die dabei schiefgingen und darum hier stehen:

* **Die Welle ist ein verschobener Verlauf, und die Prozente muss man rechnen.** Bei
  `background-size: 260%` verschiebt eine Position von 100 % um −1,6 Bildbreiten, und der
  Streifen sitzt in der Mitte der Bahn. Der erste Wurf lief von 160 % auf −60 % – damit stand
  er die halbe Laufzeit außerhalb des Bildes und man sah einen Aufblitzer statt einer Welle.
  Richtig ist 130 % → −30 %: gerade eben links draußen bis gerade eben rechts draußen.
* **Eine beschleunigte Kurve taugt für eine Welle nicht.** Mit `cubic-bezier(.2,.7,.2,1)` war
  der Streifen nach einem Drittel der Zeit durch und den Rest unsichtbar. Eine Welle läuft
  gleichmäßig, also `linear` – im Automaten `steps()`, das ist dort dasselbe in hart.

Dazu ein Fehler, den erst der Browser zeigte: in Material 3 stand
`var(--md-sys-motion-easing-emphasized)` in der Kurzschreibweise – ein Merkmal, das es nicht
gibt (definiert sind nur `-standard`, `-emphasized-decelerate`, `-emphasized-accelerate`).
Ein unbekanntes Merkmal macht die **ganze** `animation`-Angabe ungültig, und damit lief gar
nichts. Zu sehen war das nur im Bild; die Klassen standen korrekt am Element. Seitdem wird
nicht mehr geschaut, ob die Klasse gesetzt ist, sondern was der Browser daraus rechnet
(`getComputedStyle`).

## Die Weltrangliste

In den Einstellungen unter **Weltrekorde** steht der Weltrekord je Stufe – mit dem Kürzel
dessen, der ihn hält –, dazu die Zahl der weltweit gespielten und gewonnenen Partien; der
Weltrekord der eingestellten Stufe steht außerdem klein im Spielfeld. Ohne Anmeldung, ohne
Konto, ohne Gerätemerkmal: hinaus geht, dass eine Partie gespielt und ob sie gewonnen wurde –
und bei einem **Rekord** der Punktestand samt Stufe und den drei Zeichen, die der Spieler
selbst gesetzt hat. Ein Schalter in derselben Gruppe stellt das ganz ab; dann geht keine
einzige Anfrage hinaus.

Dahinter liegt seit Fassung 1.21 eine **eigene Datenbank**: Cloudflare **D1** (SQLite) hinter
einem Worker auf `10.auer.page`. Zwei Adressen, mehr braucht das Spiel nicht:

| Adresse | Bedeutung |
|---|---|
| `GET /api/welt` | Weltrekord je Stufe samt Kürzel, dazu die beiden Zähler |
| `POST /api/partie` | eine beendete Partie: zählt mit, trägt einen Rekord ein, **wenn** es einer ist – und antwortet mit demselben Stand wie `/api/welt` |

Das ist **ein** Ruf beim Start und **einer** am Partieende. Vorher waren es siebzehn und vier.

### Warum überhaupt eine Datenbank

Vorher lag die Weltliste in `abacus.jasoncameron.dev`, einem öffentlichen Zähler ohne
Anmeldung und mit offenem CORS – dem einzigen von acht geprüften Diensten, der ohne Schlüssel
wirklich antwortet (jsonblob 403, kvdb.io „email required“, counterapi 410/404, extendsclass
404, keyvalue.immanuel.co 411; dreamlo wäre der richtige Dienst gewesen, liefert kostenlose
Listen aber nur über `http`, und gemischte Inhalte blockiert jeder Browser). Er kann genau
eines: **plus eins**. Was das gekostet hat, ist die eigentliche Begründung für den Umzug:

* Ein Punktestand musste als *Startwert* eines eigens angelegten Zählernamens hinein, ein
  zweiter Zähler zeigte als laufende Nummer darauf, das Kürzel lag als Zahl **zur Basis 37**
  daneben, und weil Schlüssel nach sechs Monaten verfallen, suchte das Lesen bis zu drei
  Nummern zurück.
* Für „lies den Höchststand, vergleiche, schreib nur wenn größer“ gab es keinen einzigen
  Aufruf – das waren drei Rufe, zwischen denen alles passieren konnte, notdürftig
  zusammengehalten von einem selbstgebauten Compare-and-Set über 409er. Zwei Regeln standen
  dort nicht aus Vorsicht im Code, sondern weil ihr Fehlen den Rekord zerstört hätte: der
  Zeiger durfte nur nachgezogen werden, wenn er wirklich hinterherhing (sonst zeigte er auf
  eine Nummer, die es nicht gibt – und ab vier Schritten Abstand galt *jede* Punktzahl als
  neuer Weltrekord), und ein bekannter Wert durfte nie durch einen kleineren ersetzt werden
  (der Zeiger verfällt für sich allein, und dann liest sich der Rekord kurzzeitig zu klein).
* Dazu eine eigene Bremse gegen die Drosselung des fremden Dienstes (30 Anfragen je 10
  Sekunden, dann 429).

In SQL ist davon **ein Satz** übrig, und in ihm steckt der ganze Grund:

```sql
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
SELECT ?1, ?2, ?3, ?4, 'spiel'
 WHERE ?2 > COALESCE((SELECT MAX(punkte) FROM rekorde WHERE stufe = ?1), 0)
```

Lesen, Vergleichen und Schreiben passieren in derselben Anweisung. Zwei Spieler, die im selben
Augenblick fertig werden, können sich hier nicht mehr gegenseitig überschreiben.

### Warum nicht Workers KV

Naheliegend, im selben Abonnement enthalten, und trotzdem falsch – aus drei Gründen, die alle
in der Cloudflare-Doku stehen:

* **Keine atomaren Operationen.** KV kennt kein „schreib nur, wenn größer“ und kein
  Compare-and-Set. Damit wäre genau der Behelf zurück, der oben weggefallen ist.
* **Am Ende konsistent, nicht sofort.** Ein Schreibvorgang ist weltweit erst nach bis zu einer
  Minute überall sichtbar. Wer einen Rekord aufstellt und die Liste aufschlägt, sähe womöglich
  den alten Stand – bei einem Spiel, in dem der Rekord der ganze Punkt ist.
* **1000 Schreibvorgänge am Tag** im kostenlosen Rahmen, und je *ein* Schlüssel höchstens
  einmal pro Sekunde.

KV ist ein Zwischenspeicher für Dinge, die selten geschrieben und oft gelesen werden.
Eine Bestenliste ist das Gegenteil.

### Was übernommen wurde

`migrations/0002_uebernahme.sql` ist **nicht abgetippt**, sondern aus einem Abzug des alten
Dienstes erzeugt: **alle 18 Rekorde** aller fünf Stufen mit ihren Kürzeln – nicht nur der
jeweils höchste – dazu die Zähler (115 Partien, 75 Siege). Der alte Dienst hatte die ganze
Reihe aufgehoben; damit gibt es vom ersten Tag an eine Bestenliste statt nur eines
Spitzenwerts. Die Spalte `wann` bleibt `NULL`: einen Zeitpunkt hat der alte Dienst nie
gespeichert, und ein erfundenes Datum wäre schlimmer als gar keines.

Die Übernahme ist **gegen ein zweites Ausführen abgesichert** (`WHERE NOT EXISTS`, und die
Zähler mit `DO NOTHING` statt `DO UPDATE`). `wrangler d1 migrations apply` merkt sich zwar, was
schon gelaufen ist – wer die Datei aber von Hand in die D1-Konsole des Dashboards einfügt, geht
an diesem Gedächtnis vorbei und hätte danach jeden Rekord doppelt und beim nächsten regulären
Lauf die Zähler auf den Stand der Übernahme zurückgesetzt. Nachgemessen: zweimal eingespielt,
danach immer noch 18 Rekorde, und ein inzwischen weitergelaufener Zähler blieb stehen.

Der erste Abzug war **falsch**, und beinahe wäre ein halber Datenbestand migriert worden: das
Abzugswerkzeug hat jede Antwort ungleich 200 als „diesen Schlüssel gibt es nicht“ gewertet –
die Drosselung des Dienstes (429) sah für es genauso aus wie ein fehlender Wert. Damit fielen
unter anderem der Klassisch-Rekord 1634/SES und fast alle Endlos-Einträge stillschweigend weg.
Aufgefallen ist es nur, weil der Abzug gegen einen Bildschirmabzug der Anzeige gehalten wurde.
Die Lehre steht jetzt im Werkzeug: 400 ms Abstand, fünf Wiederholungen mit wachsender Pause –
und ein **Abbruch**, sobald ein Schlüssel unlesbar bleibt. Lieber kein Abzug als ein halber.

### Was geprüft ist

`npm test` prüft die zwei Grenzen, an denen Fremdes ins Spiel kommt.
`pruefePartie()` in `worker.js` ist die einzige Stelle, an der etwas von außen in die
Datenbank übergeht – was hier durchrutscht, steht anschließend für alle in der Weltliste.
Bestanden wird deshalb auf dem **Typ** und nicht umgerechnet: `Number('')` ist 0 und
`Number(null)` auch, beides wäre ein gültiger Punktestand gewesen, und `String(['mittel'])`
ist `'mittel'` – ein Array hätte als Stufe durchgesehen. Die zweite Grenze ist
`hoechster()`/`uebernehmen()` in `online.js`: ein Fehler dort lässt einen Rekord verschwinden,
den es gibt, oder zeigt einen, den es nicht gibt.

`npm run check:welt` startet eine **echte lokale D1** samt `wrangler dev`, spielt neun
Abschnitte durch und räumt hinterher auf – der übernommene Bestand, eine schwache Partie
(zählt mit, ändert nichts), ein echter Rekord samt großgeschriebenem Kürzel, fünf Formen von
Unsinn (die mit 400 abgewiesen werden **und** nichts anfassen dürfen), unbekannte Adressen,
`/worker.js` als 404, und im Browser: genau ein Ruf beim Start, der Weltrekord im Spielfeld,
Schalter aus → kein einziger Ruf, Schnittstelle tot → trotzdem spielbar und ohne
Konsolenmeldung.

Der Abschnitt, wegen dem es die Datenbank gibt, ist der vierte: **drei Partien gehen im selben
Augenblick ein** (6000/AAA, 7000/BBB, 6500/CCC). Danach muss der Rekord bei 7000 stehen, den
Namen BBB tragen – und alle drei müssen gezählt sein. Ein gleich hoher Wert danach stiehlt den
Namen nicht.

Der neunte Abschnitt steht dort wegen eines Fehlers, den der Umzug **selbst** gemacht hat. Der
Service Worker ließ bis dahin alles Fremde in Ruhe und speicherte alles Eigene – eine Regel,
die genau so lange richtig war, wie die Weltzahlen von einem fremden Host kamen. Seit sie unter
derselben Adresse liegen wie das Spiel, fiel `/api/welt` unter „eigen“: der Arbeiter legte die
Antwort ab, und offline hätte er auf eine Frage nach Zahlen `index.html` gereicht. Der Kommentar
über der Stelle hatte beides wörtlich vorhergesagt, nur hing die Bedingung an der Herkunft statt
am Pfad. Jetzt hängt sie am Pfad, und die Prüfung sieht im Offline-Speicher nach, ob dort etwas
mit `/api/` liegt. Gegengeprobt: ohne die eine Zeile fällt sie durch – eine Prüfung, die auch
ohne den Fix besteht, prüft nichts.

Die Vorgängerfassung dieser Prüfung war 591 Zeilen lang und prüfte zu neun Zehnteln Probleme,
die es nicht mehr gibt: verfallende Schlüssel, die Drosselung, ein Zeiger, der seinem Stand
vorausläuft. Sie ist mit dem Umzug auf 200 Zeilen geschrumpft – das ist der Umzug in einer
Zahl.

Und weil die Entwicklungsumgebung weder an `10.auer.page` noch an `cauer71.github.io` kommt
(der Proxy weist beides mit 403 ab), gibt es dafür eine eigene Abnahme auf einem Läufer:
[`.github/workflows/abnahme-live.yml`](.github/workflows/abnahme-live.yml) öffnet **beide**
Adressen mit einem echten Browser und prüft, dass die Fassung stimmt, dass genau ein Leseruf
hinausgeht, dass der Weltrekord im Feld steht und dass **keine einzige Konsolenmeldung**
entsteht. Beide Adressen, weil die Pages-Fassung ihre Zahlen über Kreuz holt und damit an
einem CORS-Kopf hängt, der sonst still ausfiele. Sie läuft nur auf Zuruf und **schreibt
bewusst nichts**: ein Zählruf würde die Weltzahlen mit einer Partie füllen, die niemand
gespielt hat. Vorher und nachher wird der Bestand gelesen und verglichen.

**Was das nicht ist:** eine Wettkampfliste. Weil niemand angemeldet ist, kann jeder eintragen,
was er will – das steht auch so in der Oberfläche. Die Punkteschranke im Worker (eine Million;
der höchste je erreichte Stand lag bei 12 503) ist deshalb kein Schutz gegen Betrug, sondern
gegen Unsinn. Und es ist ein Einzelstück ohne Zusage: fällt die Datenbank aus, bleibt das
Spiel unverändert spielbar, die Weltwerte fehlen dann einfach.

## Schriften und Lizenzen

* **Nunito** (`fonts/nunito-latin-var.woff2`, 39 kB) – SIL Open Font License 1.1,
  Volltext in [`fonts/OFL.txt`](fonts/OFL.txt).
* **Roboto** (`fonts/roboto-latin-var.woff2`, 43 kB) und die **Material Symbols** im
  Icon-Sprite der `index.html` – Apache License 2.0, Volltext in
  [`fonts/APACHE-2.0.txt`](fonts/APACHE-2.0.txt).
* **ZP Pixel** (`fonts/zp-pixel.woff2`, 2,0 kB – 97 Zeichen inkl. Umlauten, Gravis und Akut),
  **ZP Hand** (`fonts/zp-hand.woff2`, 4,9 kB)
  und die Pixel-Icons – für dieses Projekt gezeichnet, gemeinfrei (CC0). Kein Nachladen von
  fremden Servern, keine Lizenzfrage.

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
* **Punkte zählen bezogen auf selbst geholte Zahlen.** Auffüllen hängt die übrigen Zahlen noch
  einmal an, *verdoppelt* also das Feld. Fünfmal Auffüllen vor dem ersten Zug macht aus 54
  Zahlen 1728 – in der Oberfläche nachgetippt – und aus 3100 Punkten rund 53000, in Leicht sogar
  91000. Der Bestwert hätte damit nicht Können belohnt, sondern fünf Tipps auf denselben Knopf.
  Seither ist ein Treffer weniger wert, je mehr Zahlen man sich selbst geholt hat: doppelt so
  viele Zahlen, halber Wert. Eine geholte Zahl wiegt dabei anderthalbfach, weil der Kombo-Anlauf
  einmal je Partie anfällt und auf einem aufgeblähten Feld nicht auffällt; über 300 Partien ×
  5 Stufen × 4 Spielweisen lag Schummeln bei Gewicht 1,0 noch 6–11 % vorn, bei 1,5 klar hinten
  (77–84 % von sauberem Spiel). Sauberes Spiel kostet das 1–2 %, im Endlos-Modus 5 %. Neue
  Runden im Endlos-Modus zählen *nicht* als geholt – sie sind der Lohn fürs leergeräumte Feld.
* **Verworfen: das Mischen beim Auffüllen.** Über 500 Partien je Stufe hebt es die Siegquote von
  85/79/58 % auf 91/84/67 % – und es nimmt dem Spiel das Vorausplanen: in Leserichtung weiß man,
  welche Zahl nach dem Auffüllen wo liegt. Beides Gründe, beim Original zu bleiben.
* **Warum am Ende immer dieselben Ziffern kommen.** Auffüllen hängt genau das an, was noch
  liegt. Wer nur noch 7en und 8en hat, bekommt 7en und 8en – die beiden passen nur zu sich
  selbst (7+8 = 15), ihre Partner 3 und 2 sind dann längst weg. Über 400 Partien je Stufe blieb
  bei jeder zweiten Niederlage nur noch **eine oder zwei verschiedene Ziffern** übrig. Nicht ein
  einziges Mal war der Rest rechnerisch unpaarbar – es scheitert immer an der Nachbarschaft,
  nie an der Anzahl. Deshalb greift die Umsortierung genau dort und nicht früher.
