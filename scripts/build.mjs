// Last step of `npm run build` (after tsc and the Tailwind CSS build): copies public/ and the
// Supabase browser module into dist/ and writes dist/config.js with the local interface
// address and the local publishable key (priitkustala/ai-news#40). Both are read from the
// environment or the git-ignored .env.local at the repository root; the build refuses a
// secret key and an address outside the local stack, so only local values reach the client.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const localEnv = path.join(root, '.env.local');
if (fs.existsSync(localEnv)) process.loadEnvFile(localEnv);

function fail(message) {
  console.error(`build: ${message}`);
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const publishableKey = process.env.PUBLISHABLE_KEY ?? '';
if (!supabaseUrl) fail('SUPABASE_URL is not set (the local interface address; see e2e/README.md, Variables).');
if (!publishableKey) fail('PUBLISHABLE_KEY is not set (the local publishable key; see e2e/README.md, Variables).');
if (!publishableKey.startsWith('sb_publishable_')) fail('PUBLISHABLE_KEY is not a publishable key; nothing else may enter the client.');
const host = new URL(supabaseUrl).hostname;
if (!['ai-news-api', 'localhost', '127.0.0.1'].includes(host)) {
  fail(`SUPABASE_URL host ${host} is not the local stack; this build is for the local test environment only.`);
}

fs.cpSync(path.join(root, 'public'), dist, { recursive: true });
fs.mkdirSync(path.join(dist, 'vendor'), { recursive: true });
fs.copyFileSync(
  path.join(root, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js'),
  path.join(dist, 'vendor', 'supabase.js'),
);
fs.writeFileSync(
  path.join(dist, 'config.js'),
  `window.AI_NEWS_CONFIG = ${JSON.stringify({ supabaseUrl, publishableKey })};\n`,
);
console.log(`build: wrote ${path.relative(root, dist)}/ (interface ${supabaseUrl})`);
