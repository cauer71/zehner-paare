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

-- leicht: 2560/CHR, 2580/CHR, 2694, 2795, 3077/TAB
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft) VALUES ('leicht', 2560, 'CHR', NULL, 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft) VALUES ('leicht', 2580, 'CHR', NULL, 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft) VALUES ('leicht', 2694, '', NULL, 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft) VALUES ('leicht', 2795, '', NULL, 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft) VALUES ('leicht', 3077, 'TAB', NULL, 'abacus');

-- mittel: 3959, 4155/CHR, 4169
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft) VALUES ('mittel', 3959, '', NULL, 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft) VALUES ('mittel', 4155, 'CHR', NULL, 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft) VALUES ('mittel', 4169, '', NULL, 'abacus');

-- schwer: 4720/SES, 4775/SES, 4862/SES
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft) VALUES ('schwer', 4720, 'SES', NULL, 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft) VALUES ('schwer', 4775, 'SES', NULL, 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft) VALUES ('schwer', 4862, 'SES', NULL, 'abacus');

-- klassisch: 1194/CHR, 1634/SES
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft) VALUES ('klassisch', 1194, 'CHR', NULL, 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft) VALUES ('klassisch', 1634, 'SES', NULL, 'abacus');

-- endlos: 2249/SES, 2279/SES, 2288/SES, 2321/SES, 12503/SES
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft) VALUES ('endlos', 2249, 'SES', NULL, 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft) VALUES ('endlos', 2279, 'SES', NULL, 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft) VALUES ('endlos', 2288, 'SES', NULL, 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft) VALUES ('endlos', 2321, 'SES', NULL, 'abacus');
INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft) VALUES ('endlos', 12503, 'SES', NULL, 'abacus');

-- Die beiden Weltzaehler, Stand der Uebernahme.
INSERT INTO zaehler (name, wert) VALUES ('spiele', 115)
  ON CONFLICT(name) DO UPDATE SET wert = excluded.wert;
INSERT INTO zaehler (name, wert) VALUES ('siege', 75)
  ON CONFLICT(name) DO UPDATE SET wert = excluded.wert;
