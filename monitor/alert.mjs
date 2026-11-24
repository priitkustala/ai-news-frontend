// The alert step of MON-2 (priitkustala/ai-news-frontend#58). It reads the result lines of one check
// of monitor/probes.mjs, the state of the previous check, the open reports and the context files the
// workflow gathered; counts consecutive failed checks per probe; fires each rule of
// monitor/alert-rules.json whose for value is reached; writes the new state; and, when a fired rule
// has no open report, writes one triage report (a title file and a body file) that the workflow opens
// as an issue. It reads its input files and writes into the out folder only; it sends no request.
// It prints one line naming the fired rules and whether a report was written, never a value of an
// input, because the logs of this public repository are readable by anyone.
//
// node monitor/alert.mjs --results <file> --previous <folder> --open <file> --context <folder> --out <folder>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PROBES } from './probes.mjs';
import { faultsOf } from './validate-rules.mjs';

const RULES_FILE = fileURLToPath(new URL('./alert-rules.json', import.meta.url));
const ARGUMENTS = ['results', 'previous', 'open', 'context', 'out'];

// The files of the folders: the state in the previous and out folders, the report in the out folder,
// the context the workflow gathered in the context folder.
export const STATE_FILE = 'state.json';
export const TITLE_FILE = 'report-title.txt';
export const BODY_FILE = 'report-body.md';
export const INGESTION_LOG_FILE = 'ingestion-log.txt';
export const CHANGES_FILE = 'changes.txt';

const PROBE_LINE = /^(\S+) (PASS|FAIL) (.*)$/;
const INPUT_LINE = /^input MONITOR_[A-Z_]+ (missing|invalid)$/;
const NO_ANSWER = /^no answer within \d+ ms$/;
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

const BLAST_RADIUS = {
  'client-site': 'the client site: the app may not load for its reader',
  'data-interface': 'the data interface: a read without a sign-in is not refused, so rows meant for a signed-in reader may be readable by anyone',
  'feed-read': 'the feed: the app may show its reader no news',
  ingestion: 'the ingestion: no new articles reach the feed',
  'not-paused': 'the data interface: it does not answer, so the app can read and save nothing',
};

const RUNBOOK = {
  ingestion: 'open the newest run of ingest.yml in the Actions of ai-news-backend and read its first failed step; when no run completed in the window, check that its schedule is enabled.',
  'data-interface': 'in the data project dashboard, check that row-level security is on for the tables behind the feed and that the newest migration added no grant to the anonymous role.',
  'feed-read': 'open the app as a reader who is not signed in; when the feed is empty, read the newest ingestion run, and when the read is refused, check that the app key in use is still the current one.',
  'client-site': 'open the site and its hosting release history; compare the live release with the channel previous-live before a person decides on the rollback workflow.',
  'not-paused': 'open the data project dashboard; when the project is paused, a person restores it there.',
};

// The five arguments, each required; a missing one is refused by its name.
export function readArguments(argv) {
  const options = Object.fromEntries(ARGUMENTS.map((name) => [name, { type: 'string' }]));
  const { values } = parseArgs({ args: argv, options, strict: true });
  const missing = ARGUMENTS.filter((name) => values[name] === undefined || values[name] === '');
  if (missing.length > 0) throw new Error(`argument missing: ${missing.map((name) => `--${name}`).join(' ')}`);
  return values;
}

