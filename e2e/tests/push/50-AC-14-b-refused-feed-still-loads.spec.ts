// AC-14b (scenario, @surface-app, project iphone): story 50, coverage.md row AC-14 b.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-14; the Given/When/Then is the owning story's row AC-14b.
// Given permission refused, when the owner opens the app, then the feed still loads and the re-enable message
// shows. CONDITIONAL on OD-08 (push or both).
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';
import { emulateHomeScreen, emulateNotifications, expectEmulatedNotifications } from '../../support/platform';

test(
  'AC-14b: with permission refused the feed still loads and the re-enable message shows',
  { tag: ['@journey-push', '@surface-app', '@story-50'] },
  async ({ page }) => {
    // Given: notification permission refused, emulated as denied (not merely ungranted), in the
    // Home Screen web app context (CONDITIONAL on OD-08: push or both); checked in the page
    // before the owning assertion (support/platform.ts). The refused screen of artboard 19 has
    // no subscribe control, so none is required or tapped (round 20 R20-1)
    const run = runMarker();
    seed('AC-14b', run);
    await emulateNotifications(page, 'refused', run);
    await emulateHomeScreen(page);

    // When: the owner opens the app
    await page.goto('/');
    await expectEmulatedNotifications(page, 'refused');
    await itemWithTitle(page, run, 'prerequisite (45, the feed)');

    // First unmet step (50), the Then: the re-enable message shows (notifications-refused, the
    // approved copy of artboards/19-push-refused.html: notifications are off, and how to allow
    // them again in the iPhone's Settings), and the feed is still loaded beside it
    const refused = page.getByTestId('notifications-refused');
    await expect(refused, 'first unmet step (50): the re-enable message').toBeVisible();
    await expect(refused, 'the message explains how to re-enable notifications').toContainText(/allow notifications/i);
    await expect(refused, 'the message names where to re-enable them').toContainText(/Settings/);
    await itemWithTitle(page, run, 'Then: the feed still loads');
  },
);
