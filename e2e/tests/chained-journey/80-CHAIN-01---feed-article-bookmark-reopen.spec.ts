// CHAIN-01 (scenario, @surface-app, project iphone): owning item priitkustala/ai-news#80, Scope 2a.
// The one chained journey across the screens (owner question 2, option B): it stands outside the
// coverage matrix, carries no coverage row and runs in the full suite like every row.
// Given the seeded item of fixture set AC-12, when the owner opens its headline in the article view,
// opens the app again, bookmarks the item, reloads, opens Bookmarks and opens the same item there,
// then the article view shows its title. Each earlier step is a labelled prerequisite; only the last
// step is the Then.
// In the full run's classifier it reads against three items: its own (priitkustala/ai-news#80),
// ai-news-frontend#1 (the article view) and priitkustala/ai-news#51 (bookmarks).
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle, reopen } from '../../support/feed';

test(
  'CHAIN-01: an item opened in the article view, bookmarked and reopened from Bookmarks shows its title in the article view',
  { tag: ['@journey-chained', '@surface-app', '@story-80'] },
  async ({ page }) => {
    // Given: the seeded item of fixture set AC-12 (<run> in its title); the manifest names its
    // title, the oracle, independent of the screens under test
    const run = runMarker();
    const manifest = seed('AC-12', run);
    const title = String(manifest.title);
    await page.goto('/');
    const item = await itemWithTitle(page, run, 'prerequisite (45, the feed)');

    // The owner opens its headline: the article view shows the item's title
    await item.getByTestId('feed-item-title').tap();
    const opened = page.getByTestId('article-view');
    await expect(opened, 'prerequisite (1, the article view): the article view').toBeVisible();
    await expect(opened.getByTestId('article-title'), 'prerequisite (1, the article view): its title').toHaveText(title);

    // The app opened again at '/' (as AC-12 and the item's open assumption do), the same item found
    await page.goto('/');
    const again = await itemWithTitle(page, run, 'prerequisite (45, the feed after reopening)');

    // The owner bookmarks it on its row
    const control = again.getByTestId('feed-item-bookmark');
    await expect(control, 'prerequisite (51, the bookmark control): unpressed').toHaveAttribute('aria-pressed', 'false');
    await control.tap();
    await expect(control, 'prerequisite (51, the bookmark control): pressed').toHaveAttribute('aria-pressed', 'true');

    // A reload, then the Bookmarks tab and the same item in the bookmarks list
    await reopen(page, 'prerequisite (the reload)');
    const tab = page.getByTestId('nav-bookmarks');
    await expect(tab, 'prerequisite (51, the Bookmarks tab)').toBeVisible();
    await tab.tap();
    const saved = await itemWithTitle(page.getByTestId('bookmarks-list'), run, 'prerequisite (51, the bookmarks list)');

    // When: the owner opens that item there
    await saved.getByTestId('feed-item-title').tap();

    // Then: the article view shows its title
    const view = page.getByTestId('article-view');
    await expect(view, 'Then: the article view').toBeVisible();
    await expect(view.getByTestId('article-title'), 'Then: the article title').toHaveText(title);
  },
);
