// AC-09 (scenario, @surface-app, project iphone): story 45, coverage.md row AC-09 -.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-09; the Given/When/Then is the owning story's row AC-09.
// Given seeded processed items, when the owner opens the app at iPhone size, then each feed-item shows
// headline, source name, category and publication time, the page shows the feed's last-updated time, and each
// item links to its original address.
import { test, expect } from '../../support/session';
import { runMarker, shownDate, shownTime } from '../../support/env';
import { seed } from '../../support/job';
import { expectTitles, expectedItems, itemWithTitle } from '../../support/feed';

test(
  'AC-09: each feed item shows headline, source, category and time, links to its original, and the page shows the last-updated time',
  { tag: ['@journey-read-feed', '@surface-app', '@story-45'] },
  async ({ page }) => {
    // Given: seeded processed items; the manifest names every item the feed must show (title,
    // source, category, original_url, published_at) and the last completed run's date: the
    // oracle, from the published seed interface and independent of the screen under test
    const run = runMarker();
    const manifest = seed('AC-09', run);
    const items = expectedItems(manifest);
    expect(items.length, 'prerequisite: the manifest names the seeded items').toBeGreaterThan(0);

    // When: the owner opens the app at iPhone size
    await page.goto('/');

    // Then: the feed shows exactly the seeded items; each shows its headline, source, category
    // and its own publication time (published_at shown as the artboards show it, in the run time
    // zone of E2E_RUN_TIME_ZONE; round 20 R20-4) and links to its own original address; the page
    // shows the feed's last-updated time (the last completed run's date)
    await expectTitles(page, items.map((i) => i.title), 'first unmet step (45): the feed');
    for (const expected of items) {
      const item = await itemWithTitle(page, expected.title, 'Then');
      await expect(item.getByTestId('feed-item-source')).toHaveText(expected.source);
      await expect(item.getByTestId('feed-item-category')).toHaveText(expected.category);
      await expect(item.getByTestId('feed-item-time')).toHaveText(shownTime(expected.published_at));
      await expect(item.getByTestId('feed-item-original')).toHaveAttribute('href', expected.original_url);
    }
    await expect(page.getByTestId('last-updated')).toHaveText(shownDate(String(manifest.last_completed_run_date)));
  },
);
