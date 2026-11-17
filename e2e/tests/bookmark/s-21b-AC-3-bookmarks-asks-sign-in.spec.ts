// AC-3 (scenario, @surface-app, project iphone): story S-21b (priitkustala/ai-news-frontend#44), row AC-3.
// Source: the item's criterion AC-3 and the accepted settlement of S-21b (The open points, settled: the Bookmarks
// tab of a guest; Read me first, points 4 and 5).
// Changed by priitkustala/ai-news-frontend#69 (HB-1, the owner decision of 2026-11-16: bookmarks are hidden from
// visitors until accounts can be created). Old Then: the Bookmarks tab asks a visitor to sign in, and a sign-in
// there lands on the Bookmarks panel. New Then: given the guest feed, when the sign-in address is entered on the
// same page, then the sign-in form shows under the line Sign in to keep your bookmarks.; when the owner signs in
// there, then the signed-in screen shows with the Feed and Bookmarks tabs, no sign-in form, and the address no
// longer holds the sign-in hash. The owner's credentials are read in code and never printed.
import { test, expect } from '@playwright/test';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';
import { ownerCredentials } from '../../support/client-build';

test(
  's-21b-AC-3: the sign-in address /#sign-in opens the sign-in form for a visitor, and sign-in there shows the signed-in screen',
  { tag: ['@journey-bookmark', '@surface-app', '@story-44', '@story-69'] },
  async ({ page }) => {
    // Given: the guest feed with a seeded item (<run> in its title)
    const run = runMarker();
    seed('AC-12', run);
    await page.goto('/');
    await itemWithTitle(page.getByTestId('feed-list'), run, 'first unmet step (s-21b): the guest feed');

    // When: the sign-in address is entered on the same page
    await page.goto('/#sign-in');

    // Then: the sign-in form under the reason line
    await expect(page.getByTestId('sign-in-form'), 'first unmet step (69): the sign-in form at the sign-in address').toBeVisible();
    await expect(page.getByTestId('sign-in-reason')).toHaveText('Sign in to keep your bookmarks.');

    // When: the owner signs in there
    const { email, password } = ownerCredentials();
    await page.getByTestId('sign-in-email').fill(email);
    await page.getByTestId('sign-in-password').fill(password);
    await page.getByTestId('sign-in-submit').click();

    // Then: the signed-in screen with its tabs, no sign-in form, and the sign-in hash gone from the address
    await expect(page.getByTestId('signed-in')).toBeVisible();
    await expect(page.getByTestId('nav-feed')).toBeVisible();
    await expect(page.getByTestId('nav-bookmarks')).toBeVisible();
    await expect(page.getByTestId('sign-in-form')).toHaveCount(0);
    await expect(page).not.toHaveURL(/#sign-in/);
  },
);
