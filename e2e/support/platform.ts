// Emulation of what only the device provides, used where a criterion asks for it
// (Locked, Local test environment: "notification permission uses emulated permissions
// (logic only)"). It is not the device: the real check is the named manual step M7a.
import type { APIRequestContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';

// The Home Screen web app context, where B-14 places the subscribe control. iOS Safari
// reports it as navigator.standalone (UNVERIFIED; check: read Apple's Safari web app
// documentation at 50's Brief and confirm the client's detection in its scoped run).
export async function emulateHomeScreen(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'standalone', { configurable: true, get: () => true });
  });
}

// Notification permission and Web Push, emulated deterministically for the AC-14 Givens
// (round 19 F6). Playwright's WebKit turns the Notification and Push APIs off for a mobile
// profile (pinned playwright-core 1.62.1 as installed from the lockfile, lib/coreBundle.js:
// Page.overrideSetting NotificationsEnabled and PushAPIEnabled set to !contextOptions.isMobile;
// pull-requests.md, UNVERIFIED 5), so a
// browser permission grant alone cannot supply them on the iphone project. Before the page's
// own scripts run, this defines window.Notification with the given state (granted: the
// request resolves granted; refused: it resolves denied) and a PushManager on every service
// worker registration: granted, subscribe() resolves a subscription with a fixture endpoint
// carrying the run marker, keys whose getKey() bytes and toJSON() base64url strings agree,
// and getSubscription() returns it from then on; refused, subscribe() rejects with a
// NotAllowedError and no subscription is ever returned. The real client, the real data
// interface and the owner's session stay in place; only the device capability is emulated.
// What this does and does not prove on the pinned iphone project: pull-requests.md,
// UNVERIFIED 5 (round 20 R20-7, runs/ai-news-app/checks/platform-probe/).
export type PermissionState = 'granted' | 'refused';

export async function emulateNotifications(page: Page, state: PermissionState, run: string): Promise<void> {
  await page.addInitScript(
    ({ state: s, run: r }) => {
      const permission = s === 'granted' ? 'granted' : 'denied';
      class EmulatedNotification {
        static get permission(): string {
          return permission;
        }
        static requestPermission(): Promise<string> {
          return Promise.resolve(permission);
        }
      }
      Object.defineProperty(window, 'Notification', { configurable: true, value: EmulatedNotification });
      // Fixture key bytes (an uncompressed P-256 point is 65 bytes, an auth secret 16), derived
      // from the run marker so that two runs never share them; not a real key pair.
      const bytes = (n: number, seed: string): Uint8Array => Uint8Array.from({ length: n }, (_, i) => (seed.charCodeAt(i % seed.length) + i) % 256);
      const p256dh = bytes(65, `${r}-p256dh`);
      p256dh[0] = 4;
      const auth = bytes(16, `${r}-auth`);
      const base64url = (b: Uint8Array): string => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const endpoint = `https://fixtures.invalid/push/${r}`;
      let current: unknown = null;
      const subscription = {
        endpoint,
        expirationTime: null,
        options: { userVisibleOnly: true },
        toJSON: () => ({ endpoint, expirationTime: null, keys: { p256dh: base64url(p256dh), auth: base64url(auth) } }),
        getKey: (name: string) => (name === 'p256dh' ? p256dh.slice().buffer : name === 'auth' ? auth.slice().buffer : null),
        unsubscribe: () => {
          current = null;
          return Promise.resolve(true);
        },
      };
      const pushManager = {
        subscribe: () => {
          if (permission !== 'granted') return Promise.reject(new DOMException('Notification permission is denied', 'NotAllowedError'));
          current = subscription;
          return Promise.resolve(subscription);
        },
        getSubscription: () => Promise.resolve(current),
        permissionState: () => Promise.resolve(permission),
      };
      // The constructor the client feature-detects ('PushManager' in window); the calls go to pushManager.
      Object.defineProperty(window, 'PushManager', { configurable: true, value: class PushManager { static supportedContentEncodings = ['aes128gcm']; } });
      if (window.ServiceWorkerRegistration) {
        Object.defineProperty(window.ServiceWorkerRegistration.prototype, 'pushManager', { configurable: true, get: () => pushManager });
      }
    },
    { state, run },
  );
}

// Checks, in the loaded page, that the emulation is in place, so that a set-up error of the
// platform is reported as such and never as the feature's red assertion.
export async function expectEmulatedNotifications(page: Page, state: PermissionState): Promise<void> {
  const want = state === 'granted' ? 'granted' : 'denied';
  await expect
    .poll(() => page.evaluate(() => ('Notification' in window ? (window as unknown as { Notification: { permission: string } }).Notification.permission : 'absent')), {
      message: `prerequisite (platform emulation): Notification.permission is ${want}`,
    })
    .toBe(want);
  await expect
    .poll(() => page.evaluate(() => 'PushManager' in window), { message: 'prerequisite (platform emulation): PushManager is defined' })
    .toBe(true);
  // The path a conforming client takes to subscribe: a service worker registration carries
  // pushManager (round 20 R20-7). Without the platform's ServiceWorkerRegistration this fails
  // here as the platform's prerequisite, never as the feature's red assertion.
  await expect
    .poll(() => page.evaluate(() => typeof ServiceWorkerRegistration === 'function' && 'pushManager' in ServiceWorkerRegistration.prototype), {
      message: 'prerequisite (platform emulation): a service worker registration exposes pushManager',
    })
    .toBe(true);
}

// The web app manifest the served page links to, read over HTTP as a browser reads it.
export async function fetchManifest(
  request: APIRequestContext,
): Promise<{ href: string | undefined; status: number; body: Record<string, unknown> | undefined }> {
  const html = await (await request.get('/')).text();
  const link = (html.match(/<link\b[^>]*>/gi) ?? []).find((tag) => /\brel=["']?manifest["']?/i.test(tag));
  const href = link?.match(/\bhref=["']([^"']+)["']/i)?.[1];
  if (!href) {
    return { href: undefined, status: 0, body: undefined };
  }
  const response = await request.get(href);
  let body: Record<string, unknown> | undefined;
  try {
    const parsed: unknown = await response.json();
    body = parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    body = undefined;
  }
  return { href, status: response.status(), body };
}
