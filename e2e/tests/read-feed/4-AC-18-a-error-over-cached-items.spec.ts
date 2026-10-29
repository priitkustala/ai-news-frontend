// AC-18a (scenario, @surface-app, project iphone): story 4, coverage.md row AC-18 a.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-18; the Given/When/Then is the owning story's row AC-18a.
// Given cached items and a data interface that refuses connections, when the owner opens the app online, then
// the Error state with a retry control shows over the cached items.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';
import { dataUrl } from '../../support/data';

test(
  'AC-18a: with the data interface refusing connections the Error state with retry shows over cached items',
  { tag: ['@journey-read-feed', '@surface-app', '@story-4'] },
  async ({ page }) => {
    // Given: cached items (the feed opened once; prerequisite: the 45 feed) and a data
    // interface that refuses connections; the route counts the requests it refuses, so a
    // request a service worker answers cannot pass for a refused one (round 19, UNVERIFIED 5)
    const run = runMarker();
    seed('AC-18a', run);
    await page.goto('/');
    await itemWithTitle(page, run, 'prerequisite (45, the feed)');
    let refused = 0;
    await page.route(`${dataUrl()}/**`, (route) => {
      refused += 1;
      return route.abort('connectionrefused');
    });

    // When: the owner opens the app online
    await page.reload();

    // Then: the Error state with a retry control shows over the cached items
    await expect(page.getByTestId('error-state'), 'first unmet step (4): the Error state').toBeVisible();
    await expect.poll(() => refused, { message: 'the reload reached the refusing route' }).toBeGreaterThan(0);
    await expect(page.getByTestId('retry')).toBeVisible();
    await itemWithTitle(page, run, 'Then: the cached item');
  },
);
