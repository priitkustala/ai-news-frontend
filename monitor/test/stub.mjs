// A local stub of the services the probes of monitor/probes.mjs read, for the tests only: the GitHub
// list of runs of a workflow, the data interface paths and the web app manifest, on 127.0.0.1 at a
// free port. A mode makes exactly one probe fail; every other path answers as production should. It
// only answers reads and is never pointed at, or forwards to, any other address.
import { createServer } from 'node:http';

export const MODES = [
  'good',
  'ingestion-old',
  'ingestion-failed',
  'data-interface-open',
  'feed-no-rows',
  'feed-token-refused',
  'no-manifest',
  'not-paused-no-answer',
];

const HOUR_MS = 3_600_000;

function send(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

const ROWS = [
  { id: 'item-2', title: 'Stub article two', published_at: '2026-11-19T10:00:00Z' },
  { id: 'item-1', title: 'Stub article one', published_at: '2026-11-19T09:00:00Z' },
];

// Starts the stub; resolves with its base address and a close function.
export async function startStub({ mode = 'good', token }) {
  if (!MODES.includes(mode)) throw new Error(`unknown stub mode ${mode}`);
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (request.method !== 'GET') return send(response, 405, { message: 'reads only' });

    if (/^\/repos\/[^/]+\/[^/]+\/actions\/workflows\/[^/]+\/runs$/.test(url.pathname)) {
      const ageHours = mode === 'ingestion-old' ? 48 : 1;
      const conclusion = mode === 'ingestion-failed' ? 'failure' : 'success';
      return send(response, 200, {
        total_count: 1,
        workflow_runs: [
          {
            id: 1001,
            status: 'completed',
            conclusion,
            run_started_at: new Date(Date.now() - ageHours * HOUR_MS - 600_000).toISOString(),
            updated_at: new Date(Date.now() - ageHours * HOUR_MS).toISOString(),
          },
        ],
      });
    }

    if (url.pathname === '/rest/v1/' || url.pathname === '/rest/v1') {
      // A paused project: this read gets no answer; the probe's timeout ends it.
      if (mode === 'not-paused-no-answer') return;
      return send(response, 401, { message: 'No API key found in request' });
    }

    if (url.pathname === '/rest/v1/feed') {
      const authorization = request.headers.authorization;
      if (authorization === undefined && request.headers.apikey === undefined) {
        return mode === 'data-interface-open' ? send(response, 200, ROWS) : send(response, 401, { message: 'No API key found in request' });
      }
      if (mode === 'feed-token-refused' || authorization !== `Bearer ${token}`) {
        return send(response, 401, { message: 'Invalid authentication credentials' });
      }
      return send(response, 200, mode === 'feed-no-rows' ? [] : ROWS);
    }

    if (url.pathname === '/manifest.webmanifest' && mode !== 'no-manifest') {
      return send(response, 200, { name: 'Stub app', short_name: 'Stub', start_url: '/' });
    }

    return send(response, 404, { message: 'not found' });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
