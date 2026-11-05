// The feed screen of priitkustala/ai-news#45 (S-08): the headline feed read through the data
// interface with the owner's session (the feed, categories and ingestion_runs relations;
// owner-only policies of S-05), drawn after the approved artboards 01 and 07
// (design/ai-news-app/v1). The page carries one last-updated element, from the last completed
// run (B-21): its run date under the app bar, or, when that run completed more than a day ago
// (B-17), the Stale state above the items with the completion time as its headline. Each
// feed-item keeps the approved order (OD-17 B, OD-19): the metadata line (source, category,
// time), the title, the feed's own summary where the feed has one, the image slot (the
// picture where the item has an image address, the compact slot otherwise), then the link to
// the original. The per-source image policy and the placeholder artwork are S-09's. Every
// stored text is set as a text node, never as markup (B-03).
import type { SupabaseClient } from '@supabase/supabase-js';
import { el, icon } from '../dom.js';
import { shownDate, shownTime } from './format.js';

interface FeedRow {
  id: string;
  title: string;
  summary: string | null;
  source_name: string;
  category: string;
  canonical_url: string;
  image_url: string | null;
  published_at: string;
}

// The last completed run: the ingestion_runs row with status completed and the latest ended_at
// (a row without ended_at never outranks one with it; run_date breaks a tie).
interface CompletedRun {
  run_date: string;
  ended_at: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// The category's colour on the metadata line (artboard 01, classes ct-rel to ct-oth).
const CATEGORY_TEXT: Record<string, string> = {
  releases: 'text-[#1F4FD1]',
  research: 'text-[#6B3FA0]',
  policy: 'text-[#0B6E5E]',
  business: 'text-[#A5470B]',
  other: 'text-[#4A5363]',
};

const EXTERNAL = 'M14 4h6v6M20 4l-9 9M18 14v5H5V6h5';

// Only an http or https address becomes a link; anything else is no link at all.
function webAddress(address: string): URL | null {
  try {
    const url = new URL(address);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

function metaLine(row: FeedRow, categoryName: string): HTMLElement {
  return el(
    'p',
    { class: 'text-[13px] text-muted-foreground' },
    el('span', { 'data-testid': 'feed-item-source' }, row.source_name),
    ' · ',
    el('span', { class: `font-semibold ${CATEGORY_TEXT[row.category] ?? CATEGORY_TEXT.other}`, 'data-testid': 'feed-item-category' }, categoryName),
    ' · ',
    el('time', { datetime: row.published_at, 'data-testid': 'feed-item-time' }, shownTime(row.published_at)),
  );
}

function originalLink(row: FeedRow): HTMLElement | null {
  const url = webAddress(row.canonical_url);
  if (!url) return null;
  return el(
    'a',
    {
      class: 'inline-flex min-h-8 min-w-11 items-center gap-1 self-start px-1.5 text-sm text-primary',
      href: row.canonical_url,
      target: '_blank',
      rel: 'noopener noreferrer',
      'data-testid': 'feed-item-original',
    },
    url.hostname.replace(/^www\./, ''),
    icon(16, EXTERNAL),
  );
}

// The picture drawn the full card width (361 by 160) where the item has an image address.
function picture(address: URL): HTMLElement {
  const image = el('img', {
    class: 'h-full w-full object-cover',
    src: address.href,
    alt: '',
    loading: 'lazy',
    referrerpolicy: 'no-referrer',
  });
  return el(
    'figure',
    { class: 'mt-1 flex flex-col gap-1', 'data-testid': 'feed-item-image-slot' },
    el('div', { class: 'h-40 w-full overflow-hidden rounded-[10px] bg-[#F4F5F7]' }, image),
  );
}

// The compact 88 by 88 slot at the item's left; its artwork arrives with S-09.
function compactSlot(rows: number): HTMLElement {
  return el('div', {
    class: `col-start-1 row-start-1 ${rows === 4 ? 'row-span-4' : 'row-span-3'} size-22 overflow-hidden rounded-lg bg-[#F4F5F7]`,
    'aria-hidden': 'true',
    'data-testid': 'feed-item-image-slot',
  });
}

function feedItem(row: FeedRow, categoryName: string): HTMLElement {
  const title = el('h2', { class: 'text-[17px] font-bold leading-[1.3]', 'data-testid': 'feed-item-title' }, row.title);
  const summary = row.summary
    ? el('p', { class: 'text-base leading-[1.45]', 'data-testid': 'feed-item-summary' }, row.summary)
    : null;
  const link = originalLink(row);
  const image = row.image_url ? webAddress(row.image_url) : null;
  const text = [metaLine(row, categoryName), title, summary].filter((node): node is HTMLElement => node !== null);
  const item = el('article', { class: 'border-b border-[#E3E5E9] px-4 py-3', 'data-testid': 'feed-item' });

  if (image) {
    item.classList.add('flex', 'min-h-28', 'flex-col', 'gap-1.5');
    item.append(...text, picture(image), ...(link ? [link] : []));
  } else {
    // Document order stays metadata, title, summary, slot, link; the grid draws the slot at
    // the left as on artboard 01.
    item.classList.add('grid', 'min-h-28', 'grid-cols-[88px_minmax(0,1fr)]', 'content-start', 'gap-x-3', 'gap-y-1');
    for (const node of [...text, ...(link ? [link] : [])]) node.classList.add('col-start-2');
    item.append(...text, compactSlot(text.length + (link ? 1 : 0)), ...(link ? [link] : []));
  }
  return item;
}

// The last-updated element: under the app bar while the last completed run is less than a day
// old (artboard 01), inside the Stale state otherwise (artboard 07).
function lastUpdated(run: CompletedRun | null, now: number): HTMLElement {
  const completed = run?.ended_at ? Date.parse(run.ended_at) : NaN;
  if (run && run.ended_at && now - completed > DAY_MS) {
    return el(
      'div',
      { class: 'bg-[#FFF1C7] px-4 py-2.5 text-[15px] font-bold text-[#5C3F00]', 'data-testid': 'stale-state' },
      el('p', { 'data-testid': 'last-updated' }, `Last updated ${shownTime(run.ended_at)}`),
      el('p', { class: 'text-[13px] font-normal' }, "More than a day ago. These are not today's headlines."),
    );
  }
  return el(
    'p',
    { class: '-mt-1 px-4 pb-2 text-[13px] text-muted-foreground', 'data-testid': 'last-updated' },
    run ? `Updated ${shownDate(run.run_date)}` : 'Not updated yet',
  );
}

async function load(
  client: SupabaseClient,
): Promise<{ rows: FeedRow[]; names: Map<string, string>; run: CompletedRun | null }> {
  const [feed, categories, runs] = await Promise.all([
    client.from('feed').select('id,title,summary,source_name,category,canonical_url,image_url,published_at'),
    client.from('categories').select('id,name'),
    client
      .from('ingestion_runs')
      .select('run_date,ended_at')
      .eq('status', 'completed')
      .order('ended_at', { ascending: false, nullsFirst: false })
      .order('run_date', { ascending: false })
      .limit(1),
  ]);
  if (feed.error) throw new Error(feed.error.message);
  if (categories.error) throw new Error(categories.error.message);
  if (runs.error) throw new Error(runs.error.message);
  const names = new Map((categories.data as { id: string; name: string }[]).map((c) => [c.id, c.name]));
  return { rows: feed.data as FeedRow[], names, run: ((runs.data as CompletedRun[])[0] ?? null) };
}

// The feed screen: the last-updated element (or the Stale state holding it), then feed-list
// with one feed-item per row of the feed view, in the view's order.
export function feedScreen(client: SupabaseClient): HTMLElement {
  const list = el('section', { class: 'flex flex-col', 'aria-label': 'Headlines', 'data-testid': 'feed-list' });
  const screen = el('div', { class: 'flex flex-1 flex-col' }, list);
  load(client).then(
    ({ rows, names, run }) => {
      list.before(lastUpdated(run, Date.now()));
      list.replaceChildren(...rows.map((row) => feedItem(row, names.get(row.category) ?? row.category)));
    },
    () => {
      // The Error state is S-19's; until then the screen says plainly that nothing loaded.
      list.replaceChildren(el('p', { class: 'px-4 py-14 text-center text-muted-foreground' }, 'The headlines could not be loaded.'));
    },
  );
  return screen;
}
