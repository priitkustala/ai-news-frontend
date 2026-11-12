// 53-SMOKE-d (smoke, @surface-app, project iphone): priitkustala/ai-news#53, production smoke suite after every
// deploy; criterion: with the read-only smoke session the feed read answers.
// Given the client at iPhone size and the smoke user signed out, when the smoke user signs in through the
// client's own sign-in screen, then at least one feed item shows. No title is asserted: the hosted news is
// unknown.
// Read only: no seed, no development sign-in, no job command.
import { test, expect } from '@playwright/test';
import { smokeCredentials } from '../../support/smoke';

test(
  '53-SMOKE-d: the smoke user signs in and the feed shows an item',
  { tag: ['@tier-smoke', '@journey-read-feed', '@surface-app', '@story-53'] },
  async ({ page }) => {
    const { email, password } = smokeCredentials();

    // Given: the client's sign-in screen at iPhone size
    await page.goto('/');

    // When: the smoke user signs in
    await page.getByTestId('sign-in-email').fill(email);
    await page.getByTestId('sign-in-password').fill(password);
    await page.getByTestId('sign-in-submit').click();

    // Then: at least one feed item shows
    await expect(page.getByTestId('feed-item').first()).toBeVisible();
  },
);
