// AC-1 (scenario, @surface-app, project iphone): story S-21b (priitkustala/ai-news-frontend#44), row AC-1.
// Source: the item's criterion AC-1 and the accepted settlement of S-21b (The open points, settled: the guest
// screen); the data side is S-21a (ai-news-backend#47: news readable by anyone).
// Given a browser with no stored session and a seeded item, when the visitor opens the app, then the feed shows
// the seeded item (more than 0 feed-item in feed-list) and no sign-in form is on the feed screen.
// Changed by priitkustala/ai-news-frontend#69 (HB-1, the owner decision of 2026-11-16: bookmarks are hidden from
// visitors until accounts can be created). Old Then: the Feed and Bookmarks tabs show. New Then: no tab bar
// (no nav-feed, no nav-bookmarks), no bookmark control and no sign-in form, the app bar titled Radarnik; and the
// same holds in the article view the visitor opens from the feed.
import { test, expect } from '@playwright/test';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

test(
  's-21b-AC-1: a visitor with no session reads the feed, with no sign-in form, and sees no tab bar',
  { tag: ['@journey-read-feed', '@surface-app', '@story-44', '@story-69'] },
  async ({ page }) => {
    // Given: a seeded item (<run> in its title); the browser holds no stored session
    const run = runMarker();
    seed('AC-12', run);

    // When: the visitor opens the app
    await page.goto('/');

    // Then: the feed shows the seeded item, no sign-in form, and no tab bar
    const list = page.getByTestId('feed-list');
    await expect(list, 'first unmet step (s-21b): the guest feed').toBeVisible();
    const item = await itemWithTitle(list, run, 'first unmet step (s-21b): the seeded item on the guest feed');
    expect(await list.getByTestId('feed-item').count(), 'feed-item rows in feed-list').toBeGreaterThan(0);
    await expect(page.getByTestId('sign-in-form')).toHaveCount(0);
    await expect(page.getByTestId('nav-bookmarks'), 'first unmet step (69): no Bookmarks tab for a visitor').toHaveCount(0);
    await expect(page.getByTestId('nav-feed')).toHaveCount(0);
    await expect(page.getByTestId('feed-item-bookmark')).toHaveCount(0);
    await expect(page.getByTestId('sign-in-form')).toHaveCount(0);
    await expect(page.locator('header h1')).toHaveText('Radarnik');

    // When: the visitor opens the seeded item's article view
    await item.getByTestId('feed-item-title').tap();

    // Then: the article view shows, with no tab bar, no bookmark control and no sign-in form
    await expect(page.getByTestId('article-view'), 'the article view opens for a visitor').toBeVisible();
    await expect(page.getByTestId('nav-bookmarks')).toHaveCount(0);
    await expect(page.getByTestId('nav-feed')).toHaveCount(0);
    await expect(page.getByTestId('feed-item-bookmark')).toHaveCount(0);
    await expect(page.getByTestId('sign-in-form')).toHaveCount(0);
  },
);
