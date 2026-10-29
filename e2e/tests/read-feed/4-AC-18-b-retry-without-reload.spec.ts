// AC-18b (scenario, @surface-app, project iphone): story 4, coverage.md row AC-18 b.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-18; the Given/When/Then is the owning story's row AC-18b.
// Given cached items and a data interface that refuses connections, when it is back and the owner taps retry,
// then the feed shows without a page reload.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';
import { dataUrl } from '../../support/data';

test(
  'AC-18b: when the data interface is back, retry shows the feed without a page reload',
  { tag: ['@journey-read-feed', '@surface-app', '@story-4'] },
  async ({ page }) => {
    // Given: cached items and a data interface that refuses connections, the Error state shown
    // (prerequisite: the 45 feed); the route counts what it refuses and, after it is lifted,
    // the scenario counts the data requests that reach the interface
    const run = runMarker();
    seed('AC-18b', run);
    await page.goto('/');
    await itemWithTitle(page, run, 'prerequisite (45, the feed)');
    const pattern = `${dataUrl()}/**`;
    let refused = 0;
    await page.route(pattern, (route) => {
      refused += 1;
      return route.abort('connectionrefused');
    });
    await page.reload();
    await expect(page.getByTestId('retry'), 'first unmet step (4): the retry control').toBeVisible();
    await expect.poll(() => refused, { message: 'the reload reached the refusing route' }).toBeGreaterThan(0);
    let loads = 0;
    page.on('load', () => {
      loads += 1;
    });
    let answered = 0;
    page.on('requestfinished', (req) => {
      if (req.url().startsWith(dataUrl())) answered += 1;
    });

    // When: the data interface is back and the owner taps retry
    await page.unroute(pattern);
    await page.getByTestId('retry').tap();

    // Then: the feed shows from the interface without a page reload
    await expect(page.getByTestId('error-state')).toBeHidden();
    await expect.poll(() => answered, { message: 'the retry reached the data interface' }).toBeGreaterThan(0);
    await itemWithTitle(page, run, 'Then');
    expect(loads, 'page loads after the retry').toBe(0);
  },
);
