// AC-3 (scenario, @surface-app, project laptop): story RL-1 (priitkustala/ai-news-frontend#70), row AC-3.
// Source: the item's criterion AC-3 (the article view at the 672 px reading width, What to Build, from
// 1024 px), with the seed of 56-AC-1.
// Given the laptop window (1280 by 800) and the seed digests (item A, <run>-digest-1, with a stored digest),
// when the owner opens A, then article-view is at most 672 px wide and centred, article-digest lies inside it
// and original-article is no wider than it; when the owner uses article-back, then the feed shows again with
// its two columns.
import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

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
  '70-AC-3: on a laptop window the article view keeps the 672 px reading width, centred, and back shows the two columns',
  { tag: ['@journey-open-article', '@surface-app', '@story-70', '@viewport-laptop'] },
  async ({ page }) => {
    // Given: the laptop window and the seed digests
    expect(page.viewportSize(), 'the laptop project window').toEqual({ width: 1280, height: 800 });
    const run = runMarker();
    seed('digests', run);
    await page.goto('/');
    const item = await itemWithTitle(page, `${run}-digest-1`, 'prerequisite (45, the feed)');

    // When: the owner opens A
    await item.getByTestId('feed-item-title').click();

    // Then: article-view is at most 672 px wide and centred
    const view = page.getByTestId('article-view');
    await expect(view, 'prerequisite (1): the article view').toBeVisible();
    await expect(view.getByTestId('article-digest'), 'prerequisite (56): the digest').toBeVisible();
    await expect.poll(async () => (await boxOf(view, 'article-view')).width, { message: 'article-view is at most 672 px wide' }).toBeLessThanOrEqual(672);
    await expect.poll(() => marginDifference(page, view), { message: 'article-view is centred' }).toBeLessThanOrEqual(1);

    // Then: article-digest lies inside article-view, and original-article is no wider than it
    const viewBox = await boxOf(view, 'article-view');
    const digest = await boxOf(view.getByTestId('article-digest'), 'article-digest');
    expect(digest.x, 'article-digest starts inside article-view').toBeGreaterThanOrEqual(viewBox.x - 1);
    expect(digest.x + digest.width, 'article-digest ends inside article-view').toBeLessThanOrEqual(viewBox.x + viewBox.width + 1);
    expect(digest.y, 'article-digest starts below the top of article-view').toBeGreaterThanOrEqual(viewBox.y - 1);
    expect(digest.y + digest.height, 'article-digest ends above the bottom of article-view').toBeLessThanOrEqual(viewBox.y + viewBox.height + 1);
    const original = await boxOf(view.getByTestId('original-article'), 'original-article');
    expect(original.width, 'original-article is no wider than article-view').toBeLessThanOrEqual(viewBox.width);

    // When: the owner uses article-back
    await page.getByTestId('article-back').click();

    // Then: the feed shows again with its two columns
    const list = page.getByTestId('feed-list');
    await expect(list).toBeVisible();
    await expect(view).toHaveCount(0);
    const items = page.getByTestId('feed-item');
    await expect
      .poll(async () => Math.abs((await boxOf(items.nth(0), 'the first feed-item')).y - (await boxOf(items.nth(1), 'the second feed-item')).y), {
        message: 'the first two feed-items share their top (±1): two columns',
      })
      .toBeLessThanOrEqual(1);
    const listBox = await boxOf(list, 'feed-list');
    const first = await boxOf(items.nth(0), 'the first feed-item');
    const second = await boxOf(items.nth(1), 'the second feed-item');
    expect(Math.abs(first.width - listBox.width / 2), 'the first feed-item is half the list width (±1)').toBeLessThanOrEqual(1);
    expect(Math.abs(second.width - listBox.width / 2), 'the second feed-item is half the list width (±1)').toBeLessThanOrEqual(1);
    expect(Math.abs(second.x - (first.x + first.width)), 'the second feed-item starts where the first ends (±1)').toBeLessThanOrEqual(1);
  },
);
