// AC-11b (scenario, @surface-app, project iphone): story 2, coverage.md row AC-11 b.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-11; the Given/When/Then is the owning story's row AC-11b.
// Given seeded items in three categories and none in Research today, when the owner selects Research, then
// the Empty state text shows and no error state.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { categoryOption, itemWithTitle } from '../../support/feed';

test(
  'AC-11b: selecting Research with nothing new today shows the Empty state and no error',
  { tag: ['@journey-filter-category', '@surface-app', '@story-2'] },
  async ({ page }) => {
    // Given: seeded items in three categories and none in Research today (prerequisite: the
    // 45 feed)
    const run = runMarker();
    seed('AC-11b', run);
    await page.goto('/');
    await itemWithTitle(page, run, 'prerequisite (45, the feed)');

    // First unmet step (2): the category filter
    const option = await categoryOption(page, 'Research', 'first unmet step (2)');

    // When: the owner selects Research
    await option.tap();

    // Then: the Empty state text shows, no feed item and no error state
    await expect(option).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('empty-state')).toHaveText(/\S/);
    await expect(page.getByTestId('feed-item')).toHaveCount(0);
    await expect(page.getByTestId('error-state')).toHaveCount(0);
  },
);
