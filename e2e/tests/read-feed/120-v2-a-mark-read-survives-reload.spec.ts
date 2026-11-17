// v2-a (scenario, @surface-app, project iphone): the Radarnik v2 proposal (priitkustala/ai-news#120), read marks.
// Source: the mockup and proposal comment on #120 (every story has Mark read / ✓ Read at its top right, an unread
// story shows a blue dot before its title, the mark changes only on a tap) and the owner decision of 2026-11-17
// recorded there that marking is tap-only. Not yet an approved story: written with the draft pull request.
// Given a seeded item, when the owner taps its read pill, reloads and taps it again, then the pill reads Read
// (pressed) and the dot is hidden after the first tap and after the reload, and reads Mark read with the dot shown
// after the second tap; the item's title is unchanged throughout.
import { test, expect } from '../../support/session';
import { runMarker } from '../../support/env';
import { seed } from '../../support/job';
import { itemWithTitle } from '../../support/feed';

test(
  'v2-a: a story marked read keeps the mark after reload, and a second tap marks it unread',
  { tag: ['@journey-read-feed', '@surface-app', '@story-120'] },
  async ({ page }) => {
    // Given: a seeded item (<run> in its title) in the feed
    const run = runMarker();
    seed('AC-15a', run);
    await page.goto('/');
    const item = await itemWithTitle(page, run, 'prerequisite (45, the feed)');
    const pill = item.getByTestId('feed-item-read');
    const dot = item.getByTestId('feed-item-unread');
    await expect(pill, 'first unmet step (120): the read pill, unpressed').toHaveAttribute('aria-pressed', 'false');
    await expect(pill).toHaveText('Mark read');
    await expect(dot).toBeVisible();
    const title = await item.getByTestId('feed-item-title').textContent();

    // When: the owner taps the read pill
    await pill.tap();

    // Then: Read, pressed, no dot
    await expect(pill).toHaveAttribute('aria-pressed', 'true');
    await expect(pill).toHaveText('Read');
    await expect(dot).toBeHidden();

    // When: the page is reloaded
    await page.reload();
    const again = await itemWithTitle(page, run, 'Then');

    // Then: the mark is kept on the device
    await expect(again.getByTestId('feed-item-read')).toHaveAttribute('aria-pressed', 'true');
    await expect(again.getByTestId('feed-item-unread')).toBeHidden();

    // When: the owner taps it again
    await again.getByTestId('feed-item-read').tap();

    // Then: Mark read, unpressed, the dot back, the title unchanged
    await expect(again.getByTestId('feed-item-read')).toHaveAttribute('aria-pressed', 'false');
    await expect(again.getByTestId('feed-item-read')).toHaveText('Mark read');
    await expect(again.getByTestId('feed-item-unread')).toBeVisible();
    await expect(again.getByTestId('feed-item-title')).toHaveText(title ?? '');
  },
);
