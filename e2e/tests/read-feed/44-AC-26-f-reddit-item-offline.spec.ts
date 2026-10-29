// AC-26f (scenario, @surface-app, project iphone): story 44, coverage.md row AC-26 f.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-26; the Given/When/Then is the owning story's row AC-26f.
// Given the owner opened the feed with the Reddit item while online, when Playwright's offline emulation is
// switched on and the page is reopened, then the Offline banner shows and the Reddit item is readable with
// its community name, username and label, and opening it shows the needs a connection note.
import { test, expect } from '../../support/session';
import { runDateToday, runMarker } from '../../support/env';
import { ingest, seed } from '../../support/job';
import { itemWithTitle, reopen } from '../../support/feed';

test(
  'AC-26f: offline the Reddit item is readable with community, username and label and opens with the needs-a-connection note',
  { tag: ['@journey-read-feed', '@surface-app', '@story-44'] },
  async ({ page, context }) => {
    // Given: the owner opened the feed with the Reddit item (<run>-reddit-admitted) while online
    // (prerequisites: the 45 feed and the 4 offline support, both REQUIRED before 44);
    // the manifest names its community and author
    const run = runMarker();
    const manifest = seed('AC-26f', run);
    const result = ingest(runDateToday());
    expect(result.report?.status, 'prerequisite (1, the run report): the run completes').toMatch(/^(completed|partial)$/);
    await page.goto('/');
    const online = await itemWithTitle(page, `${run}-reddit-admitted`, 'first unmet step (44): the Reddit item online');
    await expect(online.getByTestId('feed-item-reddit-label'), 'first unmet step (44): the from Reddit label').toHaveText('from Reddit');

    // When: offline emulation is switched on and the page is reopened; the reopening is the 4
    // offline support this row requires, asserted so that its absence fails on an assertion and
    // never in a rejected navigation (round 20 R20-2)
    await context.setOffline(true);
    await reopen(page, 'prerequisite (4, offline support): the app reopens offline from its cache');

    // Then: the Offline banner shows, the Reddit item is readable with its community, username
    // and label, and opening it shows the needs-a-connection note
    await expect(page.getByTestId('offline-banner')).toBeVisible();
    const post = await itemWithTitle(page, `${run}-reddit-admitted`, 'Then');
    await expect(post.getByTestId('feed-item-community')).toHaveText(String(manifest.community));
    await expect(post.getByTestId('feed-item-author')).toHaveText(String(manifest.author));
    await expect(post.getByTestId('feed-item-reddit-label')).toHaveText('from Reddit');
    await post.getByTestId('feed-item-title').tap();
    await expect(page.getByTestId('needs-connection'), 'the approved copy of artboard 12').toHaveText('The full article needs a connection.');
  },
);
