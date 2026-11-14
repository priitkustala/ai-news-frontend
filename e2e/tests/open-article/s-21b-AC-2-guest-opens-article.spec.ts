// AC-2 (scenario, @surface-app, project iphone): story S-21b (priitkustala/ai-news-frontend#44), row AC-2.
// Source: the item's criterion AC-2 and the accepted settlement of S-21b (The open points, settled: the guest
// screen), in the form of the open-article rows (1-AC-12).
// Given the guest feed with a seeded item that has a feed summary, when the visitor taps its headline, then the
// article view shows the item's title and summary and the control to the original address, and back returns to
// the feed with the item.
import { test, expect } from '@playwright/test';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

test(
  's-21b-AC-2: a visitor opens an article from the guest feed and goes back',
  { tag: ['@journey-open-article', '@surface-app', '@story-s-21b'] },
  async ({ page }) => {
    // Given: the guest feed with a seeded item (<run> in its title); the manifest names its title, summary and
    // original_url: the oracle, independent of the screens under test
    const run = runMarker();
    const manifest = seed('AC-12', run);
    await page.goto('/');
    const item = await itemWithTitle(page.getByTestId('feed-list'), run, 'first unmet step (s-21b): the guest feed');

    // When: the visitor taps the headline
    await item.getByTestId('feed-item-title').tap();

    // Then: the article view with the item's title, summary and the control to the original address
    const view = page.getByTestId('article-view');
    await expect(view, 'the article view opens for a visitor').toBeVisible();
    await expect(view.getByTestId('article-title')).toHaveText(String(manifest.title));
    await expect(view.getByTestId('article-summary')).toHaveText(String(manifest.summary));
    await expect(view.getByTestId('original-article')).toHaveAttribute('href', String(manifest.original_url));

    // and back returns to the feed with the item
    await page.getByTestId('article-back').tap();
    await expect(page.getByTestId('article-view')).toHaveCount(0);
    await expect(page.getByTestId('feed-list')).toBeVisible();
    await expect(await itemWithTitle(page.getByTestId('feed-list'), run, 'the item on the feed after back')).toBeVisible();
  },
);
