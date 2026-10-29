// AC-13b (scenario, @surface-app, project iphone): story 49, coverage.md row AC-13 b.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-13; the Given/When/Then is the owning story's row AC-13b.
// Given today's run failed, when the owner opens the briefing, then the previous briefing shows with its own
// date. CONDITIONAL on OD-08 (briefing or both).
import { test, expect } from '../../support/session';
import { runDateToday, runMarker, shownDate } from '../../support/env';
import { seed } from '../../support/job';

test(
  'AC-13b: after a failed run the previous briefing shows with its own date',
  { tag: ['@journey-briefing', '@surface-app', '@story-49'] },
  async ({ page }) => {
    // Given: today's run failed; the fixture manifest names the previous briefing's run date
    const run = runMarker();
    const manifest = seed('AC-13b', run);
    const previous = String(manifest.previous_run_date);
    await page.goto('/');

    // First unmet step (49): the Briefing tab
    await expect(page.getByTestId('nav-briefing'), 'first unmet step (49): the Briefing tab').toBeVisible();

    // When: the owner opens the briefing
    await page.getByTestId('nav-briefing').tap();

    // Then: the previous briefing shows with its own date
    await expect(page.getByTestId('briefing')).toBeVisible();
    await expect(page.getByTestId('briefing-date')).toHaveText(shownDate(previous));
    await expect(page.getByTestId('briefing-date')).not.toHaveText(shownDate(runDateToday()));
  },
);
