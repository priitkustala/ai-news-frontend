// 53-SMOKE-e (smoke, @surface-data, project api): priitkustala/ai-news#53, production smoke suite after every
// deploy; criterion: with the read-only smoke session the feed read answers, and a bookmark write is refused;
// the suite asserts the refusal.
// Given the smoke session and one row of the feed, when its bookmark is inserted with that session, then the
// insert is refused by authorization (401 or 403) and the smoke session's bookmarks read returns no row (refused,
// or a well-formed empty list).
// Read only: the refused insert is its only write attempt; no seed, no development sign-in, no job command.
import { test, expect } from '@playwright/test';
import { expectRows, readRelation } from '../../support/data';
import { REFUSED_BY_AUTHORIZATION, insertRow, showsNoRow, signInSmoke } from '../../support/smoke';

test(
  '53-SMOKE-e: a bookmark write with the smoke session is refused',
  { tag: ['@tier-smoke', '@journey-bookmark', '@surface-data', '@story-53'] },
  async ({ request }) => {
    // Given: the smoke session and one row of the feed
    const token = await signInSmoke(request);
    const feed = expectRows(await readRelation(request, 'feed', token), 'the smoke session reads the feed');
    expect(feed.length, 'the feed has at least one row').toBeGreaterThan(0);
    const item = feed[0];

    // When: its bookmark is inserted with the smoke session (the columns the client's bookmark control writes)
    const status = await insertRow(
      request,
      'bookmarks',
      { item_id: item.id, title: item.title, link: item.canonical_url, summary: item.summary ?? null },
      token,
    );

    // Then: the insert is refused by authorization, and the smoke session reads no bookmark
    expect(REFUSED_BY_AUTHORIZATION, `the bookmark insert with the smoke session is refused (status ${status})`).toContain(
      status,
    );
    const bookmarks = await readRelation(request, 'bookmarks', token);
    expect(showsNoRow(bookmarks), `the smoke session reads no bookmark (status ${bookmarks.status})`).toBe(true);
  },
);
