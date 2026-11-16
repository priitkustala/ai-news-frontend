// AC-5 (scenario, @surface-app, project iphone): priitkustala/ai-news-frontend#65 (HS-1), the Home Screen icon.
// Source: the item criterion AC-5 and Scope 4; settlement 95 point 5.1.
// Given the built client served on localhost, when the head touch icon link and the manifest icons are read, then
// each answers 200 with an image/png content type, and the manifest lists at least one icon.
import { test, expect } from '@playwright/test';
import { fetchManifest } from '../../support/platform';

test(
  'AC-5: the touch icon and the manifest icons are served as PNG files',
  { tag: ['@journey-install', '@surface-app', '@story-65'] },
  async ({ request }) => {
    // Given: the built client served on localhost
    const html = await (await request.get('/')).text();

    // When: the head touch icon link and the manifest icons are read
    const link = (html.match(/<link\b[^>]*>/gi) ?? []).find((tag) => /\brel=[\x22\x27]?apple-touch-icon[\x22\x27]?/i.test(tag));
    const href = link?.match(/\bhref=[\x22\x27]([^\x22\x27]+)[\x22\x27]/i)?.[1];
    const manifest = await fetchManifest(request);
    const listed = manifest.body?.icons;
    const icons = Array.isArray(listed) ? (listed as Array<{ src?: unknown }>) : [];

    // Then: the touch icon answers 200 with image/png
    expect(href, 'the page head links an Apple touch icon').toBeTruthy();
    const touch = await request.get(href as string);
    expect(touch.status()).toBe(200);
    expect(touch.headers()['content-type']).toMatch(/^image\/png/);

    // And: the manifest lists at least one icon, each answering 200 with image/png
    expect(manifest.status).toBe(200);
    expect(icons.length, 'the manifest lists at least one icon').toBeGreaterThan(0);
    for (const icon of icons) {
      expect(typeof icon.src, 'each manifest icon has a src').toBe('string');
      const response = await request.get(icon.src as string);
      expect(response.status(), String(icon.src)).toBe(200);
      expect(response.headers()['content-type']).toMatch(/^image\/png/);
    }
  },
);
