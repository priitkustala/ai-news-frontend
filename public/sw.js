// The client's service worker (priitkustala/ai-news-frontend#3, S-18 plan step 2): a plain
// script served from the root (scripts/build.mjs copies public/ into dist/, scripts/serve.mjs
// serves /sw.js), so its scope is the whole client. Offline reading (priitkustala/ai-news-frontend#4,
// S-19) keeps the app's own files here: install stores every file of the build (SHELL_FILES,
// written by scripts/build.mjs with "/" for index.html) in a cache named for their content
// (SHELL_CACHE), activate deletes the older ones, and a GET of a listed file goes to the network
// first and falls back to the stored copy. Under OD-18 A a picture from another origin is answered
// from the cache ai-news-images when the page stored it there (licensed pictures only,
// src/offline storeLicensed), else from the network; the worker itself stores nothing. The rows the app showed and the owner's bookmarks are
// kept by the page (src/offline), never here: the data interface, sign-in and /health get no
// answer from this worker. Push is handled here (priitkustala/ai-news#50, S-15): the daily
// notification the backend's notify command sends, whose JSON payload carries title and body,
// and a tap on it opens the client.
const SHELL_CACHE = '{{SHELL_CACHE}}';
const SHELL_FILES = {{SHELL_FILES}};
const IMAGE_CACHE = 'ai-news-images';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name.startsWith('ai-news-shell-') && name !== SHELL_CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin && SHELL_FILES.includes(url.pathname)) {
    event.respondWith(
      fetch(request).catch(() =>
        caches.open(SHELL_CACHE).then((cache) => cache.match(url.pathname)).then((stored) => stored ?? Response.error()),
      ),
    );
  } else if (url.origin !== self.location.origin && request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => cache.match(request.url)).then((stored) => stored ?? fetch(request)),
    );
  }
});

self.addEventListener('push', (event) => {
  const { title, body } = event.data.json();
  event.waitUntil(self.registration.showNotification(title, { body }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/'));
});
