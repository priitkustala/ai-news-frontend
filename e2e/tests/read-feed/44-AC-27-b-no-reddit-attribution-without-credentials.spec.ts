// AC-27b (scenario, @surface-app, project iphone): story 44, coverage.md row AC-27 b.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-27; the Given/When/Then is the owning story's row AC-27b.
// Given a configuration with no Reddit credentials set and a fixture Reddit listing present on the fixture
// server, when a run completes and the owner opens the feed, then no feed-item shows a community name or the
// from Reddit label.
import { test, expect } from '../../support/session';
import { runDateToday, runMarker } from '../../support/env';
import { ingest, seed } from '../../support/job';

test(
  'AC-27b: without Reddit credentials no feed item shows a community name or the from Reddit label',
  { tag: ['@journey-read-feed', '@surface-app', '@story-44'] },
  async ({ page }) => {
    // Given: no Reddit credentials set and a fixture Reddit listing on the fixture server
    const run = runMarker();
    seed('AC-27b', run);

    // When: a run completes and the owner opens the feed
    const result = ingest(runDateToday());
    expect(result.report?.status, 'prerequisite (1, the run report): the run completes').toMatch(/^(completed|partial)$/);
    await page.goto('/');

    // Then: no feed-item shows a community name or the from Reddit label. The feed itself is a
    // prerequisite (45); once 1 and 45 are built a client without Reddit support already
    // satisfies this row, so it has no owner-only red (pull-requests.md, Conflicts, C-1)
    await expect(page.getByTestId('feed-item').first(), 'prerequisite (45, the feed)').toBeVisible();
    await expect(page.getByTestId('feed-item-community')).toHaveCount(0);
    await expect(page.getByTestId('feed-item-reddit-label')).toHaveCount(0);
  },
);
