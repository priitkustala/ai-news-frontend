// 53-SMOKE-f (smoke, @surface-app, project iphone): priitkustala/ai-news#212 (CHK-1), production smoke suite before
// every release goes live. The owner rule of Decisions rows 550 and 1116 (the story page at least two or three times
// the length of its card, never the other way around) and the owner, 2026-11-24: a consistency check validated
// before a story appears on the production page.
// Given the client at iPhone size and the smoke user signed in through the client's own sign-in form, when the Feed
// tab draws the served stories, then for every drawn story with its feed row the card (feed-item-summary) is at most
// half of its page text (the digest when present, else the summary), and neither the card nor the page text holds
// an entity, a tag, a footnote mark between backslashes or a rule line; a Reddit story is checked on its page text
// only. Every failing story is collected and the row fails once with their ids and reasons.
// Read only: no seed, no development sign-in, no job command; nothing logged but ids, counts and reasons (never a
// title or a text of a story).
import { test, expect, type Locator } from '@playwright/test';
import type { Row } from '../../support/data';
import { readQuery, signInSmoke, smokeCredentials } from '../../support/smoke';

type Story = { id: string; title: string; summary: string | null; digest: string | null; sourceType: string };
type Drawn = { title: string | null; cards: string[] };

const MARKUP: [string, RegExp][] = [
  ['entity', /&(#\d+|[A-Za-z]+);/],
  ['tag', /<[A-Za-z\/]/],
  ['footnote', /\\\d+\\/],
  ['rule', /[-_=*]{4,}/],
];

// The one reader of a feed row: id, title and source_type are required, summary and digest are a string or null.
// A row that does not fit fails here, naming its position and the field, never a value.
function toStory(row: Row, index: number): Story {
  const text = (field: string): string | null => {
    const value = row[field];
    if (value === null || typeof value === 'string') return value;
    throw new Error(`feed row ${index}: ${field} is neither a string nor null`);
  };
  const required = (field: string): string => {
    const value = text(field);
    if (value === null) throw new Error(`feed row ${index}: ${field} is missing`);
    return value;
  };
  return { id: required('id'), title: required('title'), summary: text('summary'), digest: text('digest'), sourceType: required('source_type') };
}

// The text the story page shows: the digest when it is a non-empty string, else the summary, else nothing.
function pageText(story: Story): string {
  if (story.digest) return story.digest;
  return story.summary ?? '';
}

// The drawn count once two reads in a row agree, so the list is read after it has settled.
async function settledCount(items: Locator): Promise<number> {
  let previous = -1;
  await expect
    .poll(async () => {
      const count = await items.count();
      const settled = count === previous && count > 0;
      previous = count;
      return settled;
    }, { message: 'the feed list settles: two reads of the drawn count agree' })
    .toBe(true);
  return previous;
}

// Each drawn item's title text and the texts of its card elements (0 or 1 since #210), read in one pass.
async function readDrawn(items: Locator): Promise<Drawn[]> {
  return items.evaluateAll((nodes) =>
    nodes.map((node) => ({
      title: node.querySelector('[data-testid="feed-item-title"]')?.textContent ?? null,
      cards: Array.from(node.querySelectorAll('[data-testid="feed-item-summary"]'), (card) => card.textContent ?? ''),
    })),
  );
}

function markupReasons(text: string, where: string): string[] {
  return MARKUP.filter(([, pattern]) => pattern.test(text)).map(([kind]) => `markup ${kind} in ${where}`);
}

// The reasons one drawn story fails the rule; empty when it holds.
function storyReasons(story: Story, drawn: Drawn): string[] {
  const page = pageText(story);
  const reddit = story.sourceType === 'reddit';
  const reasons: string[] = [];
  if (!reddit && drawn.cards.length > 1) reasons.push('more than one card');
  const card = reddit ? null : (drawn.cards[0] ?? null);
  if (card !== null && (page === '' || card.length > Math.floor(page.length / 2))) reasons.push('card over half');
  if (card !== null) reasons.push(...markupReasons(card, 'card'));
  reasons.push(...markupReasons(page, 'page'));
  return reasons;
}

// Each drawn item takes the first not yet matched story whose title equals its title text (trimmed); the entries
// name the story id and its reasons, or the position of a drawn item with no story.
function failures(stories: Story[], drawn: Drawn[]): string[] {
  const unmatched = [...stories];
  const entries: string[] = [];
  drawn.forEach((item, position) => {
    const title = item.title?.trim();
    const index = title === undefined ? -1 : unmatched.findIndex((story) => story.title.trim() === title);
    if (index < 0) {
      entries.push(`drawn item ${position}: no row for its title position ${position}`);
      return;
    }
    const [story] = unmatched.splice(index, 1);
    const reasons = storyReasons(story, item);
    if (reasons.length > 0) entries.push(`${story.id}: ${reasons.join(', ')}`);
  });
  return entries;
}

test(
  '53-SMOKE-f: no served card is longer than half its page and no card or page shows source markup',
  { tag: ['@tier-smoke', '@journey-read-feed', '@surface-app', '@story-212'] },
  async ({ page, request }) => {
    test.setTimeout(60_000);
    const { email, password } = smokeCredentials();

    // Given: the client's sign-in form, at the sign-in address, at iPhone size; the smoke user signs in
    await page.goto('/#sign-in');
    await expect(page.getByTestId('sign-in-form'), 'the sign-in form at the sign-in address').toBeVisible();
    await page.getByTestId('sign-in-email').fill(email);
    await page.getByTestId('sign-in-password').fill(password);
    await page.getByTestId('sign-in-submit').click();
    await expect(page.getByTestId('signed-in')).toBeVisible();

    // The rows the smoke session reads through the published interface, read before the Feed tab so that an empty
    // feed fails on its own assertion here (rule 4) and not on the wait for a drawn item
    const result = await readQuery(request, 'feed?select=id,title,summary,digest,source_type', await signInSmoke(request));
    expect(result.status, 'the feed read with the smoke session answers 200').toBe(200);
    expect(result.malformed, 'the feed read answers a well-formed list of rows').toBe(false);
    expect(result.rows.length, 'the feed read holds rows: an empty feed is not a pass').toBeGreaterThan(0);
    const stories = result.rows.map(toStory);

    // When: the Feed tab draws the served stories
    await page.getByTestId('nav-feed').tap();
    const items = page.getByTestId('feed-list').getByTestId('feed-item');
    await expect(items.first()).toBeVisible();
    const drawnCount = await settledCount(items);
    const drawn = await readDrawn(items);
    expect(drawn.length, 'the drawn items read are the settled count').toBe(drawnCount);

    // Then: no drawn story fails the half rule or shows markup; one failure lists every failing story
    const entries = failures(stories, drawn);
    console.log(`53-SMOKE-f: drawn ${drawn.length} of ${stories.length} rows, ${entries.length} failing`);
    expect(entries, `drawn ${drawn.length} of ${stories.length} rows; failing stories (id: reasons)`).toEqual([]);
  },
);
