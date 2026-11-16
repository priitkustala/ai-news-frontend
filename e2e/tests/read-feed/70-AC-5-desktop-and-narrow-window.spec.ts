// AC-5 (scenario, @surface-app, project laptop): story RL-1 (priitkustala/ai-news-frontend#70), row AC-5.
// Source: the item's criterion AC-5 (above 1024 px nothing grows; from 768 px one 672 px column, What to
// Build), in the form of the read-feed rows (45-AC-09).
// Given the owner signed in on the feed in the laptop project, when the window is set to 1920 by 1080, then
// feed-list is 1024 px wide and centred; when it is set to 900 by 800, then feed-list is at most 672 px wide and
// centred, every feed-item is as wide as the list and the tabs are within the top 64 px; at both sizes the
// document is no wider than the window.
import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { expectTitles, expectedItems } from '../../support/feed';

// The width of a testid element, or NaN while it has no box.
async function widthOf(locator: Locator): Promise<number> {
  return (await locator.boundingBox())?.width ?? Number.NaN;
}

// The difference between the element's left and right margins to the window.
async function marginDifference(page: Page, locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) return Number.POSITIVE_INFINITY;
  const width = await page.evaluate(() => window.innerWidth);
  return Math.abs(box.x - (width - box.x - box.width));
}

// The document's width beyond the window's (0 or less: no horizontal overflow).
async function overflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

test(
  '70-AC-5: a desktop window keeps the 1024 px column and a narrow laptop window shows one 672 px column',
  { tag: ['@journey-read-feed', '@surface-app', '@story-70', '@viewport-laptop'] },
  async ({ page }) => {
    // Given: the owner signed in on the feed in the laptop project
    const run = runMarker();
    const items = expectedItems(seed('AC-09', run));
    expect(items.length, 'prerequisite: the manifest names the seeded items').toBeGreaterThan(0);
    await page.goto('/');
    await expectTitles(page, items.map((i) => i.title), 'prerequisite (45, the feed)');
    const list = page.getByTestId('feed-list');

    // When: the window is set to 1920 by 1080
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Then: feed-list is 1024 px wide (±1) and centred, and the document is no wider than the window
    await expect.poll(async () => Math.abs((await widthOf(list)) - 1024), { message: 'at 1920: feed-list is 1024 px wide (±1)' }).toBeLessThanOrEqual(1);
    await expect.poll(() => marginDifference(page, list), { message: 'at 1920: feed-list is centred' }).toBeLessThanOrEqual(1);
    expect(await overflow(page), 'at 1920: scrollWidth is at most innerWidth').toBeLessThanOrEqual(0);

    // When: the window is set to 900 by 800
    await page.setViewportSize({ width: 900, height: 800 });

    // Then: feed-list is at most 672 px wide and centred, every feed-item is as wide as the list (one column),
    // the tabs are within the top 64 px, and the document is no wider than the window
    await expect.poll(() => widthOf(list), { message: 'at 900: feed-list is at most 672 px wide' }).toBeLessThanOrEqual(672);
    await expect.poll(() => marginDifference(page, list), { message: 'at 900: feed-list is centred' }).toBeLessThanOrEqual(1);
    const listWidth = await widthOf(list);
    const feedItems = page.getByTestId('feed-item');
    const count = await feedItems.count();
    expect(count, 'prerequisite: the feed shows its items').toBe(items.length);
    for (let index = 0; index < count; index += 1) {
      expect(Math.abs((await widthOf(feedItems.nth(index))) - listWidth), `at 900: feed-item ${index + 1} is as wide as the list (±1)`).toBeLessThanOrEqual(1);
    }
    for (const tab of ['nav-feed', 'nav-bookmarks']) {
      await expect.poll(async () => (await page.getByTestId(tab).boundingBox())?.y ?? Number.POSITIVE_INFINITY, { message: `at 900: ${tab} is within the top 64 px` }).toBeLessThan(64);
    }
    expect(await overflow(page), 'at 900: scrollWidth is at most innerWidth').toBeLessThanOrEqual(0);
  },
);
