// AC-15b (scenario, @surface-app, project iphone): story 51, coverage.md row AC-15 b.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-15; the Given/When/Then is the owning story's row AC-15b.
// Given a seeded item bookmarked as in AC-15a, when the owner bookmarks it again, then it is listed once.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { expectTitles, itemWithTitle } from '../../support/feed';

test(
  'AC-15b: bookmarking an item again lists it once',
  { tag: ['@journey-bookmark', '@surface-app', '@story-51'] },
  async ({ page, context }) => {
    // Given: a seeded item open in two pages of the owner's session, bookmarked from the first;
    // the seed resets the bookmarks, so Bookmarks holds this item only (prerequisite: the 45
    // feed). The second page is opened before the first bookmark and is not reloaded; it still
    // shows the add control, which is asserted unpressed before the second tap, so a client that
    // updates the open page live fails that assertion visibly instead of the tap removing the
    // bookmark (UNVERIFIED 7)
    const run = runMarker();
    seed('AC-15b', run);
    await page.goto('/');
    const first = await itemWithTitle(page, run, 'prerequisite (45, the feed)');
    const title = ((await first.getByTestId('feed-item-title').textContent()) ?? '').trim();
    await expect(first.getByTestId('feed-item-bookmark'), 'first unmet step (51): the bookmark control').toHaveAttribute('aria-pressed', 'false');
    const second = await context.newPage();
    await second.goto('/');
    const again = await itemWithTitle(second, run, 'prerequisite (45, the feed)');
    await first.getByTestId('feed-item-bookmark').tap();
    await expect(first.getByTestId('feed-item-bookmark')).toHaveAttribute('aria-pressed', 'true');

    // When: the owner bookmarks it again from the second page, which still shows the add control
    await expect(again.getByTestId('feed-item-bookmark')).toHaveAttribute('aria-pressed', 'false');
    await again.getByTestId('feed-item-bookmark').tap();
    await expect(again.getByTestId('feed-item-bookmark')).toHaveAttribute('aria-pressed', 'true');

    // Then: it is listed once: after a reload the Bookmarks list is exactly this one item
    await page.reload();
    await expect(page.getByTestId('nav-bookmarks'), 'Then: the Bookmarks tab (51)').toBeVisible();
    await page.getByTestId('nav-bookmarks').tap();
    await expectTitles(page.getByTestId('bookmarks-list'), [title], 'Then');
  },
);
