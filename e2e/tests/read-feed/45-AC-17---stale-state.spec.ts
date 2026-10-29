// AC-17 (scenario, @surface-app, project iphone): story 45, coverage.md row AC-17 -.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-17; the Given/When/Then is the owning story's row AC-17.
// Given seeded health data whose last completed run is 30 hours old, when the owner opens the app, then the
// Stale state shows the last-updated time prominently.
import { test, expect } from '../../support/session';
import { runMarker, shownTime } from '../../support/env';
import { seed } from '../../support/job';

test(
  'AC-17: with the last completed run 30 hours old the Stale state shows the last-updated time prominently',
  { tag: ['@journey-read-feed', '@surface-app', '@story-45'] },
  async ({ page }) => {
    // Given: seeded health data whose last completed run is 30 hours old; the manifest names
    // that run's completion instant (last_completed_at, ISO 8601; round 21 R21-2), checked
    // against the Given before the app is opened
    const run = runMarker();
    const manifest = seed('AC-17', run);
    const lastCompleted = String(manifest.last_completed_at);
    expect(Math.round((Date.now() - Date.parse(lastCompleted)) / 3_600_000), 'Given: the seeded last completed run is 30 hours old').toBe(30);

    // When: the owner opens the app
    await page.goto('/');

    // Then: the Stale state shows the last-updated time prominently (inside the Stale state,
    // artboard 07: Last updated 26 Oct 2026, 23:10): the seeded run's last_completed_at in the
    // display format of support/env.ts shownTime, in the zone E2E_RUN_TIME_ZONE binds (OD-09
    // OPEN); another run's time or other text fails
    const stale = page.getByTestId('stale-state');
    await expect(stale).toBeVisible();
    await expect(stale.getByTestId('last-updated'), 'the seeded last completed run').toHaveText(new RegExp(`(?:^|\\D)${shownTime(lastCompleted)}(?:\\D|$)`));
  },
);
