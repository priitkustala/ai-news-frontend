// 53-SMOKE-c (smoke, @surface-data, project api): priitkustala/ai-news#53, production smoke suite after every
// deploy; criterion (edge case): when the last ingestion run is older than the schedule window, the smoke run
// fails and names that check.
// Given a visitor (the publishable key only, no session), when the last-updated columns of ingestion_runs are
// read as the client's last-updated line reads them (src/feed/index.ts: run_date and ended_at of the newest
// completed run), then the newest completed run's run_date is at most E2E_SMOKE_MAX_RUN_AGE_DAYS days (default 1)
// before today in E2E_RUN_TIME_ZONE; otherwise the failure starts with freshness: and names the run date found
// and the window. Read only: no seed, no development sign-in, no job command.
// Why no session (owner decision of 2026-11-12): migration 0015 of ai-news-backend#47 grants these columns of
// ingestion_runs to anon only; a signed-in user who is not the owner reads no run row.
// Limit: on the hosted project this row works only while guest reading is open there (settlement F5).
import { test } from '@playwright/test';
import { expectRows } from '../../support/data';
import { runDateToday } from '../../support/env';
import { maxRunAgeDays, readQuery } from '../../support/smoke';

const DAY_MS = 24 * 60 * 60 * 1000;

test(
  '53-SMOKE-c: the newest completed ingestion run is within the window',
  { tag: ['@tier-smoke', '@journey-read-feed', '@surface-data', '@story-53'] },
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

    // Then: its run date is at most the window's days before today
    const runDate = typeof rows[0]?.run_date === 'string' ? (rows[0].run_date as string) : null;
    const age = runDate === null ? Infinity : (Date.parse(runDateToday()) - Date.parse(runDate)) / DAY_MS;
    if (!(age <= window)) {
      throw new Error(`freshness: newest completed run date ${runDate ?? 'none'}, window ${window} days`);
    }
  },
);
