// The Bookmarks screen of priitkustala/ai-news#51 (S-16, B-15), drawn after the approved
// artboard 13 (design/ai-news-app/v1): the owner's bookmarks, newest first, read with the
// owner's session at every opening of the tab. A bookmark whose item the feed view lists is
// drawn as that feed-item, with its metadata, image slot, link and pressed control; one the feed
// no longer lists shows the fields the bookmark row keeps: its title (a link to the original),
// its summary and the control. A control pressed here leaves its item on the list, unpressed,
// until the list is opened again. Every stored text is set as a text node, never as markup (B-03).
import type { SupabaseClient } from '@supabase/supabase-js';
import { el } from '../dom.js';
import { feedItem, webAddress, type FeedRow, type OpenArticle } from '../feed/index.js';
import { announce } from '../status.js';
import { bookmarkControl, replaceBookmarks } from './control.js';

interface BookmarkRow {
  item_id: string;
  title: string;
  link: string;
  summary: string | null;
}

const NOT_LOADED = 'Bookmarks could not be loaded.';

function note(text: string): HTMLElement {
  return el('p', { class: 'px-6 py-14 text-center text-[15px] text-[#3D424C]' }, text);
}

// A bookmark drawn from its stored fields only: no metadata line, no image slot.
function storedItem(row: BookmarkRow): HTMLElement {
  const url = webAddress(row.link);
  const title = url
    ? el('a', { class: 'block min-h-6', href: row.link, target: '_blank', rel: 'noopener noreferrer', 'data-testid': 'feed-item-title' }, row.title)
    : el('span', { class: 'block min-h-6', 'data-testid': 'feed-item-title' }, row.title);
  const summary = row.summary
    ? el('p', { class: 'text-base leading-[1.45]', 'data-testid': 'feed-item-summary' }, row.summary)
    : null;
  const control = bookmarkControl({ id: row.item_id, title: row.title, canonical_url: row.link, summary: row.summary });
  return el(
    'article',
    { class: 'flex min-h-28 flex-col gap-1.5 border-b border-[#E3E5E9] px-4 py-3', 'data-testid': 'feed-item' },
    el('h2', { class: 'text-[17px] font-bold leading-[1.3]' }, title),
    ...(summary ? [summary] : []),
    el('div', { class: 'flex flex-wrap items-center gap-1' }, control),
  );
}

export function bookmarksPanel(client: SupabaseClient, open: OpenArticle): { panel: HTMLElement; reload: () => Promise<void> } {
  const panel = el('section', { class: 'flex flex-col', 'aria-label': 'Bookmarks', 'data-testid': 'bookmarks-list' });
  // Only the answer of the latest opening is drawn.
  let opening = 0;
  async function reload(): Promise<void> {
    const mine = ++opening;
    const answers = await Promise.all([
      client.from('bookmarks').select('item_id,title,link,summary').order('created_at', { ascending: false }),
      client.from('feed').select('*'),
      client.from('categories').select('id,name'),
    ]).catch(() => null);
    if (mine !== opening) return;
    const [bookmarks, feed, categories] = answers ?? [];
    if (!bookmarks || !feed || !categories || bookmarks.error || feed.error || categories.error) {
      panel.replaceChildren(note(NOT_LOADED));
      announce(NOT_LOADED);
      return;
    }
    const rows = bookmarks.data as BookmarkRow[];
    const listed = new Map((feed.data as FeedRow[]).map((row) => [row.id, row]));
    const names = new Map((categories.data as { id: string; name: string }[]).map((c) => [c.id, c.name]));
    replaceBookmarks(rows.map((row) => row.item_id));
    if (rows.length === 0) {
      panel.replaceChildren(note('No bookmarks yet.'));
      return;
    }
    panel.replaceChildren(
      ...rows.map((row) => {
        const item = listed.get(row.item_id);
        return item ? feedItem(item, names.get(item.category) ?? item.category, open) : storedItem(row);
      }),
    );
  }
  return { panel, reload };
}
