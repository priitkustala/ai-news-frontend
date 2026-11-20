// AC-18c (scenario, @surface-app, project iphone): story 4, the edge case of priitkustala/ai-news-frontend#81
// (CQ-D1), criterion AC-4: a first read that fails with no kept copy still shows the Error state over the
// failure text. Written before the feed screen's reading moved into src/feed/data.ts, so that it holds the
// behaviour of today.
// Given no kept copy of the feed and a data interface that refuses connections, when the owner opens the app
// online, then the Error state with a retry control shows over the failure text, with no item.
import { test, expect } from '../../support/session';
import { dataUrl } from '../../support/data';

// The refusing route must see the data requests: with the client's service worker in control,
// WebKit's requests bypass page.route (S-09 finding B2).
test.use({ serviceWorkers: 'block' });

test(
  'AC-18c: with no kept copy and the data interface refusing connections the Error state shows over the failure text',
  { tag: ['@journey-read-feed', '@surface-app', '@story-4'] },
  async ({ page }) => {
    // Given: the feed opened once and its first read answered, then the kept copy removed, and a
    // data interface that refuses connections; the route counts the requests it refuses, so a
    // request a service worker answers cannot pass for a refused one
    await page.goto('/');
    await expect(page.getByTestId('feed-list')).not.toHaveAttribute('aria-busy', 'true');
    await page.evaluate(() => localStorage.removeItem('ai-news-offline-feed'));
    let refused = 0;
    await page.route(`${dataUrl()}/**`, (route) => {
      refused += 1;
      return route.abort('connectionrefused');
    });

    // When: the owner opens the app online
    await page.reload();

    // Then: the Error state with a retry control shows over the failure text, with no item
    await expect(page.getByTestId('error-state'), 'the Error state').toBeVisible();
    await expect(page.getByTestId('retry')).toBeVisible();
    await expect(page.getByText('The headlines could not be loaded.')).toBeVisible();
    await expect(page.getByTestId('feed-item')).toHaveCount(0);
    await expect.poll(() => refused, { message: 'the reload reached the refusing route' }).toBeGreaterThan(0);
  },
);
