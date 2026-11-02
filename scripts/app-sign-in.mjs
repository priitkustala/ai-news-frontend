// E2E_APP_SIGNIN_COMMAND of this repository (priitkustala/ai-news#40):
//   node scripts/app-sign-in.mjs <persona> <storage-state-file>
// Signs a seeded persona in through the client's own sign-in screen, in the scenarios'
// browser and device profile (WebKit, Playwright's iPhone 15), and saves the browser state
// as a Playwright storage-state file (e2e/tests/README-testids.md, Variables). The client
// must be served at E2E_BASE_URL. The personas are the backend seed's synthetic test users
// (scripts/personas.json, a byte copy of ai-news-backend db/seed/personas.json: public test
// data, never a real credential). Prints one JSON object as its last line.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localEnv = path.join(root, '.env.local');
if (fs.existsSync(localEnv)) process.loadEnvFile(localEnv);

const [persona, file] = process.argv.slice(2);
const personas = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'personas.json'), 'utf8'));
const credentials = persona && !persona.startsWith('_') ? personas[persona] : undefined;
if (!credentials || !file) {
  console.error('usage: node scripts/app-sign-in.mjs <owner|second-user> <storage-state-file>');
  process.exit(2);
}
const baseURL = process.env.E2E_BASE_URL;
if (!baseURL) {
  console.error('app-sign-in: E2E_BASE_URL is not set (the served client; see e2e/README.md, Variables).');
  process.exit(2);
}

// The scenario runner's own Playwright, installed by `npm ci` in e2e/.
const { webkit, devices } = createRequire(path.join(root, 'e2e', 'package.json'))('@playwright/test');

const browser = await webkit.launch();
try {
  const context = await browser.newContext({ ...devices['iPhone 15'], baseURL });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByTestId('sign-in-email').fill(credentials.email);
  await page.getByTestId('sign-in-password').fill(credentials.password);
  await page.getByTestId('sign-in-submit').click();
  const outcome = await Promise.race([
    page.getByTestId('signed-in').waitFor({ timeout: 30_000 }).then(() => 'signed-in'),
    page.getByTestId('sign-in-error').waitFor({ timeout: 30_000 }).then(() => 'refused'),
  ]);
  if (outcome !== 'signed-in') {
    console.error(`app-sign-in: the client refused the sign-in of ${persona}`);
    process.exitCode = 1;
  } else {
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    await context.storageState({ path: file });
    console.log(JSON.stringify({ persona, signed_in: true, storage_state: path.resolve(file) }));
  }
} catch (error) {
  console.error(`app-sign-in: ${error.message.split('\n')[0]}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
