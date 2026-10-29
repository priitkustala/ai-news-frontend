// AC-24b (scenario, @surface-app, project iphone): story 51, coverage.md row AC-24 b.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-24; the Given/When/Then is the owning story's row AC-24b.
// Given the feed, when the owner goes offline, then a status message element with the new state is present.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

test(
  'AC-24b: going offline presents a status message element with the new state',
  { tag: ['@journey-bookmark', '@surface-app', '@story-51'] },
  async ({ page, context }) => {
    // Given: the feed, online, with a seeded item (<run> in its title) (prerequisite: the 45
    // feed); no status message announces the offline state yet
    const run = runMarker();
    seed('AC-24b', run);
    await page.goto('/');
    await itemWithTitle(page, run, 'prerequisite (45, the feed)');
    const status = page.getByTestId('status-message');
    await expect(status).not.toHaveText(/offline/i);

    // When: the owner goes offline
    await context.setOffline(true);

    // Then: a status message element announces the new, offline state with the approved copy of
    // artboards/06-feed-offline.html, which starts "You're offline." (round 20 R20-4): a stale
    // bookmark or online message, or text that only mentions the word, such as "You are not
    // offline" or "No longer offline", does not satisfy it
    await expect(status, 'first unmet step (51): the offline state is announced').toBeVisible();
    await expect(status).toHaveAttribute('role', 'status');
    await expect(status).toHaveText(/^\s*You[’']re offline\./);
  },
);
