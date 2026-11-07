// AC-09b (scenario, @surface-app, project iphone): bug 23 (SI-15), coverage.md row AC-09 b.
// Source: the regression contract, Test integrity 2 (a bug is reproduced as a failing scenario before its
// repair); no Locked criterion states a count of reads.
// Given the owner with a stored session and one item whose image address fails, when the page loads, then the
// feed, the categories and the ingestion runs are each read once and the picture is requested once.
import { test, expect } from '../../support/session';
import { requireEnv, runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

// The counting route must see the image request: with the client's service worker in control,
// WebKit's requests bypass page.route (S-09 finding B2).
test.use({ serviceWorkers: 'block' });

test(
  'AC-09b: a page load with a stored session reads the feed once and requests the picture once',
  { tag: ['@journey-read-feed', '@surface-app', '@bug-23'] },
  async ({ page }) => {
    // Given: an item (<run>-failed-image) whose image address fails at once; the route counts the
    // requests it sees and aborts each; the three counters count the reads of the data interface
    const run = runMarker();
    const manifest = seed('AC-10c', run);
    const dataUrl = requireEnv('E2E_DATA_URL', 'the published data interface');
    let hits = 0;
    await page.route(String(manifest.failed_image_url), async (route) => {
      hits += 1;
      await route.abort('failed');
    });
    let feedReads = 0;
    let categoryReads = 0;
    let runReads = 0;
    page.on('request', (request) => {
      const url = request.url();
      if (url.startsWith(`${dataUrl}/feed`)) feedReads += 1;
      else if (url.startsWith(`${dataUrl}/categories`)) categoryReads += 1;
      else if (url.startsWith(`${dataUrl}/ingestion_runs`)) runReads += 1;
    });

    try {
      // When: the page loads with the stored session and the failed image is shown as failed
      await page.goto('/');
      const failed = await itemWithTitle(page, `${run}-failed-image`, 'prerequisite (45, the feed)');
      const slot = failed.getByTestId('feed-item-image-slot');
      await expect(slot, 'prerequisite (46, the failed image): the slot reads failed').toHaveAttribute('data-image-state', 'failed');
      await page.waitForLoadState('networkidle');

      // Then: each read happened once, and so did the picture's request
      expect(feedReads, 'first unmet step (23): the feed is read once per page load').toBe(1);
      expect(categoryReads, 'the categories are read once per page load').toBe(1);
      expect(runReads, 'the ingestion runs are read once per page load').toBe(1);
      expect(hits, 'the picture is requested once per page load').toBe(1);
      await expect(slot).toHaveAttribute('data-image-state', 'failed');
    } finally {
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    }
  },
);
