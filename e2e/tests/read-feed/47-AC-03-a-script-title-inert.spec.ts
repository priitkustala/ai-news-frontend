// AC-03a (scenario, @surface-app, project iphone): story 47, coverage.md row AC-03 a.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-03; the Given/When/Then is the owning story's row AC-03a.
// Given seeded hostile fixtures with a title containing a <script> tag, when the run completes and the owner
// opens the feed, then the script text shows as inert plain text and no script executes.
import { test, expect } from '../../support/session';
import { runDateToday, runMarker } from '../../support/env';
import { ingest, seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

test(
  'AC-03a: a title containing a script tag shows as inert plain text and no script executes',
  { tag: ['@journey-read-feed', '@surface-app', '@story-47'] },
  async ({ page }) => {
    // Given: a hostile fixture whose title is "<run> <script>alert('xss-<run>')</script>". B-03
    // strips markup at ingestion, so the scenario does not require the tag to be kept: it
    // requires the payload's text, the tags stripped (alert('xss-<run>')), to be shown as plain
    // text in the title (no element inside it) and no script to run (pull-requests.md,
    // Interpretation 7; round 20 R20-4)
    const run = runMarker();
    seed('AC-03a', run);
    const result = ingest(runDateToday());
    expect(result.report?.status, 'prerequisite (1, the run report): the run completes').toMatch(/^(completed|partial)$/);
    const dialogs: string[] = [];
    page.on('dialog', (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });

    // When: the run completes and the owner opens the feed
    await page.goto('/');

    // Then: the hostile item's title shows as inert plain text and no script executes
    const item = await itemWithTitle(page, run, 'prerequisite (45, the feed)');
    const title = item.getByTestId('feed-item-title');
    await expect(title).toContainText(run);
    await expect(title, 'first unmet step (47): the script text shows as inert plain text').toContainText(`alert('xss-${run}')`);
    await expect.poll(() => title.evaluate((el) => el.children.length), { message: 'the title holds text only' }).toBe(0);
    expect(dialogs).toEqual([]);
  },
);
