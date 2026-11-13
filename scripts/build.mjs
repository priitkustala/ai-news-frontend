// Last step of `npm run build` (after tsc and the Tailwind CSS build): copies public/ and the
// Supabase browser module into dist/ and writes dist/config.js with the local interface
// address and the local publishable key (priitkustala/ai-news#40). Both are read from the
// environment or the git-ignored .env.local at the repository root; the build refuses a
// secret key and an address outside the local stack, so only local values reach the client;
// the client reads config.js only through src/config, which refuses a non-publishable key (#43).
// With AI_NEWS_BUILD_TARGET=hosted (the release workflow, priitkustala/ai-news#56) SUPABASE_URL must be
// an https address of any host and the build line prints no address; absent or local keeps the local checks.
// It also fills the Content-Security-Policy img-src of index.html with the image hosts of
// src/config/images.ts, as tsc compiled it (priitkustala/ai-news#46, S-09 plan step 4), and
// writes into dist/sw.js the list of the files its install stores for offline reading and the
// cache name made from their content (priitkustala/ai-news-frontend#4, S-19).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
const target = process.env.AI_NEWS_BUILD_TARGET || 'local';
if (!['local', 'hosted'].includes(target)) fail(`AI_NEWS_BUILD_TARGET ${target} is not one of local or hosted.`);
if (target === 'hosted') {
  if (!URL.canParse(supabaseUrl) || new URL(supabaseUrl).protocol !== 'https:') {
    fail('SUPABASE_URL is not an https address; the hosted build needs the hosted interface over https.');
  }
} else {
  const host = new URL(supabaseUrl).hostname;
  if (!['ai-news-api', 'localhost', '127.0.0.1'].includes(host)) {
    fail(`SUPABASE_URL host ${host} is not the local stack; this build is for the local test environment only.`);
  }
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
// img-src 'self' plus the image hosts; each must be an http or https origin, nothing else.
const { imageHosts } = await import(pathToFileURL(path.join(dist, 'config', 'images.js')).href);
for (const host of imageHosts) {
  const url = URL.canParse(host) ? new URL(host) : null;
  if (!url || !['http:', 'https:'].includes(url.protocol) || url.origin !== host) {
    fail(`image host ${host} in src/config/images.ts is not an http or https origin.`);
  }
}
const indexFile = path.join(dist, 'index.html');
const index = fs.readFileSync(indexFile, 'utf8');
if (!index.includes('{{IMAGE_HOSTS}}')) fail('public/index.html has no {{IMAGE_HOSTS}} in its Content-Security-Policy.');
fs.writeFileSync(indexFile, index.replace('{{IMAGE_HOSTS}}', imageHosts.join(' ')));

// The service worker's shell: every file of dist/ but sw.js itself, "/" for index.html, in a
// cache named ai-news-shell- and the first 12 characters of the SHA-256 of their bytes.
const swFile = path.join(dist, 'sw.js');
const sw = fs.readFileSync(swFile, 'utf8');
if (!sw.includes("'{{SHELL_CACHE}}'") || !sw.includes('{{SHELL_FILES}}')) {
  fail('public/sw.js has no {{SHELL_CACHE}} or {{SHELL_FILES}}.');
}
const shellFiles = fs
  .readdirSync(dist, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => path.relative(dist, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
  .filter((file) => file !== 'sw.js')
  .sort();
const digest = crypto.createHash('sha256');
for (const file of shellFiles) digest.update(fs.readFileSync(path.join(dist, file)));
const shellCache = `ai-news-shell-${digest.digest('hex').slice(0, 12)}`;
const shellPaths = shellFiles.map((file) => (file === 'index.html' ? '/' : `/${file}`));
fs.writeFileSync(swFile, sw.replace("'{{SHELL_CACHE}}'", JSON.stringify(shellCache)).replace('{{SHELL_FILES}}', JSON.stringify(shellPaths)));

console.log(`build: wrote ${path.relative(root, dist)}/ (interface ${target === 'hosted' ? 'hosted' : supabaseUrl}; img-src 'self' ${imageHosts.join(' ')}; ${shellPaths.length} shell files)`);
