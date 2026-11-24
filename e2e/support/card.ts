// The card rule of priitkustala/ai-news#210 (Decisions rows 550 and 1116), checked from the outside:
// the card text of a feed-item is the opening of the text its story page shows, never more than half
// of it, and ends at the end of a sentence or with one ellipsis. The check reads both texts from the
// screens or the oracle and never computes the expected card by the rule itself.
import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

const ELLIPSIS = '…';

// The text of the card (feed-item-summary) inside one feed-item; waits for the one paragraph, and a
// card without it fails here.
export async function readCard(item: Locator, label: string): Promise<string> {
  const card = item.getByTestId('feed-item-summary');
  await expect(card, `${label}: the card shows feed-item-summary`).toHaveCount(1);
  const text = await card.textContent();
  expect(text, `${label}: the card has a text`).not.toBeNull();
  return String(text);
}

// The card is the opening of the page text: page and card not empty, the card at most half the page
// text, ending with . ! ? or the ellipsis, and a prefix of the page text (before the ellipsis, trimmed);
// a card that ends with the ellipsis ends at a whole word: the page text goes on with white space.
export function expectCardOfPage(card: string, page: string, label: string): void {
  expect(page.trim(), `${label}: the page text is not empty`).not.toBe('');
  expect(card.trim(), `${label}: the card text is not empty`).not.toBe('');
  const half = Math.floor(page.length / 2);
  expect(card.length, `${label}: the card (${card.length} characters) is at most half the page text (${page.length} characters, half ${half})`).toBeLessThanOrEqual(half);
  expect(/[.!?…]$/.test(card), `${label}: the card ends with . ! ? or ${ELLIPSIS}`).toBe(true);
  const opening = card.endsWith(ELLIPSIS) ? card.slice(0, -ELLIPSIS.length).trim() : card;
  expect(opening, `${label}: the card text before any ellipsis is not empty`).not.toBe('');
  expect(page.startsWith(opening), `${label}: the card is the opening of the page text`).toBe(true);
  if (card.endsWith(ELLIPSIS)) {
    const next = page.charAt(opening.length);
    expect(/\s/.test(next), `${label}: the card ends at a whole word (the page text after its opening is ${JSON.stringify(next)}, not white space)`).toBe(true);
  }
}
