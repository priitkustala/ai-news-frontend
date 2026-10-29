// AC-26a (scenario, @surface-app, project iphone): story 44, coverage.md row AC-26 a.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-26; the Given/When/Then is the owning story's row AC-26a.
// Given test Reddit credentials and a fixture Data API listing for one joined community with one admitted
// external-link post and one excluded image post, when a run completes and the owner opens the feed at iPhone
// size, then the admitted post shows as a feed-item with its title, the community name, the poster's
// username, the from Reddit label, a link back to the post and its external link.
import { test, expect } from '../../support/session';
import { runDateToday, runMarker } from '../../support/env';
import { ingest, seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

test(
  'AC-26a: the admitted Reddit post shows with title, community, username, label, post link and external link',
  { tag: ['@journey-read-feed', '@surface-app', '@story-44'] },
  async ({ page }) => {
    // Given: test Reddit credentials and a fixture listing for one joined community with an
    // admitted external-link post (<run>-reddit-admitted) and an excluded image post
    // (<run>-reddit-image); the manifest names the admitted post's community, author, post_url
    // and external_url (the fixture listing's values)
    const run = runMarker();
    const manifest = seed('AC-26a', run);

    // When: a run completes and the owner opens the feed at iPhone size
    const result = ingest(runDateToday());
    expect(result.report?.status, 'prerequisite (1, the run report): the run completes').toMatch(/^(completed|partial)$/);
    await page.goto('/');

    // Then: the admitted post shows with its title, community, username, the from Reddit label
    // (approved copy of artboards/09-feed-item-reddit.html), post link and external link, each
    // equal to the fixture's
    const post = await itemWithTitle(page, `${run}-reddit-admitted`, 'first unmet step (44): the admitted post');
    await expect(post.getByTestId('feed-item-community')).toHaveText(String(manifest.community));
    await expect(post.getByTestId('feed-item-author')).toHaveText(String(manifest.author));
    await expect(post.getByTestId('feed-item-reddit-label')).toHaveText('from Reddit');
    await expect(post.getByTestId('feed-item-post-link')).toHaveAttribute('href', String(manifest.post_url));
    await expect(post.getByTestId('feed-item-external-link')).toHaveAttribute('href', String(manifest.external_url));
  },
);
