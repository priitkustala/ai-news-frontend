// 53-SMOKE-c (smoke, @surface-data, project api): priitkustala/ai-news#53, production smoke suite after every
// deploy; criterion (edge case): when the last ingestion run is older than the schedule window, the smoke run
// fails and names that check.
// Given a visitor (the publishable key only, no session), when the last-updated columns of ingestion_runs are
// read as the client's last-updated line reads them (src/feed/index.ts: run_date and ended_at of the newest
// completed run), then the newest completed run's run_date is at most E2E_SMOKE_MAX_RUN_AGE_DAYS days (default 1)
// before the checked day; otherwise the failure starts with freshness: and names the run date found and the
// window. Read only: no seed, no development sign-in, no job command.
// The checked day (priitkustala/ai-news#198, tag @bug-198): with E2E_FRESHNESS_SLOT_UTC set (only the daily
// freshness workflow sets it, to its schedule time 20:47), the UTC date of the start moment minus that slot
// time, which is the UTC day the run was scheduled for, however late GitHub starts it; a hand-started run checks
// the day a scheduled run started at that moment would check. Without it, the date of the start moment in
// E2E_RUN_TIME_ZONE, as before (smoke.yml and release.yml). The start moment is the real clock, or
// E2E_FRESHNESS_START when set (local runs only).
// Why no session (owner decision of 2026-11-12): migration 0015 of ai-news-backend#47 grants these columns of
// ingestion_runs to anon only; a signed-in user who is not the owner reads no run row.
// Limit: on the hosted project this row works only while guest reading is open there (settlement F5).
import { test } from '@playwright/test';
import { expectRows } from '../../support/data';
import { requireEnv, runDateToday } from '../../support/env';
import { maxRunAgeDays, readQuery } from '../../support/smoke';

const DAY_MS = 24 * 60 * 60 * 1000;

// The start moment of the run: E2E_FRESHNESS_START when it is set (an ISO 8601 UTC moment such as
// 2026-11-17T02:37:39Z, for a local run that stands for a late start), otherwise the real clock.
// No workflow sets it. A malformed value fails the row; there is no fallback.
function startMoment(): Date | null {
  const raw = process.env.E2E_FRESHNESS_START;
  if (raw === undefined) return null;
  const moment = new Date(raw);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(raw) ||
    Number.isNaN(moment.getTime()) ||
    moment.toISOString().slice(0, 19) !== raw.slice(0, 19)
  ) {
    throw new Error('E2E_FRESHNESS_START is not an ISO 8601 UTC moment (YYYY-MM-DDTHH:MM:SSZ).');
  }
  return moment;
}

// The slot time of the daily schedule in minutes after UTC midnight: E2E_FRESHNESS_SLOT_UTC (HH:MM)
// when it is set, otherwise null. A malformed value fails the row; there is no fallback.
function slotMinutes(): number | null {
  const raw = process.env.E2E_FRESHNESS_SLOT_UTC;
  if (raw === undefined) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(raw);
  if (match === null) {
    throw new Error('E2E_FRESHNESS_SLOT_UTC is not a UTC time of day (HH:MM).');
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

// The day the row checks: with a slot time, the UTC date of the start moment minus the slot time
// (the day the run was scheduled for); without one, the date of the start moment in
// E2E_RUN_TIME_ZONE, and with no start moment set either, today's run date exactly as runDateToday
// gives it.
function checkedDay(): string {
  const slot = slotMinutes();
  const moment = startMoment();
  if (slot !== null) {
    return new Date((moment ?? new Date()).getTime() - slot * 60 * 1000).toISOString().slice(0, 10);
  }
  if (moment === null) return runDateToday();
  const timeZone = requireEnv('E2E_RUN_TIME_ZONE', 'the run time zone of OD-09');
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    moment,
  );
}

test(
  '53-SMOKE-c: the newest completed ingestion run is within the window',
  { tag: ['@tier-smoke', '@journey-read-feed', '@surface-data', '@story-53', '@bug-198'] },
  async ({ request }) => {
    // Given: a visitor, no session, and the window
    const window = maxRunAgeDays();

    // When: the newest completed run is read, its last-updated columns only, in the client's order
    const result = await readQuery(
      request,
      'ingestion_runs?select=run_date,ended_at&status=eq.completed&order=ended_at.desc.nullslast,run_date.desc&limit=1',
      null,
    );
    const rows = expectRows(result, 'a visitor reads the last-updated columns of ingestion_runs');

    // Then: its run date is at most the window's days before the checked day
    const runDate = typeof rows[0]?.run_date === 'string' ? (rows[0].run_date as string) : null;
    const age = runDate === null ? Infinity : (Date.parse(checkedDay()) - Date.parse(runDate)) / DAY_MS;
    if (!(age <= window)) {
      throw new Error(`freshness: newest completed run date ${runDate ?? 'none'}, window ${window} days`);
    }
  },
);
