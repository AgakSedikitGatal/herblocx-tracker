import {
  ArrowRightLeft,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import type { ActivityKind, Segment } from "@/lib/activity";
import { dayLabel } from "@/lib/format";

export type ActivityRow = {
  id: number;
  actor: string;
  kind: ActivityKind;
  segments: Segment[];
  day: string; // "2026/10/16" (Jakarta)
  time: string; // "14:30" (Jakarta)
  taskTitle: string;
  taskHref: string | null; // null = the task was deleted since
};

const ICONS: Record<ActivityKind, { icon: LucideIcon; label: string; tone: string }> = {
  created: { icon: Plus, label: "Created", tone: "bg-accent text-accent-foreground" },
  moved: { icon: ArrowRightLeft, label: "Status change", tone: "bg-status-progress text-status-progress-foreground" },
  assigned: { icon: UserRound, label: "Assignment", tone: "bg-muted text-foreground" },
  edited: { icon: Pencil, label: "Edit", tone: "bg-muted text-foreground" },
  comment: { icon: MessageSquare, label: "Comment", tone: "bg-status-review text-status-review-foreground" },
  file: { icon: Paperclip, label: "File or link", tone: "bg-muted text-foreground" },
  deleted: { icon: Trash2, label: "Deleted", tone: "bg-destructive/10 text-destructive" },
};

// The log grouped by day, one line per event:
// [icon] Admin moved Prepare Q4 budget [To Do] → [In Progress]          14:32
// `showTask` = name the task in each line (Activity page, Dashboard); off inside a task's own history.
export function ActivityList({ rows, showTask }: { rows: ActivityRow[]; showTask: boolean }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No activity yet.</p>;

  const days: { day: string; rows: ActivityRow[] }[] = [];
  for (const row of rows) {
    const last = days[days.length - 1];
    if (last?.day === row.day) last.rows.push(row);
    else days.push({ day: row.day, rows: [row] });
  }

  return (
    <div className="grid gap-4">
      {days.map((group) => (
        <section key={group.day} className="grid gap-1">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {dayLabel(group.day)}
          </h3>
          <ol className="divide-y rounded-lg border bg-card">
            {group.rows.map((row) => (
              <Line key={row.id} row={row} showTask={showTask} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function Line({ row, showTask }: { row: ActivityRow; showTask: boolean }) {
  const { icon: Icon, label, tone } = ICONS[row.kind];

  return (
    <li className="flex items-start gap-3 px-3 py-2 text-sm">
      <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${tone}`} title={label}>
        <Icon className="size-3.5" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>
      <p className="min-w-0 flex-1 leading-6">
        <span className="font-semibold">{row.actor}</span>{" "}
        {groupStatusChanges(row.segments).map((part, i) =>
          Array.isArray(part) ? (
            // Keep "To Do → In Progress" on one line.
            <span key={i} className="whitespace-nowrap">
              {part.map((segment, j) => (
                <SegmentView key={j} segment={segment} row={row} showTask={showTask} />
              ))}
            </span>
          ) : (
            <SegmentView key={i} segment={part} row={row} showTask={showTask} />
          ),
        )}
      </p>
      <time className="shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums">{row.time}</time>
    </li>
  );
}

// [status] [→] [status] becomes one group so it never wraps in the middle.
function groupStatusChanges(segments: Segment[]): (Segment | Segment[])[] {
  const parts: (Segment | Segment[])[] = [];
  for (let i = 0; i < segments.length; i++) {
    const [a, b, c] = [segments[i], segments[i + 1], segments[i + 2]];
    if (a.t === "status" && b?.t === "text" && b.v === "→" && c?.t === "status") {
      parts.push([a, b, c]);
      i += 2;
    } else {
      parts.push(a);
    }
  }
  return parts;
}

function SegmentView({ segment, row, showTask }: { segment: Segment; row: ActivityRow; showTask: boolean }) {
  switch (segment.t) {
    case "text":
      return <>{segment.v} </>;
    case "em":
      return <><span className="font-medium">{segment.v}</span> </>;
    case "status":
      return <><StatusBadge status={segment.v} className="align-middle" /> </>;
    case "task":
      if (!showTask) return <>the task </>;
      return row.taskHref ? (
        <>
          <Link href={row.taskHref} className="font-medium text-primary hover:underline">
            {row.taskTitle}
          </Link>{" "}
        </>
      ) : (
        <>
          <span className="font-medium">{row.taskTitle}</span>{" "}
          <span className="text-muted-foreground">(deleted)</span>{" "}
        </>
      );
  }
}
