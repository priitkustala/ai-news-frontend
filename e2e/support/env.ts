// Values the scenarios need from the local test environment. None is guessed here:
// the environment bootstrap story (#40) writes each value into e2e/README.md
// (section Variables the scenarios read). An unset value fails the scenario with
// an error that names it.
import { randomBytes } from 'node:crypto';
import path from 'node:path';

export function requireEnv(name: string, what: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set (${what}). The environment bootstrap story (#40) writes its value ` +
        'into e2e/README.md, section Variables the scenarios read.',
    );
  }
  return value;
}

// A marker unique to this run, put into the names of the data a scenario creates
// (regression contract, Scenario rules 4).
export function runMarker(): string {
  return `e2e-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
}

// Today's run date (YYYY-MM-DD) in the run time zone. The time zone is OD-09 (OPEN),
// so it is read from the environment and never assumed.
export function runDateToday(): string {
  const timeZone = requireEnv('E2E_RUN_TIME_ZONE', 'the run time zone of OD-09');
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(),
  );
}

// The repository this e2e/ folder belongs to (support/ sits in <repository>/e2e/support).
export function repositoryRoot(): string {
  return path.resolve(__dirname, '..', '..');
}

// The folder of the built client that the local server serves (AC-20e scans it).
export function builtClientDir(): string {
  return requireEnv('E2E_BUILT_CLIENT_DIR', 'the folder of the built client served on localhost');
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
  'November', 'December'];

// A run date as the screens show it: "28 Oct 2026" (artboards 01 and 07, last-updated)
// or "28 October 2026" (artboards 16 and 17, briefing-date).
export function shownDate(runDate: string): RegExp {
  const [year, month, day] = runDate.split('-').map(Number);
  const name = MONTHS[month - 1];
  return new RegExp(`\\b${day} ${name.slice(0, 3)}(${name.slice(3)})? ${year}\\b`);
}

// A publication time as the screens show it: "27 Oct 2026, 14:20" (artboards 01, 11 and 12:
// feed-item-time and article-time), in the run time zone of E2E_RUN_TIME_ZONE (OD-09 OPEN:
// the zone is the binding's, never assumed here). instant is the fixture manifest's
// published_at for the item, an ISO 8601 instant (round 20 R20-4).
export function shownTime(instant: string): string {
  const timeZone = requireEnv('E2E_RUN_TIME_ZONE', 'the run time zone of OD-09');
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`The fixture manifest's published_at is not an ISO 8601 instant: ${instant}`);
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${Number(parts.day)} ${MONTHS[Number(parts.month) - 1].slice(0, 3)} ${parts.year}, ${parts.hour}:${parts.minute}`;
}
