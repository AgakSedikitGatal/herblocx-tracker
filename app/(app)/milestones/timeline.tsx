import Link from "next/link";
import { formatDate } from "@/lib/format";

export type TimelineItem = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  progress: number;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 86_400_000;

// "2026-10-15" -> whole days since 1970-01-01 (calendar dates only, no time zone involved).
function toDay(date: string) {
  return Math.round(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) / DAY);
}

// A simple Gantt-style view: one bar per milestone from its start to its end date,
// filled to its progress, with a line for today (Jakarta).
export function Timeline({ items, today }: { items: TimelineItem[]; today: string }) {
  if (items.length === 0) return null;

  const first = items.reduce((min, m) => (m.startDate < min ? m.startDate : min), items[0].startDate);
  const last = items.reduce((max, m) => (m.endDate > max ? m.endDate : max), items[0].endDate);

  // Widen the range to whole months.
  const rangeStart = toDay(`${first.slice(0, 7)}-01`);
  const lastMonth = new Date(Date.UTC(+last.slice(0, 4), +last.slice(5, 7), 0)); // last day of month
  const rangeEnd = Math.round(lastMonth.getTime() / DAY);
  const total = rangeEnd - rangeStart + 1;
  const pct = (days: number) => `${(days / total) * 100}%`;

  const months: { label: string; start: number; days: number }[] = [];
  for (let day = rangeStart; day <= rangeEnd; ) {
    const d = new Date(day * DAY);
    const daysInMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    const label = d.getUTCMonth() === 0 || months.length === 0
      ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
      : MONTHS[d.getUTCMonth()];
    months.push({ label, start: day - rangeStart, days: daysInMonth });
    day += daysInMonth;
  }

  const todayDay = toDay(today);
  const showToday = todayDay >= rangeStart && todayDay <= rangeEnd;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="min-w-[640px]">
        <div className="flex border-b text-xs text-muted-foreground">
          <div className="w-48 shrink-0 px-3 py-2">Milestone</div>
          <div className="relative h-8 flex-1">
            {months.map((month) => (
              <div
                key={month.start}
                className="absolute top-0 h-full border-l px-1 py-2 whitespace-nowrap"
                style={{ left: pct(month.start), width: pct(month.days) }}
              >
                {month.label}
              </div>
            ))}
          </div>
        </div>
        {items.map((item) => {
          const start = toDay(item.startDate) - rangeStart;
          const length = toDay(item.endDate) - toDay(item.startDate) + 1;
          const late = item.endDate < today && item.progress < 100;
          return (
            <div key={item.id} className="flex border-b last:border-b-0">
              <div className="w-48 shrink-0 truncate px-3 py-2 text-sm">
                <Link href={`/milestones/${item.id}`} className="hover:underline">
                  {item.title}
                </Link>
              </div>
              <div className="relative flex-1 py-2">
                {months.map((month) => (
                  <div
                    key={month.start}
                    className="absolute top-0 h-full border-l border-dashed"
                    style={{ left: pct(month.start) }}
                  />
                ))}
                {showToday && (
                  <div
                    className="absolute top-0 z-10 h-full border-l-2 border-destructive/70"
                    style={{ left: pct(todayDay - rangeStart) }}
                  />
                )}
                <Link
                  href={`/milestones/${item.id}`}
                  title={`${item.title}: ${formatDate(item.startDate)} – ${formatDate(item.endDate)}, ${item.progress}% done`}
                  className={`relative block h-6 overflow-hidden rounded-md border bg-muted ${late ? "border-destructive" : "border-border"}`}
                  style={{ marginLeft: pct(start), width: pct(length) }}
                >
                  <span className="absolute inset-y-0 left-0 bg-primary/70" style={{ width: `${item.progress}%` }} />
                  <span className="relative px-2 text-xs leading-6 font-medium whitespace-nowrap">
                    {item.progress}%
                  </span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
        Red line: today ({formatDate(today)}). Red border: past its end date and not finished.
      </p>
    </div>
  );
}
