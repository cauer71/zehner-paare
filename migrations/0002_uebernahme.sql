-- Uebernahme aus dem alten Zaehlerdienst abacus.jasoncameron.dev,
-- Raum zehner-paare-8fz3, gelesen am 2026-08-28T08:07:42.125Z.
--
-- Erzeugt aus dem Dump, nicht abgetippt. Uebernommen ist ALLES, was dort
-- stand: jeder Rekord jeder Stufe mit seinem Kuerzel, nicht nur der jeweils
-- hoechste - der alte Dienst hat die Reihe ja aufgehoben, und damit gibt es
-- vom ersten Tag an eine Bestenliste statt nur eines Spitzenwerts.
--
-- wann bleibt NULL: einen Zeitpunkt hat der alte Dienst nie gespeichert.
-- Ein erfundenes Datum waere schlimmer als gar keines.
--
-- Jede Zeile ist gegen ein ZWEITES Ausfuehren abgesichert (WHERE NOT EXISTS).
-- "wrangler d1 migrations apply" merkt sich zwar, was schon gelaufen ist - wer
-- die Datei aber von Hand in die D1-Konsole des Dashboards einfuegt, an
-- diesem Gedaechtnis vorbei, haette danach jeden Rekord doppelt und beim
-- naechsten regulaeren Lauf die Zaehler zurueckgesetzt. Die Absicherung kostet
-- nichts und nimmt der Uebernahme diese Falle.

-- leicht: 2560/CHR, 2580/CHR, 2694, 2795, 3077/TAB
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
  SELECT 'leicht', 2560, 'CHR', NULL, 'abacus' WHERE NOT EXISTS
    (SELECT 1 FROM rekorde WHERE stufe = 'leicht' AND punkte = 2560 AND herkunft = 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
  SELECT 'leicht', 2580, 'CHR', NULL, 'abacus' WHERE NOT EXISTS
    (SELECT 1 FROM rekorde WHERE stufe = 'leicht' AND punkte = 2580 AND herkunft = 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
  SELECT 'leicht', 2694, '', NULL, 'abacus' WHERE NOT EXISTS
    (SELECT 1 FROM rekorde WHERE stufe = 'leicht' AND punkte = 2694 AND herkunft = 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
  SELECT 'leicht', 2795, '', NULL, 'abacus' WHERE NOT EXISTS
    (SELECT 1 FROM rekorde WHERE stufe = 'leicht' AND punkte = 2795 AND herkunft = 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
  SELECT 'leicht', 3077, 'TAB', NULL, 'abacus' WHERE NOT EXISTS
    (SELECT 1 FROM rekorde WHERE stufe = 'leicht' AND punkte = 3077 AND herkunft = 'abacus');

-- mittel: 3959, 4155/CHR, 4169
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
  SELECT 'mittel', 3959, '', NULL, 'abacus' WHERE NOT EXISTS
    (SELECT 1 FROM rekorde WHERE stufe = 'mittel' AND punkte = 3959 AND herkunft = 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
  SELECT 'mittel', 4155, 'CHR', NULL, 'abacus' WHERE NOT EXISTS
    (SELECT 1 FROM rekorde WHERE stufe = 'mittel' AND punkte = 4155 AND herkunft = 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
  SELECT 'mittel', 4169, '', NULL, 'abacus' WHERE NOT EXISTS
    (SELECT 1 FROM rekorde WHERE stufe = 'mittel' AND punkte = 4169 AND herkunft = 'abacus');

-- schwer: 4720/SES, 4775/SES, 4862/SES
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
  SELECT 'schwer', 4720, 'SES', NULL, 'abacus' WHERE NOT EXISTS
    (SELECT 1 FROM rekorde WHERE stufe = 'schwer' AND punkte = 4720 AND herkunft = 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
  SELECT 'schwer', 4775, 'SES', NULL, 'abacus' WHERE NOT EXISTS
    (SELECT 1 FROM rekorde WHERE stufe = 'schwer' AND punkte = 4775 AND herkunft = 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
  SELECT 'schwer', 4862, 'SES', NULL, 'abacus' WHERE NOT EXISTS
    (SELECT 1 FROM rekorde WHERE stufe = 'schwer' AND punkte = 4862 AND herkunft = 'abacus');

-- klassisch: 1194/CHR, 1634/SES
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
  SELECT 'klassisch', 1194, 'CHR', NULL, 'abacus' WHERE NOT EXISTS
    (SELECT 1 FROM rekorde WHERE stufe = 'klassisch' AND punkte = 1194 AND herkunft = 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
  SELECT 'klassisch', 1634, 'SES', NULL, 'abacus' WHERE NOT EXISTS
    (SELECT 1 FROM rekorde WHERE stufe = 'klassisch' AND punkte = 1634 AND herkunft = 'abacus');

-- endlos: 2249/SES, 2279/SES, 2288/SES, 2321/SES, 12503/SES
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
  SELECT 'endlos', 2249, 'SES', NULL, 'abacus' WHERE NOT EXISTS
    (SELECT 1 FROM rekorde WHERE stufe = 'endlos' AND punkte = 2249 AND herkunft = 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
  SELECT 'endlos', 2279, 'SES', NULL, 'abacus' WHERE NOT EXISTS
    (SELECT 1 FROM rekorde WHERE stufe = 'endlos' AND punkte = 2279 AND herkunft = 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
  SELECT 'endlos', 2288, 'SES', NULL, 'abacus' WHERE NOT EXISTS
    (SELECT 1 FROM rekorde WHERE stufe = 'endlos' AND punkte = 2288 AND herkunft = 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
  SELECT 'endlos', 2321, 'SES', NULL, 'abacus' WHERE NOT EXISTS
    (SELECT 1 FROM rekorde WHERE stufe = 'endlos' AND punkte = 2321 AND herkunft = 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
  SELECT 'endlos', 12503, 'SES', NULL, 'abacus' WHERE NOT EXISTS
    (SELECT 1 FROM rekorde WHERE stufe = 'endlos' AND punkte = 12503 AND herkunft = 'abacus');

-- Die beiden Weltzaehler, Stand der Uebernahme.
--
-- DO NOTHING und nicht DO UPDATE: laeuft diese Datei ein zweites Mal, darf sie
-- einen Zaehler, der inzwischen weitergelaufen ist, nicht auf den Stand der
-- Uebernahme zurueckwerfen.
INSERT INTO zaehler (name, wert) VALUES ('spiele', 115) ON CONFLICT(name) DO NOTHING;
INSERT INTO zaehler (name, wert) VALUES ('siege', 75) ON CONFLICT(name) DO NOTHING;
