// AC-2 (scenario, @surface-app, project iphone): story DG-2 (priitkustala/ai-news-frontend#56), row AC-2.
// Source: the item's criterion AC-2 and the accepted settlement of DG-2 (The open points, settled: 5.2 the seeded
// data, 5.3 the scenarios; Read me first point 3, the labelled first unmet step), in the form of the open-article
// rows (1-AC-12).
// Given the seed digests, item B (<run>-digest-3) with no digest and a feed summary, when the owner opens B's
// article page, then article-summary shows B's feed summary as today, with no article-digest and no note. It first
// opens A's article page, the story's first observable (A's digest shown), so that it fails before the build.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';
import { expectRows, readRelation, signInOwner, type Row } from '../../support/data';

test(
  '56-AC-2: an item with no digest shows its feed summary on the article page, with no note',
  { tag: ['@journey-open-article', '@surface-app', '@story-56'] },
  async ({ page, request }) => {
    test.setTimeout(60_000);
    // Given: the seed digests (<run> in its titles); the oracle is the published interface, the feed relation
    // read with the owner's session, at the manifest's ids of items A and B, independent of the screens under test
    const run = runMarker();
    const manifest = seed('digests', run);
    const ids = manifest.ids as string[];
    const lengths = manifest.digest_lengths as (number | null)[];
    const rows = expectRows(await readRelation(request, 'feed', signInOwner()), 'the oracle: the feed relation');
    const a = rows.find((row: Row) => row.id === ids[0]);
    const b = rows.find((row: Row) => row.id === ids[2]);
    expect(a, 'the oracle: item A in the feed relation').toBeDefined();
    expect(b, 'the oracle: item B in the feed relation').toBeDefined();
    expect(typeof a!.digest, 'the oracle: A has a stored digest').toBe('string');
    expect(String(a!.digest).length, 'the oracle: the length the manifest names').toBe(lengths[0]);
    expect(b!.digest, 'the oracle: B has no digest').toBeNull();
    expect(String(b!.title)).toContain(`${run}-digest-3`);
    expect(typeof b!.summary === 'string' && b!.summary !== '', 'the oracle: B has a feed summary').toBe(true);
    await page.goto('/');
    const view = page.getByTestId('article-view');
    await (await itemWithTitle(page, `${run}-digest-1`, 'prerequisite (45, the feed)')).getByTestId('feed-item-title').tap();
    await expect(view.getByTestId('article-digest'), "first unmet step (56): A's article page shows its digest").toHaveText(String(a!.digest));
    await page.getByTestId('article-back').tap();
    await expect(view).toHaveCount(0);

    // When: the owner opens B's article page
    await (await itemWithTitle(page, `${run}-digest-3`, 'Given: item B on the feed')).getByTestId('feed-item-title').tap();

    // Then: B's feed summary as today, no digest and no note
    await expect(view, 'prerequisite (1): the article view').toBeVisible();
    await expect(view.getByTestId('article-title')).toHaveText(String(b!.title));
    await expect(view.getByTestId('article-summary')).toHaveText(String(b!.summary));
    await expect(view.getByTestId('article-digest')).toHaveCount(0);
    await expect(view.locator('[data-testid*="digest"], [data-testid*="note"]'), 'no note about a missing digest').toHaveCount(0);
  },
);
