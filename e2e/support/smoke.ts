// The smoke rows (priitkustala/ai-news#53, tag @tier-smoke): what they read after every deploy,
// against the hosted app or, locally, against the local stack. The smoke user is a signed-in
// user who is not the owner (the guest-reading policies of ai-news-backend#47: it reads the news
// relations, no row of bookmarks or push_subscriptions, and every write is refused). Locally its
// stand-in is the seeded persona second-user. The last-updated columns of ingestion_runs are open
// to visitors only (migration 0015 grants them to anon), so the freshness row reads them with the
// publishable key and no session (owner decision of 2026-11-12). Nothing here seeds, runs a job
// command or uses the development sign-in, and nothing is logged: a failure names the check and
// counts only, never a value.
import type { APIRequestContext } from '@playwright/test';
import { dataUrl, type ReadResult, type Row } from './data';
import { requireEnv } from './env';

export function smokeCredentials(): { email: string; password: string } {
  return {
    email: requireEnv('E2E_SMOKE_EMAIL', 'the e-mail of the smoke user'),
    password: requireEnv('E2E_SMOKE_PASSWORD', 'the password of the smoke user'),
  };
}

function publishableKey(): string {
  return requireEnv('E2E_PUBLISHABLE_KEY', 'the publishable key of the data interface');
}

// The window of the freshness check in days (default 1): the newest completed run may be at most
// this many days before today in E2E_RUN_TIME_ZONE. -1 is accepted: a window no run can meet, the
// deliberately failing run that proves the freshness row fails.
export function maxRunAgeDays(): number {
  const raw = process.env.E2E_SMOKE_MAX_RUN_AGE_DAYS || '1';
  const days = Number(raw);
  if (!Number.isInteger(days) || days < -1) {
    throw new Error('E2E_SMOKE_MAX_RUN_AGE_DAYS is not a whole number of days (-1 or more).');
  }
  return days;
}

// The smoke session, by the published password sign-in of the same gateway as the Data API:
// E2E_DATA_URL with /rest/v1 replaced by /auth/v1/token?grant_type=password. Returns the
// access token; the answer's body is never shown.
export async function signInSmoke(request: APIRequestContext): Promise<string> {
  const address = dataUrl().replace(/\/rest\/v1$/, '/auth/v1/token?grant_type=password');
  const response = await request.post(address, {
    headers: { apikey: publishableKey(), 'Content-Type': 'application/json' },
    data: smokeCredentials(),
  });
  const token = response.ok() ? ((await response.json()) as { access_token?: unknown }).access_token : undefined;
  if (typeof token !== 'string' || token === '') {
    throw new Error(`The smoke user's sign-in returned no session (status ${response.status()}).`);
  }
  return token;
}

function headers(token: string | null): Record<string, string> {
  return token === null ? { apikey: publishableKey() } : { apikey: publishableKey(), Authorization: `Bearer ${token}` };
}

// A read of the Data API with a query of the caller's (select, filters, order), with the smoke
// session or with no session at all (token null: the publishable key only). Same result shape as
// readRelation of ./data, so expectRows and wellFormedCount apply.
export async function readQuery(request: APIRequestContext, query: string, token: string | null): Promise<ReadResult> {
  const response = await request.get(`${dataUrl()}/${query}`, { headers: headers(token) });
  if (response.status() !== 200) {
    return { status: response.status(), rows: [], malformed: false };
  }
  let body: unknown;
  try {
    body = JSON.parse(await response.text());
  } catch {
    body = undefined;
  }
  const ok = Array.isArray(body) && body.every((row) => row !== null && typeof row === 'object' && !Array.isArray(row));
  return { status: 200, rows: ok ? (body as Row[]) : [], malformed: !ok };
}

// An insert the smoke rows expect to be refused; returns the status only, never the body.
export async function insertRow(
  request: APIRequestContext,
  relation: string,
  row: Row,
  token: string | null,
): Promise<number> {
  const response = await request.post(`${dataUrl()}/${relation}`, {
    headers: { ...headers(token), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    data: row,
  });
  return response.status();
}

// A refusal by authorization: 401 or 403 (the Data API's answers to a missing grant or a row
// security policy that admits no row).
export const REFUSED_BY_AUTHORIZATION = [401, 403];

// A read that shows no row: refused by authorization, or a well-formed empty list. Any other
// answer (an error of the service, a malformed body) is not evidence of no row.
export function showsNoRow(result: ReadResult): boolean {
  if (REFUSED_BY_AUTHORIZATION.includes(result.status)) return true;
  return result.status === 200 && !result.malformed && result.rows.length === 0;
}
