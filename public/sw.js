// The client's service worker (priitkustala/ai-news-frontend#3, S-18 plan step 2): the
// smallest worker that registers and installs. It is a plain script served from the root
// (scripts/build.mjs copies public/ into dist/, scripts/serve.mjs serves /sw.js), so its
// scope is the whole client. It serves nothing itself: no fetch handler, no cache, no push
// handling; offline reading (S-19) and push (S-15) add their own handling here later.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
