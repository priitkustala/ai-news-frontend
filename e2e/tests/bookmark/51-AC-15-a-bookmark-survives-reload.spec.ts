// AC-15a (scenario, @surface-app, project iphone): story 51, coverage.md row AC-15 a.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-15; the Given/When/Then is the owning story's row AC-15a.
// Given a seeded item, when the owner bookmarks it, reloads the page and opens Bookmarks, then the item is
// listed and its control shows the pressed state.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

test(
  'AC-15a: a bookmarked item is listed in Bookmarks after reload with its control pressed',
  { tag: ['@journey-bookmark', '@surface-app', '@story-51'] },
  async ({ page }) => {
    // Given: a seeded item (<run> in its title) in the feed (prerequisite: the 45 feed, a
    // REQUIRED dependency of 51)
    const run = runMarker();
    seed('AC-15a', run);
    await page.goto('/');
    const item = await itemWithTitle(page, run, 'prerequisite (45, the feed)');

    // First unmet step (51): the item's bookmark control, unpressed
    const control = item.getByTestId('feed-item-bookmark');
    await expect(control, 'first unmet step (51): the bookmark control').toHaveAttribute('aria-pressed', 'false');

    // When: the owner bookmarks it, reloads the page and opens Bookmarks
    await control.tap();
    await expect(control).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.getByTestId('nav-bookmarks'), 'first unmet step (51): the Bookmarks tab').toBeVisible();
    await page.getByTestId('nav-bookmarks').tap();

    // Then: the item is listed and its control shows the pressed state
    const saved = await itemWithTitle(page.getByTestId('bookmarks-list'), run, 'Then');
    await expect(saved.getByTestId('feed-item-bookmark')).toHaveAttribute('aria-pressed', 'true');
  },
);
