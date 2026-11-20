// Tests of the alert rules validator of MON-1 (priitkustala/ai-news-frontend#57): the real script
// monitor/validate-rules.mjs runs as a child process on monitor/alert-rules.json and on each bad
// rules file of monitor/test/bad-rules, and its lines and exit code are asserted. Nothing here
// sends a request.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const VALIDATOR = fileURLToPath(new URL('../validate-rules.mjs', import.meta.url));
const RULES = fileURLToPath(new URL('../alert-rules.json', import.meta.url));
const PROBES = ['ingestion', 'data-interface', 'feed-read', 'client-site', 'not-paused'];

function validate(path) {
  const result = spawnSync(process.execPath, [VALIDATOR, path], { encoding: 'utf8', env: { PATH: process.env.PATH } });
  return { code: result.status, stdout: result.stdout, lines: result.stdout.split('\n').filter(Boolean) };
}

function badFile(name) {
  return fileURLToPath(new URL(`./bad-rules/${name}`, import.meta.url));
}

// Asserts a refusal: a non-zero exit, a line naming bad-rule and the fault word, and every line
// about bad-rule (each other rule of a bad file is valid).
function assertRefused(name, word) {
  const result = validate(badFile(name));
  assert.notEqual(result.code, 0, result.stdout);
  assert.ok(result.lines.length > 0, 'no fault line');
  assert.ok(
    result.lines.some((line) => line.startsWith('bad-rule ') && new RegExp(`\\b${word}\\b`).test(line)),
    result.stdout,
  );
  for (const line of result.lines) assert.ok(line.startsWith('bad-rule '), line);
}

test('AC-3 rules file valid: exit 0, seven rules, exactly two outage rules', () => {
  const result = validate(RULES);
  assert.equal(result.code, 0, result.stdout);
  assert.deepEqual(result.lines, ['rules OK 7']);

  const { rules } = JSON.parse(readFileSync(RULES, 'utf8'));
  assert.equal(rules.length, 7);
  const critical = new Set(['data-interface', 'not-paused']);
  for (const probe of PROBES) {
    const rule = rules.find((candidate) => candidate.uid === `mon-${probe}`);
    assert.deepEqual(rule, {
      uid: `mon-${probe}`,
      severity: critical.has(probe) ? 'critical' : 'warning',
      for: 1,
      probe,
      outage: 'no',
    });
  }
  const outages = rules.filter((rule) => rule.outage === 'yes');
  assert.deepEqual(
    outages.sort((a, b) => a.uid.localeCompare(b.uid)),
    [
      { uid: 'mon-client-site-outage', severity: 'critical', for: 2, probe: 'client-site', outage: 'yes' },
      { uid: 'mon-feed-read-outage', severity: 'critical', for: 2, probe: 'feed-read', outage: 'yes' },
    ],
  );
});

test('AC-4 duplicate uid: refused naming bad-rule and duplicate', () => {
  assertRefused('duplicate-uid.json', 'duplicate');
});

test('AC-4 severity info: refused naming bad-rule and severity', () => {
  assertRefused('severity-info.json', 'severity');
});

test('AC-4 no for value: refused naming bad-rule and for', () => {
  assertRefused('no-for.json', 'for');
});

test('AC-4 unknown probe: refused naming bad-rule and probe', () => {
  assertRefused('unknown-probe.json', 'probe');
});

test('AC-4 outage on warning: refused naming bad-rule and outage', () => {
  assertRefused('outage-on-warning.json', 'outage');
});
