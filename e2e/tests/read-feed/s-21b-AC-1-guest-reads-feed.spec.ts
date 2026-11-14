// AC-1 (scenario, @surface-app, project iphone): story S-21b (priitkustala/ai-news-frontend#44), row AC-1.
// Source: the item's criterion AC-1 and the accepted settlement of S-21b (The open points, settled: the guest
// screen); the data side is S-21a (ai-news-backend#47: news readable by anyone).
// Given a browser with no stored session and a seeded item, when the visitor opens the app, then the feed shows
// the seeded item (more than 0 feed-item in feed-list), no sign-in form is on the feed screen, and the Feed and
// Bookmarks tabs show.
import { test, expect } from '@playwright/test';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

test(
  's-21b-AC-1: a visitor with no session reads the feed, with no sign-in form',
  { tag: ['@journey-read-feed', '@surface-app', '@story-s-21b'] },
  async ({ page }) => {
    // Given: a seeded item (<run> in its title); the browser holds no stored session
    const run = runMarker();
    seed('AC-12', run);

    // When: the visitor opens the app
    await page.goto('/');

    // Then: the feed shows the seeded item, no sign-in form, and the tab bar
    const list = page.getByTestId('feed-list');
    await expect(list, 'first unmet step (s-21b): the guest feed').toBeVisible();
    await itemWithTitle(list, run, 'first unmet step (s-21b): the seeded item on the guest feed');
    expect(await list.getByTestId('feed-item').count(), 'feed-item rows in feed-list').toBeGreaterThan(0);
    await expect(page.getByTestId('sign-in-form')).toHaveCount(0);
    await expect(page.getByTestId('nav-feed')).toBeVisible();
    await expect(page.getByTestId('nav-bookmarks')).toBeVisible();
  },
);
