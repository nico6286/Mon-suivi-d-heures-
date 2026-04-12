const CACHE_NAME = 'suivi-pro-v2'; // On change le nom pour forcer la mise à jour

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(['./', './index.html', './app.js', './manifest.json']);
        })
    );
});

self.addEventListener('activate', event => {
    // Supprime les anciens caches pour éviter les conflits
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
        }).then(() => clients.claim())
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
