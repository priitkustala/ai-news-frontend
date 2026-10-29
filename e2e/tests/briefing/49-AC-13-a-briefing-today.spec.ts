// AC-13a (scenario, @surface-app, project iphone): story 49, coverage.md row AC-13 a.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-13; the Given/When/Then is the owning story's row AC-13a.
// Given a completed run for today's run date, when the owner opens the briefing, then it shows today's date
// and the top items per category. CONDITIONAL on OD-08 (briefing or both).
import { test, expect } from '../../support/session';
import { runDateToday, runMarker, shownDate } from '../../support/env';
import { seed } from '../../support/job';

test(
  'AC-13a: the briefing shows today\'s date and the top items per category',
  { tag: ['@journey-briefing', '@surface-app', '@story-49'] },
  async ({ page }) => {
    // Given: a completed run for today's run date (CONDITIONAL on OD-08: briefing or both); the
    // manifest names the expected briefing from the frozen fixture: each category in order with
    // the titles of its top items in order
    const run = runMarker();
    const manifest = seed('AC-13a', run);
    const expected = (Array.isArray(manifest.briefing) ? manifest.briefing : []) as { category: string; top_titles: string[] }[];
    expect(expected.length, 'prerequisite: the manifest names the expected briefing').toBeGreaterThan(0);
    const today = runDateToday();
    await page.goto('/');

    // First unmet step (49): the Briefing tab
    await expect(page.getByTestId('nav-briefing'), 'first unmet step (49): the Briefing tab').toBeVisible();

    // When: the owner opens the briefing
    await page.getByTestId('nav-briefing').tap();

    // Then: it shows today's date and, for every expected category in order, its top items in
    // order; a missing category or a lower-ranked substitute fails
    await expect(page.getByTestId('briefing')).toBeVisible();
    await expect(page.getByTestId('briefing-date')).toHaveText(shownDate(today));
    const sections = page.getByTestId('briefing-category');
    await expect(sections).toHaveCount(expected.length);
    for (let i = 0; i < expected.length; i += 1) {
      await expect(sections.nth(i)).toContainText(expected[i].category);
      await expect(sections.nth(i).getByTestId('briefing-item')).toHaveText(
        expected[i].top_titles.map((t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))),
      );
    }
  },
);
