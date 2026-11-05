// AC-12 (scenario, @surface-app, project iphone): story 1, evaluation finding F-S10-1 of round 1
// (SERIOUS, ACCEPT-FIX), reproduced before its repair (regression contract, Test integrity 2).
// Given the owner reading a seeded item in the article view, opened from a scrolled feed, when the
// auth library confirms the same session again (the tab becomes visible: SIGNED_IN for the stored
// session), then the same article view stays shown, and its back control returns to the same feed
// at the same scroll position without a second read of the data interface.
import { test, expect } from '../../support/session';
import { requireEnv, runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

test(
  'AC-12: the article view and the feed behind it survive a same-session auth notification',
  { tag: ['@journey-open-article', '@surface-app', '@story-1'] },
  async ({ page }) => {
    // Given: the seeded feed (an item with <run> in its title among the base seed's), scrolled
    // to a known position halfway down, and the first headline wholly in view there opened; its
    // title, read as data from the feed, is the article's expected title
    const run = runMarker();
    seed('AC-12', run);
    const dataUrl = requireEnv('E2E_DATA_URL', 'the published data interface');
    await page.goto('/');
    await itemWithTitle(page, run, 'prerequisite (45, the feed)');
    const titles = page.getByTestId('feed-item').getByTestId('feed-item-title');
    const { known, index } = await titles.evaluateAll((nodes) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: Math.round(max / 2), behavior: 'instant' });
      const inView = nodes.findIndex((node) => {
        const box = node.getBoundingClientRect();
        return box.top >= 0 && box.bottom <= window.innerHeight;
      });
      return { known: window.scrollY, index: inView };
    });
    expect(known, 'prerequisite: the feed is scrolled away from its top').toBeGreaterThan(0);
    expect(index, 'prerequisite: a headline is in view at the known position').toBeGreaterThanOrEqual(0);
    const title = titles.nth(index);
    const expectedTitle = (await title.textContent())?.trim() ?? '';
    const dataReads: string[] = [];
    page.on('request', (request) => {
      if (request.url().startsWith(dataUrl)) dataReads.push(request.url());
    });
    await title.tap();
    const view = page.getByTestId('article-view');
    await expect(view, 'prerequisite (1, the article view)').toBeVisible();
    await expect(view.getByTestId('article-title')).toHaveText(expectedTitle);

    // When: the tab becomes visible again, as on the return from the publisher's page. The
    // document's own visibilitychange (it bubbles to window, where the auth library listens)
    // makes the library recover the stored session and notify its subscribers with SIGNED_IN;
    // the library's cross-tab channel (named by the session's storage key) carries the same
    // event, so the scenario waits for it, then for one more turn of the page's timers, by
    // which the app's own callback has run
    const event = await page.evaluate(async () => {
      const key = Object.keys(localStorage).find((name) => /^sb-.+-auth-token$/.test(name));
      if (!key) return 'no stored session';
      const channel = new BroadcastChannel(key);
      const heard = new Promise<string>((resolve) => {
        channel.onmessage = (message) => {
          if (message.data?.event === 'SIGNED_IN') resolve('SIGNED_IN');
        };
        setTimeout(() => resolve('no notification'), 10_000);
      });
      document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
      const result = await heard;
      channel.close();
      await new Promise((resolve) => setTimeout(resolve, 0));
      return result;
    });
    expect(event, 'prerequisite: the auth library notified the same session').toBe('SIGNED_IN');

    // Then: the same article view is still shown, and its back control returns to the same
    // feed at the same position, with no second read of the data interface
    await expect(view, 'the article view stays after the notification').toBeVisible();
    await expect(view.getByTestId('article-title')).toHaveText(expectedTitle);
    await page.getByTestId('article-back').tap();
    await expect(view).toHaveCount(0);
    await expect(title, 'the feed is shown again').toBeVisible();
    await expect
      .poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - known), { message: 'the feed returns at its known position' })
      .toBeLessThanOrEqual(3);
    expect(dataReads, 'no second read of the data interface for the return').toEqual([]);
  },
);
