// Serves the built client (dist/) on localhost with Node 22's built-in http module
// (priitkustala/ai-news#40). Loopback only: 127.0.0.1 and ::1, port PORT (default 3000).
// GET and HEAD of files inside dist/; "/" is index.html; anything else answers 404.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(process.env.CLIENT_DIR ?? path.join(root, 'dist'));
const port = Number(process.env.PORT ?? 3000);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

if (!fs.existsSync(path.join(dir, 'index.html'))) {
  console.error(`serve: ${dir}/index.html is missing; run npm run build first`);
  process.exit(1);
}

function handle(request, response) {
  const send = (status, body, headers = {}) => {
    response.writeHead(status, { 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache', ...headers });
    response.end(request.method === 'HEAD' ? undefined : body);
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') return send(405, 'method not allowed', { Allow: 'GET, HEAD' });

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    return send(400, 'bad request');
  }
  if (pathname === '/health') return send(200, 'ok');
  const file = path.resolve(dir, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
  if (!file.startsWith(dir + path.sep)) return send(404, 'not found');

  fs.readFile(file, (error, body) => {
    if (error) return send(404, 'not found');
    send(200, body, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
  });
}

const servers = [];
for (const host of ['127.0.0.1', '::1']) {
  const server = http.createServer(handle);
  server.on('error', (error) => {
    if (host === '::1' && error.code === 'EADDRNOTAVAIL') return; // no IPv6 loopback here
    console.error(`serve: ${host}:${port}: ${error.message}`);
    process.exit(1);
  });
  server.listen(port, host, () => console.log(`serve: ${dir} on http://${host.includes(':') ? `[${host}]` : host}:${port}`));
  servers.push(server);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const server of servers) server.close();
    process.exit(0);
  });
}
