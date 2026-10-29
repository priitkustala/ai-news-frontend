// AC-16b (scenario, @surface-app, project iphone): story 4, coverage.md row AC-16 b.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-16; the Given/When/Then is the owning story's row AC-16b.
// Given the owner opened the feed and bookmarked an item while online, when Playwright's offline emulation is
// switched on and the page is reopened, then non-licensed image slots show the placeholder.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle, reopen } from '../../support/feed';

test(
  'AC-16b: offline every non-licensed image slot shows the placeholder',
  { tag: ['@journey-offline', '@surface-app', '@story-4'] },
  async ({ page, context }) => {
    // Given: the owner opened the feed and bookmarked an item (<run> in its title) while online
    // (prerequisites: the 45 feed, the 46 image slots, the 51 bookmark control); the
    // seeded items include licensed, owner-accepted hotlink and placeholder sources, and the
    // manifest counts the items and the non-licensed ones
    const run = runMarker();
    const manifest = seed('AC-16b', run);
    const total = Number(manifest.item_count);
    const nonLicensed = Number(manifest.non_licensed_count);
    expect(nonLicensed, 'prerequisite: non-licensed items are seeded').toBeGreaterThan(0);
    await page.goto('/');
    const item = await itemWithTitle(page, run, 'prerequisite (45, the feed)');
    await expect(item.getByTestId('feed-item-bookmark'), 'prerequisite (51): the bookmark control').toHaveAttribute('aria-pressed', 'false');
    await item.getByTestId('feed-item-bookmark').tap();
    await expect(item.getByTestId('feed-item-bookmark')).toHaveAttribute('aria-pressed', 'true');

    // When: offline emulation is switched on and the page is reopened; reopening offline is
    // 4's own first observable (its cache), asserted so that a missing cache fails here on an
    // assertion and never in a rejected navigation (round 20 R20-2)
    await context.setOffline(true);
    await reopen(page, 'first unmet step (4): the app reopens offline from its cache');

    // Then: every non-licensed image slot shows the placeholder, counted against the manifest.
    // The policy of every slot is waited on until each slot carries one and the non-licensed
    // count is the manifest's (round 20 R20-5), never read from one sample
    await expect(page.getByTestId('offline-banner'), 'Then: the Offline banner').toBeVisible();
    const items = page.getByTestId('feed-item');
    await expect(items).toHaveCount(total);
    const policies = async () => Promise.all(
      // a slot not yet present counts as unset for this sample instead of blocking the poll
      Array.from({ length: total }, (_, i) => items.nth(i).getByTestId('feed-item-image-slot')
        .getAttribute('data-image-policy', { timeout: 1_000 }).catch(() => null)),
    );
    let settled: (string | null)[] = [];
    await expect
      .poll(async () => {
        settled = await policies();
        return { unset: settled.filter((p) => !p).length, nonLicensed: settled.filter((p) => p && p !== 'licensed').length };
      }, { message: 'every image slot carries its policy and the non-licensed slots are the manifest\'s' })
      .toEqual({ unset: 0, nonLicensed });
    for (let i = 0; i < total; i += 1) {
      if (settled[i] !== 'licensed') {
        await expect(items.nth(i).getByTestId('feed-item-placeholder'), `the non-licensed slot ${i} shows the placeholder`).toBeVisible();
      }
    }
  },
);
