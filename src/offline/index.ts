// Offline reading and the data interface's failure of priitkustala/ai-news-frontend#4 (S-19, B-16,
// B-18), drawn after the approved artboards 05, 06 and 12 (design/ai-news-app/v1). The cache is
// split: the service worker (public/sw.js) keeps the app's own files and, under OD-18 A, the
// licensed pictures; the page keeps here, in localStorage, what it last showed: the rows,
// categories and last run of the last successful first read of the feed, and the owner's
// bookmark rows (item_id, title, link, summary). The data requests never pass through the worker.
// Every read and write of the copy is guarded: a missing or broken copy reads as none. The copy
// is cleared at sign-out. The mode says what the screens draw: online, offline (no network) or
// error (online, the data interface failed). navigator.onLine never decides it (it reads false
// while online in the scenarios' WebKit, src/status.ts): after a failed read, reachable() asks
// the app's own origin. Every text is set as a text node, never as markup (B-03).
import type { Category } from '../feed/categories.js';
import type { CompletedRun, FeedRow } from '../feed/index.js';
import { el, icon } from '../dom.js';

export type Mode = 'online' | 'offline' | 'error';

export interface FeedCopy {
  rows: FeedRow[];
  categories: Category[];
  run: CompletedRun | null;
}

export interface BookmarkCopyRow {
  item_id: string;
  title: string;
  link: string;
  summary: string | null;
}

const FEED_KEY = 'ai-news-offline-feed';
const BOOKMARKS_KEY = 'ai-news-offline-bookmarks';
const IMAGE_CACHE = 'ai-news-images';

export const OFFLINE_FEED = "You're offline. Saved headlines and bookmarks are readable.";
export const OFFLINE_ARTICLE = "You're offline. Showing the saved fields of this item.";
export const ERROR = "Can't reach the news service. Showing saved items.";
export const NEEDS_CONNECTION = 'The full article needs a connection.';

let mode: Mode = 'online';

export function currentMode(): Mode {
  return mode;
}

export function setMode(next: Mode): void {
  mode = next;
}

function read(key: string): unknown {
  try {
    const text = localStorage.getItem(key);
    return text === null ? null : JSON.parse(text);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A full or refused storage keeps the earlier copy; the screens work without one.
  }
}

export function saveFeed(copy: FeedCopy): void {
  write(FEED_KEY, copy);
}

export function feedCopy(): FeedCopy | null {
  const copy = read(FEED_KEY) as Partial<FeedCopy> | null;
  if (!copy || !Array.isArray(copy.rows) || !Array.isArray(copy.categories)) return null;
  return { rows: copy.rows, categories: copy.categories, run: copy.run ?? null };
}

export function saveBookmarks(rows: BookmarkCopyRow[]): void {
  write(BOOKMARKS_KEY, rows);
}

export function bookmarksCopy(): BookmarkCopyRow[] | null {
  const rows = read(BOOKMARKS_KEY);
  return Array.isArray(rows) ? (rows as BookmarkCopyRow[]) : null;
}

export function clearOffline(): void {
  try {
    localStorage.removeItem(FEED_KEY);
    localStorage.removeItem(BOOKMARKS_KEY);
  } catch {
    // Nothing to clear where storage is refused.
  }
}

// Resolves true when the app's own origin answers at all (any status), false when nothing
// answers: the device is offline. The worker does not answer /health.
export async function reachable(): Promise<boolean> {
  try {
    await fetch('/health', { cache: 'no-store' });
    return true;
  } catch {
    return false;
  }
}

// Under OD-18 A: keeps a licensed picture that has loaded for offline reading. The worker
// answers it from this cache when the network fails. Never called for a hotlink picture.
export function storeLicensed(address: string): void {
  if (!('caches' in window)) return;
  void fetch(address, { mode: 'no-cors' })
    .then((answer) => caches.open(IMAGE_CACHE).then((cache) => cache.put(address, answer)))
    .catch(() => undefined);
}

const CLOUD_OFF = 'M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 9 4.5 4.5 0 0 0 7 18zM3 3l18 18';
const ALERT = 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 11v6M12 7.5v.5';
const RETRY = 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5';

// The dark Offline banner (artboards 06 and 12) with its sentence as text. The one status
// region of src/status.ts announces the sentence; the banner carries no role of its own.
export function offlineBanner(text: string): HTMLElement {
  return el(
    'div',
    { class: 'flex items-center gap-2.5 bg-[#1A1C21] px-4 py-2.5 text-sm text-white', 'data-testid': 'offline-banner' },
    icon(22, CLOUD_OFF),
    el('p', {}, text),
  );
}

// The Error state (artboard 05): its icon, the sentence and the Retry control.
export function errorState(retry: HTMLButtonElement): HTMLElement {
  return el(
    'div',
    { class: 'flex items-center gap-2.5 bg-[#FDECEC] px-4 py-3 text-sm text-[#7A1414]', 'data-testid': 'error-state' },
    icon(22, ALERT),
    el('p', { class: 'flex-1' }, ERROR),
    retry,
  );
}

export function retryButton(): HTMLButtonElement {
  return el(
    'button',
    {
      type: 'button',
      class: 'inline-flex min-h-9 min-w-21 items-center justify-center gap-1.5 rounded-[18px] bg-[#7A1414] px-3.5 text-sm font-semibold text-white disabled:opacity-60',
      'data-testid': 'retry',
    },
    icon(18, RETRY),
    'Retry',
  );
}

// The note in place of the original-article control while offline (artboard 12).
export function needsConnection(): HTMLElement {
  return el('p', { class: 'rounded-xl bg-[#F4F5F7] px-3.5 py-3 text-sm text-[#1A1C21]', 'data-testid': 'needs-connection' }, NEEDS_CONNECTION);
}
