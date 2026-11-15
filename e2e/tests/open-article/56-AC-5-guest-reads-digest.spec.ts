// AC-5 (scenario, @surface-app, project iphone): story DG-2 (priitkustala/ai-news-frontend#56), row AC-5.
// Source: the item's criterion AC-5 and the accepted settlement of DG-2 (The open points, settled: 5.2 the seeded
// data, 5.3 the scenarios), in the form of the guest open-article row (s-21b-AC-2).
// Given a guest with no stored session (S-21b) and the seed digests, item A (<run>-digest-1) with a stored digest,
// when the visitor opens A's article page, then the same as AC-1: article-digest shows A's digest exactly,
// article-summary is absent, article-title stands above the digest, and original-article points to A's link.
import { test, expect } from '@playwright/test';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';
import { expectRows, readRelation, signInOwner, type Row } from '../../support/data';

test(
  '56-AC-5: a visitor reads the stored digest on the article page',
  { tag: ['@journey-open-article', '@surface-app', '@story-56'] },
  async ({ page, request }) => {
    test.setTimeout(60_000);
    // Given: the seed digests (<run> in its titles); the browser holds no stored session. The oracle is the
    // published interface, the feed relation read with the owner's session, at the manifest's id of item A,
    // independent of the screens under test
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
    const list = page.getByTestId('feed-list');
    const item = await itemWithTitle(list, `${run}-digest-1`, 'prerequisite (s-21b): the guest feed');
    await expect(page.getByTestId('sign-in-form'), 'Given: a guest, no sign-in form on the feed').toHaveCount(0);

    // When: the visitor opens A's article page
    await item.getByTestId('feed-item-title').tap();

    // Then: the digest exactly, no summary, the title above the digest, the link to A's original
    const view = page.getByTestId('article-view');
    await expect(view, 'prerequisite (s-21b): the article view opens for a visitor').toBeVisible();
    await expect(view.getByTestId('article-digest'), "first unmet step (56): A's article page shows its digest").toHaveText(String(a!.digest));
    await expect(view.getByTestId('article-summary')).toHaveCount(0);
    await expect(view.getByTestId('article-title')).toHaveText(String(a!.title));
    const order = await view.evaluate((v) => Array.from(v.children).map((child) => child.getAttribute('data-testid')));
    expect(order.indexOf('article-title'), 'article-title is drawn').toBeGreaterThanOrEqual(0);
    expect(order.indexOf('article-title'), 'article-title stands above article-digest').toBeLessThan(order.indexOf('article-digest'));
    await expect(view.getByTestId('original-article')).toHaveAttribute('href', String(a!.canonical_url));
  },
);
