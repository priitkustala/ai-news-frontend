// AC-19 (scenario, @surface-app, project iphone): story 2, coverage.md row AC-19 -.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-19; the Given/When/Then is the owning story's row AC-19.
// Given a data-interface response delayed by 2 seconds, when the owner opens a category, then a loading
// indicator with a text label is present until the items show.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { categoryOption, itemWithTitle } from '../../support/feed';
import { dataUrl } from '../../support/data';

test(
  'AC-19: a loading indicator with a text label is present until a delayed category shows',
  { tag: ['@journey-filter-category', '@surface-app', '@story-2'] },
  async ({ page }) => {
    // Given: seeded items, the feed open (prerequisite: the 45 feed), and every data-interface
    // response delayed by 2 seconds (the delay is the Given's slow interface, emulated on the
    // network; the scenario itself waits only on conditions). The route counts the requests it
    // delays, so a request that bypasses it (for example one a service worker answers) cannot
    // pass for the delayed one (round 19, UNVERIFIED 5)
    const run = runMarker();
    seed('AC-19', run);
    await page.goto('/');
    await itemWithTitle(page, run, 'prerequisite (45, the feed)');
    const option = await categoryOption(page, 'Model and product releases', 'first unmet step (2)');
    let delayed = 0;
    await page.route(`${dataUrl()}/**`, async (route) => {
      delayed += 1;
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });

    // When: the owner opens a category
    await option.tap();

    // Then: a loading indicator with a text label is present until the items show
    await expect(page.getByTestId('loading')).toBeVisible();
    await expect(page.getByTestId('loading')).toHaveText(/\S/);
    await expect.poll(() => delayed, { message: 'the category request went through the delayed route' }).toBeGreaterThan(0);
    await expect(page.getByTestId('feed-item').first()).toBeVisible();
    await expect(page.getByTestId('loading')).toBeHidden();
  },
);
