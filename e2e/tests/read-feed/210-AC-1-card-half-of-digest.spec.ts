// AC-1 (scenario, @surface-app, project iphone): bug priitkustala/ai-news#210 (CARD-1), row AC-1.
// Source: the item's criterion AC-1 and the owner rule of Decisions rows 550 and 1116 (the card is about a third
// of the page text and never more than half).
// Given the seed card-text, item A (<run>-card-1) with a source summary of about 800 characters holding &#8217;
// and a feed-only digest of about 430 characters, when the reader opens A's story page and goes back to the feed,
// then A's card is the opening of the page text (article-digest), at most half its length, and holds no &#8217;.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';
import { expectRows, readRelation, signInOwner, type Row } from '../../support/data';
import { expectCardOfPage, readCard } from '../../support/card';

test(
  '210-AC-1: the card of a story with a long source summary is the opening of its digest, at most half',
  { tag: ['@journey-read-feed', '@surface-app', '@story-210'] },
  async ({ page, request }) => {
    test.setTimeout(60_000);
    // Given: the seed card-text (<run> in its titles); the oracle is the published interface, the feed relation
    // read with the owner's session, at the manifest's id of item A, independent of the screens under test
    const run = runMarker();
    const manifest = seed('card-text', run);
    const ids = manifest.ids as string[];
    expect(Array.isArray(ids) && ids.length === 3, 'the oracle: the manifest names the ids of A, B and C').toBe(true);
    const rows = expectRows(await readRelation(request, 'feed', signInOwner()), 'the oracle: the feed relation');
    const a = rows.find((row: Row) => row.id === ids[0]);
    expect(a, 'the oracle: item A in the feed relation').toBeDefined();
    expect(typeof a!.digest === 'string' && a!.digest !== '', 'the oracle: A has a stored digest').toBe(true);
    expect(String(a!.summary), 'the oracle: A has the source summary the owner saw').toContain('&#8217;');
    const digest = String(a!.digest);

    // When: the reader opens A's story page, then goes back to the feed and reads A's card
    await page.goto('/');
    await (await itemWithTitle(page, `${run}-card-1`, 'prerequisite (45, the feed)')).getByTestId('feed-item-title').tap();
    await expect(page.getByTestId('article-view').getByTestId('article-digest'), "prerequisite (56): A's story page shows its digest").toHaveText(digest);
    await page.getByTestId('article-back').tap();
    await expect(page.getByTestId('article-view')).toHaveCount(0);
    const card = await readCard(await itemWithTitle(page, `${run}-card-1`, "A's card"), "A's card");

    // Then: the card is the opening of the page text, at most half of it, with no &#8217;
    expectCardOfPage(card, digest, "A's card against A's story page");
    expect(card, "A's card holds no &#8217;").not.toContain('&#8217;');
  },
);
