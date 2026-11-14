// The two builds and the persistent browser profile of bug 45 (priitkustala/ai-news-frontend#45, SI-51):
// the client built once with a key the stack does not know (key A, as a stack that no longer exists
// would leave it) and once with the key as the environment holds it (key B). The run's own server
// reads dist/ from disk per request, so a build takes effect at once at the same address.
// Key A is composed at run time from parts and never printed, so that no file and no log holds the
// publishable prefix followed by a key character. No key, email or password is ever logged here.
import { devices, webkit, expect, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { repositoryRoot } from './env';

// Key A: invalid by design; it passes the build's and the client's prefix checks only.
function keyA(): string {
  return ['sb', 'publishable', 'si51', 'stale'].join('_');
}

// Key B: the key the environment holds (the orchestrator's feed puts it there).
function keyB(): string {
  const key = process.env.PUBLISHABLE_KEY;
  if (!key) throw new Error('PUBLISHABLE_KEY is not set in the environment of the run (the feed did not carry it).');
  return key;
}

function build(key: string | undefined, label: string): void {
  const env = { ...process.env };
  if (key !== undefined) env.PUBLISHABLE_KEY = key;
  const result = spawnSync('node', ['scripts/build.mjs'], { cwd: repositoryRoot(), env, encoding: 'utf8', timeout: 120_000 });
  if (result.error || result.status !== 0) {
    throw new Error(`The build ${label} failed (exit ${result.status}): ${(result.stderr ?? '').slice(0, 500)}`);
  }
}

export function buildWithKeyA(): void {
  build(keyA(), 'with key A');
}

export function buildWithKeyB(): void {
  build(undefined, 'with key B (the environment as it is)');
}

export function ownerCredentials(): { email: string; password: string } {
  const personas = JSON.parse(fs.readFileSync(path.join(repositoryRoot(), 'scripts', 'personas.json'), 'utf8'));
  return personas.owner;
}

// One persistent WebKit profile on a folder, in the scenarios' device profile, service workers allowed.
export async function launchProfile(testInfo: TestInfo, folder: string): Promise<BrowserContext> {
  const { defaultBrowserType: _ignored, ...device } = devices['iPhone 15'];
  void _ignored;
  return webkit.launchPersistentContext(folder, {
    ...device,
    baseURL: testInfo.project.use.baseURL,
    serviceWorkers: 'allow',
  });
}

// The first visit under build A: a worker registered and ready, then the planting (when given) and the close.
export async function visitAndRegisterWorker(page: Page): Promise<void> {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), { message: 'a service worker is registered' })
    .toBeGreaterThan(0);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
}

// The storage name and the fields of the owner's stored session the planting changes (never a value).
export const staleFields = ['access_token (signature part)', 'refresh_token'];

// The owner's session of the development sign-in, turned into the session of an earlier stack: the expiry
// stays, the access token's signature changes, the refresh token is a random string.
export function staleOwnerSession(stateFile: string, origin: string): { name: string; value: string } {
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  const entries: { name: string; value: string }[] = state.origins.find((o: { origin: string }) => o.origin === origin)?.localStorage ?? [];
  const entry = entries.find((e) => /^sb-.*-auth-token$/.test(e.name));
  if (!entry) throw new Error('The owner storage state holds no stored session for the client origin.');
  const session = JSON.parse(entry.value);
  const parts = String(session.access_token).split('.');
  parts[2] = randomBytes(32).toString('base64url');
  session.access_token = parts.join('.');
  session.refresh_token = randomBytes(12).toString('hex');
  return { name: entry.name, value: JSON.stringify(session) };
}

// Which key the sign-in token request carried and what it got back, from the context's events (labels only).
export function watchSignIn(context: BrowserContext): () => string {
  const a = keyA();
  const b = keyB();
  const label = (v: string | undefined) => (v === a ? 'A' : v === b ? 'B' : v === undefined ? 'none' : 'other');
  let apikey = 'not observed';
  let status = 'not observed';
  context.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/auth/v1/token')) apikey = label(request.headers()['apikey']);
  });
  context.on('response', (response) => {
    if (response.request().method() === 'POST' && response.url().includes('/auth/v1/token')) status = String(response.status());
  });
  return () => `sign-in request apikey header: ${apikey}; response status: ${status}`;
}

// The owner submits the right credentials; resolves with what shows first. The sign-in form opens the
// page without guest reading; with it, the form is behind the Bookmarks tab (priitkustala/ai-news-frontend#44,
// S-21b): whichever shows first decides.
export async function submitOwner(page: Page): Promise<'signed-in' | 'sign-in-error'> {
  const { email, password } = ownerCredentials();
  const opening = await Promise.race([
    page.getByTestId('sign-in-email').waitFor({ timeout: 30_000 }).then(() => 'form' as const),
    page.getByTestId('nav-bookmarks').waitFor({ timeout: 30_000 }).then(() => 'tab' as const),
  ]);
  if (opening === 'tab') await page.getByTestId('nav-bookmarks').click();
  await page.getByTestId('sign-in-email').fill(email);
  await page.getByTestId('sign-in-password').fill(password);
  await page.getByTestId('sign-in-submit').click();
  return Promise.race([
    page.getByTestId('signed-in').waitFor({ timeout: 30_000 }).then(() => 'signed-in' as const),
    page.getByTestId('sign-in-error').waitFor({ timeout: 30_000 }).then(() => 'sign-in-error' as const),
  ]);
}

// The page's own configuration key: A, B or other.
export async function pageKeyLabel(page: Page): Promise<string> {
  return page.evaluate(
    ([a, b]) => {
      const held = (window as unknown as { AI_NEWS_CONFIG?: { publishableKey?: string } }).AI_NEWS_CONFIG?.publishableKey;
      return held === a ? 'A' : held === b ? 'B' : 'other';
    },
    [keyA(), keyB()],
  );
}

export async function logReadings(page: Page, signIn: () => string, outcome: string): Promise<void> {
  console.log(`reading: outcome ${outcome}`);
  console.log(`reading: the page's own configuration holds key ${await pageKeyLabel(page)}`);
  console.log(`reading: ${signIn()}`);
}
