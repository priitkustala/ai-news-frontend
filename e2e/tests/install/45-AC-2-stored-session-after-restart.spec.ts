// AC-2 (scenario, @surface-app, project iphone): bug 45 (priitkustala/ai-news-frontend#45, SI-51), row AC-2.
// Source: the regression contract (ai-news-team-context rules/regression-contract.md), Test integrity 2:
// a bug is reproduced by a scenario that fails before the fix.
// Given a browser profile that visited the client built with key A, its worker registered, and holding a
// stored session an earlier stack issued (the owner's session with a changed signature and a refresh token
// the stack never issued), when the client is rebuilt with key B and the profile visits it again, then the
// guest screen shows and stays (no error loop), and the owner persona's right credentials give the signed-in screen.
// Rewritten by story S-21b (priitkustala/ai-news-frontend#44; its settlement, finding F1): without a session the
// app shows the guest feed, and the sign-in form is behind the Bookmarks tab (submitOwner opens it).
import { test, expect } from '../../support/session';
import { buildWithKeyA, buildWithKeyB, launchProfile, logReadings, staleFields, staleOwnerSession, submitOwner, visitAndRegisterWorker, watchSignIn } from '../../support/client-build';

test(
  'AC-2: a stored session of an earlier stack leads to the guest screen, and sign-in works',
  { tag: ['@journey-install', '@surface-app', '@bug-45'] },
  async ({ ownerState }, testInfo) => {
    test.setTimeout(180_000);
    const folder = testInfo.outputPath('profile');
    try {
      // Given: the profile visited build A, its worker registered, and the stale session is planted
      buildWithKeyA();
      const first = await launchProfile(testInfo, folder);
      const firstPage = await first.newPage();
      await visitAndRegisterWorker(firstPage);
      const planted = staleOwnerSession(ownerState, new URL(String(testInfo.project.use.baseURL)).origin);
      console.log(`reading: stale session stored under ${planted.name}; fields changed: ${staleFields.join(', ')}`);
      await firstPage.evaluate(([name, value]) => localStorage.setItem(name, value), [planted.name, planted.value]);
      await firstPage.reload();
      await first.close();

      // When: build B is served and the profile revisits
      buildWithKeyB();
      const context = await launchProfile(testInfo, folder);
      try {
        const signIn = watchSignIn(context);
        const page = await context.newPage();
        await page.goto('/');

        // Then: the guest screen shows and stays
        await expect(page.getByTestId('nav-bookmarks'), 'first unmet step (s-21b): the guest screen').toBeVisible();
        await expect(page.getByTestId('signed-in')).toHaveCount(0);
        await page.waitForLoadState('networkidle');
        await expect(page.getByTestId('nav-bookmarks')).toBeVisible();
        await expect(page.getByTestId('signed-in')).toHaveCount(0);
        await expect(page.getByTestId('sign-in-error')).toHaveCount(0);

        // and the right credentials give the signed-in screen
        const outcome = await submitOwner(page);
        await logReadings(page, signIn, outcome);
        await expect(page.getByTestId('signed-in')).toBeVisible();
      } finally {
        await context.close();
      }
    } finally {
      buildWithKeyB();
    }
  },
);
