// The production probes of MON-1 (priitkustala/ai-news-frontend#57): five checks of the hosted app,
// each printing one line: the probe name, PASS or FAIL, and the reading. Exit 0 when all five pass,
// 1 when any fails, 2 when a required input is missing or not valid. The probes only read: every
// request is a GET, and nothing is written anywhere. Every address and the read-only token are
// inputs (MONITOR_* environment variables); no line names an address, the token, a header value
// or a body, because the logs of this public repository are readable by anyone.
// MON-2 schedules this script against production; the tests run it against a local stub.
import { pathToFileURL } from 'node:url';

export const PROBES = ['ingestion', 'data-interface', 'feed-read', 'client-site', 'not-paused'];

// The feed as the client reads it (src/bookmarks/index.ts, client.from('feed').select('*')), newest
// published first (src/feed/index.ts, published_at).
const FEED_PATH = '/rest/v1/feed?select=*&order=published_at.desc&limit=5';
const UNAUTHENTICATED_PATH = '/rest/v1/feed?select=*&limit=1';
const REST_ROOT = '/rest/v1/';
const MANIFEST_PATH = '/manifest.webmanifest';

const INPUTS = [
  { name: 'MONITOR_GITHUB_API', key: 'githubApi', fallback: 'https://api.github.com' },
  { name: 'MONITOR_BACKEND_REPO', key: 'backendRepo', fallback: 'priitkustala/ai-news-backend' },
  { name: 'MONITOR_INGEST_WORKFLOW', key: 'ingestWorkflow', fallback: 'ingest.yml' },
  { name: 'MONITOR_WINDOW_HOURS', key: 'windowHours', number: true },
  { name: 'MONITOR_DATA_URL', key: 'dataUrl' },
  { name: 'MONITOR_READ_TOKEN', key: 'readToken' },
  { name: 'MONITOR_SITE_URL', key: 'siteUrl' },
  { name: 'MONITOR_TIMEOUT_MS', key: 'timeoutMs', fallback: '5000', number: true },
];

// The inputs from the environment, or the list of lines naming each missing or invalid one.
export function readInputs(env) {
  const inputs = {};
  const problems = [];
  for (const input of INPUTS) {
    const raw = env[input.name] === undefined || env[input.name] === '' ? input.fallback : env[input.name];
    if (raw === undefined) {
      problems.push(`input ${input.name} missing`);
    } else if (input.number) {
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0) problems.push(`input ${input.name} invalid`);
      else inputs[input.key] = value;
    } else {
      inputs[input.key] = input.key.endsWith('Url') || input.key === 'githubApi' ? raw.replace(/\/+$/, '') : raw;
    }
  }
  return { inputs, problems };
}

// One read, its body read whole; the status and body text, or null when nothing answered within the
// timeout or the request failed. One timer per request, cleared when the request ends, so that no
// open handle outlives the probe and the process ends by itself.
async function read(url, headers, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: 'GET', headers, redirect: 'follow', signal: controller.signal });
    return { status: response.status, text: await response.text() };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function jsonOf(response) {
  try {
    return JSON.parse(response.text);
  } catch {
    return undefined;
  }
}

function noAnswer(timeoutMs) {
  return { pass: false, reading: `no answer within ${timeoutMs} ms` };
}

// ingestion: the newest completed run of the ingestion workflow succeeded inside the window.
async function ingestion(inputs) {
  const url = `${inputs.githubApi}/repos/${inputs.backendRepo}/actions/workflows/${encodeURIComponent(inputs.ingestWorkflow)}/runs?status=completed&per_page=1`;
  const response = await read(
    url,
    { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'ai-news-monitor' },
    inputs.timeoutMs,
  );
  if (!response) return noAnswer(inputs.timeoutMs);
  if (response.status !== 200) return { pass: false, reading: `runs list answered ${response.status}` };
  const body = jsonOf(response);
  const run = Array.isArray(body?.workflow_runs) ? body.workflow_runs[0] : undefined;
  if (!run) return { pass: false, reading: 'no completed run' };
  const completed = Date.parse(run.updated_at);
  if (Number.isNaN(completed)) return { pass: false, reading: `run ${run.id} has no completion time` };
  const ageHours = (Date.now() - completed) / 3_600_000;
  const inside = ageHours <= inputs.windowHours;
  const conclusion = typeof run.conclusion === 'string' ? run.conclusion : 'none';
  return {
    pass: conclusion === 'success' && inside,
    reading: `run ${run.id} ${conclusion} age ${ageHours.toFixed(1)}h ${inside ? 'within' : 'outside'} window ${inputs.windowHours}h`,
  };
}

