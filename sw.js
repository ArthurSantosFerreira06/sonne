/* Cache dos arquivos do aplicativo. Incrementar a versão a cada atualização publicada. */
const CACHE_NAME = 'habitous-static-v2';
const APP_FILES = [
  './', './index.html', './style.css', './details.css', './script.js',
  './manifest.webmanifest', './assets/favicon.ico', './assets/favicon-estrela.ico',
  './assets/favicon-estrela-48.png', './assets/apple-touch-estrela.png',
  './assets/icon-estrela-192.png', './assets/icon-estrela-512.png', './assets/icon-estrela-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => (key.startsWith('sonnhe-static-') || key.startsWith('habitous-static-')) && key !== CACHE_NAME)
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