// AC-4 (scenario, @surface-app, project iphone): story S-21b (priitkustala/ai-news-frontend#44), row AC-4.
// Source: the item's criterion AC-4 and the accepted settlement of S-21b (Read me first, point 2: the test ids
// that exist are feed-item-bookmark, sign-out, push-card and subscribe).
// Given the guest feed with a seeded item drawn, in the Home Screen web app with notification permission
// emulated as granted (where the owner's feed carries the push card), when it is inspected, then no bookmark
// control, sign-out button, push card, subscribe control or notification note is present, and no element whose
// data-testid names a comment, a like or an opinion.
import { test, expect } from '@playwright/test';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';
import { emulateHomeScreen, emulateNotifications, expectEmulatedNotifications } from '../../support/platform';

test(
  's-21b-AC-4: the guest feed has no bookmark control, sign-out or push control',
  { tag: ['@journey-read-feed', '@surface-app', '@story-s-21b'] },
  async ({ page }) => {
    // Given: the guest feed with a seeded item (<run> in its title), in the Home Screen web app
    const run = runMarker();
    seed('AC-12', run);
    await emulateNotifications(page, 'granted', run);
    await emulateHomeScreen(page);
    await page.goto('/');
    await expectEmulatedNotifications(page, 'granted');
    await itemWithTitle(page.getByTestId('feed-list'), run, 'first unmet step (s-21b): the guest feed');

    // When: it is inspected, after the page has settled
    await page.waitForLoadState('networkidle');

    // Then: none of the owner's controls, and no comments, likes or opinions control
    await expect(page.getByTestId('feed-item-bookmark')).toHaveCount(0);
    await expect(page.getByTestId('sign-out')).toHaveCount(0);
    await expect(page.getByTestId('push-card')).toHaveCount(0);
    await expect(page.getByTestId('subscribe')).toHaveCount(0);
    await expect(page.locator('[data-testid^="notifications-"]')).toHaveCount(0);
    await expect(page.locator('[data-testid*="comment"]')).toHaveCount(0);
    await expect(page.locator('[data-testid*="like"]')).toHaveCount(0);
    await expect(page.locator('[data-testid*="opinion"]')).toHaveCount(0);
  },
);
