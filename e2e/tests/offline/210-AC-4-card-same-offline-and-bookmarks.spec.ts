// AC-4 (scenario, @surface-app, project iphone): bug priitkustala/ai-news#210 (CARD-1), row AC-4.
// Source: the item's criterion AC-4, in the form of the offline rows (4-AC-16-a).
// Given the seed card-text, items A (<run>-card-1) and B (<run>-card-2) bookmarked by the owner and the feed read
// once online, then the browser offline, when the reader reads the feed from the kept copy and opens Bookmarks,
// then every card of A and B shows the same text as on the online feed.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle, reopen } from '../../support/feed';
import { readCard } from '../../support/card';

test(
  '210-AC-4: the cards of A and B show the same text offline and in Bookmarks as on the online feed',
  { tag: ['@journey-offline', '@surface-app', '@story-210'] },
  async ({ page, context }) => {
    test.setTimeout(60_000);
    // Given: the seed card-text (<run> in its titles); the owner reads the feed once online, keeps the card texts
    // of A and B and bookmarks both (prerequisite 51, the bookmark control)
    const run = runMarker();
    const manifest = seed('card-text', run);
    expect(Array.isArray(manifest.ids) && (manifest.ids as unknown[]).length === 3, 'the manifest names the ids of A, B and C').toBe(true);
    await page.goto('/');
    const titles = [`${run}-card-1`, `${run}-card-2`];
    const online: string[] = [];
    for (const title of titles) {
      const item = await itemWithTitle(page, title, 'prerequisite (45, the feed)');
      const card = await readCard(item, `the online card of ${title}`);
      expect(card.trim(), `the online card of ${title} is not empty`).not.toBe('');
      online.push(card);
      await expect(item.getByTestId('feed-item-bookmark'), 'prerequisite (51): the bookmark control').toHaveAttribute('aria-pressed', 'false');
      await item.getByTestId('feed-item-bookmark').tap();
      await expect(item.getByTestId('feed-item-bookmark')).toHaveAttribute('aria-pressed', 'true');
    }
    // the service worker controls the page before the network goes (owner decision 2026-11-07)
    await page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated');
    await context.setOffline(true);
    await reopen(page, 'prerequisite (4): the app reopens offline from its cache');
    await expect(page.getByTestId('offline-banner'), 'Given: the Offline banner').toBeVisible();

    // When: the reader reads the feed from the kept copy
    // Then: each card shows the online text
    for (const [index, title] of titles.entries()) {
      const cached = await itemWithTitle(page, title, 'Then: the kept feed');
      await expect(cached.getByTestId('feed-item-summary'), `the kept card of ${title}`).toHaveText(online[index]);
    }

    // When: the reader opens Bookmarks
    // Then: each bookmarked card shows the online text
    await expect(page.getByTestId('nav-bookmarks'), 'prerequisite (51): the Bookmarks tab').toBeVisible();
    await page.getByTestId('nav-bookmarks').tap();
    for (const [index, title] of titles.entries()) {
      const saved = await itemWithTitle(page.getByTestId('bookmarks-list'), title, 'Then: Bookmarks');
      await expect(saved.getByTestId('feed-item-summary'), `the bookmarked card of ${title}`).toHaveText(online[index]);
    }
  },
);