// data-interface: a read of the feed with no key and no sign-in is refused.
async function dataInterface(inputs) {
  const response = await read(`${inputs.dataUrl}${UNAUTHENTICATED_PATH}`, {}, inputs.timeoutMs);
  if (!response) return noAnswer(inputs.timeoutMs);
  if (response.status === 401 || response.status === 403) {
    return { pass: true, reading: `unauthenticated read refused ${response.status}` };
  }
  return { pass: false, reading: `unauthenticated read answered ${response.status}` };
}

// feed-read: the newest published articles, read with the read-only token, hold at least one row.
async function feedRead(inputs) {
  const response = await read(
    `${inputs.dataUrl}${FEED_PATH}`,
    // The key of a reader who is not signed in (owner decision 2026-11-24) is not a session token: it
    // goes in apikey only, with no Authorization header, as the app sends it with no session.
    { apikey: inputs.readToken, Accept: 'application/json' },
    inputs.timeoutMs,
  );
  if (!response) return noAnswer(inputs.timeoutMs);
  if (response.status === 401 || response.status === 403) {
    return { pass: false, reading: `token refused ${response.status}` };
  }
  if (response.status !== 200) return { pass: false, reading: `feed read answered ${response.status}` };
  const rows = jsonOf(response);
  if (!Array.isArray(rows)) return { pass: false, reading: 'feed read answered 200 with no row list' };
  if (rows.length === 0) return { pass: false, reading: 'no rows' };
  return { pass: true, reading: `${rows.length} rows` };
}

// client-site: the site serves its web app manifest, a JSON body with a name.
async function clientSite(inputs) {
  const response = await read(`${inputs.siteUrl}${MANIFEST_PATH}`, { Accept: 'application/manifest+json, application/json' }, inputs.timeoutMs);
  if (!response) return noAnswer(inputs.timeoutMs);
  if (response.status !== 200) return { pass: false, reading: `no manifest: answered ${response.status}` };
  const manifest = jsonOf(response);
  if (manifest === undefined || manifest === null || typeof manifest !== 'object') {
    return { pass: false, reading: 'no manifest: body is not JSON' };
  }
  if (typeof manifest.name !== 'string' || manifest.name.trim() === '') {
    return { pass: false, reading: 'no manifest: no name' };
  }
  return { pass: true, reading: 'manifest with a name' };
}

// not-paused: the data interface answers at all; a paused project does not answer.
async function notPaused(inputs) {
  const response = await read(`${inputs.dataUrl}${REST_ROOT}`, {}, inputs.timeoutMs);
  if (!response) return noAnswer(inputs.timeoutMs);
  return { pass: true, reading: `answered ${response.status}` };
}

const CHECKS = {
  ingestion,
  'data-interface': dataInterface,
  'feed-read': feedRead,
  'client-site': clientSite,
  'not-paused': notPaused,
};

// Runs the five probes at once; the results in the order of PROBES.
export async function runProbes(inputs) {
  return Promise.all(
    PROBES.map(async (name) => {
      try {
        return { name, ...(await CHECKS[name](inputs)) };
      } catch {
        return { name, pass: false, reading: 'probe error' };
      }
    }),
  );
}

async function main() {
  const { inputs, problems } = readInputs(process.env);
  if (problems.length > 0) {
    for (const line of problems) console.log(line);
    process.exit(2);
  }
  const results = await runProbes(inputs);
  for (const result of results) console.log(`${result.name} ${result.pass ? 'PASS' : 'FAIL'} ${result.reading}`);
  // No process.exit after the reads: the exit code is set and the process ends by itself.
  process.exitCode = results.every((result) => result.pass) ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
