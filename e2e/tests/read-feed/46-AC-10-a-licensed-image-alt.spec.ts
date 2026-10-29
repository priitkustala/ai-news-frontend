// AC-10a (scenario, @surface-app, project iphone): story 46, coverage.md row AC-10 a.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-10; the Given/When/Then is the owning story's row AC-10a.
// Given one source with policy licensed and an image, when the feed loads, then the licensed image shows with
// its text alternative.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { expectTextAlternative, itemWithTitle } from '../../support/feed';

test(
  'AC-10a: the licensed image shows with its text alternative',
  { tag: ['@journey-read-feed', '@surface-app', '@story-46'] },
  async ({ page }) => {
    // Given: an item (<run>-licensed) of a source with image policy licensed and an image
    const run = runMarker();
    seed('AC-10a', run);

    // When: the feed loads
    await page.goto('/');

    // Then: the licensed image shows with its text alternative, read on the image inside the
    // feed-item-image boundary (the testid element or, as on artboards 01 and 08, its child svg
    // with role img and aria-label; round 21 R21-1); decorative or neither fails
    const item = await itemWithTitle(page, `${run}-licensed`, 'prerequisite (45, the feed)');
    await expect(item.getByTestId('feed-item-image-slot'), 'first unmet step (46): the licensed image slot').toHaveAttribute('data-image-state', 'licensed');
    await expect(item.getByTestId('feed-item-image')).toBeVisible();
    await expectTextAlternative(item.getByTestId('feed-item-image'), 'the licensed image');
  },
);
