// AC-23b (scenario, @surface-app, project iphone): story 3, coverage.md row AC-23 b.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-23; the Given/When/Then is the owning story's row AC-23b.
// Given the client served on localhost, when the page loads, then the service worker registers (localhost is
// a secure context).
import { test, expect } from '@playwright/test';

test(
  'AC-23b: the service worker registers on localhost',
  { tag: ['@journey-install', '@surface-app', '@story-3'] },
  async ({ page }) => {
    // Given: the client served on localhost (a secure context)
    // When: the page loads
    await page.goto('/');

    // Then: the service worker registers
    await expect
      .poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length))
      .toBeGreaterThan(0);
  },
);
