/* Cache dos arquivos do aplicativo. Incrementar a versão a cada atualização publicada. */
const CACHE_NAME = 'sonnhe-static-v2';
const APP_FILES = [
  './', './index.html', './style.css', './theme-medieval.css', './script.js',
  './manifest.webmanifest', './assets/sol-sonnhe.webp', './assets/favicon.ico',
  './assets/favicon-48.png', './assets/apple-touch-icon.png',
  './assets/icon-192.png', './assets/icon-512.png', './assets/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('sonnhe-static-') && key !== CACHE_NAME)
      .map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});