// The data interface the client uses: the Data API and sign-in of the local Supabase
// interface over the exposed schema (Locked, Architecture; Local test environment, row
// Data interface). The client's scenarios read it only to observe what the client
// wrote or what a run recorded (AC-14a, AC-21b), with the local publishable key and the
// owner's session; the database is never read. Header names follow Supabase's Data API
// (UNVERIFIED; check: backend 40c and 40d pass against the stack #40 builds).
import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';
import { lastJsonObject, runBackend } from './backend';
import { requireEnv } from './env';

export type Row = Record<string, unknown>;
// malformed: a 200 answer whose body is not a JSON array of rows (invalid JSON included);
// never read as an empty result. Scenarios take rows only through expectRows below.
export type ReadResult = { status: number; rows: Row[]; malformed: boolean };

// The development sign-in (Locked, Local test environment) for the seeded owner: the
// backend command prints {"access_token": "..."} as its last line. The method is OD-21's.
export function signInOwner(): string {
  const result = runBackend(['sign-in', 'owner']);
  const token = lastJsonObject(result.stdout)?.access_token;
  if (result.exitCode !== 0 || typeof token !== 'string' || token === '') {
    throw new Error(`The development sign-in for owner returned no session (exit ${result.exitCode}).`);
  }
  return token;
}

export function dataUrl(): string {
  return requireEnv('E2E_DATA_URL', 'the Data API address of the local Supabase interface').replace(/\/+$/, '');
}

export async function readRelation(request: APIRequestContext, relation: string, token: string): Promise<ReadResult> {
  const key = requireEnv('E2E_PUBLISHABLE_KEY', 'the local publishable key of the local Supabase interface');
  const response = await request.get(`${dataUrl()}/${relation}?select=*`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  if (response.status() !== 200) {
    return { status: response.status(), rows: [], malformed: false };
  }
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  const ok = Array.isArray(body) && body.every((row) => row !== null && typeof row === 'object' && !Array.isArray(row));
  return { status: 200, rows: ok ? (body as Row[]) : [], malformed: !ok };
}

// The one way a scenario uses the rows of a read (round 20 R20-3): the read must be a
// successful, well-formed list (status 200, malformed false) before any count or equality
// is taken from it, so an empty or invalid answer is never evidence.
export function expectRows(result: ReadResult, why: string): Row[] {
  expect(result.status, `${why}: the read answers 200`).toBe(200);
  expect(result.malformed, `${why}: the read answers a well-formed list of rows`).toBe(false);
  return result.rows;
}

// The row count of a read for an expect.poll, or -1 unless the read is a well-formed 200
// list, so a malformed or refused answer never counts as a number of rows.
export function wellFormedCount(result: ReadResult): number {
  return result.status === 200 && !result.malformed ? result.rows.length : -1;
}
