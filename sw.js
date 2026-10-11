// iPOS Field App — service worker
// Network-first: the app is always fetched fresh when there is a connection, so a new
// upload shows up on the next open. The cache is only a fallback for when the phone is offline.
// Bump CACHE when you want every device to drop its old stored copy immediately.
const CACHE = 'ipos-2026-10-11-a';

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  // Only handle the app's own files. Apps Script API calls and CDN libraries go straight to the network.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (hit) { return hit || caches.match('./'); });
      })
  );
});
