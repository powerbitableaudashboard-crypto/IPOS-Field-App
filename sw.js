// iPOS Field App Service Worker
// Bump this on every deploy — it's the signal that makes the browser
// treat this as an updated worker and re-run install/activate below.
var CACHE_NAME = "ipos-field-v4";
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
  // Only ever intercept our own app's GET requests (index.html,
  // manifest.json, icons, etc). Everything else — most importantly
  // POST submissions and any request to a different origin, like the
  // Apps Script API this app calls for every action — is left
  // completely untouched and goes straight to the network exactly as
  // if this service worker didn't exist. Two reasons:
  //   1. cache.put() only supports GET requests; attempting it on a
  //      POST (every form submission this app makes) silently fails
  //      every time, and there's no benefit to "caching" a one-time
  //      write anyway.
  //   2. API responses (Device Payments, installs, etc.) must always
  //      be live data, never a cached copy — caching them here served
  //      no purpose and only risked staleness.
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== self.location.origin) {
    return;
  }

  e.respondWith(
    // { cache: "no-store" } is the actual fix for the stale-update
    // problem: without it, this fetch() can be silently satisfied by
    // the BROWSER's own HTTP cache (based on whatever Cache-Control
    // headers the host sends for index.html) without ever reaching
    // the network — so this "network-first" logic was still at the
    // mercy of ordinary HTTP caching. no-store forces a real network
    // round-trip every time the app is online, so a newly uploaded
    // index.html is picked up immediately instead of only after the
    // browser's HTTP cache happens to expire.
    fetch(e.request, { cache: "no-store" })
      .then(function(response) {
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
