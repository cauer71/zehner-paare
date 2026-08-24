/* =========================================================================
   Zehner-Paare – Sprachen

   Deutsch, Italienisch, Englisch. Deutsch ist die Quelle: dort steht der
   Text, wie er gemeint ist, die anderen beiden folgen ihm.

   Warum eine eigene Datei und kein Fremdpaket: es sind knapp 140 Sätze und
   ein Platzhalter-Ersetzer. Alles, was ein Paket sonst noch mitbringt –
   Pluralregeln nach CLDR, Datumsformate, Nachladen einzelner Sprachen –
   braucht dieses Spiel nicht. Die Mehrzahl kommt hier immer mit einer Zahl
   davor ("3 Zeilen"), und die drei Sprachen bilden 1 und n gleich.

   Wichtig für alles, was hier drinsteht: **der Text muss in sein Feld
   passen.** Die Knopfleiste unten, die Chips und die Statuskarten sind
   schmal, und auf 320 px ist die Beschriftung der Leiste auf nowrap
   gestellt – ein zu langes Wort läuft dort wirklich hinaus. Bei jedem
   Schlüssel, wo es eng ist, steht das gemessene Budget als Kommentar
   dabei. Geprüft wird das nicht per Augenmaß, sondern von
   tools/check-ueberlauf.mjs über drei Sprachen, fünf Stile, vier Breiten und
   sieben Spiellagen – und die Budgets selbst kommen aus
   tools/check-platz.mjs, das den Text ins Feld schreibt und schaut, wann es
   anschlägt.
   ========================================================================= */

/** Reihenfolge = Reihenfolge im Umschalter. */
export const SPRACHEN = {
  de: { label: 'Deutsch', htmlLang: 'de' },
  it: { label: 'Italiano', htmlLang: 'it' },
  en: { label: 'English', htmlLang: 'en' },
};

export const STANDARD = 'de';