// A JSON file, or an error naming what it holds and the cause.
function readJson(file, what) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${what} unreadable: ${error.message}`, { cause: error });
  }
}

// The rules of MON-1, refused with every fault the validator of MON-1 names.
function readRules() {
  const document = readJson(RULES_FILE, 'alert rules');
  const faults = faultsOf(document);
  if (faults.length > 0) throw new Error(`alert rules not valid: ${faults.join('; ')}`);
  return document.rules;
}

// The lines of the probe script: one per probe that ran, and an input line per missing or invalid
// input (the script then runs no probe). Any other line is refused with its line number.
export function parseResults(text) {
  const results = new Map();
  const inputProblems = [];
  text.split('\n').forEach((line, index) => {
    if (line.trim() === '') return;
    if (INPUT_LINE.test(line)) {
      inputProblems.push(line);
      return;
    }
    const match = PROBE_LINE.exec(line);
    if (!match || !PROBES.includes(match[1])) throw new Error(`results line ${index + 1} is not a probe line`);
    if (results.has(match[1])) throw new Error(`results line ${index + 1} repeats probe ${match[1]}`);
    results.set(match[1], { pass: match[2] === 'PASS', reading: match[3], line });
  });
  return { results, inputProblems };
}

// Per probe: passed, completed and its output line. A probe with no line did not run (an input was
// missing), so its check counts as failed and not completed.
function outcomesOf(parsed) {
  return Object.fromEntries(
    PROBES.map((probe) => {
      const result = parsed.results.get(probe);
      if (!result) return [probe, { pass: false, completed: false, line: `${probe} not run` }];
      return [probe, { pass: result.pass, completed: !NO_ANSWER.test(result.reading), line: result.line }];
    }),
  );
}

function emptyState() {
  return {
    checkedAt: null,
    counts: Object.fromEntries(PROBES.map((probe) => [probe, 0])),
    since: Object.fromEntries(PROBES.map((probe) => [probe, null])),
  };
}

// The fault of the shape of a parsed state, or null: an object holding a counts and a since object.
function shapeFault(document) {
  if (document === null || typeof document !== 'object') return 'not an object';
  if (document.counts === null || typeof document.counts !== 'object') return 'no counts';
  if (document.since === null || typeof document.since !== 'object') return 'no start times';
  return null;
}

// The fault of one probe entry, or null: a whole count, and a start time when the count is above 0.
function probeEntryFault(document, probe) {
  const count = document.counts[probe];
  if (!Number.isInteger(count) || count < 0) return `count of ${probe} not a whole number`;
  if (count > 0 && !TIME.test(String(document.since[probe]))) return `start time of ${probe} missing`;
  return null;
}

// The first fault of a parsed state, or null when it is valid: its shape, then each probe entry.
export function stateFault(document) {
  const shape = shapeFault(document);
  if (shape !== null) return shape;
  for (const probe of PROBES) {
    const fault = probeEntryFault(document, probe);
    if (fault !== null) return fault;
  }
  return null;
}

// The state of the previous check and a note on how it was read. A missing or unreadable state
// starts every count at 0 by design (the first check, or an artifact past its retention); the note
// keeps the cause.
export function readPrevious(folder) {
  let document;
  try {
    document = JSON.parse(readFileSync(join(folder, STATE_FILE), 'utf8'));
  } catch (error) {
    // A parse error quotes the file over several lines; the note stays one line and names it not JSON.
    const cause = error instanceof SyntaxError ? 'not JSON' : error.message;
    return { state: emptyState(), note: `previous state not read (${cause}), counts start at 0` };
  }
  const fault = stateFault(document);
  if (fault !== null) return { state: emptyState(), note: `previous state not valid (${fault}), counts start at 0` };
  return { state: document, note: 'previous state read' };
}

// The new state: a count one higher on a failed check and 0 on a passed one; the start time of a run
// of failures is kept from the previous state and set to this check's time on its first failure.
export function nextState(previous, outcomes, now) {
  const counts = {};
  const since = {};
  for (const probe of PROBES) {
    const failed = !outcomes[probe].pass;
    counts[probe] = failed ? previous.counts[probe] + 1 : 0;
    since[probe] = failed ? (previous.counts[probe] > 0 ? previous.since[probe] : now) : null;
  }
  return { checkedAt: now, counts, since };
}

// The open reports as gh issue list --json number,title prints them; refused when not that list.
function readOpen(file) {
  const document = readJson(file, 'open reports file');
  if (!Array.isArray(document)) throw new Error('open reports file is not a list');
  document.forEach((issue, index) => {
    if (issue === null || typeof issue !== 'object' || typeof issue.title !== 'string') {
      throw new Error(`open report ${index} has no title`);
    }
  });
  return document;
}

// An open report covers a rule when its title holds the rule uid with no letter, digit or hyphen right
// before or after it: mon-feed-read. covers mon-feed-read, mon-feed-read-outage does not.
export function covers(title, uid) {
  const free = (character) => character === undefined || !/[\p{L}\p{N}-]/u.test(character);
  for (let at = title.indexOf(uid); at >= 0; at = title.indexOf(uid, at + 1)) {
    if (free(title[at - 1]) && free(title[at + uid.length])) return true;
  }
  return false;
}

// A context file of the workflow. A missing one never stops the report by design: its section then
// says not available, with the cause.
function contextOf(folder, file) {
  try {
    return readFileSync(join(folder, file), 'utf8').trimEnd().split('\n');
  } catch (error) {
    return [`not available (${error.message})`];
  }
}

function fenced(lines) {
  return ['````', ...lines, '````'];
}

function notCompletedLines(parsed, outcomes) {
  const lines = [
    ...parsed.inputProblems.map((line) => `- ${line}`),
    ...PROBES.filter((probe) => !outcomes[probe].completed).map((probe) => `- ${outcomes[probe].line}`),
  ];
  return lines.length > 0 ? lines : ['none'];
}

// The body of the triage report, in the order of the incident triage brief template.
export function reportBody({ rules, state, parsed, outcomes, contextFolder }) {
  const probes = PROBES.filter((probe) => rules.some((rule) => rule.probe === probe));
  const ingestionFailed = !outcomes.ingestion.pass;
  return [
    '## Degradation',
    '',
    ...rules.map(
      (rule) =>
        `- ${rule.uid}: severity ${rule.severity}, outage ${rule.outage}; probe ${rule.probe} failed ${state.counts[rule.probe]} consecutive checks, the rule fires at ${rule.for}`,
    ),
    '',
    '## Start time',
    '',
    ...probes.map((probe) => `- ${probe}: ${state.since[probe]} (UTC, the first failed check of this run of failures)`),
    '',
    '## Blast radius',
    '',
    ...probes.map((probe) => `- ${probe}: ${BLAST_RADIUS[probe]}`),
    '',
    '## Checks run and their output',
    '',
    ...fenced(PROBES.map((probe) => outcomes[probe].line)),
    '',
    '## Checks not completed',
    '',
    ...notCompletedLines(parsed, outcomes),
    '',
    '## Ingestion log end',
    '',
    ...(ingestionFailed ? fenced(contextOf(contextFolder, INGESTION_LOG_FILE)) : ['not applicable']),
    '',
    '## Latest changes',
    '',
    ...fenced(contextOf(contextFolder, CHANGES_FILE)),
    '',
    '## First runbook step',
    '',
    ...probes.map((probe) => `- ${probe}: ${RUNBOOK[probe]}`),
    '',
    'A person executes any mitigation; nothing is rolled back by this workflow.',
    '',
    ...rules.map((rule) => `Rule: ${rule.uid}`),
    '',
  ].join('\n');
}

function uidsOf(rules) {
  return rules.length > 0 ? rules.map((rule) => rule.uid).join(' ') : 'none';
}

function run(argv, now) {
  const args = readArguments(argv);
  const rules = readRules();
  const parsed = parseResults(readFileSync(args.results, 'utf8'));
  const open = readOpen(args.open);
  const previous = readPrevious(args.previous);
  const outcomes = outcomesOf(parsed);
  const state = nextState(previous.state, outcomes, now);
  const fired = rules.filter((rule) => state.counts[rule.probe] >= rule.for);
  const reported = fired.filter((rule) => !open.some((issue) => covers(issue.title, rule.uid)));

  mkdirSync(args.out, { recursive: true });
  writeFileSync(join(args.out, STATE_FILE), `${JSON.stringify(state, null, 2)}\n`);
  if (reported.length > 0) {
    writeFileSync(join(args.out, TITLE_FILE), `Monitor alert ${uidsOf(reported)}\n`);
    writeFileSync(join(args.out, BODY_FILE), reportBody({ rules: reported, state, parsed, outcomes, contextFolder: args.context }));
  }
  const covered = fired.filter((rule) => !reported.includes(rule));
  console.log(
    `fired: ${uidsOf(fired)}; report written: ${reported.length > 0 ? `yes (${uidsOf(reported)})` : 'no'}; covered by an open report: ${uidsOf(covered)}; ${previous.note}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    run(process.argv.slice(2), new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'));
  } catch (error) {
    console.error(`alert: ${error.message}`);
    process.exitCode = 1;
  }
}
