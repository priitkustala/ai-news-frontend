// AC-1 (scenario, @surface-app, project iphone): bug 45 (priitkustala/ai-news-frontend#45, SI-51), row AC-1.
// Source: the regression contract (ai-news-team-context rules/regression-contract.md), Test integrity 2:
// a bug is reproduced by a scenario that fails before the fix.
// Given a browser profile that visited the client built with key A, its service worker registered, no session,
// when the client is rebuilt with key B at the same address, the profile visits it again and the owner persona's
// right email and password are submitted, then the signed-in screen shows within the scenario timeout, with no
// site data cleared.
import { test, expect } from '@playwright/test';
import { buildWithKeyA, buildWithKeyB, launchProfile, logReadings, submitOwner, visitAndRegisterWorker, watchSignIn } from '../../support/client-build';

test(
  'AC-1: a browser that visited before signs in after the key changed',
  { tag: ['@journey-install', '@surface-app', '@bug-45'] },
  async ({}, testInfo) => {
    test.setTimeout(180_000);
    const folder = testInfo.outputPath('profile');
    try {
      // Given: the profile visited build A and its worker registered
      buildWithKeyA();
      const first = await launchProfile(testInfo, folder);
      await visitAndRegisterWorker(await first.newPage());
      await first.close();

      // When: build B is served, the profile revisits and the owner submits the right credentials
      buildWithKeyB();
      const context = await launchProfile(testInfo, folder);
      try {
        const signIn = watchSignIn(context);
        const page = await context.newPage();
        await page.goto('/');
        const outcome = await submitOwner(page);
        await logReadings(page, signIn, outcome);

        // Then: signed in, no site data cleared
        await expect(page.getByTestId('signed-in')).toBeVisible();
      } finally {
        await context.close();
      }
    } finally {
      buildWithKeyB();
    }
  },
);