const TEXTE = {

  /* ------------------------------------------------------------- Deutsch */
  de: {
    'doc.title': 'Zehner-Paare',
    'doc.description': 'Streiche Zahlenpaare weg: gleiche Zahlen oder Summe 10. '
      + 'Das klassische Zahlenrätsel fürs Smartphone.',

    // Vorlesehilfen – laufen nie über, weil sie nicht gezeichnet werden
    'a11y.rules': 'Spielregeln',
    'a11y.settings': 'Einstellungen',
    'a11y.board': 'Zahlenfeld',
    'a11y.actions': 'Spielaktionen',
    'a11y.undo': 'Zug zurücknehmen',
    'a11y.hint': 'Tipp anzeigen',
    'a11y.new': 'Neues Spiel',
    'a11y.close': 'Schließen',
    'a11y.difficulty': 'Schwierigkeit',
    'a11y.style': 'Stil',
    'a11y.theme': 'Farbschema',
    'a11y.language': 'Sprache',
    'cell.label': 'Zeile {row}, Spalte {col}, Zahl {v}',
    'cell.labelEmpty': 'Zeile {row}, Spalte {col}, leer',

    // Statuskarten – je Karte rund 90 px bei 320 px Bildschirm
    'hud.score': 'Punkte',
    'hud.left': 'Übrig',
    'hud.time': 'Zeit',
    'hud.round': 'Runde',
    'hud.noRecord': 'noch kein Rekord',
    'hud.record': 'Rekord {score}',
    'hud.recordBeaten': 'Rekord {score} geknackt',
    'hud.recordArcade': 'HI {score}',
    'hud.recordBeatenArcade': 'HI {score} geknackt',

    // Knopfleiste unten – die engste Stelle im ganzen Spiel.
    // Gemessen bleiben der Beschriftung 48 px (Zurück/Tipp/Neu) bzw. rund
    // 60 px (Auffüllen/Rettung) bei 320 px. Nicht länger werden.
    'bar.undo': 'Zurück',
    'bar.hint': 'Tipp',
    'bar.new': 'Neu',
    'bar.refill': 'Auffüllen',
    'bar.rescue': 'Rettung',

    // Kombo
    'combo.badge': 'Kombo ×{n}',
    'combo.pop.2': 'Kombo ×2',
    'combo.pop.3': 'Kombo ×3',
    'combo.pop.4': 'Kombo ×4',
    'combo.pop.5': 'Stark! ×5',
    'combo.pop.6': 'Kombo ×6',
    'combo.pop.7': 'Heiß! ×7',
    'combo.pop.8': 'Irre! ×8',
    'combo.pop.9': 'Kombo ×9',
    'combo.pop.10': 'Maximum ×10',

    // Meldungen in der festen Zeile über dem Brett. Sie darf höchstens
    // drei Zeilen brauchen, sonst wächst sie über das Brett.
    'msg.noMoveRefill': 'Kein Zug mehr – bitte auffüllen.',
    'msg.noMove': 'Kein Zug mehr möglich.',
    'msg.noRefill': 'Kein Auffüllen mehr übrig.',
    'msg.refilled': '{n} Zahlen angehängt · noch {left}×',
    'msg.refillWorth': ' · Treffer zählen {p} %',
    'msg.rescue': 'Rettung! Noch eine Chance.',
    'msg.round': 'Runde {n} · +{bonus} · ein Auffüllen zurück',
    'msg.recordLive': 'Rekord! {score} Punkte übertroffen',
    'msg.pairNotAdjacent': '{a} und {b} passen – nur nicht benachbart.',
    'msg.pairNoMatch': '{a} und {b} – weder gleich noch Summe 10.',
    'msg.classicFixed': 'Klassisch: immer dasselbe Startfeld',
    'msg.style': 'Stil: {label}',
    'msg.language': 'Sprache: {label}',
    'msg.installed': 'Liegt jetzt auf dem Startbildschirm.',
    'msg.diagonalOn': 'Diagonale Paare erlaubt.',
    'msg.diagonalOff': 'Diagonale Paare aus.',
    'msg.wrapOn': 'Zeilenumbruch zählt als Nachbarschaft.',
    'msg.wrapOff': 'Zeilenumbruch aus.',
    'msg.confirmNew': 'Neues Spiel starten? Die laufende Partie geht verloren.',

    // Kleine Zahlen über den Kacheln
    'fx.rowFree': 'Zeile frei!',
    'fx.rowsFree': '{n} Zeilen!',

    // Nur für die Vorlesehilfe
    'live.selected': '{v} ausgewählt',
    'live.cleared': '{a} und {b} gestrichen, {points} Punkte',
    'live.hint': 'Tipp: {a} und {b}',
    'live.refilled': '{n} Zahlen angehängt',
    'live.rescued': 'Rettung: {n} Zahlen noch einmal auf dem Feld',
    'live.undone': 'Zug zurückgenommen',
    'live.round': 'Runde {n}',
    'live.newGame': 'Neues Spiel: {label}',

    // Schwierigkeiten – stehen als Chip (umbrechend) und in der Bestenliste
    'diff.leicht': 'Leicht',
    'diff.mittel': 'Mittel',
    'diff.schwer': 'Schwer',
    'diff.klassisch': 'Klassisch',
    'diff.endlos': 'Endlos',
    'diff.note': '{rows} × {cols} Felder · {refills}× Auffüllen',
    'diff.noteClassic': ' · immer dasselbe Startfeld, das Papier-Original (1–19 ohne 10)',
    'diff.noteEndless': ' · je Runde {rows} neue Zeilen, +{refills}× Auffüllen, kein Ende',

    // Stile – kurze Fassung steht auf dem Chip, lange in der Meldung
    'skin.classic': 'Original',
    'skin.m3': 'Material 3',
    'skin.arcade': 'Arcade',
    'skin.papier': 'Papier',
    'skin.kontrast': 'Kontrast',
    'skin.papier.long': 'Papier & Bleistift',
    'skin.kontrast.long': 'Hochkontrast',
    'skin.note': 'Der Arcade-Stil leuchtet immer im Dunkeln – das Farbschema '
      + 'gilt für die anderen.',

    // Die Sprueche der Attract-Zeile im Arcade-Stil. "1UP · HIGH SCORE"
    // stand auf jedem Automaten der Welt so - das bleibt englisch.
    'arcade.attract1': '1UP · HIGH SCORE',
    'arcade.attract2': '★ EINWURF FREI ★',

    'theme.auto': 'Auto',
    'theme.light': 'Hell',
    'theme.dark': 'Dunkel',

    // Regeln
    'rules.title': 'So wird gespielt',
    'rules.lead': 'Streiche zwei Zahlen weg, wenn sie <b>gleich</b> sind oder '
      + 'zusammen <b>10</b> ergeben.',
    'rules.legendA': '3 + 7 = 10 · senkrecht',
    'rules.legendB': '6 + 4 = 10 · waagrecht',
    'rules.adjHead': 'Wann sind zwei Zahlen benachbart?',
    'rules.adj1': '<b>Waagrecht</b> nebeneinander oder <b>senkrecht</b> übereinander.',
    'rules.adj2': '<b>Diagonal</b> übers Eck.',
    'rules.adj3': '<b>In Leserichtung</b> – auch am Zeilenende zur nächsten Zeile.',
    'rules.adj4': 'Schon gestrichene Felder zählen nicht mehr: du <b>siehst durch sie '
      + 'hindurch</b>. Deshalb entstehen mit jedem Zug neue Paare.',
    'rules.stuckHead': 'Und wenn nichts mehr geht?',
    'rules.stuck1': 'Mit <b>Auffüllen</b> werden alle übrigen Zahlen hinten noch einmal '
      + 'angehängt. Das Guthaben dafür ist begrenzt. Eine komplett leere Zeile '
      + 'verschwindet. Wer das ganze Feld leer räumt, gewinnt.',
    'rules.stuck2': 'Geht gar nichts mehr und ist das Guthaben leer, gibt es einmal pro '
      + 'Partie die <b>Rettung</b>: die letzten Zahlen kommen noch einmal aufs Feld.',
    'rules.pointsHead': 'Punkte und Endlos',
    'rules.points1': 'Ein Paar bringt 10 Punkte, mal <b>Kombofaktor</b>: jeder Treffer in '
      + 'Folge erhöht ihn um eins, bis ×10. Ein Fehlgriff oder ein Auffüllen setzt ihn '
      + 'zurück – sauber gespielt ist also gut doppelt so viel wert. Zwei Zeilen in einem '
      + 'Zug geben einen Zuschlag. Am Ende zählt jedes gesparte Auffüllen 150 Punkte.',
    'rules.points2': 'Im Modus <b>Endlos</b> ist ein leeres Feld nicht das Ende: es kommen '
      + 'drei frische Zeilen, ein Auffüllen zurück ins Guthaben und 200 Punkte. Der Lauf '
      + 'endet erst, wenn nichts mehr geht – wie weit kommst du?',
    'rules.footnote': 'Diagonale und Zeilenumbruch lassen sich in den Einstellungen '
      + 'abschalten.',
    'rules.go': 'Los geht’s',

    // Einstellungen – die Gruppentitel stehen in aufklappbaren Abschnitten
    'set.title': 'Einstellungen',
    'set.groupGame': 'Spiel',
    'set.groupLook': 'Darstellung',
    'set.groupSound': 'Ton & Vibration',
    'set.groupLanguage': 'Sprache',
    'set.groupBest': 'Bestwerte',
    'set.groupApp': 'App',
    'set.difficulty': 'Schwierigkeit',
    'set.rules': 'Regeln',
    'set.optDiagonal': 'Diagonale Paare erlauben',
    'set.optWrap': 'Zeilenumbruch (Leserichtung)',
    'set.optPartners': 'Mögliche Partner markieren',
    'set.style': 'Stil',
    'set.theme': 'Farbschema',
    'set.optSound': 'Ton',
    'set.optVibrate': 'Vibration',
    'set.langAuto': 'Automatisch',
    'set.langAutoNote': 'Folgt der Spracheinstellung des Geräts. Jetzt: {label}.',
    'set.install': 'Zum Startbildschirm hinzufügen',
    'set.installNote': 'Danach startet das Spiel ohne Browserleiste und läuft auch offline.',
    'set.installIos': 'In Safari unten auf „Teilen“ tippen und „Zum Home-Bildschirm“ '
      + 'wählen. Danach startet das Spiel ohne Browserleiste und läuft auch offline.',
    'set.hint': 'Ein Regelwechsel gilt sofort für die laufende Partie. Ein Wechsel der '
      + 'Schwierigkeit startet ein neues Spiel.',
    'set.rulesBtn': 'Regeln',
    'set.done': 'Fertig',
    // Kurzfassung des Zustands in der Gruppenkopfzeile
    'set.nowDiagonal': 'Diagonal',
    'set.nowWrap': 'Umbruch',
    'set.nowPartners': 'Partner',
    'set.nowNothing': 'aus',
    'set.nowNoBest': 'noch keine',
    'set.nowBest': '{n} von {von}',
    'set.groupGameSub': 'Schwierigkeit und Regeln',
    'set.groupLookSub': 'Stil und Farben',
    'set.groupSoundSub': 'Rückmeldung beim Spielen',

    // Spielende
    'end.won': 'Feld leer geräumt!',
    'end.endlessOver': 'Lauf beendet · Runde {n}',
    'end.stuck': 'Keine Züge mehr',
    'end.wonBest': '{label} · dein bisher bester Lauf, vorher {prev}.',
    'end.wonFirst': '{label} · dein erster Sieg auf dieser Stufe.',
    'end.wonClean': 'Sauber gespielt bei {label}.',
    'end.savedRefills': ' {n}× Auffüllen gespart: +{points}.',
    'end.dilute': ' Selbst geholte Zahlen: Treffer zählten {p} %.',
    'end.rescueOffer': 'Nur noch {n} Zahlen – die Rettung legt sie dir noch einmal aufs Feld.',
    'end.endlessTip': 'Bis Runde {n} gekommen. Ein Zug zurück hält den Lauf am Leben.',
    'end.deadEnd': 'Kein Paar mehr übrig und kein Auffüllen mehr. Nimm einen Zug zurück '
      + 'oder starte neu.',
    'end.statScore': 'Punkte',
    'end.statRounds': 'Runden',
    'end.statTime': 'Zeit',
    'end.statMoves': 'Züge',
    'end.statCombo': 'Beste Kombo',
    'end.record': '★ Neuer Bestwert',
    'end.recordPlus': '★ Neuer Bestwert · +{plus}',
    'end.undo': 'Zug zurück',
    'end.rescue': 'Rettung',
    'end.again': 'Nochmal',
    'end.newGame': 'Neues Spiel',
  },

  /* --------------------------------------------------------- Italienisch */
  it: {
    'doc.title': 'Zehner-Paare',
    'doc.description': 'Elimina coppie di numeri: uguali oppure con somma 10. Il classico rompicapo '
      + 'numerico per lo smartphone.',
    // Vorlesehilfen – laufen nie über, weil sie nicht gezeichnet werden
    'a11y.rules': 'Regole del gioco',
    'a11y.settings': 'Impostazioni',
    'a11y.board': 'Campo dei numeri',
    'a11y.actions': 'Azioni di gioco',
    'a11y.undo': 'Annulla la mossa',
    'a11y.hint': 'Mostra un indizio',
    'a11y.new': 'Nuova partita',
    'a11y.close': 'Chiudi',
    'a11y.difficulty': 'Difficoltà',
    'a11y.style': 'Stile',
    'a11y.theme': 'Schema colori',
    'a11y.language': 'Lingua',
    'cell.label': 'Riga {row}, colonna {col}, numero {v}',
    'cell.labelEmpty': 'Riga {row}, colonna {col}, casella vuota',
    // Statuskarten – je Karte rund 90 px bei 320 px Bildschirm
    'hud.score': 'Punti',
    'hud.left': 'Rimasti',
    'hud.time': 'Tempo',
    'hud.round': 'Turno',
    'hud.noRecord': 'ancora nessun record',
    'hud.record': 'Record {score}',
    'hud.recordBeaten': 'Record {score} battuto',
    'hud.recordArcade': 'HI {score}',
    'hud.recordBeatenArcade': 'HI {score} battuto',
    // Knopfleiste unten – die engste Stelle im ganzen Spiel.
    // Gemessen bleiben der Beschriftung 48 px (Zurück/Tipp/Neu) bzw. rund
    // 60 px (Auffüllen/Rettung) bei 320 px. Nicht länger werden.
    'bar.undo': 'Annulla',
    'bar.hint': 'Indizio',
    'bar.new': 'Ricomincia',
    'bar.refill': 'Ricarica',
    'bar.rescue': 'Recupero',
    // Kombo
    'combo.badge': 'Combo ×{n}',
    'combo.pop.2': 'Combo ×2',
    'combo.pop.3': 'Combo ×3',
    'combo.pop.4': 'Combo ×4',
    'combo.pop.5': 'Forte! ×5',
    'combo.pop.6': 'Combo ×6',
    'combo.pop.7': 'Bollente! ×7',
    'combo.pop.8': 'Follia! ×8',
    'combo.pop.9': 'Combo ×9',
    'combo.pop.10': 'Massimo ×10',
    // Meldungen in der festen Zeile über dem Brett. Sie darf höchstens
    // drei Zeilen brauchen, sonst wächst sie über das Brett.
    'msg.noMoveRefill': 'Nessuna mossa – ricarica il campo.',
    'msg.noMove': 'Nessuna mossa possibile.',
    'msg.noRefill': 'Non hai più ricariche.',
    'msg.refilled': '{n} numeri aggiunti · ancora {left}×',
    'msg.refillWorth': ' · le mosse valgono il {p} %',
    'msg.rescue': 'Recupero! Un’altra occasione.',
    'msg.round': 'Turno {n} · +{bonus} · una ricarica in più',
    'msg.recordLive': 'Record! Superati {score} punti',
    'msg.pairNotAdjacent': '{a} e {b} vanno bene, ma non sono vicini.',
    'msg.pairNoMatch': '{a} e {b} – né uguali né somma 10.',
    'msg.classicFixed': 'Classico: campo iniziale sempre uguale',
    'msg.style': 'Stile: {label}',
    'msg.language': 'Lingua: {label}',
    'msg.installed': 'Ora è nella schermata Home.',
    'msg.diagonalOn': 'Coppie in diagonale permesse.',
    'msg.diagonalOff': 'Coppie in diagonale disattivate.',
    'msg.wrapOn': 'A fine riga i numeri restano vicini.',
    'msg.wrapOff': 'Fine riga disattivata.',
    'msg.confirmNew': 'Iniziare una nuova partita? Perdi quella in corso.',
    // Kleine Zahlen über den Kacheln
    'fx.rowFree': 'Riga libera!',
    'fx.rowsFree': '{n} righe!',
    // Nur für die Vorlesehilfe
    'live.selected': '{v} selezionato',
    'live.cleared': '{a} e {b} eliminati, {points} punti',
    'live.hint': 'Indizio: {a} e {b}',
    'live.refilled': '{n} numeri aggiunti',
    'live.rescued': 'Recupero: {n} numeri di nuovo in campo',
    'live.undone': 'Mossa annullata',
    'live.round': 'Turno {n}',
    'live.newGame': 'Nuova partita: {label}',
    // Schwierigkeiten – stehen als Chip (umbrechend) und in der Bestenliste
    'diff.leicht': 'Facile',
    'diff.mittel': 'Medio',
    'diff.schwer': 'Difficile',
    'diff.klassisch': 'Classico',
    'diff.endlos': 'Infinito',
    'diff.note': '{rows} × {cols} caselle · {refills}× ricarica',
    'diff.noteClassic': ' · campo iniziale sempre uguale, l’originale su carta (1–19 senza 10)',
    'diff.noteEndless': ' · ogni turno {rows} righe nuove, +{refills}× ricarica, senza fine',
    // Stile – kurze Fassung steht auf dem Chip, lange in der Meldung
    'skin.classic': 'Originale',
    'skin.m3': 'Material 3',
    'skin.arcade': 'Arcade',
    'skin.papier': 'Carta',
    'skin.kontrast': 'Contrasto',
    'skin.papier.long': 'Carta e matita',
    'skin.kontrast.long': 'Alto contrasto',
    'skin.note': 'Lo stile Arcade brilla sempre nel buio – lo schema colori vale per gli altri.',
    // Die Sprueche der Attract-Zeile im Arcade-Stil. "1UP · HIGH SCORE"
    // stand auf jedem Automaten der Welt so - das bleibt englisch.
    'arcade.attract1': '1UP · HIGH SCORE',
    'arcade.attract2': '★ PARTITA GRATIS ★',

    'theme.auto': 'Auto',
    'theme.light': 'Chiaro',
    'theme.dark': 'Scuro',
    // Regeln
    'rules.title': 'Come si gioca',
    'rules.lead': 'Elimina due numeri se sono <b>uguali</b> o se insieme fanno <b>10</b>.',
    'rules.legendA': '3 + 7 = 10 · in verticale',
    'rules.legendB': '6 + 4 = 10 · in orizzontale',
    'rules.adjHead': 'Quando due numeri sono vicini?',
    'rules.adj1': '<b>In orizzontale</b> uno accanto all’altro o <b>in verticale</b> uno sopra '
      + 'l’altro.',
    'rules.adj2': '<b>In diagonale</b>, angolo contro angolo.',
    'rules.adj3': '<b>Nel senso di lettura</b> – anche dalla fine di una riga alla riga dopo.',
    'rules.adj4': 'Le caselle già eliminate non contano più: <b>ci vedi attraverso</b>. Così a '
      + 'ogni mossa nascono coppie nuove.',
    'rules.stuckHead': 'E se non si muove più niente?',
    'rules.stuck1': 'Con <b>Ricarica</b> tutti i numeri rimasti vengono aggiunti un’altra volta in '
      + 'fondo. Il credito di ricariche è limitato. Una riga del tutto vuota sparisce. '
      + 'Chi svuota tutto il campo vince.',
    'rules.stuck2': 'Se non c’è più nessuna mossa e il credito è finito, una volta per partita hai '
      + 'il <b>Recupero</b>: gli ultimi numeri tornano in campo.',
    'rules.pointsHead': 'Punti e Infinito',
    'rules.points1': 'Una coppia vale 10 punti, per il <b>fattore combo</b>: ogni coppia di fila lo '
      + 'alza di uno, fino a ×10. Un errore o una ricarica lo riporta a ×1 – giocare '
      + 'pulito vale quindi più del doppio. Due righe in una sola mossa danno un '
      + 'bonus. Alla fine ogni ricarica risparmiata vale 150 punti.',
    'rules.points2': 'In modalità <b>Infinito</b> il campo vuoto non è la fine: arrivano tre righe '
      + 'nuove, una ricarica torna nel credito e 200 punti. La corsa finisce solo '
      + 'quando non si muove più niente – fin dove arrivi?',
    'rules.footnote': 'Diagonale e fine riga si possono disattivare nelle impostazioni.',
    'rules.go': 'Iniziamo',
    // Einstellungen – die Gruppentitel stehen in aufklappbaren Abschnitten
    'set.title': 'Impostazioni',
    'set.groupGame': 'Gioco',
    'set.groupLook': 'Aspetto',
    'set.groupSound': 'Audio e vibrazione',
    'set.groupLanguage': 'Lingua',
    'set.groupBest': 'Record',
    'set.groupApp': 'App',
    'set.difficulty': 'Difficoltà',
    'set.rules': 'Regole',
    'set.optDiagonal': 'Permetti coppie in diagonale',
    'set.optWrap': 'Fine riga (senso di lettura)',
    'set.optPartners': 'Evidenzia i numeri abbinabili',
    'set.style': 'Stile',
    'set.theme': 'Schema colori',
    'set.optSound': 'Audio',
    'set.optVibrate': 'Vibrazione',
    'set.langAuto': 'Automatica',
    'set.langAutoNote': 'Segue la lingua del dispositivo. Ora: {label}.',
    'set.install': 'Aggiungi alla schermata Home',
    'set.installNote': 'Poi il gioco parte senza la barra del browser e funziona anche offline.',
    'set.installIos': 'In Safari tocca «Condividi» in basso e scegli «Aggiungi a Home». Poi il gioco '
      + 'parte senza la barra del browser e funziona anche offline.',
    'set.hint': 'Una regola cambiata vale subito per la partita in corso. Cambiare difficoltà '
      + 'avvia una partita nuova.',
    'set.rulesBtn': 'Regole',
    'set.done': 'Fatto',
    // Kurzfassung des Zustands in der Gruppenkopfzeile
    'set.nowDiagonal': 'Diagonale',
    'set.nowWrap': 'Fine riga',
    'set.nowPartners': 'Abbinabili',
    'set.nowNothing': 'disattivati',
    'set.nowNoBest': 'ancora nessuno',
    'set.nowBest': '{n} su {von}',
    'set.groupGameSub': 'Difficoltà e regole',
    'set.groupLookSub': 'Stile e colori',
    'set.groupSoundSub': 'Feedback di gioco',
    // Spielende
    'end.won': 'Campo svuotato!',
    'end.endlessOver': 'Corsa finita · turno {n}',
    'end.stuck': 'Niente più mosse',
    'end.wonBest': '{label} · la tua corsa migliore, prima era {prev}.',
    'end.wonFirst': '{label} · la tua prima vittoria a questo livello.',
    'end.wonClean': 'Partita pulita a livello {label}.',
    'end.savedRefills': ' {n}× ricarica risparmiata: +{points}.',
    'end.dilute': ' Numeri richiamati: le mosse valevano il {p} %.',
    'end.rescueOffer': 'Solo {n} numeri – il Recupero te li rimette in campo.',
    'end.endlessTip': 'Turno {n} raggiunto. Annullare una mossa tiene in vita la corsa.',
    'end.deadEnd': 'Nessuna coppia e nessuna ricarica. Annulla una mossa o ricomincia.',
    'end.statScore': 'Punti',
    'end.statRounds': 'Turni',
    'end.statTime': 'Tempo',
    'end.statMoves': 'Mosse',
    'end.statCombo': 'Combo max',
    'end.record': '★ Nuovo record',
    'end.recordPlus': '★ Nuovo record · +{plus}',
    'end.undo': 'Annulla mossa',
    'end.rescue': 'Recupero',
    'end.again': 'Ancora',
    'end.newGame': 'Nuova partita',
  },

  /* --------------------------------------------------------- Englisch */
  en: {
    'doc.title': 'Zehner-Paare',
    'doc.description': 'Clear pairs of numbers: matching numbers, or two that add up to 10. The '
      + 'classic number puzzle for your phone.',
    // Vorlesehilfen – laufen nie über, weil sie nicht gezeichnet werden
    'a11y.rules': 'Game rules',
    'a11y.settings': 'Settings',
    'a11y.board': 'Number board',
    'a11y.actions': 'Game actions',
    'a11y.undo': 'Undo move',
    'a11y.hint': 'Show hint',
    'a11y.new': 'New game',
    'a11y.close': 'Close',
    'a11y.difficulty': 'Difficulty',
    'a11y.style': 'Style',
    'a11y.theme': 'Colour scheme',
    'a11y.language': 'Language',
    'cell.label': 'Row {row}, column {col}, number {v}',
    'cell.labelEmpty': 'Row {row}, column {col}, empty',
    // Statuskarten – je Karte rund 90 px bei 320 px Bildschirm
    'hud.score': 'Score',
    'hud.left': 'Remaining',
    'hud.time': 'Time',
    'hud.round': 'Round',
    'hud.noRecord': 'no best score yet',
    'hud.record': 'Best {score}',
    'hud.recordBeaten': 'Best {score} beaten',
    'hud.recordArcade': 'HI {score}',
    'hud.recordBeatenArcade': 'HI {score} beaten',
    // Knopfleiste unten – die engste Stelle im ganzen Spiel.
    // Gemessen bleiben der Beschriftung 48 px (Zurück/Tipp/Neu) bzw. rund
    // 60 px (Auffüllen/Rettung) bei 320 px. Nicht länger werden.
    'bar.undo': 'Undo',
    'bar.hint': 'Hint',
    'bar.new': 'New',
    'bar.refill': 'Refill',
    'bar.rescue': 'Rescue',
    // Kombo
    'combo.badge': 'Combo ×{n}',
    'combo.pop.2': 'Combo ×2',
    'combo.pop.3': 'Combo ×3',
    'combo.pop.4': 'Combo ×4',
    'combo.pop.5': 'Great! ×5',
    'combo.pop.6': 'Combo ×6',
    'combo.pop.7': 'Hot! ×7',
    'combo.pop.8': 'Wild! ×8',
    'combo.pop.9': 'Combo ×9',
    'combo.pop.10': 'Maximum ×10',
    // Meldungen in der festen Zeile über dem Brett. Sie darf höchstens
    // drei Zeilen brauchen, sonst wächst sie über das Brett.
    'msg.noMoveRefill': 'No moves left – try a refill.',
    'msg.noMove': 'No moves left.',
    'msg.noRefill': 'No refills left.',
    'msg.refilled': '{n} numbers added · {left}× to go',
    'msg.refillWorth': ' · matches now count {p} %',
    'msg.rescue': 'Rescue! One more chance.',
    'msg.round': 'Round {n} · +{bonus} · one refill back',
    'msg.recordLive': 'New best! {score} points beaten',
    'msg.pairNotAdjacent': '{a} and {b} match – just not adjacent.',
    'msg.pairNoMatch': '{a} and {b} – neither equal nor adding up to 10.',
    'msg.classicFixed': 'Classic: always the same starting board',
    'msg.style': 'Style: {label}',
    'msg.language': 'Language: {label}',
    'msg.installed': 'It’s on your home screen now.',
    'msg.diagonalOn': 'Diagonal pairs allowed.',
    'msg.diagonalOff': 'Diagonal pairs off.',
    'msg.wrapOn': 'Line wrap counts as adjacency.',
    'msg.wrapOff': 'Line wrap off.',
    'msg.confirmNew': 'Start a new game? You’ll lose the current one.',
    // Kleine Zahlen über den Kacheln
    'fx.rowFree': 'Row cleared!',
    'fx.rowsFree': '{n} rows!',
    // Nur für die Vorlesehilfe
    'live.selected': '{v} selected',
    'live.cleared': '{a} and {b} cleared, {points} points',
    'live.hint': 'Hint: {a} and {b}',
    'live.refilled': '{n} numbers added',
    'live.rescued': 'Rescue: {n} numbers back on the board',
    'live.undone': 'Move undone',
    'live.round': 'Round {n}',
    'live.newGame': 'New game: {label}',
    // Schwierigkeiten – stehen als Chip (umbrechend) und in der Bestenliste
    'diff.leicht': 'Easy',
    'diff.mittel': 'Medium',
    'diff.schwer': 'Hard',
    'diff.klassisch': 'Classic',
    'diff.endlos': 'Endless',
    'diff.note': '{rows} × {cols} tiles · {refills}× refill',
    'diff.noteClassic': ' · always the same starting board, the paper original (1–19 without 10)',
    'diff.noteEndless': ' · {rows} new rows each round, +{refills}× refill, no end',
    // Stile – kurze Fassung steht auf dem Chip, lange in der Meldung
    'skin.classic': 'Original',
    'skin.m3': 'Material 3',
    'skin.arcade': 'Arcade',
    'skin.papier': 'Paper',
    'skin.kontrast': 'Contrast',
    'skin.papier.long': 'Paper & pencil',
    'skin.kontrast.long': 'High contrast',
    'skin.note': 'The Arcade style always glows in the dark – the colour scheme applies to the '
      + 'others.',
    // Die Sprueche der Attract-Zeile im Arcade-Stil. "1UP · HIGH SCORE"
    // stand auf jedem Automaten der Welt so - das bleibt englisch.
    'arcade.attract1': '1UP · HIGH SCORE',
    'arcade.attract2': '★ FREE PLAY ★',

    'theme.auto': 'Auto',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    // Regeln
    'rules.title': 'How to play',
    'rules.lead': 'Clear two numbers when they are <b>equal</b> or add up to <b>10</b>.',
    'rules.legendA': '3 + 7 = 10 · vertical',
    'rules.legendB': '6 + 4 = 10 · horizontal',
    'rules.adjHead': 'When are two numbers adjacent?',
    'rules.adj1': '<b>Horizontally</b> side by side, or <b>vertically</b> one above the other.',
    'rules.adj2': '<b>Diagonally</b>, across a corner.',
    'rules.adj3': '<b>In reading order</b> – and from the end of a row into the next.',
    'rules.adj4': 'Tiles you have already cleared no longer count: you <b>see straight through '
      + 'them</b>. That is why every move opens up new pairs.',
    'rules.stuckHead': 'And when nothing works any more?',
    'rules.stuck1': 'A <b>Refill</b> appends all the remaining numbers to the back of the board '
      + 'once more. The credit for it is limited. A row that is completely empty '
      + 'disappears. Clear the whole board and you win.',
    'rules.stuck2': 'If nothing works at all and your credit is gone, there is one <b>Rescue</b> '
      + 'per game: the last numbers come back onto the board.',
    'rules.pointsHead': 'Points and Endless',
    'rules.points1': 'A pair is worth 10 points, times the <b>combo factor</b>: every consecutive '
      + 'hit raises it by one, up to ×10. A wrong tap or a refill resets it – so '
      + 'playing clean is worth well over twice as much. Two rows in one move earn a '
      + 'bonus. At the end, every refill you did not use is worth 150 points.',
    'rules.points2': 'In <b>Endless</b> mode an empty board is not the end: you get three fresh '
      + 'rows, one refill back in credit and 200 points. The run only ends when '
      + 'nothing works any more – how far can you get?',
    'rules.footnote': 'Diagonals and line wrap can be switched off in the settings.',
    'rules.go': 'Let’s go',
    // Einstellungen – die Gruppentitel stehen in aufklappbaren Abschnitten
    'set.title': 'Settings',
    'set.groupGame': 'Game',
    'set.groupLook': 'Appearance',
    'set.groupSound': 'Sound & vibration',
    'set.groupLanguage': 'Language',
    'set.groupBest': 'Best scores',
    'set.groupApp': 'App',
    'set.difficulty': 'Difficulty',
    'set.rules': 'Rules',
    'set.optDiagonal': 'Allow diagonal pairs',
    'set.optWrap': 'Line wrap (reading order)',
    'set.optPartners': 'Highlight possible partners',
    'set.style': 'Style',
    'set.theme': 'Colour scheme',
    'set.optSound': 'Sound',
    'set.optVibrate': 'Vibration',
    'set.langAuto': 'Automatic',
    'set.langAutoNote': 'Follows your device’s language setting. Right now: {label}.',
    'set.install': 'Add to home screen',
    'set.installNote': 'The game then starts without the browser bar and works offline too.',
    'set.installIos': 'In Safari, tap “Share” at the bottom and choose “Add to Home Screen”. The '
      + 'game then starts without the browser bar and works offline too.',
    'set.hint': 'A change to the rules takes effect straight away in the current game. '
      + 'Changing the difficulty starts a new game.',
    'set.rulesBtn': 'Rules',
    'set.done': 'Done',
    // Kurzfassung des Zustands in der Gruppenkopfzeile
    'set.nowDiagonal': 'Diagonal',
    'set.nowWrap': 'Wrap',
    'set.nowPartners': 'Partners',
    'set.nowNothing': 'off',
    'set.nowNoBest': 'none yet',
    'set.nowBest': '{n} of {von}',
    'set.groupGameSub': 'Difficulty and rules',
    'set.groupLookSub': 'Style and colours',
    'set.groupSoundSub': 'Feedback as you play',
    // Spielende
    'end.won': 'Board cleared!',
    'end.endlessOver': 'Run over · round {n}',
    'end.stuck': 'No moves left',
    'end.wonBest': '{label} · your best run so far, previously {prev}.',
    'end.wonFirst': '{label} · your first win at this level.',
    'end.wonClean': 'A clean run on {label}.',
    'end.savedRefills': ' {n}× refill saved: +{points}.',
    'end.dilute': ' Numbers you called in: matches counted {p} %.',
    'end.rescueOffer': 'Only {n} numbers left – the rescue puts them back on the board for you.',
    'end.endlessTip': 'You made it to round {n}. An undo keeps the run alive.',
    'end.deadEnd': 'No pairs left and no refills either. Undo a move or start again.',
    'end.statScore': 'Score',
    'end.statRounds': 'Rounds',
    'end.statTime': 'Time',
    'end.statMoves': 'Moves',
    'end.statCombo': 'Best combo',
    'end.record': '★ New best',
    'end.recordPlus': '★ New best · +{plus}',
    'end.undo': 'Undo move',
    'end.rescue': 'Rescue',
    'end.again': 'Play again',
    'end.newGame': 'New game',
  },
};

