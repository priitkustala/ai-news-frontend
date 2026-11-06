// Display formats of the feed screen (e2e/tests/README-testids.md, Display formats; artboards
// 01 and 07), in the device's own time zone (the run time zone is OD-09, OPEN): a run date as
// "28 Oct 2026" and an instant as "27 Oct 2026, 14:20" (day without a leading zero, the
// month's first three letters, the year, a comma and the 24-hour time).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const parts = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// A run date (YYYY-MM-DD, a calendar date with no zone) as "2 Nov 2026".
export function shownDate(runDate: string): string {
  const [year, month, day] = runDate.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

// An ISO 8601 instant as "2 Nov 2026, 21:53" in the device's time zone; empty when it is no instant.
export function shownTime(instant: string): string {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '';
  const p = Object.fromEntries(parts.formatToParts(date).map((part) => [part.type, part.value]));
  return `${Number(p.day)} ${MONTHS[Number(p.month) - 1]} ${p.year}, ${p.hour}:${p.minute}`;
}

// The date part of shownTime, without the time of day: "2 Nov 2026"; empty when it is no instant.
export function shownDay(instant: string): string {
  return shownTime(instant).split(',')[0];
}
