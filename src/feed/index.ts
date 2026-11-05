// The feed screen of priitkustala/ai-news#45 (S-08): the headline feed read through the data
// interface with the owner's session (the feed, categories and ingestion_runs relations;
// owner-only policies of S-05), drawn after the approved artboards 01 and 07
// (design/ai-news-app/v1). The page carries one last-updated element, from the last completed
// run (B-21): its run date under the app bar, or, when that run completed more than a day ago
// (B-17), the Stale state above the items with the completion time as its headline. Each
// feed-item keeps the approved order (OD-17 B, OD-19): the metadata line (source, category,
// time), the title, the feed's own summary where the feed has one, the image slot (S-09,
// ./image.ts: the picture or the owned placeholder by the source's image policy), then the
// link to the original. The title opens the item in the article view
// (priitkustala/ai-news-frontend#1, src/article). Every stored text is set as a text node,
// never as markup (B-03).
import type { SupabaseClient } from '@supabase/supabase-js';
import { el, icon } from '../dom.js';
import { shownDate, shownTime } from './format.js';
import { imageSlot } from './image.js';

export interface FeedRow {
  id: string;
  title: string;
  summary: string | null;
  source_name: string;
  category: string;
  canonical_url: string;
  image_url: string | null;
  image_policy: string | null;
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
export const CATEGORY_TEXT: Record<string, string> = {
  releases: 'text-[#1F4FD1]',
  research: 'text-[#6B3FA0]',
  policy: 'text-[#0B6E5E]',
  business: 'text-[#A5470B]',
  other: 'text-[#4A5363]',
};

export const EXTERNAL = 'M14 4h6v6M20 4l-9 9M18 14v5H5V6h5';

// Only an http or https address becomes a link; anything else is no link at all.
export function webAddress(address: string): URL | null {
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

// The compact layout (artboard 01): the slot at the item's left in an 88 px column, the text
// beside it. Document order stays metadata, title, summary, slot, link.
function compactLayout(item: HTMLElement, text: HTMLElement[], slot: HTMLElement, link: HTMLElement | null): void {
  const rows = text.length + (link ? 1 : 0);
  item.className = 'grid min-h-28 grid-cols-[88px_minmax(0,1fr)] content-start gap-x-3 gap-y-1 border-b border-[#E3E5E9] px-4 py-3';
  for (const node of [...text, ...(link ? [link] : [])]) node.classList.add('col-start-2');
  slot.classList.add('col-start-1', 'row-start-1', rows === 4 ? 'row-span-4' : 'row-span-3');
  item.replaceChildren(...text, slot, ...(link ? [link] : []));
}

// The picture layout (artboards 01 and 08): the picture the full card width between the
// summary and the link, the credit line of a licensed image under it.
function pictureLayout(item: HTMLElement, text: HTMLElement[], picture: HTMLElement, credit: HTMLElement | null, link: HTMLElement | null): void {
  item.className = 'flex min-h-28 flex-col gap-1.5 border-b border-[#E3E5E9] px-4 py-3';
  for (const node of [...text, ...(link ? [link] : [])]) node.classList.remove('col-start-2');
  item.replaceChildren(...text, picture, ...(credit ? [credit] : []), ...(link ? [link] : []));
}

// Opens an item in the article view; the shell decides how (src/app.ts).
export type OpenArticle = (row: FeedRow, categoryName: string) => void;

// The headline: a link that holds only the title's text and opens the article view.
function headline(row: FeedRow, categoryName: string, open: OpenArticle): HTMLElement {
  const link = el('a', { class: 'block min-h-6', href: '#article', 'data-testid': 'feed-item-title' }, row.title);
  link.addEventListener('click', (event) => {
    event.preventDefault();
    open(row, categoryName);
  });
  return el('h2', { class: 'text-[17px] font-bold leading-[1.3]' }, link);
}

function feedItem(row: FeedRow, categoryName: string, open: OpenArticle): HTMLElement {
  const title = headline(row, categoryName, open);
  const summary = row.summary
    ? el('p', { class: 'text-base leading-[1.45]', 'data-testid': 'feed-item-summary' }, row.summary)
    : null;
  const link = originalLink(row);
  const text = [metaLine(row, categoryName), title, summary].filter((node): node is HTMLElement => node !== null);
  const item = el('article', { 'data-testid': 'feed-item' });
  // Compact until a picture has loaded (S-09): pending, placeholder and failed keep this layout.
  const slot = imageSlot(row, (picture, credit) => pictureLayout(item, text, picture, credit, link));
  compactLayout(item, text, slot, link);
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
    client.from('feed').select('id,title,summary,source_name,category,canonical_url,image_url,image_policy,published_at'),
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
// with one feed-item per row of the feed view, in the view's order; a title opens its row with open.
export function feedScreen(client: SupabaseClient, open: OpenArticle): HTMLElement {
  const list = el('section', { class: 'flex flex-col', 'aria-label': 'Headlines', 'data-testid': 'feed-list' });
  const screen = el('div', { class: 'flex flex-1 flex-col' }, list);
  load(client).then(
    ({ rows, names, run }) => {
      list.before(lastUpdated(run, Date.now()));
      list.replaceChildren(...rows.map((row) => feedItem(row, names.get(row.category) ?? row.category, open)));
    },
    () => {
      // The Error state is S-19's; until then the screen says plainly that nothing loaded.
      list.replaceChildren(el('p', { class: 'px-4 py-14 text-center text-muted-foreground' }, 'The headlines could not be loaded.'));
    },
  );
  return screen;
}
