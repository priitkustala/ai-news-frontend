// Registers the client's service worker (public/sw.js, served at /sw.js) with the whole
// client as its scope (priitkustala/ai-news-frontend#3, S-18 plan step 2). Browsers expose
// navigator.serviceWorker only in a secure context: localhost in the local test environment,
// the HTTPS hosting address at release. A failed registration is logged and leaves the page
// working, since nothing the client shows depends on the worker yet.
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error: unknown) => {
    console.error('service worker: registration failed', error);
  });
}
