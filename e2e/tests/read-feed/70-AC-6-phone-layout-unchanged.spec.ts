// AC-6 (scenario, @surface-app, project iphone): story RL-1 (priitkustala/ai-news-frontend#70), row AC-6.
// Source: the item's criterion AC-6 (below 768 px the phone layout exactly as today, What to Build), with the
// seed of 56-AC-1. It passes before and after the change.
// Given the owner signed in at iPhone size and the seed digests, when the feed shows and then an item is
// opened, then feed-list is as wide as the window up to 393 px with every feed-item the full list width,
// nav-feed's top is in the lower half of the window, status-message's bottom is 91 px above the window's bottom,
// and article-view is as wide as feed-list.
import type { Locator } from '@playwright/test';
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

// The width of a testid element, or NaN while it has no box.
async function widthOf(locator: Locator): Promise<number> {
  return (await locator.boundingBox())?.width ?? Number.NaN;
}

test(
  '70-AC-6: at iPhone size the phone layout stays as today: one 393 px column, the tabs at the bottom, the toast 91 px up',
  { tag: ['@journey-read-feed', '@surface-app', '@story-70'] },
  async ({ page }) => {
    // Given: the owner signed in at iPhone size and the seed digests
    const run = runMarker();
    seed('digests', run);

    // When: the feed shows
    await page.goto('/');
    const item = await itemWithTitle(page, `${run}-digest-1`, 'prerequisite (45, the feed)');

    // Then: feed-list is as wide as the window up to 393 px (±1), and every feed-item is the full list width
    const shown = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
    const list = page.getByTestId('feed-list');
    const expectedWidth = Math.min(shown.width, 393);
    await expect.poll(async () => Math.abs((await widthOf(list)) - expectedWidth), { message: 'feed-list is as wide as the window up to 393 px (±1)' }).toBeLessThanOrEqual(1);
    const listWidth = await widthOf(list);
    const feedItems = page.getByTestId('feed-item');
    const count = await feedItems.count();
    expect(count, 'prerequisite: the feed shows its items').toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      expect(Math.abs((await widthOf(feedItems.nth(index))) - listWidth), `feed-item ${index + 1} is the full list width (±1)`).toBeLessThanOrEqual(1);
    }

    // Then: nav-feed's top is in the lower half of the window
    await expect.poll(async () => (await page.getByTestId('nav-feed').boundingBox())?.y ?? Number.NaN, { message: "nav-feed's top is in the lower half of the window" }).toBeGreaterThan(shown.height / 2);

    // Then: status-message's bottom is 91 px (±1) above the window's bottom (empty at rest, so it has no
    // visible box: its bottom is read from the element itself)
    const toastGap = await page
      .getByTestId('status-message')
      .evaluate((toast) => window.innerHeight - toast.getBoundingClientRect().bottom);
    expect(Math.abs(toastGap - 91), "status-message's bottom is 91 px above the window's bottom (±1)").toBeLessThanOrEqual(1);

    // When: an item is opened
    await item.getByTestId('feed-item-title').tap();

    // Then: article-view is as wide as feed-list (±1)
    const view = page.getByTestId('article-view');
    await expect(view, 'prerequisite (1): the article view').toBeVisible();
    await expect.poll(async () => Math.abs((await widthOf(view)) - listWidth), { message: 'article-view is as wide as feed-list (±1)' }).toBeLessThanOrEqual(1);
  },
);
