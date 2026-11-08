// The bookmark control of priitkustala/ai-news#51 (S-16, B-15), drawn after the approved
// artboard 14 (design/ai-news-app/v1): a 40 by 40 button whose aria-pressed is its only state,
// outline when not bookmarked, filled on a tinted circle when bookmarked. The bookmarks live in
// the bookmarks table under the owner's session and its owner-only policies (OD-33 A); the device
// keeps only S-19's read-only copy of what was shown (src/offline), for reading offline. One set of bookmarked item ids serves every control on the page, so the feed
// and the Bookmarks list agree; the client is held here, so that a control needs only its row.
// Add is an insert, and a row already there (23505) counts as done, since the table grants no
// update; remove is a delete by item_id. Both are idempotent. aria-pressed changes only after
// the answer, and every change is announced in the status message (src/status.ts).
import type { SupabaseClient } from '@supabase/supabase-js';
import { el, icon } from '../dom.js';
import { announce } from '../status.js';
import { bookmarksCopy, lifetime, saveBookmarks } from '../offline/index.js';

// The fields a bookmark row keeps of its item (Locked, Data model: title, link, summary as shown).
export interface BookmarkSubject {
  id: string;
  title: string;
  canonical_url: string;
  summary: string | null;
}

export const BOOKMARK = 'M6 3h12v18l-6-4.2L6 21z';
const FAILED = 'The bookmark could not be changed. Try again.';
const CONTROL =
  'ml-auto inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[#1A1C21] aria-pressed:bg-[#E8EEFC] aria-pressed:text-[#1F4FD1] aria-pressed:[&_path]:fill-current';

const saved = new Set<string>();
let client: SupabaseClient | null = null;

function draw(control: HTMLElement): void {
  const pressed = saved.has(control.dataset.itemId ?? '');
  control.setAttribute('aria-pressed', String(pressed));
  control.setAttribute('aria-label', pressed ? 'Remove bookmark' : 'Bookmark');
}

// Every bookmark control on the page, the hidden ones included, shows the set.
function sync(): void {
  for (const control of document.querySelectorAll<HTMLElement>('[data-testid="feed-item-bookmark"]')) draw(control);
}

// Replaces the set with the item ids of a successful read of bookmarks and redraws the page.
export function replaceBookmarks(ids: Iterable<string>): void {
  saved.clear();
  for (const id of ids) saved.add(id);
  sync();
}

// Reads the owner's bookmarks, with no automatic retry; a failed read fills the set from the
// device's copy, if any.
export async function refreshBookmarks(next: SupabaseClient): Promise<void> {
  client = next;
  const { data, error } = await next.from('bookmarks').select('item_id').retry(false);
  if (error) {
    console.error('bookmarks could not be read', error.message);
    const copy = bookmarksCopy();
    if (copy) replaceBookmarks(copy.map((row) => row.item_id));
    return;
  }
  replaceBookmarks((data as { item_id: string }[]).map((row) => row.item_id));
}

async function add(row: BookmarkSubject): Promise<boolean> {
  if (!client) return false;
  try {
    const { error } = await client
      .from('bookmarks')
      .insert({ item_id: row.id, title: row.title, link: row.canonical_url, summary: row.summary || null });
    return !error || error.code === '23505';
  } catch {
    return false;
  }
}

async function remove(id: string): Promise<boolean> {
  if (!client) return false;
  try {
    const { error } = await client.from('bookmarks').delete().eq('item_id', id);
    return !error;
  } catch {
    return false;
  }
}

// The control of one item; a tap while its write is open is ignored. An answer arriving after
// sign-out changes nothing.
export function bookmarkControl(row: BookmarkSubject): HTMLButtonElement {
  const control = el('button', { type: 'button', class: CONTROL, 'data-testid': 'feed-item-bookmark', 'data-item-id': row.id }, icon(22, BOOKMARK));
  draw(control);
  let busy = false;
  control.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    const was = saved.has(row.id);
    const life = lifetime();
    const done = await (was ? remove(row.id) : add(row));
    busy = false;
    if (life !== lifetime()) return;
    if (!done) {
      announce(FAILED);
      return;
    }
    const copy = (bookmarksCopy() ?? []).filter((kept) => kept.item_id !== row.id);
    if (was) saved.delete(row.id);
    else saved.add(row.id);
    saveBookmarks(was ? copy : [{ item_id: row.id, title: row.title, link: row.canonical_url, summary: row.summary || null }, ...copy]);
    sync();
    announce(was ? 'Bookmark removed' : 'Bookmark saved');
  });
  return control;
}
