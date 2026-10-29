// AC-26e (scenario, @surface-app, project iphone): story 44, coverage.md row AC-26 e.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-26; the Given/When/Then is the owning story's row AC-26e.
// Given the community's listing has no admitted post, when the owner opens the feed, then no item from that
// community shows and no error state shows.
import { test, expect } from '../../support/session';
import { runDateToday, runMarker } from '../../support/env';
import { ingest, seed } from '../../support/job';
import { expectTitles } from '../../support/feed';

test(
  'AC-26e: a community listing with no admitted post shows no item from it and no error state',
  { tag: ['@journey-read-feed', '@surface-app', '@story-44'] },
  async ({ page }) => {
    // Given: the listing of one joined community (its name contains <run>) has no admitted post,
    // beside a community with an admitted post; the manifest names the complete set of feed
    // titles the set must show (feed_titles) and the names of the communities shown on it
    // (feed_communities)
    const run = runMarker();
    const manifest = seed('AC-26e', run);
    const titles = (Array.isArray(manifest.feed_titles) ? manifest.feed_titles : []).map(String);
    const communities = (Array.isArray(manifest.feed_communities) ? manifest.feed_communities : []).map(String);
    expect(communities.length, 'prerequisite: an admitted community is shown').toBeGreaterThan(0);
    const result = ingest(runDateToday());
    expect(result.report?.status, 'prerequisite (1, the run report): the run completes').toMatch(/^(completed|partial)$/);

    // When: the owner opens the feed
    await page.goto('/');

    // Then: the feed settles on exactly the expected set; the community names shown are exactly
    // the expected ones, none from the empty community; no error state shows. The feed itself is
    // the 45 prerequisite; the expected set holds the admitted Reddit post, which 44 provides
    await expect(page.getByTestId('feed-item').first(), 'prerequisite (45, the feed)').toBeVisible();
    await expectTitles(page, titles, 'first unmet step (44): the feed with the admitted Reddit post');
    await expect
      .poll(async () => (await page.getByTestId('feed-item-community').allTextContents()).map((t) => t.trim()).sort(), {
        message: 'first unmet step (44): the community names shown',
      })
      .toEqual([...communities].sort());
    expect(communities.filter((name) => name.includes(run))).toEqual([]);
    await expect(page.getByTestId('error-state')).toHaveCount(0);
  },
);
