// AC-4 (scenario, @surface-app, project laptop): story RL-1 (priitkustala/ai-news-frontend#70), row AC-4.
// Source: the item's criterion AC-4 (the tab bar along the top and the toast 24 px above the bottom, What to
// Build, from 768 px), in the form of the read-feed rows (45-AC-09).
// Given the owner signed in, the laptop window (1280 by 800) and seeded items, when the feed shows, then
// nav-feed and nav-bookmarks share their top, within the top 64 px, nav-feed is the current page, the first
// feed-item and category-filter start at or below the bar's bottom and status-message's bottom is 24 px above
// the window's bottom; when the owner scrolls to the end of the feed, then both tabs are still within the top
// 64 px; when the owner clicks nav-bookmarks, then bookmarks-list shows, at most 672 px wide and centred, and
// nav-bookmarks is the current page; when the owner clicks nav-feed, then the feed shows.
import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { expectTitles, expectedItems } from '../../support/feed';

// The box of a testid element; a missing box fails the step that needs it.
async function boxOf(locator: Locator, what: string): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox();
  expect(box, `${what} has a box`).not.toBeNull();
  return box!;
}

// The difference between the element's left and right margins to the window.
async function marginDifference(page: Page, locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) return Number.POSITIVE_INFINITY;
  const width = await page.evaluate(() => window.innerWidth);
  return Math.abs(box.x - (width - box.x - box.width));
}

// The larger of the two tabs' tops in the window, or infinity while one has no box.
async function lowerTabTop(page: Page): Promise<number> {
  const feed = await page.getByTestId('nav-feed').boundingBox();
  const bookmarks = await page.getByTestId('nav-bookmarks').boundingBox();
  return feed && bookmarks ? Math.max(feed.y, bookmarks.y) : Number.POSITIVE_INFINITY;
}

test(
  '70-AC-4: on a laptop window the tabs stand in a bar along the top, nothing under it, and the toast sits 24 px above the bottom',
  { tag: ['@journey-read-feed', '@surface-app', '@story-70', '@viewport-laptop'] },
  async ({ page }) => {
    // Given: the laptop window and seeded items
    expect(page.viewportSize(), 'the laptop project window').toEqual({ width: 1280, height: 800 });
    const run = runMarker();
    const items = expectedItems(seed('AC-09', run));
    expect(items.length, 'prerequisite: the manifest names the seeded items').toBeGreaterThan(0);

    // When: the feed shows
    await page.goto('/');
    await expectTitles(page, items.map((i) => i.title), 'prerequisite (45, the feed)');

    // Then: the two tabs share their top, within the top 64 px of the window, and nav-feed is the current page
    const feedTab = page.getByTestId('nav-feed');
    const bookmarksTab = page.getByTestId('nav-bookmarks');
    await expect.poll(() => lowerTabTop(page), { message: 'both tabs are within the top 64 px' }).toBeLessThan(64);
    const feedTabBox = await boxOf(feedTab, 'nav-feed');
    const bookmarksTabBox = await boxOf(bookmarksTab, 'nav-bookmarks');
    expect(Math.abs(feedTabBox.y - bookmarksTabBox.y), 'nav-feed and nav-bookmarks share their top (±1)').toBeLessThanOrEqual(1);
    await expect(feedTab).toHaveAttribute('aria-current', 'page');

    // Then: nothing hidden under the bar: the first feed-item and category-filter start at or below the bar's
    // bottom (the bar is the element that holds the tabs; it has no testid of its own)
    const barBottom = await feedTab.evaluate((tab) => tab.parentElement!.getBoundingClientRect().bottom);
    const firstItem = await boxOf(page.getByTestId('feed-item').first(), 'the first feed-item');
    const filter = await boxOf(page.getByTestId('category-filter'), 'category-filter');
    expect(firstItem.y, "the first feed-item's top is at or below the bar's bottom").toBeGreaterThanOrEqual(barBottom);
    expect(filter.y, "category-filter's top is at or below the bar's bottom").toBeGreaterThanOrEqual(barBottom);

    // Then: status-message's bottom is 24 px (±1) above the window's bottom (empty at rest, so it has no
    // visible box: its bottom is read from the element itself)
    const toastGap = await page
      .getByTestId('status-message')
      .evaluate((toast) => window.innerHeight - toast.getBoundingClientRect().bottom);
    expect(Math.abs(toastGap - 24), "status-message's bottom is 24 px above the window's bottom (±1)").toBeLessThanOrEqual(1);

    // When: the owner scrolls to the end of the feed
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY), { message: 'prerequisite: the page scrolled' }).toBeGreaterThan(0);

    // Then: both tabs are still within the top 64 px
    await expect.poll(() => lowerTabTop(page), { message: 'after the scroll both tabs are within the top 64 px' }).toBeLessThan(64);

    // When: the owner clicks nav-bookmarks
    await bookmarksTab.click();

    // Then: bookmarks-list shows, at most 672 px wide and centred, and nav-bookmarks is the current page
    const bookmarks = page.getByTestId('bookmarks-list');
    await expect(bookmarks).toBeVisible();
    await expect.poll(async () => (await boxOf(bookmarks, 'bookmarks-list')).width, { message: 'bookmarks-list is at most 672 px wide' }).toBeLessThanOrEqual(672);
    await expect.poll(() => marginDifference(page, bookmarks), { message: 'bookmarks-list is centred' }).toBeLessThanOrEqual(1);
    await expect(bookmarksTab).toHaveAttribute('aria-current', 'page');

    // When: the owner clicks nav-feed
    await feedTab.click();

    // Then: the feed shows
    await expect(page.getByTestId('feed-list')).toBeVisible();
    await expect(bookmarks).toBeHidden();
    await expect(feedTab).toHaveAttribute('aria-current', 'page');
  },
);
