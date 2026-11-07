// AC-10g (scenario, @surface-app, project iphone): story 24, row AC-10 g of frontend#24.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-10; the Given/When/Then is the owning story's row AC-10g.
// Given an item with no image address, when the owner opens it, then the article view's image slot shows the
// owned placeholder with the source name in text.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

test(
  'AC-10g: an item with no image address shows the owned placeholder on the article view',
  { tag: ['@journey-open-article', '@surface-app', '@story-24'] },
  async ({ page }) => {
    // Given: a seeded item (<run> in its title) with no image address; the manifest names its
    // source's display name (source), the oracle the screen is waited on
    const run = runMarker();
    const manifest = seed('AC-12', run);
    await page.goto('/');
    const item = await itemWithTitle(page, run, 'prerequisite (45, the feed)');

    // When: the owner opens it
    await item.getByTestId('feed-item-title').tap();
    const view = page.getByTestId('article-view');
    await expect(view, 'prerequisite (1, the article view)').toBeVisible();

    // Then: the slot shows the owned placeholder with the source name in text, and no picture
    const slot = view.getByTestId('article-image-slot');
    await expect(slot, 'first unmet step (24): the article image slot').toHaveAttribute('data-image-state', 'placeholder');
    await expect(slot).toHaveAttribute('data-image-policy', 'placeholder');
    await expect(slot.getByTestId('article-placeholder')).toBeVisible();
    await expect(slot.getByTestId('article-placeholder')).toContainText(String(manifest.source));
    await expect(view.getByTestId('article-image')).toHaveCount(0);
  },
);
