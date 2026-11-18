// AC-1 to AC-4 (scenario, @surface-app, projects iphone and laptop): bug priitkustala/ai-news-frontend#89.
// Source: the item's criteria. AC-1: this scenario fails on main at a root text size of 20 px. AC-2: at the
// root text sizes 16, 20, 24 and 32 px no source line, title or summary of a compact feed-item starts less
// than 11 px after the right edge of its image slot (the 12 px gap of the design, 1 px tolerance). AC-3: at
// 16 px the compact slot stays 88 by 88 and the title starts 12 px after it. AC-4: a placeholder label set to
// 20 px does not widen the slot or push it into the text.
// The cause, read from the code: compactLayout (src/feed/index.ts) fixes the slot's grid column at 88 px,
// while the slot and its placeholder (src/feed/image.ts) are size-22, 5.5rem; at a larger root text size the
// slot outgrows its column and, painted after the text, covers the first letters of each text row.
// Given a visitor on / with the feed shown and every image slot settled, when the root text size is 16, 20,
// 24 and 32 px in turn (and at 20 px the placeholder labels are set to 20 px), then every text box of a
// compact item starts at least 11 px after its slot's right edge, and at 16 px the slot is 88 by 88 with
// the title 12 px after it.
// Read only, no seed and no sign-in: it also runs against the live site after the release.
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const TEXT_IDS = ['feed-item-source', 'feed-item-community', 'feed-item-title', 'feed-item-summary'];
const COMPACT_STATES = ['placeholder', 'pending', 'failed'];

interface Measure {
  slot: { width: number; height: number };
  titleGap: number;
  minGap: number;
  worst: { testId: string; item: number; gap: number };
}

// Measures every compact feed-item: the gap from its slot's right edge to the left edge of each text box.
async function measure(page: Page): Promise<Measure | null> {
  return page.evaluate(
    ({ textIds, compactStates }) => {
      let first: { slot: { width: number; height: number }; titleGap: number } | null = null;
      let worst: { testId: string; item: number; gap: number } | null = null;
      const items = Array.from(document.querySelectorAll('[data-testid="feed-item"]'));
      for (const [index, item] of items.entries()) {
        const slot = item.querySelector('[data-testid="feed-item-image-slot"]');
        if (!slot || !compactStates.includes(slot.getAttribute('data-image-state') ?? '')) continue;
        const slotBox = slot.getBoundingClientRect();
        const right = slotBox.x + slotBox.width;
        for (const testId of textIds) {
          const text = item.querySelector(`[data-testid="${testId}"]`);
          if (!text) continue;
          const gap = text.getBoundingClientRect().x - right;
          if (!worst || gap < worst.gap) worst = { testId, item: index, gap };
          if (!first && testId === 'feed-item-title') first = { slot: { width: slotBox.width, height: slotBox.height }, titleGap: gap };
        }
      }
      if (!first || !worst) return null;
      return { slot: first.slot, titleGap: first.titleGap, minGap: worst.gap, worst };
    },
    { textIds: TEXT_IDS, compactStates: COMPACT_STATES },
  );
}

const round = (value: number): string => value.toFixed(1);

// The whole check, shared by the two projects.
async function placeholderNeverCoversText(page: Page): Promise<void> {
  const project = test.info().project.name;

  // Given: a visitor on / with the feed shown and no image slot still pending
  await page.goto('/');
  await expect(page.getByTestId('feed-item').first()).toBeVisible();
  const slots = page.getByTestId('feed-item-image-slot');
  await expect
    .poll(() => slots.evaluateAll((nodes) => nodes.filter((node) => node.getAttribute('data-image-state') === 'pending').length), {
      message: 'prerequisite: every image slot has settled',
    })
    .toBe(0);
  const compact = await slots.evaluateAll(
    (nodes, states) => nodes.filter((node) => states.includes(node.getAttribute('data-image-state') ?? '')).length,
    COMPACT_STATES,
  );
  expect(compact, 'prerequisite: at least one compact image slot (placeholder, pending or failed)').toBeGreaterThanOrEqual(1);

  try {
    for (const size of [16, 20, 24, 32]) {
      // When: the root text size is set
      await page.evaluate((px) => {
        document.documentElement.style.fontSize = `${px}px`;
      }, size);
      const measured = await measure(page);
      expect(measured, `root ${size} px: a compact feed-item with a title is measured`).not.toBeNull();
      const m = measured!;
      console.log(
        `89 MEASURE ${project} root ${size} px: slot ${round(m.slot.width)}x${round(m.slot.height)}, gap to title ${round(m.titleGap)} px, min gap ${round(m.minGap)} px`,
      );

      // Then: no text box starts less than 11 px after its slot's right edge
      expect(
        m.minGap,
        `root ${size} px: ${m.worst.testId} of item ${m.worst.item} starts ${round(m.worst.gap)} px after the slot right edge`,
      ).toBeGreaterThanOrEqual(11);

      // Then: at the default size the slot is 88 by 88 and the title starts 12 px after it
      if (size === 16) {
        expect(Math.abs(m.slot.width - 88), `root 16 px: the compact slot is 88 px wide (±1), is ${round(m.slot.width)}`).toBeLessThanOrEqual(1);
        expect(Math.abs(m.slot.height - 88), `root 16 px: the compact slot is 88 px high (±1), is ${round(m.slot.height)}`).toBeLessThanOrEqual(1);
        expect(Math.abs(m.titleGap - 12), `root 16 px: the title starts 12 px after the slot (±1), is ${round(m.titleGap)}`).toBeLessThanOrEqual(1);
      }

      // Then: at 20 px a 20 px placeholder label neither widens the slot nor pushes it into the text
      if (size === 20) {
        await page.getByTestId('feed-item-placeholder-source').evaluateAll((nodes) => {
          for (const node of nodes) (node as HTMLElement).style.fontSize = '20px';
        });
        const labelled = await measure(page);
        expect(labelled, 'root 20 px, label 20 px: a compact feed-item with a title is measured').not.toBeNull();
        const l = labelled!;
        expect(
          Math.abs(l.slot.width - m.slot.width),
          `root 20 px, label 20 px: the compact slot keeps its width ${round(m.slot.width)} (±1), is ${round(l.slot.width)}`,
        ).toBeLessThanOrEqual(1);
        expect(
          l.minGap,
          `root 20 px, label 20 px: ${l.worst.testId} of item ${l.worst.item} starts ${round(l.worst.gap)} px after the slot right edge`,
        ).toBeGreaterThanOrEqual(11);
        await page.getByTestId('feed-item-placeholder-source').evaluateAll((nodes) => {
          for (const node of nodes) (node as HTMLElement).style.fontSize = '';
        });
      }
    }
  } finally {
    // Last: the root text size back to empty
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '';
    });
  }
}

test(
  '89-AC-1: the compact placeholder never covers the text of its feed-item, iPhone',
  { tag: ['@journey-read-feed', '@surface-app', '@bug-89'] },
  async ({ page }) => {
    await placeholderNeverCoversText(page);
  },
);

test(
  '89-AC-1: the compact placeholder never covers the text of its feed-item, laptop',
  { tag: ['@journey-read-feed', '@surface-app', '@bug-89', '@viewport-laptop'] },
  async ({ page }) => {
    await placeholderNeverCoversText(page);
  },
);
