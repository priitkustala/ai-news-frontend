// AC-09c (scenario, @surface-app, project iphone): bug 23 (SI-15), coverage.md row AC-09 c; rewritten by story
// S-21b (priitkustala/ai-news-frontend#44, criterion AC-5): a visitor reads the feed, so sign-out shows the guest
// feed, and the old count of feed reads is replaced by a check that no request carries the owner's token.
// Source: the regression contract, Test integrity 2 (a bug is reproduced as a failing scenario before its
// repair); the item's table of changed scenarios and the accepted settlement of S-21b.
// Given the owner with a stored session reading the feed, when they sign out, then the guest feed shows and a
// reload keeps it, the Bookmarks tab shows the sign-in form, and no request to the data interface after the
// sign-out carries the owner's access token.
import type { Request } from '@playwright/test';
import { test, expect } from '../../support/session';
import { requireEnv, runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

// The held route must see the image request: with the client's service worker in control,
// WebKit's requests bypass page.route (S-09 finding B2).
test.use({ serviceWorkers: 'block' });

test(
  'AC-09c: sign-out from the feed shows the guest feed, and a reload keeps it',
  { tag: ['@journey-read-feed', '@surface-app', '@bug-23'] },
  async ({ page }) => {
    // Given: the seeded feed shown for the stored session; every request to the data interface is kept,
    // marked whether it went out after the sign-out tap
    const run = runMarker();
    seed('AC-12', run);
    const dataUrl = requireEnv('E2E_DATA_URL', 'the published data interface');
    let signedOut = false;
    const dataRequests: { after: boolean; request: Request }[] = [];
    page.on('request', (request) => {
      if (request.url().startsWith(dataUrl)) dataRequests.push({ after: signedOut, request });
    });
    await page.goto('/');
    await itemWithTitle(page, run, 'prerequisite (45, the feed)');
    // The owner's access token, read in the page from the client's stored session; compared in code only,
    // never printed
    const ownerToken = await page.evaluate(() => {
      for (let index = 0; index < localStorage.length; index += 1) {
        const name = localStorage.key(index) ?? '';
        if (/^sb-.*-auth-token$/.test(name)) return String((JSON.parse(localStorage.getItem(name) ?? '{}') as { access_token?: string }).access_token ?? '');
      }
      return '';
    });
    expect(ownerToken.length > 0, 'prerequisite: the stored session holds an access token').toBe(true);
    const carriesOwnerToken = async (request: Request) => (await request.allHeaders())['authorization'] === `Bearer ${ownerToken}`;
    const carried = async (after: boolean) => {
      let count = 0;
      for (const entry of dataRequests.filter((e) => e.after === after)) if (await carriesOwnerToken(entry.request)) count += 1;
      return count;
    };
    expect(await carried(false), 'prerequisite: the signed-in reads carried the owner token (the check can see it)').toBeGreaterThan(0);

    // When: the owner taps sign-out (requests are marked as after the sign-out from here)
    signedOut = true;
    await page.getByTestId('sign-out').tap();

    // Then: the guest feed shows instead of the signed-in screen, and a reload keeps it
    await expect(page.getByTestId('signed-in')).toHaveCount(0);
    await itemWithTitle(page.getByTestId('feed-list'), run, 'first unmet step (s-21b): the guest feed shows after sign-out');
    await page.reload();
    await itemWithTitle(page.getByTestId('feed-list'), run, 'the guest feed after the reload');
    await expect(page.getByTestId('signed-in')).toHaveCount(0);
    // the Bookmarks tab shows the sign-in form
    await page.getByTestId('nav-bookmarks').tap();
    await expect(page.getByTestId('sign-in-form')).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(dataRequests.filter((e) => e.after).length, 'the guest feed was read after the sign-out').toBeGreaterThan(0);
    expect(await carried(true), 'no request to the data interface after the sign-out carries the owner token').toBe(0);
  },
);
