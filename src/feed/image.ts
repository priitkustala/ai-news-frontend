// The item's image slot of priitkustala/ai-news#46 (S-09): the picture or the owned
// placeholder by the per-source image policy the feed row carries (Locked B-10, OD-17 B),
// drawn after the approved artboards 01 and 08 (design/ai-news-app/v1, Image policy table).
// The article view uses the same slot (priitkustala/ai-news-frontend#24, S-20, artboards 11
// and 12), with its test ids prefixed article instead of feed-item.
// Compact until loaded (the Brief's step 3): an item whose source policy is licensed or
// owner-accepted hotlink and that has an image address starts in the compact 88 by 88 slot
// with the owned placeholder (pending); a successful load turns it into the picture, the full
// card width at 361 by 160, with its text alternative from the item's title and, for a
// licensed image, the credit line naming the source; a failed load keeps the compact slot and
// everything after it where it was (failed). A placeholder-policy source makes no image request
// at all. Offline (priitkustala/ai-news-frontend#4, S-19) a source that is not licensed gets the
// compact slot with the placeholder and makes no request; under OD-18 A a licensed picture that
// has loaded is stored for offline reading (src/offline storeLicensed). A hotlink picture is loaded by the
// phone and never stored: no cache holds it. Every text is set as a text node, never as markup (B-03).
import { el } from '../dom.js';
import { currentMode, storeLicensed } from '../offline/index.js';

export type ImageState = 'pending' | 'licensed' | 'hotlink' | 'placeholder' | 'failed';

export interface ImageSubject {
  title: string;
  source_name: string;
  category: string;
  image_url: string | null;
  // The source's policy as the feed view carries it: licensed, owner-accepted hotlink or
  // placeholder (the default, also for a value the client does not know).
  image_policy: string | null;
}

// The policy as data-image-policy writes it (the design's tokens: licensed,
// owner-accepted-hotlink, placeholder).
type Policy = 'licensed' | 'owner-accepted-hotlink' | 'placeholder';

function policyOf(value: string | null): Policy {
  if (value === 'licensed') return 'licensed';
  if (value === 'owner-accepted hotlink') return 'owner-accepted-hotlink';
  return 'placeholder';
}

