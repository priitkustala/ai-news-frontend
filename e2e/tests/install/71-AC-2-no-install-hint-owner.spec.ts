// AC-2 (scenario, @surface-app, project iphone): priitkustala/ai-news-frontend#71 (IH-1), row AC-2.
// Source: the item criterion AC-2; the owner decision of 2026-11-16 to hide the hint in the current release.
// Given the owner signed in through the development sign-in, in a browser tab at iPhone size, when the feed
// shows (signed-in and feed-list visible), then install-hint has count 0.
import { test, expect } from '../../support/session';

test(
  'AC-2: the signed-in owner sees no Add to Home Screen hint',
  { tag: ['@journey-install', '@surface-app', '@story-71'] },
  async ({ page }) => {
    // Given: the owner signed in, in a browser tab
    await page.goto('/');

    // When: the feed shows
    await expect(page.getByTestId('signed-in')).toBeVisible();
    await expect(page.getByTestId('feed-list')).toBeVisible();

    // Then: no install hint
    await expect(page.getByTestId('install-hint'), 'no install hint for the owner').toHaveCount(0);
  },
);
