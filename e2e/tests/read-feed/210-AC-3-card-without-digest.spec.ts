// AC-3 (scenario, @surface-app, project iphone): bug priitkustala/ai-news#210 (CARD-1), row AC-3.
// Source: the item's criterion AC-3 and the owner rule of Decisions rows 550 and 1116 (the card is about a third
// of the page text and never more than half).
// Given the seed card-text, item C (<run>-card-3) with no digest and a source summary of about 300 characters in
// three sentences, when the reader opens C's story page and goes back to the feed, then the page shows the source
// summary (article-summary) as today, and C's card is the opening of that text, at most half its length.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';
import { expectRows, readRelation, signInOwner, type Row } from '../../support/data';
import { expectCardOfPage, readCard } from '../../support/card';

test(
  '210-AC-3: the card of a story without a digest is the opening of its source summary, at most half',
  { tag: ['@journey-read-feed', '@surface-app', '@story-210'] },
  async ({ page, request }) => {
    test.setTimeout(60_000);
    // Given: the seed card-text (<run> in its titles); the oracle is the published interface, the feed relation
    // read with the owner's session, at the manifest's id of item C, independent of the screens under test
    const run = runMarker();
    const manifest = seed('card-text', run);
    const ids = manifest.ids as string[];
    expect(Array.isArray(ids) && ids.length === 3, 'the oracle: the manifest names the ids of A, B and C').toBe(true);
    const rows = expectRows(await readRelation(request, 'feed', signInOwner()), 'the oracle: the feed relation');
    const c = rows.find((row: Row) => row.id === ids[2]);
    expect(c, 'the oracle: item C in the feed relation').toBeDefined();
    expect(c!.digest, 'the oracle: C has no digest').toBeNull();
    expect(typeof c!.summary === 'string' && c!.summary !== '', 'the oracle: C has a source summary').toBe(true);
    const summary = String(c!.summary);

    // When: the reader opens C's story page, then goes back to the feed and reads C's card
    await page.goto('/');
    await (await itemWithTitle(page, `${run}-card-3`, 'prerequisite (45, the feed)')).getByTestId('feed-item-title').tap();
    const view = page.getByTestId('article-view');
    await expect(view.getByTestId('article-summary'), "C's story page shows its source summary as today").toHaveText(summary);
    await expect(view.getByTestId('article-digest')).toHaveCount(0);
    await page.getByTestId('article-back').tap();
    await expect(page.getByTestId('article-view')).toHaveCount(0);
    const card = await readCard(await itemWithTitle(page, `${run}-card-3`, "C's card"), "C's card");

    // Then: the card is the opening of the page text, at most half of it
    expectCardOfPage(card, summary, "C's card against C's story page");
  },
);
