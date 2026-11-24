// Tests of the alert step of MON-2 (priitkustala/ai-news-frontend#58): the real script
// monitor/alert.mjs runs as a child process on the fixture files of monitor/test/alert-fixtures/
// (result lines, previous states, open reports and context files, all made up), and its printed
// line, its state file and its report files are asserted. Each run writes into its own out folder
// under monitor/test, removed when the test ends; nothing here sends a request.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SCRIPT = fileURLToPath(new URL('../alert.mjs', import.meta.url));
const FIXTURES = join(HERE, 'alert-fixtures');
const NO_PREVIOUS = join(FIXTURES, 'no-previous-state');
const HEADINGS = [
  '## Degradation',
  '## Start time',
  '## Blast radius',
  '## Checks run and their output',
  '## Checks not completed',
  '## Ingestion log end',
  '## Latest changes',
  '## First runbook step',
];

function fixture(name) {
  return join(FIXTURES, name);
}

// Runs the test body with a fresh out folder under monitor/test and removes it afterwards.
async function withOut(body) {
  const out = mkdtempSync(join(HERE, '.alert-out-'));
  try {
    return await body(out);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

// Runs monitor/alert.mjs on the named results, previous folder and open reports, with the fixture
// context, into the out folder; its exit code, printed line, state and report files.
async function runAlert({ results, previous = NO_PREVIOUS, open = fixture('open-none.json'), out }) {
  const args = ['--results', fixture(results), '--previous', previous, '--open', open, '--context', fixture('context'), '--out', out];
  const { code, stdout, stderr } = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], { env: { PATH: process.env.PATH }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
  assert.equal(code, 0, `alert.mjs failed: ${stderr}`);
  const lines = stdout.split('\n').filter(Boolean);
  assert.equal(lines.length, 1, stdout);
  const statePath = join(out, 'state.json');
  assert.ok(existsSync(statePath), 'no state file written');
  const titlePath = join(out, 'report-title.txt');
  const bodyPath = join(out, 'report-body.md');
  assert.equal(existsSync(titlePath), existsSync(bodyPath), 'a report needs both its title and its body');
  return {
    line: lines[0],
    state: JSON.parse(readFileSync(statePath, 'utf8')),
    title: existsSync(titlePath) ? readFileSync(titlePath, 'utf8').trim() : null,
    body: existsSync(bodyPath) ? readFileSync(bodyPath, 'utf8') : null,
  };
}

// The text under one heading of a report body, up to the next heading.
function section(body, heading) {
  const start = body.indexOf(`${heading}\n`);
  assert.ok(start >= 0, `no heading ${heading}`);
  const next = body.indexOf('\n## ', start + heading.length);
  return body.slice(start + heading.length, next < 0 ? undefined : next);
}

test('R2 green check opens nothing: five passes fire no rule and write no report', () =>
  withOut(async (out) => {
    const result = await runAlert({ results: 'results-green.txt', out });
    assert.match(result.line, /^fired: none; report written: no;/);
    assert.equal(result.title, null);
    assert.deepEqual(Object.values(result.state.counts), [0, 0, 0, 0, 0]);
  }));

test('R2 failure fires a for 1 rule: one feed-read failure fires mon-feed-read and not its outage rule', () =>
  withOut(async (out) => {
    const result = await runAlert({ results: 'results-feed-read-fail.txt', out });
    assert.match(result.line, /^fired: mon-feed-read; report written: yes \(mon-feed-read\);/);
    assert.equal(result.title, 'Monitor alert mon-feed-read');
    assert.equal(result.state.counts['feed-read'], 1);
    assert.match(result.state.since['feed-read'], /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  }));

test('R2 for 2 rule needs two consecutive failures: the outage rule fires on the second failed check', () =>
  withOut((first) =>
    withOut(async (second) => {
      const one = await runAlert({ results: 'results-client-site-fail.txt', out: first });
      assert.match(one.line, /^fired: mon-client-site; /);
      assert.equal(one.state.counts['client-site'], 1);
      const two = await runAlert({ results: 'results-client-site-fail.txt', previous: first, out: second });
      assert.match(two.line, /^fired: mon-client-site mon-client-site-outage; report written: yes \(mon-client-site mon-client-site-outage\);/);
      assert.match(two.line, /; previous state read$/);
      assert.equal(two.state.counts['client-site'], 2);
      assert.equal(two.state.since['client-site'], one.state.since['client-site']);
    }),
  ));

test('R2 a pass resets the count: a pass after one failure sets 0, so the next failure counts 1 again', () =>
  withOut((first) =>
    withOut(async (second) => {
      const pass = await runAlert({ results: 'results-green.txt', previous: fixture('previous-client-site-1'), out: first });
      assert.match(pass.line, /^fired: none; report written: no; .*; previous state read$/);
      assert.equal(pass.state.counts['client-site'], 0);
      assert.equal(pass.state.since['client-site'], null);
      const again = await runAlert({ results: 'results-client-site-fail.txt', previous: first, out: second });
      assert.match(again.line, /^fired: mon-client-site; /);
      assert.equal(again.state.counts['client-site'], 1);
      assert.notEqual(again.state.since['client-site'], '2026-11-24T09:23:00Z');
    }),
  ));

test('R2 no previous state starts at zero: a missing or unreadable state counts the failure as the first', () =>
  withOut((first) =>
    withOut(async (second) => {
      const missing = await runAlert({ results: 'results-client-site-fail.txt', previous: NO_PREVIOUS, out: first });
      const unreadable = await runAlert({ results: 'results-client-site-fail.txt', previous: fixture('previous-unreadable'), out: second });
      for (const result of [missing, unreadable]) {
        assert.match(result.line, /^fired: mon-client-site; report written: yes \(mon-client-site\);/);
        assert.match(result.line, /; previous state not read \(.+\), counts start at 0$/);
        assert.deepEqual(result.state.counts, { ingestion: 0, 'data-interface': 0, 'feed-read': 0, 'client-site': 1, 'not-paused': 0 });
      }
    }),
  ));

test('R3 report holds the template fields: every heading in order, the probe output, the start time and the rule', () =>
  withOut(async (out) => {
    const result = await runAlert({ results: 'results-data-interface-fail.txt', out });
    assert.equal(result.title, 'Monitor alert mon-data-interface');
    const body = result.body;
    assert.ok(body !== null, 'no report body');
    const positions = HEADINGS.map((heading) => body.indexOf(`${heading}\n`));
    positions.forEach((position, index) => assert.ok(position >= 0, `no heading ${HEADINGS[index]}`));
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b), 'headings out of order');
    assert.match(section(body, '## Degradation'), /- mon-data-interface: severity critical, outage no; /);
    assert.ok(section(body, '## Start time').includes(`- data-interface: ${result.state.since['data-interface']} (UTC`));
    assert.match(section(body, '## Blast radius'), /- data-interface: the data interface/);
    const output = section(body, '## Checks run and their output');
    assert.ok(output.includes('data-interface FAIL unauthenticated read answered 200'), output);
    assert.equal(output.split('\n').filter((line) => / (PASS|FAIL) /.test(line)).length, 5, output);
    assert.match(section(body, '## Checks not completed'), /^\s*none\s*$/);
    assert.match(section(body, '## Ingestion log end'), /^\s*not applicable\s*$/);
    assert.ok(section(body, '## Latest changes').includes('aaaaaaa 2026-11-24T08:00:00Z stub frontend change'));
    assert.match(section(body, '## First runbook step'), /- data-interface: \S/);
    assert.ok(body.includes('A person executes any mitigation; nothing is rolled back by this workflow.'));
    assert.deepEqual(body.split('\n').filter((line) => line.startsWith('Rule: ')), ['Rule: mon-data-interface']);
  }));

test('R3 ingestion failure carries the log end: the failed run log lines stand under Ingestion log end', () =>
  withOut(async (out) => {
    const result = await runAlert({ results: 'results-ingestion-fail.txt', out });
    assert.equal(result.title, 'Monitor alert mon-ingestion');
    assert.ok(result.body !== null, 'no report body');
    const log = section(result.body, '## Ingestion log end');
    assert.ok(log.includes('stub-ingest-step Error: stub source answered 503'), log);
    assert.ok(log.includes('stub-ingest-step Process completed with exit code 1.'), log);
  }));

test('R4 open report suppresses a second: an open report naming the rule as a whole word writes none', () =>
  withOut((first) =>
    withOut(async (second) => {
      const covered = await runAlert({ results: 'results-feed-read-fail.txt', open: fixture('open-feed-read.json'), out: first });
      assert.match(covered.line, /^fired: mon-feed-read; report written: no; covered by an open report: mon-feed-read;/);
      assert.equal(covered.title, null);
      assert.equal(covered.state.counts['feed-read'], 1);
      const other = await runAlert({ results: 'results-feed-read-fail.txt', open: fixture('open-feed-read-outage.json'), out: second });
      assert.equal(other.title, 'Monitor alert mon-feed-read');
    }),
  ));

test('R4 open report with the uid before a period suppresses a second: Investigate mon-feed-read. covers mon-feed-read', () =>
  withOut(async (out) => {
    const result = await runAlert({ results: 'results-feed-read-fail.txt', open: fixture('open-feed-read-period.json'), out });
    assert.match(result.line, /^fired: mon-feed-read; report written: no; covered by an open report: mon-feed-read;/);
    assert.equal(result.title, null);
  }));

test('R4 open report with the uid in brackets suppresses a second: {mon-feed-read} covers mon-feed-read', () =>
  withOut(async (out) => {
    const result = await runAlert({ results: 'results-feed-read-fail.txt', open: fixture('open-feed-read-brackets.json'), out });
    assert.match(result.line, /^fired: mon-feed-read; report written: no; covered by an open report: mon-feed-read;/);
    assert.equal(result.title, null);
  }));

test('R4 one report per run: a wrong data address fails three probes and one report names all three rules', () =>
  withOut(async (out) => {
    const result = await runAlert({ results: 'results-wrong-data-address.txt', out });
    const uids = ['mon-data-interface', 'mon-feed-read', 'mon-not-paused'];
    assert.match(result.line, /^fired: mon-data-interface mon-feed-read mon-not-paused; report written: yes /);
    assert.equal(result.title, `Monitor alert ${uids.join(' ')}`);
    assert.ok(result.body !== null, 'no report body');
    assert.deepEqual(
      result.body.split('\n').filter((line) => line.startsWith('Rule: ')),
      uids.map((uid) => `Rule: ${uid}`),
    );
    const notCompleted = section(result.body, '## Checks not completed');
    for (const probe of ['data-interface', 'feed-read', 'not-paused']) {
      assert.ok(notCompleted.includes(`- ${probe} FAIL no answer within 5000 ms`), notCompleted);
    }
  }));
