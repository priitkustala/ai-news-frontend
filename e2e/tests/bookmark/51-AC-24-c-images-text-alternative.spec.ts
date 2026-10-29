// AC-24c (scenario, @surface-app, project iphone): story 51, coverage.md row AC-24 c.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-24; the Given/When/Then is the owning story's row AC-24c.
// Given the feed, when it loads, then each image has a text alternative or is marked decorative.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { expectAltOrDecorative, itemWithTitle } from '../../support/feed';

test(
  'AC-24c: each image in the feed has a text alternative or is marked decorative',
  { tag: ['@journey-bookmark', '@surface-app', '@story-51'] },
  async ({ page }) => {
    // Given: the feed with seeded items, at least one with a licensed image (<run>-licensed)
    // and one with the placeholder (<run>-placeholder); the manifest counts the images
    const run = runMarker();
    const manifest = seed('AC-24c', run);
    const images = Number(manifest.image_count);
    const placeholders = Number(manifest.placeholder_count);

    // When: it loads
    await page.goto('/');
    await itemWithTitle(page, `${run}-licensed`, 'prerequisite (45, the feed)');

    // Then: each image, the pictures and the placeholder artworks alike, has a text alternative
    // or is marked decorative (51 AC-24c), read inside each testid's boundary, where the
    // artboards put the image (a child svg with role img and aria-label, or a child svg
    // aria-hidden true beside the source name; round 21 R21-1), and waited on until it reaches
    // one of the two states (support/feed.ts, expectAltOrDecorative; round 20 R20-4 and R20-5);
    // one that is neither fails. The counts are the manifest's, so no image is left unchecked
    await expect(page.getByTestId('feed-item-image')).toHaveCount(images);
    await expect(page.getByTestId('feed-item-placeholder')).toHaveCount(placeholders);
    for (let i = 0; i < images; i += 1) {
      await expectAltOrDecorative(page.getByTestId('feed-item-image').nth(i), `first unmet step (51): image ${i}`);
    }
    for (let i = 0; i < placeholders; i += 1) {
      await expectAltOrDecorative(page.getByTestId('feed-item-placeholder').nth(i), `first unmet step (51): placeholder ${i}`);
    }
  },
);
