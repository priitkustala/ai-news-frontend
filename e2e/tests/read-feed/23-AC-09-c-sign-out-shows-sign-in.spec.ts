// AC-09c (scenario, @surface-app, project iphone): bug 23 (SI-15), coverage.md row AC-09 c.
// Source: the regression contract, Test integrity 2 (a bug is reproduced as a failing scenario before its
// repair); no Locked criterion states a count of reads.
// Given the owner with a stored session reading the feed, when they sign out, then the sign-in screen shows
// and a reload keeps it, with no further read of the feed.
import { test, expect } from '../../support/session';
import { requireEnv, runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

// The held route must see the image request: with the client's service worker in control,
// WebKit's requests bypass page.route (S-09 finding B2).
test.use({ serviceWorkers: 'block' });

test(
  'AC-09c: sign-out from the feed shows the sign-in screen, and a reload keeps it',
  { tag: ['@journey-read-feed', '@surface-app', '@bug-23'] },
  async ({ page }) => {
    // Given: the seeded feed shown for the stored session
    const run = runMarker();
    seed('AC-12', run);
    const dataUrl = requireEnv('E2E_DATA_URL', 'the published data interface');
    let counting = false;
    let feedReads = 0;
    page.on('request', (request) => {
      if (counting && request.url().startsWith(`${dataUrl}/feed`)) feedReads += 1;
    });
    await page.goto('/');
    await itemWithTitle(page, run, 'prerequisite (45, the feed)');

    // When: the owner taps sign-out (reads of the feed are counted from here)
    counting = true;
    await page.getByTestId('sign-out').tap();

    // Then: the sign-in screen shows instead of the feed, and a reload keeps it
    await expect(page.getByTestId('sign-in-form'), 'first unmet step (23): the sign-in screen shows after sign-out').toBeVisible();
    await expect(page.getByTestId('feed-list')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('sign-in-form')).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(feedReads, 'no read of the feed after the sign-out').toBe(0);
  },
);
