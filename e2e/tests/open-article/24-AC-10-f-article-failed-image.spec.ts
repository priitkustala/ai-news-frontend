// AC-10f (scenario, @surface-app, project iphone): story 24, row AC-10 f of frontend#24.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-10; the Given/When/Then is the owning story's row AC-10f.
// Given one item whose image address fails, when the owner opens it, then the article view's failed image shows
// the placeholder without shifting the layout.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { box, itemWithTitle } from '../../support/feed';

// The held route must see the image request: with the client's service worker in control,
// WebKit's requests bypass page.route (S-09 finding B2).
test.use({ serviceWorkers: 'block' });

test(
  'AC-10f: an image that fails to load shows the placeholder on the article view without shifting the layout',
  { tag: ['@journey-open-article', '@surface-app', '@story-24'] },
  async ({ page }) => {
    // Given: an item (<run>-failed-image) whose image address fails; the manifest names the
    // address (failed_image_url). The failure is controlled: the image request is held until
    // the layout before the failure is measured, then it is aborted (the route counts the
    // requests it holds, so a request it never sees cannot pass). The feed's own slot asks for
    // the address first and is held; the article's image may share that one request, so no
    // second request is required. The navigation waits for the document only
    // (domcontentloaded), and the held route is released in finally, also when a step fails
    const run = runMarker();
    const manifest = seed('AC-10c', run);
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let hits = 0;
    await page.route(String(manifest.failed_image_url), async (route) => {
      hits += 1;
      await held;
      await route.abort('failed');
    });

    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const item = await itemWithTitle(page, `${run}-failed-image`, 'prerequisite (45, the feed)');

      // When: the owner opens it, and the held image request fails
      await item.getByTestId('feed-item-title').tap();
      const view = page.getByTestId('article-view');
      await expect(view, 'prerequisite (1, the article view)').toBeVisible();
      const slot = view.getByTestId('article-image-slot');
      await expect(slot, 'first unmet step (24): the article image slot').toHaveAttribute('data-image-state', /\S/);
      await expect.poll(() => hits, { message: 'the image request reached the held route' }).toBeGreaterThan(0);
      const layout = async () => ({ slot: await box(slot), link: await box(view.getByTestId('original-article')) });
      await expect.poll(async () => (await layout()).slot?.height ?? 0, { message: 'the slot has its size while the image loads' })
        .toBeGreaterThan(0);
      const before = await layout();
      release();

      // Then: the failed image shows the placeholder, and the slot and the control after it keep
      // the place they had before the failure: a shift during the failure fails
      await expect(slot).toHaveAttribute('data-image-state', 'failed');
      await expect(view.getByTestId('article-placeholder')).toBeVisible();
      await expect.poll(layout, { message: 'the layout after the failure equals the layout before it' }).toEqual(before);
    } finally {
      release();
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    }
  },
);
