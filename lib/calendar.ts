// Month-grid helpers for the calendar. Works on calendar dates ("2026-10-15") only,
// so there are no time-zone shifts. Weeks run Monday to Sunday.

const DAY = 86_400_000;

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const toTime = (date: string) => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
const toDate = (time: number) => new Date(time).toISOString().slice(0, 10);

// "?month=2026-10" -> { year: 2026, month: 10 }. Anything else -> the month of `today`.
export function parseMonth(param: unknown, today: string) {
  const value = typeof param === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(param) ? param : today.slice(0, 7);
  return { year: +value.slice(0, 4), month: +value.slice(5, 7) };
}

export function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth(year: number, month: number, by: number) {
  const index = year * 12 + (month - 1) + by;
  return monthKey(Math.floor(index / 12), (index % 12) + 1);
}

export function monthTitle(year: number, month: number) {
  return `${MONTHS[month - 1]} ${year}`;
}

// The weeks shown for a month: from the Monday on or before the 1st
// to the Sunday on or after the last day. Each week is 7 "YYYY-MM-DD" dates.
export function monthGrid(year: number, month: number) {
  const first = Date.UTC(year, month - 1, 1);
  const last = Date.UTC(year, month, 0);
  const mondayOffset = (new Date(first).getUTCDay() + 6) % 7; // Monday = 0
  const sundayOffset = 6 - ((new Date(last).getUTCDay() + 6) % 7);
  const weeks: string[][] = [];
  for (let t = first - mondayOffset * DAY; t <= last + sundayOffset * DAY; t += 7 * DAY) {
    weeks.push(Array.from({ length: 7 }, (_, i) => toDate(t + i * DAY)));
  }
  return weeks;
}

export function isSameMonth(date: string, year: number, month: number) {
  return toTime(date) >= Date.UTC(year, month - 1, 1) && toTime(date) <= Date.UTC(year, month, 0);
}
