// AC-2 (scenario, @surface-app, project iphone): bug priitkustala/ai-news#210 (CARD-1), row AC-2.
// Source: the item's criterion AC-2 and the owner rule of Decisions rows 550 and 1116 (the card is about a third
// of the page text and never more than half).
// Given the seed card-text, item B (<run>-card-2) with a source summary holding \1\ and a run of 40 hyphens and a
// stored digest shorter than that summary, when the reader opens B's story page and goes back to the feed, then
// B's card is the opening of the page text (article-digest), at most half its length, and holds neither \1\ nor
// four hyphens in a row.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';
import { expectRows, readRelation, signInOwner, type Row } from '../../support/data';
import { expectCardOfPage, readCard } from '../../support/card';

test(
  '210-AC-2: the card of a story whose source summary holds marks is the opening of its digest, at most half',
  { tag: ['@journey-read-feed', '@surface-app', '@story-210'] },
  async ({ page, request }) => {
    test.setTimeout(60_000);
    // Given: the seed card-text (<run> in its titles); the oracle is the published interface, the feed relation
    // read with the owner's session, at the manifest's id of item B, independent of the screens under test
    const run = runMarker();
    const manifest = seed('card-text', run);
    const ids = manifest.ids as string[];
    expect(Array.isArray(ids) && ids.length === 3, 'the oracle: the manifest names the ids of A, B and C').toBe(true);
    const rows = expectRows(await readRelation(request, 'feed', signInOwner()), 'the oracle: the feed relation');
    const b = rows.find((row: Row) => row.id === ids[1]);
    expect(b, 'the oracle: item B in the feed relation').toBeDefined();
    expect(typeof b!.digest === 'string' && b!.digest !== '', 'the oracle: B has a stored digest').toBe(true);
    const summary = String(b!.summary);
    const digest = String(b!.digest);
    expect(summary, 'the oracle: B has the source summary the owner saw').toContain('\\1\\');
    expect(summary, 'the oracle: B has the run of hyphens the owner saw').toContain('-'.repeat(40));
    expect(digest.length, 'the oracle: B has a digest shorter than its summary').toBeLessThan(summary.length);

    // When: the reader opens B's story page, then goes back to the feed and reads B's card
    await page.goto('/');
    await (await itemWithTitle(page, `${run}-card-2`, 'prerequisite (45, the feed)')).getByTestId('feed-item-title').tap();
    await expect(page.getByTestId('article-view').getByTestId('article-digest'), "prerequisite (56): B's story page shows its digest").toHaveText(digest);
    await page.getByTestId('article-back').tap();
    await expect(page.getByTestId('article-view')).toHaveCount(0);
    const card = await readCard(await itemWithTitle(page, `${run}-card-2`, "B's card"), "B's card");

    // Then: the card is the opening of the page text, at most half of it, with neither \1\ nor ----
    expectCardOfPage(card, digest, "B's card against B's story page");
    expect(card, "B's card holds no \\1\\").not.toContain('\\1\\');
    expect(card, "B's card holds no four hyphens in a row").not.toContain('----');
  },
);
