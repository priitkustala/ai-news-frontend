// AC-3 (scenario, @surface-app, project iphone): priitkustala/ai-news-frontend#86 (RN-1), row AC-3.
// Source: the item criterion AC-3; the owner decision of 2026-11-17 to launch as Radarnik, with the name as text.
// Given the owner signed in with the seeded owner persona, when the owner taps nav-bookmarks and then nav-feed,
// then on Bookmarks app-name has the exact text Bookmarks and app-tagline is hidden, and on Feed app-name has
// the exact text Radarnik and app-tagline is visible.
import { test, expect } from '../../support/session';

test(
  'AC-3: the line is hidden on Bookmarks and shown again on Feed',
  { tag: ['@journey-read-feed', '@surface-app', '@story-86'] },
  async ({ page }) => {
    // Given: the owner signed in
    await page.goto('/');
    await expect(page.getByTestId('nav-bookmarks'), 'prerequisite (51): the Bookmarks tab').toBeVisible();

    // When: the owner taps nav-bookmarks
    await page.getByTestId('nav-bookmarks').tap();

    // Then: the heading reads Bookmarks and the line is hidden
    await expect(page.getByTestId('app-name'), 'the app name on Bookmarks').toHaveText('Bookmarks');
    await expect(page.getByTestId('app-tagline'), 'the line on Bookmarks').toBeHidden();

    // When: the owner taps nav-feed
    await page.getByTestId('nav-feed').tap();

    // Then: the heading reads Radarnik and the line is visible
    await expect(page.getByTestId('app-name'), 'the app name on Feed').toHaveText('Radarnik');
    await expect(page.getByTestId('app-tagline'), 'the line on Feed').toBeVisible();
  },
);
