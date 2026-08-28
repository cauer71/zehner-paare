-- Zehner-Paare: die Weltrangliste.
--
-- Zwei Tabellen, mehr braucht es nicht. Die eine haelt JEDEN Rekord, den es je
-- gab - nicht nur den hoechsten. Damit ist der Weltrekord ein MAX() und eine
-- Bestenliste ein ORDER BY, ohne dass irgendetwas nachgefuehrt werden muss.
--
-- Was der alte Zaehlerdienst dafuer brauchte, steht als Mahnmal daneben: ein
-- Zaehler als Zeiger auf die laufende Nummer, der Punktestand als Startwert
-- eines eigens angelegten Namens, das Kuerzel als Zahl zur Basis 37, und eine
-- Rueckwaertssuche ueber vier Nummern, weil Schluessel verfallen. Hier ist es
-- eine Zeile je Rekord.

CREATE TABLE IF NOT EXISTS rekorde (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  stufe    TEXT    NOT NULL,
  punkte   INTEGER NOT NULL,
  -- Drei Zeichen aus A-Z und 0-9, oder leer. Alte Rekorde haben keines: das
  -- Kuerzel kam erst mit Fassung 1.15, die Punktestaende davor sind trotzdem
  -- gueltig.
  kuerzel  TEXT    NOT NULL DEFAULT '',
  -- Millisekunden seit 1970. NULL heisst "uebernommen, Zeitpunkt unbekannt" -
  -- der alte Dienst hat keinen gespeichert.
  wann     INTEGER,
  -- 'spiel' oder 'abacus'. Damit bleibt nachvollziehbar, was aus dem alten
  -- Zaehlerdienst stammt und was hier entstanden ist.
  herkunft TEXT    NOT NULL DEFAULT 'spiel'
);

-- Der Weltrekord je Stufe ist die haeufigste Frage ueberhaupt, die Bestenliste
-- die zweithaeufigste. Beide beantwortet dieser eine Index.
CREATE INDEX IF NOT EXISTS rekorde_bestenliste ON rekorde (stufe, punkte DESC, id);

-- Gespielte und gewonnene Partien, weltweit. Eine Zeile je Zaehler statt einer
-- Spalte je Zaehler: ein dritter kommt dann ohne Schemaaenderung dazu.
CREATE TABLE IF NOT EXISTS zaehler (
  name TEXT PRIMARY KEY,
  wert INTEGER NOT NULL DEFAULT 0
);
