// AC-3 (scenario, @surface-app, project iphone): story S-21b (priitkustala/ai-news-frontend#44), row AC-3.
// Source: the item's criterion AC-3 and the accepted settlement of S-21b (The open points, settled: the Bookmarks
// tab of a guest; Read me first, points 4 and 5).
// Given the guest feed, when the visitor opens the Bookmarks tab, then the sign-in form shows under the line
// Sign in to keep your bookmarks.; when the owner signs in there, then the signed-in screen shows the Bookmarks
// panel. The owner's credentials are read in code and never printed.
import { test, expect } from '@playwright/test';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';
import { ownerCredentials } from '../../support/client-build';

test(
  's-21b-AC-3: the Bookmarks tab asks a visitor to sign in, and sign-in there shows the Bookmarks panel',
  { tag: ['@journey-bookmark', '@surface-app', '@story-s-21b'] },
  async ({ page }) => {
    // Given: the guest feed with a seeded item (<run> in its title)
    const run = runMarker();
    seed('AC-12', run);
    await page.goto('/');
    await itemWithTitle(page.getByTestId('feed-list'), run, 'first unmet step (s-21b): the guest feed');

    // When: the visitor opens the Bookmarks tab
    await expect(page.getByTestId('nav-bookmarks'), 'the Bookmarks tab for a visitor').toBeVisible();
    await page.getByTestId('nav-bookmarks').tap();

    // Then: the reason line and the sign-in form
    await expect(page.getByTestId('sign-in-reason')).toHaveText('Sign in to keep your bookmarks.');
    await expect(page.getByTestId('sign-in-form')).toBeVisible();

    // When: the owner signs in there
    const { email, password } = ownerCredentials();
    await page.getByTestId('sign-in-email').fill(email);
    await page.getByTestId('sign-in-password').fill(password);
    await page.getByTestId('sign-in-submit').click();

    // Then: the signed-in screen on the Bookmarks panel
    await expect(page.getByTestId('signed-in')).toBeVisible();
    await expect(page.getByTestId('bookmarks-list')).toBeVisible();
    await expect(page.getByTestId('nav-bookmarks')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('sign-in-form')).toHaveCount(0);
  },
);
