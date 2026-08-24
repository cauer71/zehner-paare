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

Dieselbe Aufgabe jedes Mal heißt: der Bestwert dieser Stufe vergleicht wirklich das Können und
nicht das Glück. Weil das nach einem Fehler aussieht, wenn man mehrmals auf „Neu" tippt, sagt
das Spiel es beim Start einer Klassisch-Partie kurz an. Die vier anderen Stufen würfeln jedes
Mal neu.

Diagonale und Zeilenumbruch lassen sich in den Einstellungen abschalten – das Video, das die
Vorlage war, zeigt nur waagrecht und senkrecht.

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
* Der Bestwert der Stufe steht während des Spiels in der Punktekarte – und wird gefeiert,
  sobald er fällt.
* Wer seinen Bestwert einer Stufe schlägt, bekommt am Ende eine eigene kleine Feier:
  Strahlenkranz hinter dem Pokal, goldenes Konfetti, hochlaufende Punktzahl.

Die **Einstellungen** stehen in fünf aufklappbaren Gruppen – Spiel, Darstellung, Ton &
Vibration, Sprache, Bestwerte. Vorher war es eine Liste von sieben Abschnitten am Stück, die
auf einem Handy nicht mehr auf einen Blick passte. Es ist immer höchstens eine Gruppe offen,
und welche das war, bleibt gemerkt. Damit man zum Nachsehen nicht aufklappen muss, steht in
jeder Kopfzeile rechts der aktuelle Zustand („Mittel · Diagonal · Umbruch", „Papier · Auto",
„Automatisch · Deutsch"). Gebaut mit `<details>`/`<summary>` – Tastatur und Vorlesehilfe
kommen damit von Haus aus zurecht, ohne eine Zeile Skript für das Auf und Zu.

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
npm test               # Regeltests und Woerterbuchtests
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
| `index.html` | Markup inkl. Regel-, Einstellungs- und Enddialog |
| `classic.css`, `material3.css`, `m3-colors.css`, `arcade.css`, `papier.css`, `kontrast.css` | die fünf Stile und die erzeugten M3-Farbrollen |
| `sw.js` | Offline-Cache |
| `manifest.{de,it,en}.webmanifest` | erzeugt aus `i18n.js`, je Sprache eines |
| `tools/` | Erzeuger (M3-Farbrollen, Pixelschrift, Handschrift, Pixel-Icons, App-Icons, Manifeste) und Prüfungen (`check-ueberlauf.mjs`, `check-platz.mjs`, `check-welt.mjs`) |

Die Logik in `game.js` kennt kein DOM: `createGame`, `canMatch`, `applyMatch`, `refill`,
`rescue`, `nextRound`, `findPair`, `undo`. Wer eine andere Oberfläche bauen will, braucht nur
diese Datei.

Kombo-Plakette und Hinweise haben eine eigene, feste Zeile zwischen Fortschrittsbalken und
Brett (`.ticker`). Vorher schwebten beide über dem Feld und verdeckten je nach Bildschirmhöhe
bis zu 14 Kacheln – ausgerechnet die eben angehängten.

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
eingesetzt** und geprüft, ob sie anschlägt – über 320/360/390 px und alle fünf Stile.

Zum Schluss die Abnahme über alles ([`tools/check-ueberlauf.mjs`](tools/check-ueberlauf.mjs)):
**drei Sprachen × vier Bildschirmbreiten × fünf Stile × sieben Spiellagen = 420 Zustände.** Je
Zustand vier Fragen ohne Auslegungsspielraum:

1. Scrollt die Seite waagrecht? Das ist die wichtigste Frage – siehe oben, bei `1fr` und
   `flex: 1` schlägt nicht der Knopf an, sondern die Seite.
2. Ist bei einem begrenzten Feld der Inhalt breiter als das Feld? `scrollWidth > clientWidth`
   verrät das auch bei `overflow: visible`.
3. Braucht eine Beschriftung mehr Zeilen als vorgesehen? Exakt gezählt über
   `Range.getClientRects()` – jede Zeile ist ein eigenes Rechteck. Über die Zeilenhöhe zu
   rechnen ging schief, weil `line-height` mal `normal` und mal eine Zahl ist.
4. Verlässt eine Einblendung den Meldungsstreifen über dem Brett?

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

## Fünf Stile

Unter **Einstellungen → Darstellung** lässt sich zwischen fünf Oberflächen umschalten:

* **Original** (Voreinstellung) – warmes Papierweiß, runde weiße Spielsteine, beschriftete
  Knopfleiste, Schrift Nunito.
* **Material 3** – Farbrollen nach Material You, Top App Bar, Bottom App Bar mit erweitertem
  FAB, modale Bottom Sheets mit Griff, Chips, Switches, Snackbar, Zustandsebenen und Ripple,
  Schrift Roboto, Icons aus den Material Symbols (Rounded).
* **Arcade** – ein Spielautomat von 1989: Neon auf Schwarz, eigene Pixelschrift, Pixel-Icons,
  Bildröhren-Raster, laufende Lichterkette, Sternenfeld, Chiptune. Siehe unten.
* **Papier & Bleistift** – das Rechenheft, aus dem das Spiel kommt: Karo, handgeschriebene
  Ziffern, gestrichene Zahlen bleiben stehen. Im Dunkeln Tafel und Kreide. Siehe unten.
* **Hochkontrast** – schwarz, weiß, ein Gelb. Dicke Rahmen, große Ziffern, große
  Tippflächen, keine Bewegung. Für die Sonne und für Augen, die nicht mehr zwanzig sind.
  Siehe unten.

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
| `kontrast.css` | Skin „Hochkontrast" |

Dass ein neuer Stil *vollständig* ist, wird nicht per Augenschein entschieden: ein Prüfskript
erntet in allen Stilen jedes Element mit stabilem Pfad und vergleicht. Für die beiden neuen
Stile: **296 Elemente, keines fehlt, keines unsichtbar, keines in einer fremden Schrift,
keines ohne Fläche, Rahmen oder Linie** – bis auf das Brett im Hochkontrast, wo die Kacheln
mit ihren 3-px-Rahmen bewusst alles allein tragen.

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
  Bassgang: *Stage Clear* nach dem Leerräumen, *Extend* wenn der Bestwert fällt (setzt erst nach
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

## Der Hochkontrast-Stil

Drei Farben, dicke Linien, nichts bewegt sich.

* **Nur Papierweiß, Tiefschwarz und ein Signalgelb.** Kein Rot und kein Grün als einziges
  Unterscheidungsmerkmal. Jeder Zustand hat zusätzlich eine eigene *Form*: gewählt = gelb
  gefüllt, möglicher Partner = gestrichelter Rahmen, Tipp = gelb mit zweitem Innenrahmen,
  danebengegriffen = umgekehrt (schwarze Fläche, weiße Zahl), gestrichen = flächig grau ohne
  Rahmen. Gemessen aus den Bildpunkten des fertigen Bildes: **7:1 bis 21:1**, hell wie dunkel.
* **Alles größer.** Ziffern bis 40 px, Bedienknöpfe ab 52 px, Kippschalter 56 × 40 px,
  Rahmen 3 px. Die Kacheln selbst bleiben bei 9 Spalten auf einem 390-px-Bildschirm rund
  38 px breit – das gibt das Raster vor, nicht der Stil.
* **Kein Kippschalter, ein Kästchen.** An ist gefüllt *und* trägt einen Haken, aus ist leer –
  das erkennt man auch ohne Farbe. Gewählte Chips sind gelb *und* unterstrichen.
* **Nichts bewegt sich.** Alle Dauern gehen auf fast null – nicht auf `animation: none`:
  `app.js` räumt Funken, Ringe und Wellen ab, wenn ihre Animation zu Ende ist; ohne Animation
  bliebe das Ereignis aus und die Elemente sammelten sich an. (Dieselbe Falle steckte bisher
  auch in den anderen Stilen: die Material-Welle ist dort auf `display:none` gesetzt und wurde
  nie wieder entfernt. Jetzt gibt es zusätzlich einen Wecker.)
* **Der Punktezuwachs fällt aus.** In den anderen Stilen schwebt „+70" weg und ist nach einer
  Sekunde vorbei. Ohne Bewegung bliebe er als gelber Kasten mitten auf dem Feld stehen und
  deckte gerade die Zahlen zu, um die es geht – bei schnellem Spiel sogar mehrere übereinander.
  Der Punktestand oben ist groß, schwarz und sofort aktuell; das reicht.

## Weltweite Zähler

In den Einstellungen unter **Bestwerte** stehen zwei Listen: die Bestwerte dieses Geräts und
die Weltrekorde je Stufe, dazu die Zahl der weltweit gespielten und gewonnenen Partien. Alles
anonym – hinaus geht ein Zählimpuls, kein Name, kein Gerät, keine Kennung. Ein Schalter in
derselben Gruppe stellt das ganz ab; dann geht keine einzige Anfrage hinaus.

Der Dienst dahinter ist `abacus.jasoncameron.dev`, ein öffentlicher Zähler ohne Anmeldung und
mit offenem CORS. Er war der einzige von acht geprüften Kandidaten, der ohne Schlüssel und ohne
Anmeldung wirklich antwortet (jsonblob 403, kvdb.io „email required", counterapi 410/404,
extendsclass 404, keyvalue.immanuel.co 411). Geprüft wurde auf einem GitHub-Läufer, weil die
Entwicklungsumgebung nur an Paketregister und GitHub kommt.

**Ein Zähler kennt nur „plus eins" – wie steht dann ein genauer Punktestand darin?** Über den
Startwert beim Anlegen: `create/:raum/:name?initializer=8450` legt einen Namen mit genau diesem
Wert an und antwortet beim zweiten Mal mit 409, ohne den Wert anzutasten. Also zeigt ein Zähler
`best-mittel-gen` auf die laufende Nummer des Rekords, und jede Nummer ist ein eigener Name
`best-mittel-v3` mit dem Punktestand als Startwert. Lesen kostet zwei Anfragen, ein neuer Rekord
drei. Wer gleichzeitig einträgt, bekommt 409 und versucht es beim nächsten Partieende erneut.

Gemessene Grenzen, die den Entwurf bestimmt haben:

* **30 Anfragen je 10 Sekunden je Adresse**, dann 429. Deshalb eine eigene Bremse (18 je 10 s,
  120 ms Abstand) und nach einer 429 eine halbe Minute Funkstille. Ein Verfahren, das einen
  Rekord durch wiederholtes „plus eins" hochzählt, wäre daran gescheitert.
* **Ein Schlüssel lebt 6 Monate ab dem Anlegen.** Ein Zugriff verlängert das *nicht* – die Doku
  behauptet das Gegenteil, gemessen ist es nicht so. Darum sucht das Lesen bis zu drei Nummern
  zurück, und was fehlt, trägt der nächste Spieler wieder ein: der Eintrag heilt sich selbst.
* Weltzahlen werden erst geholt, wenn jemand die Gruppe **Bestwerte** aufschlägt, und dann
  höchstens alle fünf Minuten neu. Wer nur spielen will, wartet auf niemanden.

**Was das nicht ist:** eine Wettkampfliste. Weil niemand angemeldet ist, kann jeder eintragen,
was er will – das steht auch so in der Oberfläche. Und es ist ein Einzelstück ohne Zusage:
fällt der Dienst aus, bleibt das Spiel unverändert spielbar, die Weltwerte fehlen dann einfach.
Beides ist geprüft (`tools/check-welt.mjs`): der Dienst ist dort im Browser nachgebaut, mit
genau der gemessenen Semantik, und elf Lagen werden abgenommen – erster Rekord, besserer
Rekord, schwächere Partie, verfallener Schlüssel, 429, Netzausfall, abgeschalteter Schalter,
die Anzeige selbst, eine Partie mit Rettung (die genau *einmal* zählen darf, obwohl das
Spielende zweimal durchläuft) und der Klemmfall: geht das Netz zwischen „Stand anlegen" und
„Zeiger nachziehen" verloren, zeigt der Zeiger auf den alten Stand und jeder weitere Versuch
trifft auf eine belegte Nummer. Wer dort aufgibt, kommt nie wieder durch – also wird die
belegte Nummer gelesen, der Zeiger nachgeholt und eine Nummer weiter versucht.

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
