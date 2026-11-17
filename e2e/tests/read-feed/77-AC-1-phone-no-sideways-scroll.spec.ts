// 77-AC-1 (scenario, @surface-app, project iphone): priitkustala/ai-news-frontend#77 (PSS-1), row AC-1.
// Source: the item criterion AC-1 (reproduction first); the phone layout of frontend#70 AC-6.
// Given the owner signed in at iPhone size and the seed long-words (an item in releases and one in research whose
// title, summary, digest, source name and address hold 120 letters with no break point), when the feed has settled
// on All, on every category chip and in the article view of the long-titled item, then the document is never wider
// than the window: document.documentElement.scrollWidth equals clientWidth.
import type { Page } from '@playwright/test';
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

// How far the document is wider than the window, in CSS pixels (0 when nothing scrolls sideways).
async function sideways(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

// Waits until the feed list has answered its read (feed-list drops aria-busy).
async function settled(page: Page): Promise<void> {
  await expect(page.getByTestId('feed-list')).not.toHaveAttribute('aria-busy', 'true');
}

test(
  '77-AC-1: at iPhone size a long unbroken word never makes the page wider than the screen',
  { tag: ['@journey-read-feed', '@surface-app', '@bug-77'] },
  async ({ page }) => {
    // Given: the owner signed in at iPhone size and the seed long-words
    const run = runMarker();
    const manifest = seed('long-words', run);
    const title = String(manifest.long_title ?? '');
    expect(title.startsWith(run), 'prerequisite: the manifest names the long title').toBe(true);

    // When: the feed has settled on All
    await page.goto('/');
    await itemWithTitle(page, title, 'prerequisite (45, the feed)');
    await settled(page);

    // Then: no sideways scroll on All
    expect(await sideways(page), 'no sideways scroll on All').toBe(0);

    // When and then: each category chip in turn, after its list has settled
    const options = page.getByTestId('category-option');
    const count = await options.count();
    expect(count, 'prerequisite: the category chips').toBeGreaterThan(1);
    for (let index = 1; index < count; index += 1) {
      const option = options.nth(index);
      const name = ((await option.textContent()) ?? '').replace(/\s*\d+\s*$/, '').trim();
      await option.tap();
      await expect(option).toHaveAttribute('aria-pressed', 'true');
      await settled(page);
      expect(await sideways(page), `no sideways scroll on ${name}`).toBe(0);
    }

    // When: the long-titled item is opened from All
    await options.first().tap();
    await settled(page);
    const item = await itemWithTitle(page, title, 'prerequisite (1, the long item on All)');
    await item.getByTestId('feed-item-title').tap();
    await expect(page.getByTestId('article-view'), 'prerequisite (1): the article view').toBeVisible();

    // Then: no sideways scroll in the article view
    expect(await sideways(page), 'no sideways scroll in the article view').toBe(0);
  },
);
