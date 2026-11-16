// 53-SMOKE-d (smoke, @surface-app, project iphone): priitkustala/ai-news#53, production smoke suite after every
// deploy; criterion: with the read-only smoke session the feed read answers.
// Given the client at iPhone size and the smoke user signed out, when the smoke user signs in through the
// client's own sign-in form, then at least one feed item shows. No title is asserted: the hosted news is
// unknown.
// Rewritten by story S-21b (priitkustala/ai-news-frontend#44; its settlement, finding F1): the sign-in form was
// then behind the Bookmarks tab of the guest screen, and a sign-in there landed on Bookmarks, so the Feed tab follows.
// Changed by priitkustala/ai-news-frontend#69 (HB-1, the owner decision of 2026-11-16: bookmarks are hidden from
// visitors until accounts can be created). Old Given: open / and tap the Bookmarks tab for the sign-in form. New
// Given: the sign-in address /#sign-in shows the sign-in form. The Then stays: at least one feed item shows on the
// Feed tab after the sign-in.
// Read only: no seed, no development sign-in, no job command.
import { test, expect } from '@playwright/test';
import { smokeCredentials } from '../../support/smoke';

test(
  '53-SMOKE-d: the smoke user signs in and the feed shows an item',
  { tag: ['@tier-smoke', '@journey-read-feed', '@surface-app', '@story-53', '@story-69'] },
  async ({ page }) => {
    const { email, password } = smokeCredentials();

    // Given: the client's sign-in form, at the sign-in address, at iPhone size
    await page.goto('/#sign-in');
    await expect(page.getByTestId('sign-in-form'), 'first unmet step (69): the sign-in form at the sign-in address').toBeVisible();

    // When: the smoke user signs in
    await page.getByTestId('sign-in-email').fill(email);
    await page.getByTestId('sign-in-password').fill(password);
    await page.getByTestId('sign-in-submit').click();

    // Then: at least one feed item shows on the Feed tab
    await expect(page.getByTestId('signed-in')).toBeVisible();
    await page.getByTestId('nav-feed').tap();
    await expect(page.getByTestId('feed-list').getByTestId('feed-item').first()).toBeVisible();
  },
);
