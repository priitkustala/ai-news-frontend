// E2E_BACKEND_COMMAND of this repository (priitkustala/ai-news#40): the backend's
// `seed`, `ingest` and `sign-in` commands, reached through the backend's development-only
// command relay on the shared network ai-news-local. The relay runs
// `node dist/cli.js <args>` in the backend checkout and answers {exitCode, stdout, stderr};
// any other subcommand is refused there. This prints the answer and exits with its code,
// so the scenarios see the same interface as the backend's own command line.
const relay = (process.env.AI_NEWS_COMMANDS_URL ?? 'http://ai-news-commands:8090').replace(/\/+$/, '');
const args = process.argv.slice(2);

let response;
try {
  response = await fetch(`${relay}/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ args }),
  });
} catch (error) {
  console.error(`backend-command: the relay ${relay} did not answer: ${error.cause?.message ?? error.message}`);
  process.exit(2);
}

const text = await response.text();
let answer;
try {
  answer = JSON.parse(text);
} catch {
  answer = undefined;
}
if (!response.ok || typeof answer?.exitCode !== 'number') {
  console.error(`backend-command: the relay answered HTTP ${response.status}: ${text.slice(0, 500)}`);
  process.exit(2);
}

process.stdout.write(answer.stdout ?? '');
process.stderr.write(answer.stderr ?? '');
process.exitCode = answer.exitCode;
