// AC-10c (scenario, @surface-app, project iphone): story 46, coverage.md row AC-10 c.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-10; the Given/When/Then is the owning story's row AC-10c.
// Given one item whose image address fails, when the feed loads, then the failed image shows the placeholder
// without shifting the layout.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { box, itemWithTitle } from '../../support/feed';

test(
  'AC-10c: an image that fails to load shows the placeholder without shifting the layout',
  { tag: ['@journey-read-feed', '@surface-app', '@story-46'] },
  async ({ page }) => {
    // Given: an item (<run>-failed-image) whose image address fails; the manifest names the
    // address (failed_image_url). The failure is controlled: the image request is held until
    // the layout before the failure is measured, then it is aborted (the network condition of
    // the Given; the route counts the requests it holds, so a request it never sees cannot pass).
    // The navigation waits for the document only (domcontentloaded), never for the held image,
    // and the held route is released in finally, also when an earlier step fails (round 20 R20-2)
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
      // When: the feed loads
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const failed = await itemWithTitle(page, `${run}-failed-image`, 'prerequisite (45, the feed)');
      const slot = failed.getByTestId('feed-item-image-slot');
      await expect(slot, 'first unmet step (46): the image slot').toHaveAttribute('data-image-state', /\S/);
      await expect.poll(() => hits, { message: 'the image request reached the held route' }).toBeGreaterThan(0);
      const layout = async () => ({ slot: await box(slot), link: await box(failed.getByTestId('feed-item-original')) });
      await expect.poll(async () => (await layout()).slot?.height ?? 0, { message: 'the slot has its size while the image loads' })
        .toBeGreaterThan(0);
      const before = await layout();
      release();

      // Then: the failed image shows the placeholder, and the slot and the content after it keep
      // the place they had before the failure: a shift during the failure fails
      await expect(slot).toHaveAttribute('data-image-state', 'failed');
      await expect(failed.getByTestId('feed-item-placeholder')).toBeVisible();
      await expect.poll(layout, { message: 'the layout after the failure equals the layout before it' }).toEqual(before);
    } finally {
      release();
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    }
  },
);
