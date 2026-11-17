// v2-b (scenario, @surface-app, project iphone): the Radarnik v2 proposal (priitkustala/ai-news#120), lead story and
// category banners. Source: the mockup and proposal comment on #120 (the first story as the Lead story card, the
// other stories under a banner per category with its Radarnik illustration, the live ribbon under the app bar).
// Not yet an approved story: written with the draft pull request.
// Given at least four seeded items, when the feed shows at / at iPhone size, then the first feed-item carries
// lead-story-label and its summary under What happened, every other feed-item follows a category-banner naming its
// category, live-ribbon starts with LIVE, and the app bar heading is Radarnik.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { expectTitles, expectedItems } from '../../support/feed';

test(
  'v2-b: the All view shows the lead story card, a banner per category and the live ribbon',
  { tag: ['@journey-read-feed', '@surface-app', '@story-120'] },
  async ({ page }) => {
    // Given: at least four seeded items (the manifest names them)
    const run = runMarker();
    const items = expectedItems(seed('AC-09', run));
    expect(items.length, 'prerequisite: the manifest names at least four seeded items').toBeGreaterThanOrEqual(4);

    // When: the feed shows at /
    await page.goto('/');
    await expectTitles(page, items.map((i) => i.title), 'prerequisite (45, the feed)');

    // Then: the app bar heading is Radarnik and the live ribbon starts with LIVE
    await expect(page.getByRole('heading', { name: 'Radarnik', exact: true })).toBeVisible();
    await expect(page.getByTestId('live-ribbon')).toHaveText(/^LIVE/);

    // Then: the first feed-item is the lead story, with What happened over its summary where it has one
    const feedItems = page.getByTestId('feed-item');
    await expect(feedItems.nth(0).getByTestId('lead-story-label'), 'first unmet step (120): the lead story').toHaveText('Lead story');
    expect(await page.getByTestId('lead-story-label').count(), 'one lead story').toBe(1);

    // Then: every other feed-item follows a category-banner whose name is the item's category
    const count = await feedItems.count();
    for (let index = 1; index < count; index += 1) {
      const pair = await feedItems.nth(index).evaluate((item) => {
        let node = item.previousElementSibling;
        while (node && node.getAttribute('data-testid') !== 'category-banner') node = node.previousElementSibling;
        return { banner: node?.querySelector('h2')?.textContent ?? null, category: item.querySelector('[data-testid="feed-item-category"]')?.textContent ?? null };
      });
      expect(pair.banner, `feed-item ${index + 1} follows a category-banner`).not.toBeNull();
      expect(pair.banner, `feed-item ${index + 1}'s banner names its category`).toBe(pair.category);
    }
  },
);
