// The status message of priitkustala/ai-news#51 (S-16, B-24): one live region for the whole app
// that assistive technology reads, drawn as the toast of the approved artboard 14
// (design/ai-news-app/v1), 16 px above the tab bar. It is in the page from load, empty at rest,
// and never hidden, so that a change of its text is spoken. A message stays 5 seconds, then the
// resting text returns: nothing while online, the offline sentence of artboard 06 while offline.
// It never takes a tap. Every text is set as a text node, never as markup (B-03).
import { el } from './dom.js';

const OFFLINE = "You're offline. Saved headlines and bookmarks are readable.";
const BACK_ONLINE = "You're back online.";
const SHOWN_MS = 5000;

const region = el('p', {
  role: 'status',
  class:
    'pointer-events-none fixed bottom-[91px] left-1/2 z-30 w-[361px] max-w-[calc(100%-32px)] -translate-x-1/2 rounded-[10px] bg-[#1A1C21] px-4 py-3 text-sm font-semibold text-white empty:bg-transparent empty:p-0',
  'data-testid': 'status-message',
});

// The events only: in the scenarios' WebKit navigator.onLine reads false while online (the
// step 2 reading of priitkustala/ai-news#51), so the page starts as online.
let online = true;
let timer: number | undefined;

function show(text: string): void {
  region.replaceChildren(...(text ? [text] : []));
}

function resting(): string {
  return online ? '' : OFFLINE;
}

// The one status element; the shell appends it to the page once, outside #app.
export function statusRegion(): HTMLElement {
  return region;
}

// Shows text, then after 5 seconds the resting text again.
export function announce(text: string): void {
  window.clearTimeout(timer);
  show(text);
  timer = window.setTimeout(() => show(resting()), SHOWN_MS);
}

window.addEventListener('offline', () => {
  online = false;
  window.clearTimeout(timer);
  show(OFFLINE);
});

window.addEventListener('online', () => {
  online = true;
  announce(BACK_ONLINE);
});
