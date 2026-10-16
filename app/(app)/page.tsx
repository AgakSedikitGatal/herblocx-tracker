import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { ActivityList } from "@/components/activity-list";
import { ProgressBar } from "@/components/progress-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toActivityRows } from "@/lib/activity-rows";
import { requireProfile } from "@/lib/auth";
import { TASK_STATUSES, jobRoleLabel } from "@/lib/constants";
import { formatDate, jakartaToday } from "@/lib/format";
import { getPeople } from "@/lib/people";
import { createClient } from "@/lib/supabase/server";

const DAY = 86_400_000;

function daysLate(dueDate: string, today: string) {
  return Math.round((Date.parse(today) - Date.parse(dueDate)) / DAY);
}

export default async function DashboardPage() {
  const viewer = await requireProfile();
  const supabase = await createClient();
  const today = jakartaToday();

  const [
    { data: statusCounts },
    { data: overdue, count: overdueCount },
    { data: milestones },
    { data: progress },
    { data: workload },
    { data: recent },
    people,
  ] = await Promise.all([
    supabase.from("task_status_counts").select("*"),
    supabase
      .from("task_board")
      .select("id, title, assignee_id, due_date", { count: "exact" })
      .eq("is_overdue", true)
      .order("due_date")
      .limit(10),
    supabase.from("milestones").select("id, title, end_date").order("start_date"),
    supabase.from("milestone_progress").select("*"),
    supabase
      .from("person_workload")
      .select("*")
      .order("open_tasks", { ascending: false })
      .order("full_name"),
    supabase.from("activity_log").select("*").order("id", { ascending: false }).limit(20),
    getPeople(supabase),
  ]);

  const countByStatus = new Map((statusCounts ?? []).map((s) => [s.status, s.task_count ?? 0]));
  const progressById = new Map((progress ?? []).map((p) => [p.milestone_id, p]));
  const maxOpen = Math.max(1, ...(workload ?? []).map((w) => w.open_tasks ?? 0));
  const activityRows = await toActivityRows(supabase, recent ?? [], people);

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome, {viewer.full_name} · Today is {formatDate(today)} (Jakarta)
        </p>
      </div>

      {/* Tasks by status, plus overdue */}
      <section aria-label="Tasks by status" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {TASK_STATUSES.map((s) => (
          <StatTile key={s.value} label={s.label} value={countByStatus.get(s.value) ?? 0} href="/board" />
        ))}
        <StatTile
          label="Overdue"
          value={overdueCount ?? 0}
          href="/board?overdue=1"
          alert={(overdueCount ?? 0) > 0}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Overdue tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {!overdue?.length ? (
                <p className="text-sm text-muted-foreground">Nothing is overdue. 🎉</p>
              ) : (
                <ul className="grid gap-2 text-sm">
                  {overdue.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-baseline gap-x-2">
                      <Link href={`/tasks/${t.id}`} className="font-medium hover:underline">
                        {t.title}
                      </Link>
                      <span className="text-muted-foreground">
                        {people.nameOf(t.assignee_id) ?? "Unassigned"} · due {formatDate(t.due_date)}
                      </span>
                      <span className="font-medium text-destructive">
                        {daysLate(t.due_date!, today)} day{daysLate(t.due_date!, today) === 1 ? "" : "s"} late
                      </span>
                    </li>
                  ))}
                  {(overdueCount ?? 0) > overdue.length && (
                    <li>
                      <Link href="/board?overdue=1" className="text-muted-foreground hover:underline">
                        See all {overdueCount} overdue tasks →
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progress per milestone</CardTitle>
            </CardHeader>
            <CardContent>
              {!milestones?.length ? (
                <p className="text-sm text-muted-foreground">No milestones yet.</p>
              ) : (
                <ul className="grid gap-3 text-sm">
                  {milestones.map((m) => {
                    const p = progressById.get(m.id);
                    const pct = p?.progress_pct ?? 0;
                    return (
                      <li key={m.id} className="grid gap-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <Link href={`/milestones/${m.id}`} className="font-medium hover:underline">
                            {m.title}
                          </Link>
                          <span className="text-xs whitespace-nowrap text-muted-foreground">
                            {pct}% · {p?.done_tasks ?? 0}/{p?.total_tasks ?? 0} done · ends {formatDate(m.end_date)}
                          </span>
                        </div>
                        <ProgressBar value={pct} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workload per person</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="text-xs text-muted-foreground">Open tasks = assigned and not Done.</p>
              <ul className="grid gap-2 text-sm">
                {(workload ?? []).map((w) => {
                  const open = w.open_tasks ?? 0;
                  const late = w.overdue_tasks ?? 0;
                  return (
                    <li
                      key={w.profile_id}
                      className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3"
                      title={`${w.full_name}: ${open} open, ${late} overdue`}
                    >
                      <Link
                        href={`/board?assignee=${w.profile_id}`}
                        className="truncate hover:underline"
                      >
                        {w.full_name}
                        <span className="block text-xs text-muted-foreground">
                          {w.job_role ? jobRoleLabel(w.job_role) : ""}
                        </span>
                      </Link>
                      <div className="h-2 rounded-full bg-muted">
                        {open > 0 && (
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${(open / maxOpen) * 100}%` }}
                          />
                        )}
                      </div>
                      <span className="text-xs whitespace-nowrap">
                        {open} open
                        {late > 0 && <span className="text-destructive"> · {late} overdue</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="content-start">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <ActivityList showTask rows={activityRows} />
            <Link href="/activity" className="text-sm text-muted-foreground hover:underline">
              All activity →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  href,
  alert = false,
}: {
  label: string;
  value: number;
  href: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`grid gap-1 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50 ${
        alert ? "border-destructive/50" : ""
      }`}
    >
      <span className={`flex items-center gap-1 text-xs ${alert ? "text-destructive" : "text-muted-foreground"}`}>
        {alert && <TriangleAlert className="size-3.5" aria-hidden="true" />}
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </Link>
  );
}
