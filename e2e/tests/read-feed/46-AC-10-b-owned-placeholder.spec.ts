// AC-10b (scenario, @surface-app, project iphone): story 46, coverage.md row AC-10 b.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-10; the Given/When/Then is the owning story's row AC-10b.
// Given a source with policy placeholder, when the feed loads, then the placeholder source shows the owned
// placeholder with the source name in text.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

test(
  'AC-10b: a placeholder-policy source shows the owned placeholder with the source name in text',
  { tag: ['@journey-read-feed', '@surface-app', '@story-46'] },
  async ({ page }) => {
    // Given: an item (<run>-placeholder) of a source with image policy placeholder; the manifest
    // names that source's display name (source), the oracle the screen is waited on
    const run = runMarker();
    const manifest = seed('AC-10b', run);
    const source = String(manifest.source ?? '');
    expect(source.trim(), 'prerequisite: the manifest names the source').not.toBe('');

    // When: the feed loads
    await page.goto('/');

    // Then: the owned placeholder shows with the source name in text; the source field and the
    // placeholder's text are each waited on until they read the expected name (round 20 R20-5)
    const item = await itemWithTitle(page, `${run}-placeholder`, 'prerequisite (45, the feed)');
    await expect(item.getByTestId('feed-item-image-slot'), 'first unmet step (46): the placeholder slot').toHaveAttribute('data-image-state', 'placeholder');
    await expect(item.getByTestId('feed-item-placeholder')).toBeVisible();
    await expect(item.getByTestId('feed-item-source')).toHaveText(source);
    await expect(item.getByTestId('feed-item-placeholder-source')).toHaveText(source);
  },
);
