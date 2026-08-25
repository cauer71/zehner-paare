/* Einfacher Offline-Cache: beim Aktivieren alles Noetige ablegen,
   danach Netz zuerst, Cache als Rueckfalloption.

   "Netz zuerst" allein genuegt nicht. fetch() geht naemlich durch den
   Zwischenspeicher des BROWSERS, und GitHub Pages schickt seine Dateien mit
   zehn Minuten Haltbarkeit. Der Browser antwortete also aus eigenem Bestand
   die alte app.js - und der Servicearbeiter legte sie noch einmal als frisch
   ab. Beim Anlegen des neuen Speichers dasselbe: addAll() holte die Dateien
   ebenfalls durch den Browserspeicher, ein Speicher mit neuem Namen konnte so
   mit ALTEM Inhalt entstehen und ihn beliebig lange weitertragen. Genau
   deshalb stand nach einer neuen Fassung weiter die alte Versionsnummer da.

   Darum: der eigene Programmcode wird immer am Browserspeicher vorbei geholt
   ('reload'). Schriften und Bilder nicht - die aendern sich praktisch nie und
   sind der groesste Teil der Ladung. */
const CACHE = 'zehner-paare-1.16.0';
const ASSETS = [
  './', 'index.html',
  'classic.css', 'material3.css', 'm3-colors.css', 'arcade.css', 'papier.css',
  'app.js', 'game.js', 'i18n.js', 'online.js',
  'manifest.webmanifest', 'manifest.de.webmanifest',
  'manifest.it.webmanifest', 'manifest.en.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png',
  'fonts/nunito-latin-var.woff2', 'fonts/roboto-latin-var.woff2',
  'fonts/zp-pixel.woff2', 'fonts/zp-hand.woff2',
];

/** Programmcode – muss bei einer neuen Fassung wirklich neu sein. */
const CODE = /(?:\.html|\.js|\.css|\.webmanifest)$|\/$/;

/** Wie addAll, aber am Zwischenspeicher des Browsers vorbei. */
async function ablegen(c, pfad) {
  const res = await fetch(new URL(pfad, self.location).href, { cache: 'reload' });
  // Streng wie addAll: schlaegt eine Datei fehl, gilt der ganze Speicher als
  // nicht angelegt. Ein halber Offline-Bestand ist schlimmer als keiner.
  if (!res.ok) throw new Error(`${pfad}: ${res.status}`);
  await c.put(pfad, res);
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(ASSETS.map((pfad) => ablegen(c, pfad))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Nur eigene Dateien anfassen. Die Weltzaehler liegen auf einem fremden
  // Host: im Zwischenspeicher waeren sie sofort veraltet, und die
  // Ausweichantwort index.html waere fuer eine Zahlenauskunft blanker Unsinn.
  let url = null;
  try { url = new URL(e.request.url); } catch { return; }
  if (url.origin !== self.location.origin) return;
  // Beim Code die Adresse statt der Anfrage nehmen: aus einer Anfrage mit
  // mode 'navigate' laesst sich keine neue bauen, und mehr als ein schlichtes
  // GET auf eine eigene Datei ist es nicht.
  const holen = CODE.test(url.pathname)
    ? fetch(url.href, { cache: 'reload' })
    : fetch(e.request);
  e.respondWith(
    holen
      .then((res) => {
        // Nur Gelungenes ablegen. Ein abgelegter 404 waere ein Fehler, der
        // offline bleibt, bis der Speicher wechselt.
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))),
  );
});
