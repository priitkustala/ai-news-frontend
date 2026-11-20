// Tests of the probes of MON-1 (priitkustala/ai-news-frontend#57): the real script monitor/probes.mjs
// runs as a child process against the local stub of monitor/test/stub.mjs (good answers, then each
// failure in turn), and its lines and exit code are asserted. The probes only read; every address
// is the stub on 127.0.0.1 and the read-only token is a made-up stub value.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MODES, startStub } from './stub.mjs';

const SCRIPT = fileURLToPath(new URL('../probes.mjs', import.meta.url));
const TOKEN = 'stub-read-token';
const TIMEOUT_MS = 1500;
const ORDER = ['ingestion', 'data-interface', 'feed-read', 'client-site', 'not-paused'];

// Runs the probe script against a stub in the given mode; its output lines and exit code.
async function runProbes(mode) {
  const stub = await startStub({ mode, token: TOKEN });
  try {
    const env = {
      PATH: process.env.PATH,
      MONITOR_GITHUB_API: stub.url,
      MONITOR_BACKEND_REPO: 'stub-owner/stub-backend',
      MONITOR_INGEST_WORKFLOW: 'ingest.yml',
      MONITOR_WINDOW_HOURS: '26',
      MONITOR_DATA_URL: stub.url,
      MONITOR_READ_TOKEN: TOKEN,
      MONITOR_SITE_URL: stub.url,
      MONITOR_TIMEOUT_MS: String(TIMEOUT_MS),
    };
    return await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [SCRIPT], { env, stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => (stdout += chunk));
      child.stderr.on('data', (chunk) => (stderr += chunk));
      child.on('error', reject);
      child.on('close', (code) => resolve({ code, stdout, stderr, lines: stdout.split('\n').filter(Boolean) }));
    });
  } finally {
    await stub.close();
  }
}

// Asserts five lines in probe order: the named probe FAIL with a reading matching the pattern, the
// others PASS, and a non-zero exit.
function assertOneFailure(result, probe, reading) {
  assert.equal(result.lines.length, 5, result.stdout);
  result.lines.forEach((line, index) => {
    const name = ORDER[index];
    if (name === probe) {
      assert.match(line, new RegExp(`^${name} FAIL `), line);
      assert.match(line.slice(`${name} FAIL `.length), reading, line);
    } else {
      assert.match(line, new RegExp(`^${name} PASS `), line);
    }
  });
  assert.notEqual(result.code, 0);
}

test('AC-1 good answers: five PASS lines in probe order and exit 0', async () => {
  const result = await runProbes('good');
  assert.deepEqual(
    result.lines.map((line) => line.split(' ').slice(0, 2).join(' ')),
    ORDER.map((name) => `${name} PASS`),
    result.stdout,
  );
  assert.equal(result.code, 0);
});

test('AC-2 ingestion old run: ingestion FAIL outside the window', async () => {
  assertOneFailure(await runProbes('ingestion-old'), 'ingestion', /^run 1001 success age 48\.\dh outside window 26h$/);
});

test('AC-2 ingestion failed run: ingestion FAIL naming the conclusion', async () => {
  assertOneFailure(await runProbes('ingestion-failed'), 'ingestion', /^run 1001 failure age 1\.\dh within window 26h$/);
});

test('AC-2 data-interface unauthenticated read: the worked example line', async () => {
  const result = await runProbes('data-interface-open');
  assertOneFailure(result, 'data-interface', /^unauthenticated read answered 200$/);
  assert.ok(result.lines.includes('data-interface FAIL unauthenticated read answered 200'), result.stdout);
});

test('AC-2 feed-read no rows: feed-read FAIL no rows', async () => {
  assertOneFailure(await runProbes('feed-no-rows'), 'feed-read', /^no rows$/);
});

test('AC-2 feed-read token refused: feed-read FAIL token refused', async () => {
  assertOneFailure(await runProbes('feed-token-refused'), 'feed-read', /^token refused 401$/);
});

test('AC-2 client-site no manifest: client-site FAIL no manifest', async () => {
  assertOneFailure(await runProbes('no-manifest'), 'client-site', /^no manifest: answered 404$/);
});

test('AC-2 not-paused no answer: not-paused FAIL no answer within the timeout', async () => {
  assertOneFailure(await runProbes('not-paused-no-answer'), 'not-paused', new RegExp(`^no answer within ${TIMEOUT_MS} ms$`));
});

test('token never printed: the stub token appears in no output of any probe run', async () => {
  for (const mode of MODES) {
    const result = await runProbes(mode);
    assert.equal(result.lines.length, 5, `${mode}: ${result.stdout}`);
    assert.ok(!result.stdout.includes(TOKEN), `${mode}: the token is in stdout`);
    assert.ok(!result.stderr.includes(TOKEN), `${mode}: the token is in stderr`);
  }
});
