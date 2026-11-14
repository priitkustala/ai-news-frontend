// AC-16d (scenario, @surface-app, project iphone): story 4, repair of the evaluator's finding F-S19-1
// (evaluations/ai-news-app/S-19/round-01/S-19.md); rewritten by story S-21b (priitkustala/ai-news-frontend#44,
// criterion AC-6): a visitor reads the feed, so sign-out shows the guest feed and only the bookmark copy goes.
// Source: the approved settlement of S-19 (the owner's bookmarks do not stay on a signed-out device), the
// regression contract, Test integrity 2 (a defect is reproduced as a failing scenario before its repair), and
// the item's table of changed scenarios with the accepted settlement of S-21b.
// Given the owner signed in with a bookmark, the feed and the Bookmarks panel loaded once online, when the
// successful answers of the feed's first read, the Bookmarks panel's reads and a bookmark add are held
// across sign-out and released once the guest feed shows, then the bookmark offline-copy key is not in
// localStorage after they complete (the feed copy may remain: a visitor reads the feed).
import type { Page, Request, Route } from '@playwright/test';
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';
import { dataUrl } from '../../support/data';

// The holding route must see the data requests: with the client's service worker in control,
// WebKit's requests bypass page.route (S-09 finding B2).
test.use({ serviceWorkers: 'block' });

// The two keys of the device's copy, as src/offline/index.ts names them; the bookmark copy's key.
const KEYS = ['ai-news-offline-feed', 'ai-news-offline-bookmarks'];
const BOOKMARKS_KEY = 'ai-news-offline-bookmarks';

// The copy keys present in localStorage, read after the page has had a turn to run what it queued.
async function keptKeys(page: Page): Promise<string[]> {
  return page.evaluate(async (names) => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    return names.filter((name) => localStorage.getItem(name) !== null);
  }, KEYS);
}

test(
  'AC-16d: sign-out leaves no bookmark offline copy, even when reads and a bookmark add answer after it',
  { tag: ['@journey-offline', '@surface-app', '@story-4'] },
  async ({ page }) => {
    // Given: the owner bookmarked an item (<run> in its title) while online and opened the
    // Bookmarks panel once (prerequisites: the 45 feed, the 51 bookmark control and Bookmarks tab);
    // the device keeps both copies (4)
    const run = runMarker();
    seed('AC-16a', run);
    await page.goto('/');
    const item = await itemWithTitle(page, run, 'prerequisite (45, the feed)');
    await expect(item.getByTestId('feed-item-bookmark'), 'prerequisite (51): the bookmark control').toHaveAttribute('aria-pressed', 'false');
    await item.getByTestId('feed-item-bookmark').tap();
    await expect(item.getByTestId('feed-item-bookmark')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('nav-bookmarks'), 'prerequisite (51): the Bookmarks tab').toBeVisible();
    await page.getByTestId('nav-bookmarks').tap();
    await itemWithTitle(page.getByTestId('bookmarks-list'), run, 'prerequisite (51): the bookmark listed');
    await expect.poll(() => keptKeys(page), { message: 'prerequisite (4): both copies kept online' }).toEqual(KEYS);

    // When: the data interface's successful answers are held. First the feed's first read of a
    // reopened page (its feed and categories reads); the Bookmarks panel then reads unheld, and
    // its bookmark is removed and added again, the add held; a second opening of the panel holds
    // its three reads. The owner signs out through the sign-out control while all are held; once
    // the guest feed shows, every held request is released and completes
    const held: { route: Route; request: Request; name: string }[] = [];
    let phase: 'first' | 'all' | 'released' = 'first';
    await page.route(`${dataUrl()}/**`, async (route, request) => {
      const url = new URL(request.url());
      const name = url.pathname.split('/').pop() ?? '';
      const select = url.searchParams.get('select') ?? '';
      const firstRead = request.method() === 'GET' && ((name === 'feed' && select !== '*') || (name === 'categories' && select.includes('item_count')));
      const panelRead = request.method() === 'GET' && ['feed', 'categories', 'bookmarks'].includes(name) && select !== 'item_id';
      const bookmarkAdd = request.method() === 'POST' && name === 'bookmarks';
      if ((phase === 'first' && firstRead) || (phase === 'all' && (panelRead || bookmarkAdd))) {
        held.push({ route, request, name: `${request.method()} ${name}` });
        return;
      }
      await route.continue();
    });
    const heldNames = () => held.map((entry) => entry.name).sort();
    await page.reload();
    await expect.poll(heldNames, { message: 'the feed\'s first read is held' }).toEqual(['GET categories', 'GET feed']);
    await page.getByTestId('nav-bookmarks').tap();
    const listed = await itemWithTitle(page.getByTestId('bookmarks-list'), run, 'the Bookmarks panel read unheld');
    const control = listed.getByTestId('feed-item-bookmark');
    await expect(control).toHaveAttribute('aria-pressed', 'true');
    await control.tap();
    await expect(control).toHaveAttribute('aria-pressed', 'false');
    phase = 'all';
    await control.tap();
    await page.getByTestId('nav-feed').tap();
    await page.getByTestId('nav-bookmarks').tap();
    await expect
      .poll(heldNames, { message: 'the add and the panel\'s three reads are held' })
      .toEqual(['GET bookmarks', 'GET categories', 'GET categories', 'GET feed', 'GET feed', 'POST bookmarks']);
    await page.getByTestId('sign-out').tap();
    await expect(page.getByTestId('signed-in')).toHaveCount(0);
    await expect(page.getByTestId('feed-list'), 'first unmet step (s-21b): the guest feed shows after sign-out').toBeVisible();
    await expect.poll(() => keptKeys(page), { message: 'sign-out cleared the bookmark copy' }).not.toContain(BOOKMARKS_KEY);
    phase = 'released';
    for (const entry of held) await entry.route.continue();
    for (const entry of held) {
      const response = await entry.request.response();
      expect(response?.ok(), `the held ${entry.name} answered successfully`).toBe(true);
      await response?.finished();
    }

    // Then: after every held answer completed, the bookmark offline-copy key is not in localStorage
    await expect
      .poll(() => keptKeys(page), { message: 'first unmet step (4): no bookmark offline copy after sign-out' })
      .not.toContain(BOOKMARKS_KEY);
  },
);
