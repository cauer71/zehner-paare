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
--
-- Warum alles den Praefix "zehner_" traegt: seit alle Spiele sich EINE
-- D1-Datenbank teilen (der kostenlose Tarif zaehlt Datenbanken und nicht
-- Tabellen - die ausfuehrliche Begruendung steht in wrangler.jsonc), liegen
-- diese Tabellen neben denen der anderen Spiele. Zwei Zusammenstoesse waren
-- dabei echt und nicht ausgedacht: "zaehler" gab es hier UND bei Shikaku,
-- beide mit den Zeilen 'spiele' und 'siege' - die Spiele haetten einander
-- hochgezaehlt. Und Indexnamen sind in SQLite je DATENBANK eindeutig und nicht
-- je Tabelle; ein zweites "rekorde_bestenliste" haette die Datenbank beim
-- Anlegen abgewiesen. Darum tragen auch die Indizes den Praefix.
--
-- Auch der DATEINAME dieser Migration ist global eindeutig gemacht. Das ist
-- kein Schoenheitsthema: d1_migrations ist EINE Tabelle je Datenbank, und sie
-- merkt sich den Dateinamen. Zwei Spiele mit je einem "0001_schema.sql"
-- heisst, dass wrangler das zweite fuer schon angewandt haelt und still
-- ueberspringt. Ein "migrations_table", mit dem sich das je Spiel trennen
-- liesse, gibt es nicht - weder in der Konfiguration noch als Flag.
--
-- Jede Anweisung hier traegt IF NOT EXISTS: das Schema steht in der
-- gemeinsamen Datenbank bereits, diese Datei muss also folgenlos durchlaufen
-- koennen.

CREATE TABLE IF NOT EXISTS zehner_rekorde (
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
CREATE INDEX IF NOT EXISTS zehner_rekorde_bestenliste ON zehner_rekorde (stufe, punkte DESC, id);

-- Gespielte und gewonnene Partien, weltweit. Eine Zeile je Zaehler statt einer
-- Spalte je Zaehler: ein dritter kommt dann ohne Schemaaenderung dazu.
CREATE TABLE IF NOT EXISTS zehner_zaehler (
  name TEXT PRIMARY KEY,
  wert INTEGER NOT NULL DEFAULT 0
);
