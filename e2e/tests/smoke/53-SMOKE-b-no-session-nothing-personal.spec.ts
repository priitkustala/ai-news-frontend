// 53-SMOKE-b (smoke, @surface-data, project api): priitkustala/ai-news#53, production smoke suite after every
// deploy; criterion: without a session, a read of the data interface is refused (AC-20 behaviour, as the owner
// rewrote AC-20 on 2026-11-09: a visitor reads news, nothing personal, and changes nothing).
// Given no session (the publishable key only), when bookmarks and push_subscriptions are read and a bookmark
// with a relation-valid payload is inserted, then neither read returns a row (refused, or a well-formed empty
// list) and the insert is refused by authorization (401 or 403).
// Read only: the refused insert is its only write attempt; no seed, no development sign-in, no job command.
import { test, expect } from '@playwright/test';
import { REFUSED_BY_AUTHORIZATION, insertRow, readQuery, showsNoRow } from '../../support/smoke';

// A relation-valid bookmark (the columns the client's bookmark control writes, src/bookmarks/control.ts) whose
// item id is a well-formed id; the insert is refused before the item is looked up.
const BOOKMARK = {
  item_id: '00000000-0000-4000-8000-000000000053',
  title: 'smoke check 53',
  link: 'https://example.invalid/smoke-53',
  summary: null,
};

test(
  '53-SMOKE-b: without a session nothing personal is read and a bookmark write is refused',
  { tag: ['@tier-smoke', '@journey-access', '@surface-data', '@story-53'] },
  async ({ request }) => {
    // Given: no session
    // When: bookmarks and push_subscriptions are read
    const bookmarks = await readQuery(request, 'bookmarks?select=*', null);
    const subscriptions = await readQuery(request, 'push_subscriptions?select=*', null);

    // Then: neither returns a row
    expect(showsNoRow(bookmarks), `bookmarks without a session: no row (status ${bookmarks.status})`).toBe(true);
    expect(showsNoRow(subscriptions), `push_subscriptions without a session: no row (status ${subscriptions.status})`).toBe(
      true,
    );

    // When: a bookmark is inserted without a session
    const status = await insertRow(request, 'bookmarks', BOOKMARK, null);

    // Then: the insert is refused by authorization
    expect(REFUSED_BY_AUTHORIZATION, `the bookmark insert without a session is refused (status ${status})`).toContain(
      status,
    );
  },
);
