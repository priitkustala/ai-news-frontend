// AC-4 (scenario, @surface-app, project iphone): story DG-2 (priitkustala/ai-news-frontend#56), row AC-4.
// Source: the item's criterion AC-4 and the accepted settlement of DG-2 (The open points, settled: 5.2 the seeded
// data, 5.3 the scenarios), in the form of the offline rows (4-AC-16-c).
// Given the seed digests and the feed read online with item A (a stored digest) drawn, when the owner goes
// offline, reopens the app and opens A's article page, then article-digest shows A's digest exactly, with the
// needs-a-connection note.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle, reopen } from '../../support/feed';
import { expectRows, readRelation, signInOwner, type Row } from '../../support/data';
import { expectCardOfPage, readCard } from '../../support/card';

test(
  '56-AC-4: offline the article page of an item keeps its stored digest',
  { tag: ['@journey-offline', '@surface-app', '@story-56'] },
  async ({ page, context, request }) => {
    test.setTimeout(60_000);
    // Given: the seed digests (<run> in its titles); the oracle is the published interface, the feed relation
    // read with the owner's session, at the manifest's id of item A, independent of the screens under test. The
    // feed is read online with A drawn, the service worker controls the page, then offline emulation is switched
    // on and the page reopened (prerequisite 4: the app reopens offline from its cache)
    const run = runMarker();
    const manifest = seed('digests', run);
    const ids = manifest.ids as string[];
    const lengths = manifest.digest_lengths as (number | null)[];
    const rows = expectRows(await readRelation(request, 'feed', signInOwner()), 'the oracle: the feed relation');
    const a = rows.find((row: Row) => row.id === ids[0]);
    expect(a, 'the oracle: item A in the feed relation').toBeDefined();
    expect(typeof a!.digest, 'the oracle: A has a stored digest').toBe('string');
    expect(String(a!.digest).length, 'the oracle: the length the manifest names').toBe(lengths[0]);
    await page.goto('/');
    const item = await itemWithTitle(page, `${run}-digest-1`, 'prerequisite (45, the feed)');
    expectCardOfPage(await readCard(item, "A's card"), String(a!.digest), "A's card against A's digest (changed by priitkustala/ai-news#210, row 1116)");
    // the service worker controls the page before the network goes (owner decision 2026-11-07)
    await page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated');
    await context.setOffline(true);
    await reopen(page, 'prerequisite (4): the app reopens offline from its cache');
    await expect(page.getByTestId('offline-banner'), 'Given: the Offline banner').toBeVisible();

    // When: the owner opens A's article page
    await (await itemWithTitle(page, `${run}-digest-1`, 'Given')).getByTestId('feed-item-title').tap();

    // Then: A's stored digest exactly, with the needs-a-connection note
    const view = page.getByTestId('article-view');
    await expect(view.getByTestId('article-title')).toHaveText(String(a!.title));
    await expect(view.getByTestId('article-digest'), "first unmet step (56): A's article page shows its digest offline").toHaveText(String(a!.digest));
    await expect(view.getByTestId('needs-connection')).toBeVisible();
  },
);
