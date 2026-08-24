/* Einfacher Offline-Cache: beim Aktivieren alles Noetige ablegen,
   danach Netz zuerst, Cache als Rueckfalloption. */
const CACHE = 'zehner-paare-1.8.0';
const ASSETS = [
  './', 'index.html',
  'classic.css', 'material3.css', 'm3-colors.css', 'arcade.css', 'papier.css', 'kontrast.css',
  'app.js', 'game.js', 'i18n.js',
  'manifest.webmanifest', 'manifest.de.webmanifest',
  'manifest.it.webmanifest', 'manifest.en.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png',
  'fonts/nunito-latin-var.woff2', 'fonts/roboto-latin-var.woff2',
  'fonts/zp-pixel.woff2', 'fonts/zp-hand.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
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
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))),
  );
});
