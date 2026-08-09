// iPOS Field App Service Worker
var CACHE_NAME = "ipos-field-v3";
var urlsToCache = ["./index.html", "./manifest.json"];

self.addEventListener("install", function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(names.filter(function(n){ return n !== CACHE_NAME; }).map(function(n){ return caches.delete(n); }));
    })
  );
  self.clients.claim();
});

// Network-first: always try to fetch the latest version when online.
// Only fall back to the cached copy if the network request fails
// (i.e. the phone is offline). This prevents the app from getting
// permanently stuck on an old cached version after updates.
self.addEventListener("fetch", function(e) {
  e.respondWith(
    fetch(e.request)
      .then(function(response) {
        // Keep the cache fresh with whatever we just fetched successfully.
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, responseClone);
        });
        return response;
      })
      .catch(function() {
        // Offline (or request failed) — serve the last cached copy if we have one.
        return caches.match(e.request);
      })
  );
});
