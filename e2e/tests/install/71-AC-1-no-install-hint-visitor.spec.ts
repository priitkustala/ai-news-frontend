// AC-1 (scenario, @surface-app, project iphone): priitkustala/ai-news-frontend#71 (IH-1), row AC-1.
// Source: the item criterion AC-1; the owner decision of 2026-11-16 to hide the hint in the current release.
// Given a visitor with no stored session in a browser tab (no Home Screen emulation), at iPhone size and at
// 1280 by 800, when the client has rendered at / (the app bar heading and feed-list visible), then install-hint
// has count 0 and the page holds no text Add to Home Screen.
import { test, expect, type Page } from '@playwright/test';

async function expectNoHint(page: Page): Promise<void> {
  // Given: a visitor with no stored session, in a browser tab
  await page.goto('/');

  // When: the client has rendered
  await expect(page.getByRole('heading', { name: 'Radarnik', exact: true })).toBeVisible();
  await expect(page.getByTestId('feed-list')).toBeVisible();

  // Then: no install hint and no Add to Home Screen text
  await expect(page.getByTestId('install-hint'), 'no install hint for a visitor').toHaveCount(0);
  await expect(page.getByText('Add to Home Screen'), 'no Add to Home Screen text for a visitor').toHaveCount(0);
}

test(
  'AC-1: a visitor at iPhone size sees no Add to Home Screen hint',
  { tag: ['@journey-install', '@surface-app', '@story-71'] },
  async ({ page }) => {
    await expectNoHint(page);
  },
);

test.describe('at laptop width', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test(
    'AC-1: a visitor at 1280 by 800 sees no Add to Home Screen hint',
    { tag: ['@journey-install', '@surface-app', '@story-71'] },
    async ({ page }) => {
      await expectNoHint(page);
    },
  );
});
