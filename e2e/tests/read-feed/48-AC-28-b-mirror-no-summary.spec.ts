// AC-28b (scenario, @surface-app, project iphone): story 48, coverage.md row AC-28 b.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-28; the Given/When/Then is the owning story's row AC-28b.
// Given the same mirror-shaped fixture, when a run completes and the owner opens the feed at iPhone size,
// then no summary text shows for it.
import { test, expect } from '../../support/session';
import { runDateToday, runMarker } from '../../support/env';
import { ingest, seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

test(
  'AC-28b: no summary text shows for the mirror items',
  { tag: ['@journey-read-feed', '@surface-app', '@story-48'] },
  async ({ page }) => {
    // Given: the mirror-shaped fixture as source anthropic-news-mirror; the manifest names every
    // mirror item's title (mirror_titles, each containing <run>-mirror)
    const run = runMarker();
    const manifest = seed('AC-28b', run);
    const titles = (Array.isArray(manifest.mirror_titles) ? manifest.mirror_titles : []).map(String);
    expect(titles.length, 'prerequisite: the manifest names the mirror items').toBeGreaterThan(0);

    // When: a run completes and the owner opens the feed at iPhone size
    const result = ingest(runDateToday());
    expect(result.report?.status, 'prerequisite (1, the run report): the run completes').toMatch(/^(completed|partial)$/);
    await page.goto('/');

    // Then: no summary text shows for its items
    for (const title of titles) {
      const item = await itemWithTitle(page, title, 'first unmet step (48): the mirror item');
      await expect(item.getByTestId('feed-item-summary')).toHaveCount(0);
    }
  },
);