// Only an http or https address is ever requested.
function imageAddress(address: string | null): URL | null {
  if (!address) return null;
  try {
    const url = new URL(address);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

// The owned placeholder artwork: the category colour with its icon in white (the design's
// icon set, 24-unit paths) and the source name as text. No publisher logo, no outside image.
const PLACEHOLDER_BACKGROUND: Record<string, string> = {
  releases: 'bg-[#1F4FD1]',
  research: 'bg-[#6B3FA0]',
  policy: 'bg-[#0B6E5E]',
  business: 'bg-[#A5470B]',
  other: 'bg-[#4A5363]',
};

type Shape = ['path' | 'circle', Record<string, string>];
const STROKE = { fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linejoin': 'round' };
const PLACEHOLDER_ICON: Record<string, Shape[]> = {
  // star
  releases: [['path', { d: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z', fill: 'currentColor' }]],
  // flask
  research: [['path', { d: 'M9 3h6M10 3v6l-5 9.5A1.7 1.7 0 0 0 6.5 21h11a1.7 1.7 0 0 0 1.5-2.5L14 9V3', ...STROKE }]],
  // columns
  policy: [['path', { d: 'M3 21h18M4 9h16M12 3l8 4.5H4zM6 9v9M10 9v9M14 9v9M18 9v9', ...STROKE }]],
  // briefcase
  business: [['path', { d: 'M3 8h18v11H3zM9 8V5h6v3M3 13h18', ...STROKE }]],
  // three dots
  other: [5, 12, 19].map((cx): Shape => ['circle', { cx: `${cx}`, cy: '12', r: '2.2', fill: 'currentColor' }]),
};

const SVG = 'http://www.w3.org/2000/svg';

function categoryIcon(category: string): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  for (const [name, value] of Object.entries({ width: '28', height: '28', viewBox: '0 0 24 24', 'aria-hidden': 'true' })) {
    svg.setAttribute(name, value);
  }
  for (const [tag, attributes] of PLACEHOLDER_ICON[category] ?? PLACEHOLDER_ICON.other) {
    const shape = document.createElementNS(SVG, tag);
    for (const [name, value] of Object.entries(attributes)) shape.setAttribute(name, value);
    svg.append(shape);
  }
  return svg;
}

// The prefix of the slot's test ids: the feed item's or the article view's.
type Prefix = 'feed-item' | 'article';

function placeholder(subject: ImageSubject, prefix: Prefix): HTMLElement {
  return el(
    'div',
    {
      class: `flex size-22 flex-col items-center justify-center gap-1 p-1.5 text-white ${PLACEHOLDER_BACKGROUND[subject.category] ?? PLACEHOLDER_BACKGROUND.other}`,
      'data-testid': `${prefix}-placeholder`,
    },
    categoryIcon(subject.category),
    el('span', { class: 'text-center text-[11px] font-bold leading-[1.2]', 'data-testid': `${prefix}-placeholder-source` }, subject.source_name),
  );
}

// The compact 88 by 88 slot holding the owned placeholder (pending, placeholder or failed).
function compactSlot(subject: ImageSubject, policy: Policy, state: ImageState, prefix: Prefix): HTMLElement {
  return el(
    'div',
    {
      class: 'size-22 overflow-hidden rounded-lg',
      'data-testid': `${prefix}-image-slot`,
      'data-image-state': state,
      'data-image-policy': policy,
    },
    placeholder(subject, prefix),
  );
}

// The picture the full card width, 361 by 160 with a 10 px radius, with its text alternative.
function pictureSlot(image: HTMLImageElement, policy: Policy, state: 'licensed' | 'hotlink', prefix: Prefix): HTMLElement {
  image.className = 'h-full w-full object-cover';
  return el(
    'figure',
    { class: 'mt-1', 'data-testid': `${prefix}-image-slot`, 'data-image-state': state, 'data-image-policy': policy },
    el('div', { class: 'h-40 w-full overflow-hidden rounded-[10px] bg-[#F4F5F7]', 'data-testid': `${prefix}-image` }, image),
  );
}

// The credit line a licence requires, under the picture (12 px, secondary text).
function credit(subject: ImageSubject, prefix: Prefix): HTMLElement {
  return el('p', { class: 'text-xs text-muted-foreground', 'data-testid': `${prefix}-image-credit` }, `Image: ${subject.source_name}`);
}

// The item's image slot. It returns the compact slot to place now (pending or placeholder);
// once a picture has loaded, showPicture is called with the picture slot and, for a licensed
// image, the credit line, and the caller draws the picture layout in place of the compact one.
// prefix names the screen the test ids belong to (the feed item's by default).
export function imageSlot(
  subject: ImageSubject,
  showPicture: (picture: HTMLElement, credit: HTMLElement | null) => void,
  prefix: Prefix = 'feed-item',
): HTMLElement {
  const policy = policyOf(subject.image_policy);
  const offline = currentMode() === 'offline' && policy !== 'licensed';
  const address = policy === 'placeholder' || offline ? null : imageAddress(subject.image_url);
  if (!address) return compactSlot(subject, policy, 'placeholder', prefix);

  const slot = compactSlot(subject, policy, 'pending', prefix);
  const image = el('img', { alt: `Image for: ${subject.title}`, referrerpolicy: 'no-referrer', decoding: 'async' });
  image.addEventListener(
    'load',
    () => {
      const state = policy === 'licensed' ? 'licensed' : 'hotlink';
      if (state === 'licensed') storeLicensed(address.href);
      showPicture(pictureSlot(image, policy, state, prefix), state === 'licensed' ? credit(subject, prefix) : null);
    },
    { once: true },
  );
  image.addEventListener('error', () => slot.setAttribute('data-image-state', 'failed'), { once: true });
  image.src = address.href;
  return slot;
}
