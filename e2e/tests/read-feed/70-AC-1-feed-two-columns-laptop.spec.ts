// AC-1 (scenario, @surface-app, project laptop): story RL-1 (priitkustala/ai-news-frontend#70), row AC-1.
// Source: the item's criterion AC-1 (the layout steps of What to Build, from 1024 px), in the form of the
// read-feed rows (45-AC-09).
// Given the owner signed in, the laptop project (1280 by 800) and at least four seeded items, when the feed
// shows at /, then the window is 1280 by 800, feed-list is 1024 px wide and centred, the first two feed-items
// share their top, each is half the list width and the second starts where the first ends, category-filter is
// as wide as feed-list, and the document is no wider than the window.
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

test(
  '70-AC-1: on a laptop window the feed is a centred 1024 px column with its items in two equal columns',
  { tag: ['@journey-read-feed', '@surface-app', '@story-70', '@viewport-laptop'] },
  async ({ page }) => {
    // Given: the laptop window and at least four seeded items (the manifest names them)
    expect(page.viewportSize(), 'the laptop project window').toEqual({ width: 1280, height: 800 });
    const run = runMarker();
    const items = expectedItems(seed('AC-09', run));
    expect(items.length, 'prerequisite: the manifest names at least four seeded items').toBeGreaterThanOrEqual(4);

    // When: the feed shows at /
    await page.goto('/');
    await expectTitles(page, items.map((i) => i.title), 'prerequisite (45, the feed)');

    // Then: feed-list is 1024 px wide (±1) and centred
    const list = page.getByTestId('feed-list');
    await expect
      .poll(async () => Math.abs((await boxOf(list, 'feed-list')).width - 1024), { message: 'feed-list is 1024 px wide (±1)' })
      .toBeLessThanOrEqual(1);
    await expect.poll(() => marginDifference(page, list), { message: 'feed-list is centred' }).toBeLessThanOrEqual(1);
    const listBox = await boxOf(list, 'feed-list');

    // Then: the first two feed-items share their top, each is half the list width and the second starts
    // where the first ends
    const first = await boxOf(page.getByTestId('feed-item').nth(0), 'the first feed-item');
    const second = await boxOf(page.getByTestId('feed-item').nth(1), 'the second feed-item');
    expect(Math.abs(first.y - second.y), 'the first two feed-items share their top (±1)').toBeLessThanOrEqual(1);
    expect(Math.abs(first.width - listBox.width / 2), 'the first feed-item is half the list width (±1)').toBeLessThanOrEqual(1);
    expect(Math.abs(second.width - listBox.width / 2), 'the second feed-item is half the list width (±1)').toBeLessThanOrEqual(1);
    expect(Math.abs(second.x - (first.x + first.width)), 'the second feed-item starts where the first ends (±1)').toBeLessThanOrEqual(1);

    // Then: category-filter is as wide as feed-list
    const filter = await boxOf(page.getByTestId('category-filter'), 'category-filter');
    expect(Math.abs(filter.width - listBox.width), 'category-filter is as wide as feed-list (±1)').toBeLessThanOrEqual(1);

    // Then: the document is no wider than the window
    const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
    expect(widths.scroll, 'no horizontal overflow: scrollWidth is at most innerWidth').toBeLessThanOrEqual(widths.inner);
  },
);
