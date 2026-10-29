// AC-14a (scenario, @surface-app, project iphone): story 50, coverage.md row AC-14 a.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-14; the Given/When/Then is the owning story's row AC-14a.
// Given emulated notification permission, when the owner taps the subscribe control, then exactly one row is
// written to the push_subscriptions table under the owner's sign-in. CONDITIONAL on OD-08 (push or both).
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { expectRows, readRelation, signInOwner, wellFormedCount } from '../../support/data';
import { emulateHomeScreen, emulateNotifications, expectEmulatedNotifications } from '../../support/platform';

test(
  'AC-14a: tapping subscribe with permission granted writes exactly one push subscription',
  { tag: ['@journey-push', '@surface-app', '@story-50'] },
  async ({ page, request }) => {
    // Given: emulated notification permission, granted, in the Home Screen web app context
    // (CONDITIONAL on OD-08: push or both); the emulation is deterministic and checked in the
    // page before the When (support/platform.ts), so a platform set-up error is reported as a
    // prerequisite, never as this row's red assertion
    const run = runMarker();
    seed('AC-14a', run);
    const owner = signInOwner();
    const before = expectRows(await readRelation(request, 'push_subscriptions', owner), 'prerequisite: push_subscriptions is in the exposed schema');
    await emulateNotifications(page, 'granted', run);
    await emulateHomeScreen(page);
    await page.goto('/');
    await expectEmulatedNotifications(page, 'granted');

    // First unmet step (50): the app's own subscribe control
    const subscribe = page.getByTestId('subscribe');
    await expect(subscribe, 'first unmet step (50): the subscribe control').toBeVisible();

    // When: the owner taps the subscribe control
    await subscribe.tap();

    // Then: exactly one row is written to push_subscriptions under the owner's sign-in, the one
    // with the emulated subscription's endpoint
    await expect
      .poll(async () => wellFormedCount(await readRelation(request, 'push_subscriptions', owner)), {
        message: 'push_subscriptions holds one more well-formed row',
      })
      .toBe(before.length + 1);
    const after = expectRows(await readRelation(request, 'push_subscriptions', owner), 'Then');
    expect(after.filter((row) => String(row.endpoint).includes(run))).toHaveLength(1);
  },
);
