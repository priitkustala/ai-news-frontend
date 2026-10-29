// AC-28a (scenario, @surface-app, project iphone): story 48, coverage.md row AC-28 a.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-28; the Given/When/Then is the owning story's row AC-28a.
// Given a fixture shaped like the mirror on the fixture server as source anthropic-news-mirror, when a run
// completes and the owner opens the feed at iPhone size, then each of its items shows as a feed-item with
// title, the source name, the date and a link to anthropic.com.
import { test, expect } from '../../support/session';
import { runDateToday, runMarker, shownTime } from '../../support/env';
import { ingest, seed } from '../../support/job';
import { expectedItems, itemWithTitle } from '../../support/feed';

test(
  'AC-28a: each mirror item shows title, source name, date and a link to anthropic.com',
  { tag: ['@journey-read-feed', '@surface-app', '@story-48'] },
  async ({ page }) => {
    // Given: a fixture shaped like the mirror (RSS 2.0, whole-article descriptions) as source
    // anthropic-news-mirror; the manifest names every mirror item (mirror_items, each with its
    // title containing <run>-mirror, its source display name and its published_at, an ISO 8601
    // instant; round 21 R21-2) and links
    const run = runMarker();
    const manifest = seed('AC-28a', run);
    const mirror = expectedItems(manifest, 'mirror_items');
    expect(mirror.length, 'prerequisite: the manifest names the mirror items').toBeGreaterThan(0);

    // When: a run completes and the owner opens the feed at iPhone size
    const result = ingest(runDateToday());
    expect(result.report?.status, 'prerequisite (1, the run report): the run completes').toMatch(/^(completed|partial)$/);
    await page.goto('/');

    // Then: each of its items shows with title, source name, date and a link to anthropic.com;
    // the source is the manifest's for that item and the date its published_at in the mirror's
    // date-only format of artboard 10 (17 Oct 2026: the date part of support/env.ts shownTime,
    // without the ordinary feed's time of day), in the zone E2E_RUN_TIME_ZONE binds (OD-09 OPEN)
    for (const expected of mirror) {
      const item = await itemWithTitle(page, String(expected.title), 'first unmet step (48): the mirror item');
      await expect(item.getByTestId('feed-item-source')).toHaveText(String(expected.source));
      await expect(item.getByTestId('feed-item-time'), 'the mirror item date').toHaveText(shownTime(String(expected.published_at)).split(',')[0]);
      await expect(item.getByTestId('feed-item-original')).toHaveAttribute('href', /^https:\/\/(www\.)?anthropic\.com\//);
    }
  },
);
