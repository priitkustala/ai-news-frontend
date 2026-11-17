// Read marks of the Radarnik v2 proposal (priitkustala/ai-news#120): each item carries a "Mark read"
// pill that the reader taps to mark it read ("✓ Read") or unread again, and an unread item shows a
// blue dot before its title. A mark changes only on a tap; it awards nothing and opens nothing.
// The marks are kept on this device only, under one storage key, until the backend keeps them on
// the reader's account (the production plan's item B3). Storage that throws (private mode, blocked
// site data) leaves every item unread and the page working. Every text is a text node (B-03).
import { el, icon } from '../dom.js';

const KEY = 'radarnik-marked-read';
const CHECK = 'M5 12.5l4.5 4.5L19 7.5';
const PILL =
  'inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-[#8A909C] bg-white px-3 text-[13px] font-semibold text-[#1A1C21] ' +
  'aria-pressed:border-[#E8EEFC] aria-pressed:bg-[#E8EEFC] aria-pressed:text-[#1F4FD1]';

const marked = new Set<string>(load());

function load(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...marked]));
  } catch {
    // The mark still holds for this page; it is only not kept.
  }
}

export function isRead(id: string): boolean {
  return marked.has(id);
}

// Every pill and dot of an item, the hidden ones included, shows its mark.
function sync(id: string): void {
  const read = marked.has(id);
  for (const pill of document.querySelectorAll<HTMLElement>(`[data-testid="feed-item-read"][data-item-id="${CSS.escape(id)}"]`)) draw(pill, read);
  for (const dot of document.querySelectorAll<HTMLElement>(`[data-testid="feed-item-unread"][data-item-id="${CSS.escape(id)}"]`)) dot.hidden = read;
}

function draw(pill: HTMLElement, read: boolean): void {
  pill.setAttribute('aria-pressed', String(read));
  pill.replaceChildren(...(read ? [icon(14, CHECK), 'Read'] : ['Mark read']));
}

// The pill of one item: "Mark read" unpressed, "✓ Read" pressed; a tap toggles the mark.
export function readControl(id: string, title: string): HTMLButtonElement {
  const pill = el('button', { type: 'button', class: PILL, 'data-testid': 'feed-item-read', 'data-item-id': id, 'aria-label': `Read: ${title}` });
  draw(pill, marked.has(id));
  pill.addEventListener('click', () => {
    if (marked.has(id)) marked.delete(id);
    else marked.add(id);
    save();
    sync(id);
  });
  return pill;
}

// The blue dot before an unread item's title; hidden once the item is marked read.
export function unreadDot(id: string): HTMLElement {
  const dot = el('span', {
    class: 'mt-[7px] block size-2.5 shrink-0 rounded-full bg-[#1F4FD1]',
    role: 'img',
    'aria-label': 'Unread',
    'data-testid': 'feed-item-unread',
    'data-item-id': id,
  });
  dot.hidden = marked.has(id);
  return dot;
}
