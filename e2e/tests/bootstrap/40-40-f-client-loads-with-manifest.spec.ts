// 40f (bootstrap, @surface-app, project iphone): the environment bootstrap story (#40), coverage.md row 40 f.
// Source: LOCKED specification SHA-256 d32043642ac985b907e6ccb80e8d1fc4868ae3c526c2453ccace6517a3dac890,
// section Local test environment (bootstrap checks).
// Given the built client served on localhost, when the page is opened in Playwright's iPhone profile, then
// the client page loads at iPhone size with its manifest.
import { test, expect } from '@playwright/test';
import { devices } from '@playwright/test';
import { fetchManifest } from '../../support/platform';

test(
  '40f: the client page loads at iPhone size with its manifest',
  { tag: ['@journey-bootstrap', '@surface-app', '@story-40'] },
  async ({ page, request }) => {
    // Given: the built client served on localhost (E2E_BASE_URL)
    // When: the page is opened in Playwright's iPhone profile
    const response = await page.goto('/');

    // Then: the client page loads at iPhone size with its manifest
    expect(response?.ok(), 'the page loads').toBe(true);
    expect(page.viewportSize()).toEqual(devices['iPhone 15'].viewport);
    const manifest = await fetchManifest(request);
    expect(manifest.href, 'the page links a web app manifest').toBeTruthy();
    expect(manifest.status).toBe(200);
    expect(manifest.body, 'the manifest is a JSON object').toBeDefined();
  },
);
