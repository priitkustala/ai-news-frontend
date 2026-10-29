// AC-12 (scenario, @surface-app, project iphone): story 1, coverage.md row AC-12 -.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-12; the Given/When/Then is the owning story's row AC-12.
// Given a seeded item with a feed summary, when the owner opens it, then title, source, category, time and
// the summary show, and the original-article control points to the item's original address; no article body
// is present.
import { test, expect } from '../../support/session';
import { runMarker, shownTime } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

test(
  'AC-12: the article view shows title, source, category, time and summary and opens the original, with no article body',
  { tag: ['@journey-open-article', '@surface-app', '@story-1'] },
  async ({ page }) => {
    // Given: a seeded item (<run> in its title) with a feed summary; its publisher article body
    // in the fixture starts with <run>-body. The manifest names the item's title, source,
    // category, summary, published_at and original_url: the oracle, independent of the screens
    // under test
    const run = runMarker();
    const manifest = seed('AC-12', run);
    await page.goto('/');
    const item = await itemWithTitle(page, run, 'prerequisite (45, the feed)');
    await expect(item.getByTestId('feed-item-original')).toHaveAttribute('href', String(manifest.original_url));

    // When: the owner opens it
    await item.getByTestId('feed-item-title').tap();

    // Then: title, source, category, time and summary show, the original-article control points
    // to the original address, and no article body is present
    const view = page.getByTestId('article-view');
    await expect(view, 'first unmet step (1): the article view').toBeVisible();
    await expect(view.getByTestId('article-title')).toHaveText(String(manifest.title));
    await expect(view.getByTestId('article-source')).toHaveText(String(manifest.source));
    await expect(view.getByTestId('article-category')).toHaveText(String(manifest.category));
    await expect(view.getByTestId('article-summary')).toHaveText(String(manifest.summary));
    await expect(view.getByTestId('article-time'), 'the publication time (round 20 R20-4)').toHaveText(shownTime(String(manifest.published_at)));
    await expect(view.getByTestId('original-article')).toHaveAttribute('href', String(manifest.original_url));
    await expect(view).not.toContainText(`${run}-body`);
  },
);
