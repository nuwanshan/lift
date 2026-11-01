/* Lift service worker for Pam's plan (/lift/pam/). Bump VERSION here AND in ../sw.js on every update. cache-first, so the app opens with zero signal. Bump VERSION to ship an update. */
var VERSION = 'lift-pam-1.5.0';
var FILES = ['./', 'index.html', '../app.js', '../plan.js', 'manifest.webmanifest', '../icon-192.png', '../icon-512.png', '../icon-maskable-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION && /^lift-pam-/.test(k); }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    var scopePath = new URL('./', self.location).pathname, path = new URL(req.url).pathname;
    if (path !== scopePath && path !== scopePath + 'index.html') return; // other people's plans (e.g. pam/) have their own page and worker
    e.respondWith(caches.match('index.html').then(function (r) { return r || fetch(req); }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (r) { return r || fetch(req); }));
});
