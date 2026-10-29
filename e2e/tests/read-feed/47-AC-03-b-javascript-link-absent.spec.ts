// AC-03b (scenario, @surface-app, project iphone): story 47, coverage.md row AC-03 b.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-03; the Given/When/Then is the owning story's row AC-03b.
// Given seeded hostile fixtures with a javascript: link, when the run completes and the owner opens the feed,
// then the javascript: link is absent.
import { test, expect } from '../../support/session';
import { runDateToday, runMarker } from '../../support/env';
import { ingest, seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

test(
  'AC-03b: a javascript: link from a hostile feed is absent from the feed',
  { tag: ['@journey-read-feed', '@surface-app', '@story-47'] },
  async ({ page }) => {
    // Given: a hostile feed with an item (<run>-js-link) whose link is a javascript: address,
    // beside an ordinary item (<run>-hostile-ok) of the same feed; the manifest names the
    // complete set of original addresses the feed must link (feed_links: http and https only)
    const run = runMarker();
    const manifest = seed('AC-03b', run);
    const links = (Array.isArray(manifest.feed_links) ? manifest.feed_links : []).map(String);
    const result = ingest(runDateToday());
    expect(result.report?.status, 'prerequisite (1, the run report): the run completes').toMatch(/^(completed|partial)$/);

    // When: the run completes and the owner opens the feed
    await page.goto('/');

    // Then: the feed's original links settle on exactly the expected set, with no javascript: link
    await itemWithTitle(page, `${run}-hostile-ok`, 'prerequisite (45, the feed)');
    expect(links.filter((href) => /^\s*javascript:/i.test(href)), 'the expected set holds no javascript: link').toEqual([]);
    await expect
      .poll(async () => (await page.getByTestId('feed-item-original').evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''))).sort(), {
        message: 'the original links are exactly the expected set',
      })
      .toEqual([...links].sort());
  },
);
