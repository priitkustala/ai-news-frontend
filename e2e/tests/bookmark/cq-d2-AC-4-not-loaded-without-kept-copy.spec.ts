// CQ-D2 AC-4 (scenario, @surface-app, project iphone): the edge case of priitkustala/ai-news-frontend#82
// (CQ-D2), criterion AC-4: with no kept copy and a failed read, the Bookmarks panel's not-loaded note still
// shows and is announced. Written before the panel's reading moved into src/bookmarks/data.ts, so that it
// holds the behaviour of today.
// Given the owner signed in, no kept copy of the bookmarks and a data interface that refuses connections,
// when the owner opens the Bookmarks tab, then the not-loaded note shows in the panel and is announced in the
// status message, with no item.
import { test, expect } from '../../support/session';
import { dataUrl } from '../../support/data';

// The refusing route must see the data requests: with the client's service worker in control,
// WebKit's requests bypass page.route (S-09 finding B2).
test.use({ serviceWorkers: 'block' });

test(
  'CQ-D2 AC-4: with no kept copy and the data interface refusing connections the Bookmarks panel shows and announces the not-loaded note',
  { tag: ['@journey-bookmark', '@surface-app', '@story-51'] },
  async ({ page }) => {
    // Given: the feed opened once and its first read answered, then the kept bookmark copy removed,
    // and a data interface that refuses connections; the route counts the requests it refuses, so a
    // request a service worker answers cannot pass for a refused one
    await page.goto('/');
    await expect(page.getByTestId('feed-list')).not.toHaveAttribute('aria-busy', 'true');
    await page.evaluate(() => localStorage.removeItem('ai-news-offline-bookmarks'));
    let refused = 0;
    await page.route(`${dataUrl()}/**`, (route) => {
      refused += 1;
      return route.abort('connectionrefused');
    });

    // When: the owner opens the Bookmarks tab
    await page.getByTestId('nav-bookmarks').tap();

    // Then: the not-loaded note shows in the panel and is announced, with no item
    const panel = page.getByTestId('bookmarks-list');
    await expect(panel, 'the not-loaded note').toContainText('Bookmarks could not be loaded.');
    await expect(page.getByTestId('status-message')).toHaveText('Bookmarks could not be loaded.');
    await expect(panel.getByTestId('feed-item')).toHaveCount(0);
    await expect.poll(() => refused, { message: 'the panel\'s reads reached the refusing route' }).toBeGreaterThan(0);
  },
);
