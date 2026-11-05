// The article view of priitkustala/ai-news-frontend#1 (S-10), drawn after the approved
// artboard 11 (design/ai-news-app/v1): the back control, then the item's stored fields in the
// approved order (OD-17 B, OD-19): the metadata line (category, source, publication time), the
// title, the feed's own summary as the dominant text, the image slot (the picture where the item
// has an image address, the compact slot otherwise, as the feed draws them until S-09's policy),
// then one control to the original address. It shows the feed row the feed screen already read
// with the owner's session. No article body is stored, so none is shown (B-12), and the client
// never requests the original address: it is only the href of original-article, opened on the
// publisher's site. Every stored text is set as a text node, never as markup (B-03).
import { el, icon } from '../dom.js';
import { CATEGORY_TEXT, EXTERNAL, webAddress, type FeedRow } from '../feed/index.js';
import { shownTime } from '../feed/format.js';

const BACK = 'M15 5l-7 7 7 7';

function backControl(back: () => void): HTMLElement {
  const control = el(
    'a',
    { class: 'inline-flex min-h-11 min-w-11 items-center gap-0.5 px-1 text-base text-primary', href: '#feed', 'data-testid': 'article-back' },
    icon(22, BACK),
    'Feed',
  );
  control.addEventListener('click', (event) => {
    event.preventDefault();
    back();
  });
  return control;
}

function metaLine(row: FeedRow, categoryName: string): HTMLElement {
  return el(
    'p',
    { class: 'text-sm text-muted-foreground' },
    el('span', { class: `font-semibold ${CATEGORY_TEXT[row.category] ?? CATEGORY_TEXT.other}`, 'data-testid': 'article-category' }, categoryName),
    ' · ',
    el('span', { 'data-testid': 'article-source' }, row.source_name),
    ' · ',
    el('time', { datetime: row.published_at, 'data-testid': 'article-time' }, shownTime(row.published_at)),
  );
}

// The picture the full width (361 by 160) where the item has an image address; the compact
// 88 by 88 slot otherwise (its artwork arrives with S-09).
function imageSlot(row: FeedRow): HTMLElement {
  const address = row.image_url ? webAddress(row.image_url) : null;
  if (!address) {
    return el('div', { class: 'size-22 overflow-hidden rounded-lg bg-[#F4F5F7]', 'aria-hidden': 'true', 'data-testid': 'article-image-slot' });
  }
  const image = el('img', { class: 'h-full w-full object-cover', src: address.href, alt: '', referrerpolicy: 'no-referrer' });
  return el(
    'figure',
    { class: 'flex flex-col gap-1', 'data-testid': 'article-image-slot' },
    el('div', { class: 'h-40 w-full overflow-hidden rounded-[10px] bg-[#F4F5F7]', 'data-testid': 'article-image' }, image),
  );
}

// The one control to the original: a link only an http or https address becomes.
function originalControl(row: FeedRow): HTMLElement | null {
  const url = webAddress(row.canonical_url);
  if (!url) return null;
  return el(
    'a',
    {
      class: 'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-base font-semibold text-primary-foreground',
      href: row.canonical_url,
      target: '_blank',
      rel: 'noopener noreferrer',
      'data-testid': 'original-article',
    },
    `Open the original on ${url.hostname.replace(/^www\./, '')}`,
    icon(18, EXTERNAL),
  );
}

// The article view of one feed row; back returns to the feed.
export function articleScreen(row: FeedRow, categoryName: string, back: () => void): HTMLElement {
  const summary = row.summary
    ? el('p', { class: 'text-[17px] leading-normal', 'data-testid': 'article-summary' }, row.summary)
    : null;
  const original = originalControl(row);
  const fields = [
    metaLine(row, categoryName),
    el('h1', { class: 'text-2xl font-bold leading-tight', 'data-testid': 'article-title' }, row.title),
    ...(summary ? [summary] : []),
    imageSlot(row),
    ...(original ? [original] : []),
  ];
  return el(
    'main',
    { class: 'flex flex-1 flex-col' },
    el('header', { class: 'px-4 pt-3.5 pb-2' }, backControl(back)),
    el('article', { class: 'flex flex-col gap-3 px-4 pt-2 pb-4', 'data-testid': 'article-view' }, ...fields),
  );
}
