// AC-10e (scenario, @surface-app, project iphone): story 24, row AC-10 e of frontend#24.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-10; the Given/When/Then is the owning story's row AC-10e.
// Given an item with an image address of a source with policy placeholder, when the owner opens it, then the
// article view shows the owned placeholder with the source name in text and makes no image request.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

// The held route must see the image request: with the client's service worker in control,
// WebKit's requests bypass page.route (S-09 finding B2).
test.use({ serviceWorkers: 'block' });

test(
  'AC-10e: a placeholder-policy item shows the owned placeholder on the article view and requests no image',
  { tag: ['@journey-open-article', '@surface-app', '@story-24'] },
  async ({ page }) => {
    // Given: the base seed's item "Seed: an item whose image address is broken" of TechCrunch AI, a
    // source with the default policy placeholder, with an image address (/images/missing.png); the
    // fixture set AC-10b keeps the base seed. Every request whose address holds that path is
    // counted from before the navigation
    const run = runMarker();
    seed('AC-10b', run);
    let requests = 0;
    page.on('request', (request) => {
      if (request.url().includes('/images/missing.png')) requests += 1;
    });
    await page.goto('/');
    const item = await itemWithTitle(page, 'Seed: an item whose image address is broken', 'prerequisite (45, the feed)');

    // When: the owner opens it
    await item.getByTestId('feed-item-title').tap();
    const view = page.getByTestId('article-view');
    await expect(view, 'prerequisite (1, the article view)').toBeVisible();

    // Then: the slot shows the owned placeholder with the source name in text, holds no picture,
    // and no request for the image address was made once the page has settled
    const slot = view.getByTestId('article-image-slot');
    await expect(slot, 'first unmet step (24): the article image slot').toHaveAttribute('data-image-state', 'placeholder');
    await expect(slot).toHaveAttribute('data-image-policy', 'placeholder');
    await expect(view.getByTestId('article-placeholder')).toBeVisible();
    await expect(view.getByTestId('article-placeholder')).toContainText('TechCrunch AI');
    await expect(view.getByTestId('article-image')).toHaveCount(0);
    await page.waitForLoadState('networkidle');
    expect(requests, 'requests for the placeholder-policy image address').toBe(0);
  },
);
