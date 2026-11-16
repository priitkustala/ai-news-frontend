// AC-2 (scenario, @surface-app, project laptop): story RL-1 (priitkustala/ai-news-frontend#70), row AC-2.
// Source: the item's criterion AC-2 (a single non-item child of the list spans both columns, What to Build,
// from 1024 px), with the Given of 2-AC-11-b.
// Given the laptop window (1280 by 800), seeded items in three categories and none in Research today, when the
// owner selects Research, then empty-state is as wide as feed-list, which at this window is 1024 px wide.
import type { Locator } from '@playwright/test';
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { categoryOption, itemWithTitle } from '../../support/feed';

// The width of a testid element, or NaN while it has no box.
async function widthOf(locator: Locator): Promise<number> {
  return (await locator.boundingBox())?.width ?? Number.NaN;
}

test(
  '70-AC-2: on a laptop window the Empty state spans the whole 1024 px feed list',
  { tag: ['@journey-filter-category', '@surface-app', '@story-70', '@viewport-laptop'] },
  async ({ page }) => {
    // Given: the laptop window, seeded items in three categories and none in Research today
    expect(page.viewportSize(), 'the laptop project window').toEqual({ width: 1280, height: 800 });
    const run = runMarker();
    seed('AC-11b', run);
    await page.goto('/');
    await itemWithTitle(page, run, 'prerequisite (45, the feed)');
    const option = await categoryOption(page, 'Research', 'prerequisite (2, the category filter)');

    // When: the owner selects Research
    await option.click();

    // Then: the Empty state shows, as wide as feed-list (±1) and 1024 px wide (±1)
    await expect(option).toHaveAttribute('aria-pressed', 'true');
    const empty = page.getByTestId('empty-state');
    const list = page.getByTestId('feed-list');
    await expect(empty).toBeVisible();
    await expect
      .poll(async () => Math.abs((await widthOf(empty)) - (await widthOf(list))), { message: 'empty-state is as wide as feed-list (±1)' })
      .toBeLessThanOrEqual(1);
    await expect
      .poll(async () => Math.abs((await widthOf(empty)) - 1024), { message: 'empty-state is 1024 px wide (±1)' })
      .toBeLessThanOrEqual(1);
  },
);
