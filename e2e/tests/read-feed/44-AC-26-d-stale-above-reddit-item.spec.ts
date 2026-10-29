// AC-26d (scenario, @surface-app, project iphone): story 44, coverage.md row AC-26 d.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-26; the Given/When/Then is the owning story's row AC-26d.
// Given a stored Reddit item and seeded run records whose last completed run is 30 hours old, when the owner
// opens the app, then the Stale state shows above the Reddit item as above the others.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { box, itemWithTitle } from '../../support/feed';

test(
  'AC-26d: with the last completed run 30 hours old the Stale state shows above the Reddit item',
  { tag: ['@journey-read-feed', '@surface-app', '@story-44'] },
  async ({ page }) => {
    // Given: a stored Reddit item (<run>-reddit) and run records whose last completed run is 30 hours old
    const run = runMarker();
    seed('AC-26d', run);

    // When: the owner opens the app
    await page.goto('/');

    // Then: the Stale state shows above the Reddit item; the geometry is waited on until the
    // Stale state's bottom edge lies at or above the item's top edge
    const stale = page.getByTestId('stale-state');
    await expect(stale, 'prerequisite (45): the Stale state').toBeVisible();
    const post = await itemWithTitle(page, `${run}-reddit`, 'prerequisite (45, the feed)');
    await expect(post.getByTestId('feed-item-reddit-label'), 'first unmet step (44): the from Reddit label').toHaveText('from Reddit');
    await expect
      .poll(async () => {
        const s = await box(stale);
        const p = await box(post);
        return s !== null && p !== null && s.y + s.height <= p.y;
      }, { message: 'the Stale state lies above the Reddit item' })
      .toBe(true);
  },
);
