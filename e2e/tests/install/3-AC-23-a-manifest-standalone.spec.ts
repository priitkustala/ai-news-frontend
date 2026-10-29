// AC-23a (invariant, @surface-app, project iphone): story 3, coverage.md row AC-23 a.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// criterion AC-23; the Given/When/Then is the owning story's row AC-23a.
// Kind invariant (sprint-02.md section 2.3, amendment 01, AD-01): passes once #40 is built.
// Given the client served on localhost, when the page loads, then a manifest with display standalone is
// served.
import { test, expect } from '@playwright/test';
import { fetchManifest } from '../../support/platform';

test(
  'AC-23a: the served manifest has display standalone',
  { tag: ['@journey-install', '@surface-app', '@story-3'] },
  async ({ page, request }) => {
    // Given: the client served on localhost
    // When: the page loads
    const response = await page.goto('/');
    expect(response?.ok(), 'the page loads').toBe(true);
    const manifest = await fetchManifest(request);

    // Then: a manifest with display standalone is served
    expect(manifest.href, 'the page links a web app manifest').toBeTruthy();
    expect(manifest.status).toBe(200);
    expect(manifest.body?.display).toBe('standalone');
  },
);
