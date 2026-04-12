const CACHE_NAME = 'v1';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(['./', './index.html', './app.js', './manifest.json', './1000016253.jpg'])));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
