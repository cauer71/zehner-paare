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
  [Weltweite Zähler](#weltweite-zähler)).

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

## Entwicklung

Keine Abhängigkeiten, kein Bundler. Lokal starten:

```bash
npm start          # oder: python3 -m http.server 4173
# http://localhost:4173/
```

Regeltests (21 Stück, decken Nachbarschaften, Zeilenentfernung, Auffüllen, Undo und
Serialisierung ab):

```bash
npm test               # Regeltests, Woerterbuchtests und die Kuerzel-Umrechnung
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
| `online.js` | die weltweiten Zähler (anonym, abschaltbar) |
| `i18n.test.js` | prüft die Wörterbücher gegeneinander |
| `online.test.js` | prüft die Umrechnung des Kürzels für die Weltliste |
| `index.html` | Markup inkl. Regel-, Einstellungs- und Enddialog |
| `classic.css`, `material3.css`, `m3-colors.css`, `arcade.css`, `papier.css` | die vier Stile und die erzeugten M3-Farbrollen |
| `sw.js` | Offline-Cache |
| `manifest.{de,it,en}.webmanifest` | erzeugt aus `i18n.js`, je Sprache eines |
| `tools/` | Erzeuger (M3-Farbrollen, Pixelschrift, Handschrift, Pixel-Icons, App-Icons, Manifeste) und Prüfungen (`check-ueberlauf.mjs`, `check-platz.mjs`, `check-welt.mjs`) |

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

### Bestwerte dieses Geräts gibt es nicht mehr

Bis 1.17 führte das Spiel neben dem Weltrekord eine zweite Liste: den eigenen Bestwert je
Stufe, auf dem Gerät gespeichert. Sie ist seit 1.18 **ersatzlos weg**, mitsamt ihrer Anzeige,
ihrer eigenen Feier und ihrem Eintrag im `localStorage` (`zp.best.v2` wird beim Start einmal
weggeräumt). Zwei Ranglisten nebeneinander waren eine zuviel, und die kleinere war die, die
außer einem selbst nie jemand sieht. Was bleibt, ist eine Strichliste ohne Rangfolge: wie
viele Partien auf diesem Gerät gespielt und gewonnen wurden. Das ist kein Rekord, das ist ein
Zähler.

Damit hängt alles an einer Marke – und das macht die Oberfläche einfacher, nicht ärmer: ein
Band im Enddialog statt zwei, eine Feier statt zwei Größen, ein Kürzel statt eines je Stufe.

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

## Weltweite Zähler

In den Einstellungen unter **Weltrekorde** steht der Weltrekord je Stufe – mit dem Kürzel
dessen, der ihn hält –, dazu die Zahl der weltweit gespielten und gewonnenen Partien und, als
eigene Strichliste, wie viele Partien auf diesem Gerät gespielt und gewonnen wurden. Ohne Anmeldung, ohne Konto, ohne Gerätemerkmal:
hinaus geht ein Zählimpuls, und bei einem **Weltrekord** der Punktestand samt Stufe und den
drei Zeichen, die der Spieler selbst gesetzt hat. Ein Schalter in derselben Gruppe stellt das
ganz ab; dann geht keine einzige Anfrage hinaus – und ohne eigenes Kürzel geht auch keines
hinaus, dann fehlt der Ruf einfach.

Der Dienst dahinter ist `abacus.jasoncameron.dev`, ein öffentlicher Zähler ohne Anmeldung und
mit offenem CORS. Er war der einzige von acht geprüften Kandidaten, der ohne Schlüssel und ohne
Anmeldung wirklich antwortet (jsonblob 403, kvdb.io „email required", counterapi 410/404,
extendsclass 404, keyvalue.immanuel.co 411). Geprüft wurde auf einem GitHub-Läufer, weil die
Entwicklungsumgebung nur an Paketregister und GitHub kommt.

Bevor das Kürzel in den Zähler gerechnet wurde, noch einmal nachgesehen, ob inzwischen ein
Dienst die Liste **samt Namen** führen könnte. Ergebnis: es bleibt beim Zähler.

* **dreamlo.com** wäre genau der richtige Dienst – Bestenlisten ohne Anmeldung, Name und Punkte,
  offenes CORS, „derselbe Name zweimal → der höhere Wert gilt", alles über einfache
  GET-Adressen. Nur liegen die kostenlosen Listen auf `http`, und **SSL kostet eine Spende**
  („Want to use https (SSL)? Donate $5 or more and let me know"). Gemessen: über `https`
  antwortet er `ERROR:SSL not enabled for this leaderboard.`, über `http` läuft der ganze
  Ablauf durch. Eine Seite auf GitHub Pages ist `https`, und gemischte Inhalte blockiert jeder
  Browser – damit fällt er aus, solange die Spende nicht geflossen ist. Dazu: höchstens 25
  Einträge je Liste, und der private Code müsste im Quelltext stehen; wer ihn liest, kann die
  Liste leeren.
* **jsonblob.com** – voller JSON-Speicher, offenes CORS, kein Schlüssel – antwortet Nicht-Browsern
  mit einer Cloudflare-Sperre (403), und ungenutzte Blobs verfallen.
* **jsonstorage.net** („Create operation requires API key"), **json.extendsclass.com** („Wrong
  API key"), **npoint.io** (500 beim Anlegen), **getpantry.cloud** (kein anonymes Anlegen) und
  **keyvalue.immanuel.co** (API weg, 404) verlangen heute ein Konto oder existieren nicht mehr.
* **LEADR, LootLocker, PlayFab, GameJolt** und ebenso **Firebase, Supabase oder ein eigener
  Cloudflare-Worker** sind haltbar und für diese Größenordnung kostenlos – setzen aber ein Konto
  und einen selbst betriebenen Dienst voraus. Das wäre der Weg für eine echte Top-10-Liste mit
  Namen; für drei Zeichen neben dem Weltrekord braucht es ihn nicht.

**Ein Zähler kennt nur „plus eins" – wie steht dann ein genauer Punktestand darin?** Über den
Startwert beim Anlegen: `create/:raum/:name?initializer=8450` legt einen Namen mit genau diesem
Wert an und antwortet beim zweiten Mal mit 409, ohne den Wert anzutasten. Also zeigt ein Zähler
`best-mittel-gen` auf die laufende Nummer des Rekords, und jede Nummer ist ein eigener Name
`best-mittel-v3` mit dem Punktestand als Startwert. Wer gleichzeitig einträgt, bekommt 409 und
versucht es beim nächsten Partieende erneut.

**Und ein Kürzel? Der Dienst hält doch nur Zahlen.** Dann muss das Kürzel eine Zahl sein: drei
Zeichen zur Basis 37, wobei 0 „kein Zeichen" heißt, 1–10 die Ziffern und 11–36 die Buchstaben
sind. `CAU` wird so zu 18235, größter Wert ist 50652. Die Null muss frei bleiben, weil ein
fehlender Zähler beim Lesen als 0 zurückkommt – „kein Kürzel" und `AAA` dürfen nicht dasselbe
sein. Die Zahl liegt in einem eigenen Namen `best-mittel-k3` **neben** dem Punktestand und
nicht in ihn hineingerechnet: in `best-mittel-v3` stehen Werte aus der Zeit vor dem Kürzel, und
eine Zahl allein sagt nicht, nach welcher Regel sie zu lesen ist. So bleiben alte Rekorde
gültig und haben eben kein Kürzel. Angelegt wird das Kürzel **vor** dem Nachziehen des Zeigers:
wer den Rekord findet, findet den Namen dazu schon vorliegen. Geht der Ruf verloren, steht der
Rekord ohne Namen da – der Punktestand ist die Pflicht, das Kürzel die Kür.

Das kostet eine Anfrage je Stufe: Lesen sind jetzt 17 Anfragen (zwei Zähler, je Stufe Zeiger,
Stand und Kürzel), ein neuer Rekord vier statt drei. Beides liegt unter der eigenen Bremse von
18 je 10 Sekunden; wer die Weltrekorde zweimal kurz hintereinander aufschlägt, wartet ein paar
Sekunden länger auf frische Zahlen, sieht aber sofort den letzten bekannten Stand.

Die Umrechnung selbst ist die einzige Stelle, an der aus Zeichen eine Zahl wird – und geht sie
schief, steht in der Weltliste still ein falscher Name. Deshalb prüft sie
[`online.test.js`](online.test.js) für **alle 47 988 möglichen Kürzel** (ein, zwei und drei
Zeichen) auf den Rundweg, dazu die leere Eingabe, Kleinbuchstaben, Überlanges und
unbrauchbare Werte vom Dienst. Der erste Wurf fiel dabei durch: `indexOf('')` gibt 0 und nicht
−1, eine leere Stelle wurde damit zur `0` und aus dem leeren Kürzel die Zahl 1407.

Gemessene Grenzen, die den Entwurf bestimmt haben:

* **30 Anfragen je 10 Sekunden je Adresse**, dann 429. Deshalb eine eigene Bremse (18 je 10 s,
  120 ms Abstand) und nach einer 429 eine halbe Minute Funkstille. Ein Verfahren, das einen
  Rekord durch wiederholtes „plus eins" hochzählt, wäre daran gescheitert.
* **Ein Schlüssel lebt 6 Monate ab dem Anlegen.** Ein Zugriff verlängert das *nicht* – die Doku
  behauptet das Gegenteil, gemessen ist es nicht so. Darum sucht das Lesen bis zu drei Nummern
  zurück, und was fehlt, trägt der nächste Spieler wieder ein: der Eintrag heilt sich selbst.
* Weltzahlen werden beim **Start** geholt und wenn jemand die Gruppe **Weltrekorde**
  aufschlägt, in beiden Fällen höchstens alle fünf Minuten neu. Beim Start, seit der
  Weltrekord im Spielfeld steht – vorher geschah es nur beim Aufschlagen. Geholt werden dann
  gleich alle fünf Stufen: das kostet dieselbe Runde und deckt danach jeden Wechsel der
  Schwierigkeit ab, ohne dass beim Umschalten eine leere Zeile stehen bliebe. Gewartet wird
  auf nichts davon, wer nur spielen will, wartet auf niemanden.
* Gelesen wird über `/info` und nicht über `/get`, obwohl beide dasselbe sagen: `/get`
  antwortet auf einen unbekannten Namen mit 404, `/info` mit 200 und `"exists": false`. Beim
  ersten Start existiert nichts, das wären also sieben rote 404-Zeilen in der Browserkonsole –
  harmlos, aber sie sehen nach einem Fehler aus. So darf die Abnahme streng bleiben und
  „keine Konsolenmeldung" verlangen.

**Was das nicht ist:** eine Wettkampfliste. Weil niemand angemeldet ist, kann jeder eintragen,
was er will – das steht auch so in der Oberfläche. Und es ist ein Einzelstück ohne Zusage:
fällt der Dienst aus, bleibt das Spiel unverändert spielbar, die Weltwerte fehlen dann einfach.
Beides ist geprüft (`tools/check-welt.mjs`): der Dienst ist dort im Browser nachgebaut, mit
genau der gemessenen Semantik, und dreizehn Abschnitte werden abgenommen – erster Rekord,
besserer Rekord, schwächere Partie (samt Übernahme eines fremden, höheren Rekords),
verfallener Schlüssel, 429, Netzausfall, abgeschalteter Schalter, die Anzeige selbst, eine
Partie mit Rettung (die genau *einmal* zählen darf, obwohl das Spielende zweimal durchläuft),
das Kürzel auf dem ganzen Weg (eintippen, hinausgehen, zurückkommen, angezeigt werden – dazu
der alte Rekord ohne Kürzel, das leere Kürzel, das gar keinen Ruf auslösen darf, und ein
unbrauchbarer Wert vom Dienst, der keine erfundenen Zeichen ergeben darf)
und der Klemmfall: geht das Netz zwischen „Stand anlegen" und „Zeiger nachziehen" verloren,
zeigt der Zeiger auf den alten Stand und jeder weitere Versuch trifft auf eine belegte Nummer.
Wer dort aufgibt, kommt nie wieder durch – also wird die belegte Nummer gelesen, der Zeiger
nachgeholt und eine Nummer weiter versucht.

Zwei Regeln stehen dabei nicht aus Vorsicht im Code, sondern weil ihr Fehlen den Rekord
zerstört hätte:

* **Der Zeiger darf nur nachgezogen werden, wenn er wirklich hinterherhängt.** Tragen zwei
  Browser gleichzeitig ein, bekommt einer die 409; erhöht *er* den Zeiger ebenfalls, zeigt
  dieser auf eine Nummer, die es nicht gibt. Dieser Abstand heilt nicht von selbst und wächst
  mit jedem Zusammenstoß – ab vier Schritten findet das Lesen nichts mehr, und dann gilt jede
  beliebige Punktzahl als neuer Weltrekord. Also wird vorher noch einmal nachgesehen.
* **Ein Weltrekord fällt nie.** Der Zeiger verfällt nach sechs Monaten für sich allein (er
  wird einmal angelegt und danach nur erhöht, und Erhöhen verlängert die Frist nicht), während
  die späteren Stände noch leben. Dann liest sich der Rekord kurzzeitig zu klein. Ein bekannter
  Wert wird deshalb nie durch einen kleineren ersetzt.

Und weil die Entwicklungsumgebung weder an `cauer71.github.io` noch an den Dienst kommt (der
Proxy weist beides mit 403 ab), gibt es dafür eine eigene Abnahme auf einem Läufer:
[`.github/workflows/abnahme-live.yml`](.github/workflows/abnahme-live.yml) öffnet die fertige
Seite mit einem echten Browser, schlägt **Weltrekorde** auf und prüft, dass die Leserufe wirklich
beim Dienst ankommen, dass die Fassung stimmt und dass **keine einzige Konsolenmeldung**
entsteht. Sie läuft nur auf Zuruf und **schreibt bewusst nichts**: ein Zählruf würde die
Weltzahlen mit einer Partie füllen, die niemand gespielt hat, und womöglich den ersten
Weltrekord auf einen Botwert setzen. Nach dem Lauf wird nachgesehen, dass der Namensraum
unberührt ist.

Gefunden hat das eine gegnerische Durchsicht des fertigen Codes durch fünf unabhängige
Leser mit verschiedenen Blickwinkeln (Protokoll, Ausfälle, Zählung, Privatheit, Oberfläche),
deren Funde einzeln widerlegt werden mussten, bevor sie gelten durften: von zwanzig
Behauptungen blieben acht übrig. Drei betrafen den Prüfstand selbst – unter anderem bestanden
zwei Abschnitte aus dem falschen Grund, weil die Strafpause aus dem 429-Test noch nachwirkte.
Eine Prüfung, die aus dem falschen Grund besteht, ist schlimmer als keine.

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
