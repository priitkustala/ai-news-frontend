// AC-15e (scenario, @surface-app, project iphone): story 51, coverage.md row AC-15 e.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-15; the Given/When/Then is the owning story's row AC-15e.
// Given a seeded item that is bookmarked, when the owner removes it, then it is gone after reload.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { expectTitles, itemWithTitle } from '../../support/feed';

test(
  'AC-15e: a removed bookmark is gone after reload',
  { tag: ['@journey-bookmark', '@surface-app', '@story-51'] },
  async ({ page }) => {
    // Given: a seeded item (<run> in its title), bookmarked by the owner and listed in Bookmarks
    // (prerequisite: the 45 feed; the seed resets the bookmarks)
    const run = runMarker();
    seed('AC-15e', run);
    await page.goto('/');
    const item = await itemWithTitle(page, run, 'prerequisite (45, the feed)');
    await expect(item.getByTestId('feed-item-bookmark'), 'first unmet step (51): the bookmark control').toHaveAttribute('aria-pressed', 'false');
    await item.getByTestId('feed-item-bookmark').tap();
    await expect(item.getByTestId('feed-item-bookmark')).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    const control = (await itemWithTitle(page, run, 'Given')).getByTestId('feed-item-bookmark');
    await expect(control).toHaveAttribute('aria-pressed', 'true');

    // When: the owner removes it
    await control.tap();
    await expect(control).toHaveAttribute('aria-pressed', 'false');

    // Then: it is gone after reload: unpressed in the feed and Bookmarks holds no item
    await page.reload();
    await expect((await itemWithTitle(page, run, 'Then')).getByTestId('feed-item-bookmark')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('nav-bookmarks'), 'Then: the Bookmarks tab (51)').toBeVisible();
    await page.getByTestId('nav-bookmarks').tap();
    await expect(page.getByTestId('bookmarks-list')).toBeVisible();
    await expectTitles(page.getByTestId('bookmarks-list'), [], 'Then');
  },
);