/* ------------------------------------------------------------------ Motor */

let aktuell = STANDARD;

/**
 * Welche Sprache will das Gerät? navigator.languages ist nach Vorliebe
 * sortiert, also die erste nehmen, die wir überhaupt sprechen. 'de-AT' und
 * 'de-CH' zählen als Deutsch, darum nur der Teil vor dem Bindestrich.
 */
export function spracheVomGeraet(liste) {
  // globalThis.navigator, damit die Datei auch unter node testbar bleibt -
  // dort gibt es kein navigator.languages.
  const quelle = liste ?? globalThis.navigator?.languages
    ?? [globalThis.navigator?.language].filter(Boolean);
  for (const eintrag of quelle ?? []) {
    const kurz = String(eintrag || '').toLowerCase().split('-')[0];
    if (kurz in SPRACHEN) return kurz;
  }
  return STANDARD;
}

export function setzeSprache(wunsch) {
  aktuell = wunsch in SPRACHEN ? wunsch : STANDARD;
  return aktuell;
}

export function sprache() { return aktuell; }

/**
 * Holt einen Satz und setzt die Platzhalter ein.
 *
 * Fehlt ein Schlüssel in der gewählten Sprache, kommt der deutsche Satz –
 * lieber ein Satz in der falschen Sprache als ein leeres Feld oder ein
 * roher Schlüssel im Bild.
 */
export function t(schluessel, werte) {
  const satz = TEXTE[aktuell]?.[schluessel] ?? TEXTE[STANDARD][schluessel];
  if (satz === undefined) return schluessel;
  if (!werte) return satz;
  return satz.replace(/\{(\w+)\}/g, (ganz, name) =>
    (name in werte ? String(werte[name]) : ganz));
}

/** Für die Prüfskripte: alle Schlüssel einer Sprache. */
export function schluessel(spr = STANDARD) { return Object.keys(TEXTE[spr] ?? {}); }
export function woerterbuch(spr) { return TEXTE[spr]; }
