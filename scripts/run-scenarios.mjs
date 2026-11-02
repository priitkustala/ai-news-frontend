// Runs the e2e scenarios against the built client (priitkustala/ai-news#40): starts the
// static server (scripts/serve.mjs) in this process's foreground, waits until it answers,
// runs `npx playwright test <args>` in e2e/, stops the server and exits with Playwright's
// exit code, so nothing keeps running after the run. Build first: `npm run build`.
//   node scripts/run-scenarios.mjs --project iphone --grep "@story-40"
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT ?? 3000);

const server = spawn(process.execPath, [path.join(root, 'scripts', 'serve.mjs')], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'inherit', 'inherit'],
});
let serverExited = false;
server.on('exit', () => {
  serverExited = true;
});

async function ready() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (serverExited) return false;
    const ok = await fetch(`http://127.0.0.1:${port}/health`).then((r) => r.ok, () => false);
    if (ok) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

let code = 1;
if (await ready()) {
  const run = spawn('npx', ['playwright', 'test', ...process.argv.slice(2)], {
    cwd: path.join(root, 'e2e'),
    env: { ...process.env, E2E_BASE_URL: process.env.E2E_BASE_URL ?? `http://localhost:${port}` },
    stdio: 'inherit',
  });
  code = await new Promise((resolve) => run.on('exit', (status) => resolve(status ?? 1)));
} else {
  console.error(`run-scenarios: the static server did not answer on port ${port}`);
}
server.kill('SIGTERM');
process.exit(code);
