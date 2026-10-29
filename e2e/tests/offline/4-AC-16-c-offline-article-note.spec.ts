// AC-16c (scenario, @surface-app, project iphone): story 4, coverage.md row AC-16 c.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-16; the Given/When/Then is the owning story's row AC-16c.
// Given the owner opened the feed and bookmarked an item while online and offline emulation switched on, when
// the owner opens an item, then the app shows the stored fields with the needs a connection note.
import { test, expect } from '../../support/session';
import { runMarker, shownTime } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle, reopen } from '../../support/feed';

test(
  'AC-16c: offline an opened item shows its stored fields with the needs-a-connection note',
  { tag: ['@journey-offline', '@surface-app', '@story-4'] },
  async ({ page, context }) => {
    // Given: the owner opened the feed and bookmarked an item (<run> in its title) while online,
    // with a known summary cached (the manifest names the item's title, source, category and
    // summary and its publication time published_at), then offline emulation is switched on and
    // the page reopened (prerequisites: the 45 feed, the 1 article view, the 51 bookmark
    // control); reopening offline is 4's own first observable (its cache), asserted so that a
    // missing cache fails on an assertion and never in a rejected navigation (round 20 R20-2)
    const run = runMarker();
    const manifest = seed('AC-16c', run);
    await page.goto('/');
    const item = await itemWithTitle(page, run, 'prerequisite (45, the feed)');
    await expect(item.getByTestId('feed-item-summary')).toHaveText(String(manifest.summary));
    await expect(item.getByTestId('feed-item-bookmark'), 'prerequisite (51): the bookmark control').toHaveAttribute('aria-pressed', 'false');
    await item.getByTestId('feed-item-bookmark').tap();
    await expect(item.getByTestId('feed-item-bookmark')).toHaveAttribute('aria-pressed', 'true');
    await context.setOffline(true);
    await reopen(page, 'first unmet step (4): the app reopens offline from its cache');
    await expect(page.getByTestId('offline-banner'), 'Given: the Offline banner').toBeVisible();

    // When: the owner opens the item
    await (await itemWithTitle(page, run, 'Given')).getByTestId('feed-item-title').tap();

    // Then: the stored fields, the cached summary among them, show with the needs-a-connection note
    const view = page.getByTestId('article-view');
    await expect(view.getByTestId('article-title')).toHaveText(String(manifest.title));
    await expect(view.getByTestId('article-source')).toHaveText(String(manifest.source));
    await expect(view.getByTestId('article-category')).toHaveText(String(manifest.category));
    await expect(view.getByTestId('article-summary')).toHaveText(String(manifest.summary));
    await expect(view.getByTestId('article-time'), 'the stored publication time').toHaveText(shownTime(String(manifest.published_at)));
    await expect(view.getByTestId('needs-connection'), 'the approved copy of artboard 12').toHaveText('The full article needs a connection.');
  },
);
