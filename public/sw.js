// Nanotype service worker: keeps the app shell so the editor opens offline.
// The gulp build fills in the version stamp and the asset list below.
const VERSION = '__BUILD__';
const CACHE = 'nanotype-' + VERSION;
const SHELL = __ASSETS__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Same-origin GET requests: the cached copy at once, online or not, and a fresh
// copy fetched behind it for the next open. So the editor opens instantly and
// never waits on a connection that is up but dead; a new deploy shows on the
// open after the one that fetched it. The counts (/stats/) are never
// cached. A file that is in neither place answers with a plain error.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET' || url.origin !== self.location.origin || /^\/stats\//.test(url.pathname)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(event.request, { ignoreSearch: true }).then((cached) => {
        const fresh = fetch(event.request)
          .then((response) => {
            // the shell is cached whole at install, one build at a time; a file
            // of it updated here on its own could pair a new page with an old
            // script for one open after a deploy
            if (response.ok && !SHELL.includes(url.pathname)) {
              cache.put(event.request, response.clone());
            }

            return response;
          })
          .catch(() => cached || Response.error());

        return cached || fresh;
      })
    )
  );
});
