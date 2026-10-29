// AC-24a (scenario, @surface-app, project iphone): story 51, coverage.md row AC-24 a.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-24; the Given/When/Then is the owning story's row AC-24a.
// Given the feed, when the owner toggles a bookmark, then a status message element with the new state is
// present.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

// The announcement of a saved bookmark, the approved copy of artboards/14-bookmark-control.html.
// The design draws no removal message, so the removal's copy is a proposal for 51's Brief
// (tests/README-testids.md, Proposed copy; pull-requests.md, Interpretation 8): the scenario
// requires the removed state to be announced as such, never merely a different text (round 20
// R20-4); a rename at 51's Brief changes this constant through a repair round.
const SAVED = 'Bookmark saved';
const REMOVED = 'Bookmark removed';

test(
  'AC-24a: toggling a bookmark presents a status message element with the new state',
  { tag: ['@journey-bookmark', '@surface-app', '@story-51'] },
  async ({ page }) => {
    // Given: the feed with a seeded item (<run> in its title) (prerequisite: the 45 feed)
    const run = runMarker();
    seed('AC-24a', run);
    await page.goto('/');
    const control = (await itemWithTitle(page, run, 'prerequisite (45, the feed)')).getByTestId('feed-item-bookmark');
    await expect(control, 'first unmet step (51): the bookmark control').toHaveAttribute('aria-pressed', 'false');
    const status = page.getByTestId('status-message');

    // When: the owner toggles a bookmark (save, remove, save again)
    // Then: after each toggle a status message element announces the new state, and the
    // announcement agrees with the control: saved when it is pressed, removed when it is not
    await control.tap();
    await expect(control).toHaveAttribute('aria-pressed', 'true');
    await expect(status).toHaveAttribute('role', 'status');
    await expect(status).toHaveText(SAVED);
    await control.tap();
    await expect(control).toHaveAttribute('aria-pressed', 'false');
    await expect(status).toHaveText(REMOVED);
    await control.tap();
    await expect(control).toHaveAttribute('aria-pressed', 'true');
    await expect(status).toHaveText(SAVED);
  },
);
