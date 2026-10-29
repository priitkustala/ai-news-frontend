// AC-16a (scenario, @surface-app, project iphone): story 4, coverage.md row AC-16 a.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-16; the Given/When/Then is the owning story's row AC-16a.
// Given the owner opened the feed and bookmarked an item while online, when Playwright's offline emulation is
// switched on and the page is reopened, then the Offline banner shows, cached headlines, summaries as shown
// and the bookmark are readable.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle, reopen } from '../../support/feed';

test(
  'AC-16a: offline the banner shows and cached headlines, summaries and the bookmark are readable',
  { tag: ['@journey-offline', '@surface-app', '@story-4'] },
  async ({ page, context }) => {
    // Given: the owner opened the feed and bookmarked an item (<run> in its title) while online
    // (prerequisites: the 45 feed and the 51 bookmark control, both REQUIRED before 4);
    // the manifest names the item's title and summary
    const run = runMarker();
    const manifest = seed('AC-16a', run);
    await page.goto('/');
    const item = await itemWithTitle(page, run, 'prerequisite (45, the feed)');
    await expect(item.getByTestId('feed-item-title')).toHaveText(String(manifest.title));
    await expect(item.getByTestId('feed-item-summary')).toHaveText(String(manifest.summary));
    await expect(item.getByTestId('feed-item-bookmark'), 'prerequisite (51): the bookmark control').toHaveAttribute('aria-pressed', 'false');
    await item.getByTestId('feed-item-bookmark').tap();
    await expect(item.getByTestId('feed-item-bookmark')).toHaveAttribute('aria-pressed', 'true');

    // When: offline emulation is switched on and the page is reopened; reopening offline is
    // 4's own first observable (its cache), asserted so that a missing cache fails here on an
    // assertion and never in a rejected navigation (round 20 R20-2)
    await context.setOffline(true);
    await reopen(page, 'first unmet step (4): the app reopens offline from its cache');

    // Then: the Offline banner shows; the cached headline, its summary and the bookmark are readable
    await expect(page.getByTestId('offline-banner'), 'Then: the Offline banner').toBeVisible();
    const cached = await itemWithTitle(page, run, 'Then');
    await expect(cached.getByTestId('feed-item-title')).toHaveText(String(manifest.title));
    await expect(cached.getByTestId('feed-item-summary')).toHaveText(String(manifest.summary));
    await expect(page.getByTestId('nav-bookmarks'), 'prerequisite (51): the Bookmarks tab').toBeVisible();
    await page.getByTestId('nav-bookmarks').tap();
    await itemWithTitle(page.getByTestId('bookmarks-list'), run, 'Then');
  },
);
