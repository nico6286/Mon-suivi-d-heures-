const CACHE_NAME = 'suivi-heures-v1';
const urlsToCache = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './1000016253.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
