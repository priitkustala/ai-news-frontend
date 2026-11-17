// AC-1 (scenario, @surface-app, project iphone): priitkustala/ai-news-frontend#86 (RN-1), row AC-1.
// Source: the item criterion AC-1; the owner decision of 2026-11-17 to launch as Radarnik, with the name as text.
// Given a visitor with no stored session, when the visitor opens / and the client has rendered (feed-list
// visible), then app-name has the exact text Radarnik and app-tagline is visible with the exact text
// Your 30 second digest for every important AI news.
// Read only, no seed and no sign-in: it also runs in the release smoke job against the preview address.
import { test, expect } from '@playwright/test';

test(
  'AC-1: a visitor sees the name Radarnik and the line under it',
  { tag: ['@journey-read-feed', '@surface-app', '@story-86', '@tier-smoke'] },
  async ({ page }) => {
    // Given: a visitor with no stored session
    // When: the visitor opens / and the client has rendered
    await page.goto('/');
    await expect(page.getByTestId('feed-list')).toBeVisible();

    // Then: the name Radarnik and the line under it
    await expect(page.getByTestId('app-name'), 'the app name').toHaveText('Radarnik');
    const tagline = page.getByTestId('app-tagline');
    await expect(tagline, 'the line under the app name').toBeVisible();
    await expect(tagline).toHaveText('Your 30 second digest for every important AI news');
  },
);
