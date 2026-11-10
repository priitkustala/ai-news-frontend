// AC-6 (scenario, @surface-app, project iphone): bug 45 (priitkustala/ai-news-frontend#45, SI-51), round 2, finding F-FE45-1.
// Source: finding F-FE45-1 of the evaluator's report (evaluations/ai-news-app/frontend-45/round-01/frontend-45.md) and the
// regression contract (ai-news-team-context rules/regression-contract.md), Test integrity 2: a bug is reproduced by a
// scenario that fails before the fix.
// Given a stored session the stack no longer knows, whose start-up check at /auth/v1/user is still pending, when the owner
// signs in through the form meanwhile and the old check is answered afterwards (bad_jwt in the first part, success in the
// second), then the new session stays signed in and the feed reads (first part), and a later sign-out is not undone by the
// old success (second part).
import { test, expect } from '../../support/session';
import { buildWithKeyB, staleOwnerSession, submitOwner } from '../../support/client-build';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';
import type { Page, Route } from '@playwright/test';

// The held route must see the check: with the client's service worker in control,
// WebKit's requests bypass page.route (S-09 finding B2).
test.use({ serviceWorkers: 'block', storageState: { cookies: [], origins: [] } });

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

// Plants the stale session, holds the first check of it, and reloads. Resolves with the release function.
async function loadWithHeldCheck(page: Page, ownerState: string, origin: string): Promise<(status: number, body: object) => Promise<void>> {
  await page.goto('/');
  const planted = staleOwnerSession(ownerState, origin);
  await page.evaluate(([name, value]) => localStorage.setItem(name, value), [planted.name, planted.value]);
  let held: Route | undefined;
  let seen = 0;
  await page.route('**/auth/v1/user', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    seen += 1;
    if (!held) {
      held = route;
      return;
    }
    await route.continue();
  });
  await page.reload();
  await expect.poll(() => held !== undefined, { message: 'the first check of the stored session is held' }).toBe(true);
  return async (status, body) => {
    console.log(`reading: ${seen} check request(s) seen before the release`);
    await held!.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
  };
}

test(
  'AC-6: a stale session check answered after a new sign-in keeps the new session',
  { tag: ['@journey-install', '@surface-app', '@bug-45'] },
  async ({ page, ownerState }, testInfo) => {
    buildWithKeyB();
    const run = runMarker();
    seed('AC-12', run);

    // Given: a stored session the stack refuses, its first check held
    const release = await loadWithHeldCheck(page, ownerState, new URL(String(testInfo.project.use.baseURL)).origin);

    // When: the owner signs in through the form meanwhile, and then the held check is answered bad_jwt
    await expect(page.getByTestId('sign-in-form')).toBeVisible();
    await submitOwner(page);
    await expect(page.getByTestId('signed-in')).toBeVisible();
    await release(403, { code: 403, error_code: 'bad_jwt', msg: 'invalid JWT' });

    // Then: signed-in stays for three seconds, the feed reads, no sign-in form appears
    await page.waitForTimeout(3000);
    await expect(page.getByTestId('signed-in')).toBeVisible();
    await expect(page.getByTestId('sign-in-form')).toHaveCount(0);
    await itemWithTitle(page, run, 'the feed of the new session');
  },
);

test(
  'AC-6b: a stale session check that succeeds late does not undo a later sign-out',
  { tag: ['@journey-install', '@surface-app', '@bug-45'] },
  async ({ page, ownerState }, testInfo) => {
    buildWithKeyB();

    // Given: a stored session the stack refuses, its first check held
    const release = await loadWithHeldCheck(page, ownerState, new URL(String(testInfo.project.use.baseURL)).origin);

    // When: the sign-in screen shows (the second check was refused), and the held check is answered with success
    await expect(page.getByTestId('sign-in-form')).toBeVisible();
    await release(200, { id: 'stale' });

    // Then: the sign-in screen stays
    await page.waitForTimeout(3000);
    await expect(page.getByTestId('sign-in-form')).toBeVisible();
    await expect(page.getByTestId('signed-in')).toHaveCount(0);
  },
);
