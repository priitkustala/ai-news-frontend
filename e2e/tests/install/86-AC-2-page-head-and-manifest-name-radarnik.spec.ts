// AC-2 (scenario, @surface-app, project iphone): priitkustala/ai-news-frontend#86 (RN-1), row AC-2.
// Source: the item criterion AC-2; the owner decision of 2026-11-17 to launch as Radarnik, with the name as text.
// Given the built client served on localhost, when the visitor opens / and the page head and the manifest are
// read, then the page title is Radarnik, the meta apple-mobile-web-app-title has the content Radarnik, and the
// manifest name and short_name are both Radarnik.
import { test, expect } from '@playwright/test';
import { fetchManifest } from '../../support/platform';

test(
  'AC-2: the page title, the Home Screen title and the manifest name read Radarnik',
  { tag: ['@journey-install', '@surface-app', '@story-86'] },
  async ({ page, request }) => {
    // Given: the built client served on localhost
    // When: the visitor opens / and the page head and the manifest are read
    const response = await page.goto('/');
    expect(response?.ok(), 'the page loads').toBe(true);
    const manifest = await fetchManifest(request);

    // Then: the page title, the Home Screen title and the manifest name and short_name read Radarnik
    await expect(page, 'the page title').toHaveTitle('Radarnik');
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]'), 'the Home Screen title').toHaveAttribute('content', 'Radarnik');
    expect(manifest.status, 'the manifest is served').toBe(200);
    expect(manifest.body?.name, 'the manifest name').toBe('Radarnik');
    expect(manifest.body?.short_name, 'the manifest short_name').toBe('Radarnik');
  },
);
