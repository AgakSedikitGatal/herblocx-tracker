import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  WEEKDAYS,
  isSameMonth,
  monthGrid,
  monthKey,
  monthTitle,
  parseMonth,
  shiftMonth,
} from "@/lib/calendar";
import { taskPriorityLabel, taskStatusLabel } from "@/lib/constants";
import type { Enums } from "@/lib/database.types";
import { formatDate, jakartaToday } from "@/lib/format";
import { getPeople } from "@/lib/people";
import { createClient } from "@/lib/supabase/server";

const VISIBLE_PER_DAY = 3;

type CalendarItem =
  | { kind: "milestone"; id: string; title: string }
  | {
      kind: "task";
      id: string;
      title: string;
      status: Enums<"task_status">;
      priority: Enums<"task_priority">;
      overdue: boolean;
      assignee: string;
    };

// Month view of every task's due date and every milestone's end date, shown at the top of
// the Milestones page. Nothing is entered here by hand: it is all read from the tasks and
// milestones. `monthParam` is the page's ?month=YYYY-MM.
export async function MonthCalendar({ monthParam }: { monthParam: unknown }) {
  const today = jakartaToday();
  const { year, month } = parseMonth(monthParam, today);
  const weeks = monthGrid(year, month);
  const firstDay = weeks[0][0];
  const lastDay = weeks[weeks.length - 1][6];

  const supabase = await createClient();
  const [{ data: tasks }, { data: milestones }, people] = await Promise.all([
    supabase
      .from("task_board")
      .select("id, title, status, priority, due_date, assignee_id, is_overdue")
      .gte("due_date", firstDay)
      .lte("due_date", lastDay)
      .order("priority", { ascending: false })
      .order("title"),
    supabase
      .from("milestones")
      .select("id, title, end_date")
      .gte("end_date", firstDay)
      .lte("end_date", lastDay)
      .order("title"),
    getPeople(supabase),
  ]);

  // Group everything by date: milestone deadlines first, then tasks (Urgent first).
  const byDate = new Map<string, CalendarItem[]>();
  const add = (date: string, item: CalendarItem) => byDate.set(date, [...(byDate.get(date) ?? []), item]);
  for (const m of milestones ?? []) add(m.end_date, { kind: "milestone", id: m.id, title: m.title });
  for (const t of tasks ?? []) {
    add(t.due_date!, {
      kind: "task",
      id: t.id!,
      title: t.title!,
      status: t.status!,
      priority: t.priority!,
      overdue: Boolean(t.is_overdue),
      assignee: people.nameOf(t.assignee_id) ?? "Unassigned",
    });
  }

  const inMonth = (tasks ?? []).filter((t) => isSameMonth(t.due_date!, year, month));
  const overdueInMonth = inMonth.filter((t) => t.is_overdue).length;

  return (
    <section aria-label="Calendar" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/milestones?month=${monthKey(+today.slice(0, 4), +today.slice(5, 7))}`}>Today</Link>
          </Button>
          <Button asChild variant="ghost" size="icon-sm" aria-label="Previous month">
            <Link href={`/milestones?month=${shiftMonth(year, month, -1)}`}>
              <ChevronLeft />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon-sm" aria-label="Next month">
            <Link href={`/milestones?month=${shiftMonth(year, month, 1)}`}>
              <ChevronRight />
            </Link>
          </Button>
          <h2 className="text-lg font-medium">{monthTitle(year, month)}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {inMonth.length} task deadline{inMonth.length === 1 ? "" : "s"} this month
          {overdueInMonth > 0 && <span className="text-destructive"> · {overdueInMonth} overdue</span>}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
            {WEEKDAYS.map((day) => (
              <div key={day} className="px-2 py-2">
                {day}
              </div>
            ))}
          </div>
          {weeks.map((week) => (
            <div key={week[0]} className="grid grid-cols-7 border-b last:border-b-0">
              {week.map((date, i) => (
                <DayCell
                  key={date}
                  date={date}
                  items={byDate.get(date) ?? []}
                  outside={!isSameMonth(date, year, month)}
                  isToday={date === today}
                  weekend={i >= 5}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Filled in automatically from each task&apos;s due date.</span>
        <span>◆ Milestone end date</span>
        <span className="text-destructive">Red: overdue</span>
        <span className="line-through">Struck through: done</span>
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-destructive" aria-hidden="true" /> Urgent
        </span>
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" /> High priority
        </span>
      </p>
    </section>
  );
}

function DayCell({
  date,
  items,
  outside,
  isToday,
  weekend,
}: {
  date: string;
  items: CalendarItem[];
  outside: boolean;
  isToday: boolean;
  weekend: boolean;
}) {
  const visible = items.slice(0, VISIBLE_PER_DAY);
  const hidden = items.slice(VISIBLE_PER_DAY);
  const label = `${formatDate(date)}, ${items.length} item${items.length === 1 ? "" : "s"}`;

  return (
    <div
      aria-label={label}
      className={`grid min-h-28 content-start gap-1 border-r p-1.5 last:border-r-0 ${
        outside ? "bg-muted/30 text-muted-foreground" : weekend ? "bg-muted/15" : ""
      }`}
    >
      <span
        className={`flex size-6 items-center justify-center justify-self-start rounded-full text-xs ${
          isToday ? "bg-primary font-semibold text-primary-foreground" : ""
        }`}
      >
        {+date.slice(8, 10)}
      </span>
      {visible.map((item) => (
        <Chip key={`${item.kind}-${item.id}`} item={item} />
      ))}
      {hidden.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted">
            +{hidden.length} more
          </summary>
          <div className="mt-1 grid gap-1">
            {hidden.map((item) => (
              <Chip key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Chip({ item }: { item: CalendarItem }) {
  if (item.kind === "milestone") {
    return (
      <Link
        href={`/milestones/${item.id}`}
        title={`Milestone ends: ${item.title}`}
        className="truncate rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground hover:bg-primary/85"
      >
        ◆ {item.title}
      </Link>
    );
  }

  const done = item.status === "done";
  const dot =
    !done && item.priority === "urgent"
      ? "bg-destructive"
      : !done && item.priority === "high"
        ? "bg-amber-500"
        : null;

  return (
    <Link
      href={`/tasks/${item.id}`}
      title={`${item.title} · ${taskStatusLabel(item.status)} · ${taskPriorityLabel(item.priority)} · ${item.assignee}${item.overdue ? " · OVERDUE" : ""}`}
      className={`flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-xs hover:bg-muted ${
        item.overdue
          ? "bg-destructive/10 font-medium text-destructive"
          : done
            ? "text-muted-foreground line-through"
            : "bg-secondary text-secondary-foreground"
      }`}
    >
      {dot && <span className={`size-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />}
      <span className="truncate">{item.title}</span>
    </Link>
  );
}
