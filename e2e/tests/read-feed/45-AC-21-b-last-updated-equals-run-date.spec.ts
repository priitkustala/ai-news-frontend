// AC-21b (scenario, @surface-app, project iphone): story 45, coverage.md row AC-21 b.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-21; the Given/When/Then is the owning story's row AC-21b.
// Given a completed run, when the owner opens the app at iPhone size, then the client's last-updated time
// equals that date.
import { test, expect } from '../../support/session';
import { runDateToday, runMarker, shownDate } from '../../support/env';
import { ingest, seed } from '../../support/job';
import { expectRows, readRelation, signInOwner } from '../../support/data';

test(
  'AC-21b: the client\'s last-updated time equals the last completed run\'s date',
  { tag: ['@journey-read-feed', '@surface-app', '@story-45'] },
  async ({ page, request }) => {
    // Given: a completed run; its date read from ingestion_runs through the data interface
    const run = runMarker();
    seed('AC-21b', run);
    ingest(runDateToday());
    const runs = expectRows(await readRelation(request, 'ingestion_runs', signInOwner()), 'prerequisite: the owner reads ingestion_runs');
    const completed = runs.filter((row) => row.status === 'completed').map((row) => String(row.run_date));
    expect(completed.length, 'a completed run is recorded').toBeGreaterThan(0);
    const lastRunDate = completed.sort().reverse()[0];

    // When: the owner opens the app at iPhone size
    await page.goto('/');

    // Then: the client's last-updated time equals that date
    await expect(page.getByTestId('last-updated'), 'first unmet step (45): the last-updated time').toHaveText(shownDate(lastRunDate));
  },
);
