// All dates and times are shown in Asia/Jakarta (WIB) as YYYY/MM/DD and YYYY/MM/DD HH:mm.

const jakartaParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function partsOf(date: Date) {
  const parts = Object.fromEntries(
    jakartaParts.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return parts as Record<"year" | "month" | "day" | "hour" | "minute", string>;
}

// A calendar date from the database ("2026-10-15") -> "2026/10/15". No time zone shift.
export function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10).replaceAll("-", "/");
}

// A moment in time (timestamptz) -> "2026/10/15 14:30" in Jakarta time.
export function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  const p = partsOf(new Date(value));
  return `${p.year}/${p.month}/${p.day} ${p.hour}:${p.minute}`;
}

// A moment in time (timestamptz) -> its Jakarta calendar date, "2026/10/15".
export function formatDateOfTimestamp(value: string | null | undefined) {
  return formatDateTime(value).slice(0, 10);
}

// Today's date in Jakarta as "2026-10-15" (the format date inputs and the database use).
export function jakartaToday() {
  const p = partsOf(new Date());
  return `${p.year}-${p.month}-${p.day}`;
}

// A moment in time -> its Jakarta clock time, "14:30".
export function formatTimeOfTimestamp(value: string | null | undefined) {
  return formatDateTime(value).slice(11);
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// "2026/10/16" -> "Today" / "Yesterday" / "Mon, 2026/10/12" (relative to today in Jakarta).
export function dayLabel(day: string) {
  const today = jakartaToday().replaceAll("-", "/");
  const [y, m, d] = day.split("/").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const yesterday = new Date(Date.parse(today.replaceAll("/", "-")) - 86_400_000).toISOString().slice(0, 10).replaceAll("-", "/");
  if (day === today) return "Today";
  if (day === yesterday) return "Yesterday";
  return `${WEEKDAY_NAMES[date.getUTCDay()]}, ${day}`;
}
