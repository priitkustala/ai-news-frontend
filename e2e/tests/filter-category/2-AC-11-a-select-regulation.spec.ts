// AC-11a (scenario, @surface-app, project iphone): story 2, coverage.md row AC-11 a.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-11; the Given/When/Then is the owning story's row AC-11a.
// Given seeded items in three categories and none in Research today, when the owner selects Regulation and
// policy, then only that category's items show.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { categoryOption, itemWithTitle } from '../../support/feed';

test(
  'AC-11a: selecting Regulation and policy shows only that category',
  { tag: ['@journey-filter-category', '@surface-app', '@story-2'] },
  async ({ page }) => {
    // Given: seeded items in three categories and none in Research today (prerequisite: the
    // 45 feed); the manifest names the titles of the Regulation and policy items
    const run = runMarker();
    const manifest = seed('AC-11a', run);
    const policyTitles = (Array.isArray(manifest.policy_titles) ? manifest.policy_titles : []).map(String);
    expect(policyTitles.length, 'prerequisite: the manifest names the policy items').toBeGreaterThan(0);
    await page.goto('/');
    await itemWithTitle(page, run, 'prerequisite (45, the feed)');

    // First unmet step (2): the category filter
    const option = await categoryOption(page, 'Regulation and policy', 'first unmet step (2)');

    // When: the owner selects Regulation and policy
    await option.tap();

    // Then: only that category's items show: the option is pressed, the list is exactly the
    // policy items, and every shown category reads Regulation and policy
    await expect(option).toHaveAttribute('aria-pressed', 'true');
    await expect
      .poll(async () => (await page.getByTestId('feed-item-title').allTextContents()).map((t) => t.trim()).sort())
      .toEqual([...policyTitles].sort());
    await expect(page.getByTestId('feed-item-category')).toHaveText(policyTitles.map(() => 'Regulation and policy'));
  },
);
