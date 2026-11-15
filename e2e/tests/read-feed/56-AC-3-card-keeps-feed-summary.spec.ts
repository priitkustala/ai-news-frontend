// AC-3 (scenario, @surface-app, project iphone): story DG-2 (priitkustala/ai-news-frontend#56), row AC-3.
// Source: the item's criterion AC-3 and the accepted settlement of DG-2 (The open points, settled: 5.2 the seeded
// data, 5.3 the scenarios; Read me first point 3, the labelled first unmet step), in the form of the open-article
// rows (1-AC-12).
// Given the seed digests, the feed with A (a stored digest) and B (none), when the feed is drawn, then A's card
// feed-item-summary shows A's feed summary unchanged, never the digest, and B's card shows B's feed summary. It
// first opens A's article page, the story's first observable (A's digest shown), so that it fails before the build.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';
import { expectRows, readRelation, signInOwner, type Row } from '../../support/data';

test(
  '56-AC-3: the feed card keeps the feed summary and never shows the digest',
  { tag: ['@journey-read-feed', '@surface-app', '@story-56'] },
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
    expect(typeof a!.summary === 'string' && a!.summary !== '', 'the oracle: A has a feed summary').toBe(true);
    expect(typeof b!.summary === 'string' && b!.summary !== '', 'the oracle: B has a feed summary').toBe(true);
    await page.goto('/');
    await (await itemWithTitle(page, `${run}-digest-1`, 'prerequisite (45, the feed)')).getByTestId('feed-item-title').tap();
    await expect(page.getByTestId('article-view').getByTestId('article-digest'), "first unmet step (56): A's article page shows its digest").toHaveText(String(a!.digest));

    // When: the feed is drawn again
    await page.getByTestId('article-back').tap();
    await expect(page.getByTestId('article-view')).toHaveCount(0);
    const cardA = await itemWithTitle(page, `${run}-digest-1`, "A's card");
    const cardB = await itemWithTitle(page, `${run}-digest-3`, "B's card");

    // Then: A's card shows A's feed summary, never the digest; B's card shows B's feed summary
    await expect(cardA.getByTestId('feed-item-summary')).toHaveText(String(a!.summary));
    await expect(cardA.getByTestId('feed-item-summary')).not.toContainText(String(a!.digest).slice(0, 40));
    await expect(cardB.getByTestId('feed-item-summary')).toHaveText(String(b!.summary));
  },
);
