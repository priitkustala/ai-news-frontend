// The client's service worker (priitkustala/ai-news-frontend#3, S-18 plan step 2): a plain
// script served from the root (scripts/build.mjs copies public/ into dist/, scripts/serve.mjs
// serves /sw.js), so its scope is the whole client. It serves nothing itself: no fetch handler,
// no cache; offline reading (S-19) adds its own handling here later. Push is handled here
// (priitkustala/ai-news#50, S-15): the daily notification the backend's notify command sends,
// whose JSON payload carries title and body, and a tap on it opens the client.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const { title, body } = event.data.json();
  event.waitUntil(self.registration.showNotification(title, { body }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/'));
});
