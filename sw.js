self.addEventListener('fetch', function(event) {
    // Ce code permet à Chrome de valider que c'est une vraie application
    event.respondWith(fetch(event.request));
});
