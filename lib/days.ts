/* Dates and the day log.
 *
 * Split out of storage.ts and deliberately dependency-free, the same way
 * playbook.ts and prompt.ts are, so the tests can import it directly instead of
 * going through the bundler's `@/` alias. */

/** Completed action ids, keyed by local date. */
export type DayLog = Record<string, string[]>;

export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Whole days from one date key to another. Built from the keys rather than
 *  timestamps, so a daylight-saving hour can't shift the answer. */
export function daysBetween(from: string, to: string): number {
  const parse = (key: string) => {
    const [year, month, day] = key.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}

/** Days returned to in a row. A day counts once anything is checked off, and
 *  today not being started yet doesn't end the run. */
export function streakFrom(days: DayLog, today = new Date()) {
  let cursor = today;
  if (!(days[dateKey(cursor)]?.length)) cursor = shiftDays(cursor, -1);
  let count = 0;
  while (days[dateKey(cursor)]?.length) {
    count += 1;
    cursor = shiftDays(cursor, -1);
  }
  return count;
}

export type RecentDay = { key: string; label: string; done: number; served: number; isToday: boolean };

/** Today and the days before it, newest first. Seven by default, because the
 *  screen is called Week. The rail asks for fewer so it fits. */
export function recentDays(days: DayLog, served: DayLog = {}, count = 7, today = new Date()): RecentDay[] {
  return Array.from({ length: count }, (_, index) => -index).map((offset) => {
    const date = shiftDays(today, offset);
    const key = dateKey(date);
    const shown = served[key];
    return {
      key,
      label: offset === 0 ? "Today" : new Intl.DateTimeFormat("en", { weekday: "long" }).format(date),
      // Only completions that were actually on offer that day count, so redoing
      // first run can't produce "5 of 3 done".
      done: shown ? (days[key] ?? []).filter((id) => shown.includes(id)).length : (days[key]?.length ?? 0),
      served: shown?.length ?? 3,
      isToday: offset === 0,
    };
  });
}
