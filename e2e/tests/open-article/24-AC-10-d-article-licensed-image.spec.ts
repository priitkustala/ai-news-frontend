// AC-10d (scenario, @surface-app, project iphone): story 24, row AC-10 d of frontend#24.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-10; the Given/When/Then is the owning story's row AC-10d.
// Given one source with policy licensed and an image, when the owner opens its item, then the article view's
// image slot shows the licensed image with its text alternative and the credit line.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { expectTextAlternative, itemWithTitle } from '../../support/feed';

test(
  'AC-10d: the article view shows the licensed image with its text alternative and credit line',
  { tag: ['@journey-open-article', '@surface-app', '@story-24'] },
  async ({ page }) => {
    // Given: an item (<run>-licensed) of a source with image policy licensed and an image
    const run = runMarker();
    seed('AC-10a', run);
    await page.goto('/');
    const item = await itemWithTitle(page, `${run}-licensed`, 'prerequisite (45, the feed)');

    // When: the owner opens it
    await item.getByTestId('feed-item-title').tap();
    const view = page.getByTestId('article-view');
    await expect(view, 'prerequisite (1, the article view)').toBeVisible();

    // Then: the article view's slot shows the licensed image with its text alternative, and the
    // credit line names the source
    const slot = view.getByTestId('article-image-slot');
    await expect(slot, 'first unmet step (24): the article image slot').toHaveAttribute('data-image-state', 'licensed');
    await expect(slot).toHaveAttribute('data-image-policy', 'licensed');
    await expect(view.getByTestId('article-image')).toBeVisible();
    await expectTextAlternative(view.getByTestId('article-image'), 'the licensed image');
    await expect(view.getByTestId('article-image-credit')).toHaveText('Image: Fixture licensed source');
  },
);
