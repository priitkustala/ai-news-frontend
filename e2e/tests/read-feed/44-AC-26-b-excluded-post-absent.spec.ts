// AC-26b (scenario, @surface-app, project iphone): story 44, coverage.md row AC-26 b.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-26; the Given/When/Then is the owning story's row AC-26b.
// Given the same fixture listing with one excluded image post, when a run completes and the owner opens the
// feed at iPhone size, then the excluded post is absent.
import { test, expect } from '../../support/session';
import { runDateToday, runMarker } from '../../support/env';
import { ingest, seed } from '../../support/job';
import { expectTitles, itemWithTitle } from '../../support/feed';

test(
  'AC-26b: the Reddit image post that the rule excludes is absent from the feed',
  { tag: ['@journey-read-feed', '@surface-app', '@story-44'] },
  async ({ page }) => {
    // Given: the fixture listing with the admitted post (<run>-reddit-admitted) and the excluded
    // image post (<run>-reddit-image); the manifest names the complete set of feed titles the
    // set must show (feed_titles)
    const run = runMarker();
    const manifest = seed('AC-26b', run);
    const titles = (Array.isArray(manifest.feed_titles) ? manifest.feed_titles : []).map(String);

    // When: a run completes and the owner opens the feed at iPhone size
    const result = ingest(runDateToday());
    expect(result.report?.status, 'prerequisite (1, the run report): the run completes').toMatch(/^(completed|partial)$/);
    await page.goto('/');

    // Then: the feed settles on exactly the expected set, which holds the admitted post, and the
    // excluded post is absent from it
    await itemWithTitle(page, `${run}-reddit-admitted`, 'first unmet step (44): the admitted post');
    expect(titles.some((t) => t.includes(`${run}-reddit-image`)), 'the expected set excludes the image post').toBe(false);
    await expectTitles(page, titles, 'Then');
  },
);
