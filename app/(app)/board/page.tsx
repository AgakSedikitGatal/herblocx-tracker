import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { JOB_ROLE_VALUES, jobRoleLabel } from "@/lib/constants";
import type { Enums } from "@/lib/database.types";
import { jakartaToday } from "@/lib/format";
import { getPeople } from "@/lib/people";
import { canEditTask } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { Board, type BoardTask } from "./board";
import { BoardFilters, type BoardFilterValues } from "./filters";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readFilters(params: Record<string, string | string[] | undefined>): BoardFilterValues {
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const idOrNone = (value: string) => (value === "none" || UUID.test(value) ? value : "");
  const role = one("role");
  return {
    assignee: idOrNone(one("assignee")),
    role: JOB_ROLE_VALUES.includes(role as Enums<"job_role">) ? role : "",
    milestone: idOrNone(one("milestone")),
    overdue: one("overdue") === "1",
  };
}

export default async function BoardPage({ searchParams }: PageProps<"/board">) {
  const viewer = await requireProfile();
  const filters = readFilters(await searchParams);
  const supabase = await createClient();

  let query = supabase
    .from("task_board")
    .select("*")
    .order("priority", { ascending: false }) // Urgent first
    .order("due_date")
    .order("created_at");
  if (filters.assignee === "none") query = query.is("assignee_id", null);
  else if (filters.assignee) query = query.eq("assignee_id", filters.assignee);
  if (filters.role) query = query.eq("department", filters.role as Enums<"job_role">);
  if (filters.milestone === "none") query = query.is("milestone_id", null);
  else if (filters.milestone) query = query.eq("milestone_id", filters.milestone);
  if (filters.overdue) query = query.eq("is_overdue", true);

  const [{ data: rows }, people, { data: milestones }] = await Promise.all([
    query,
    getPeople(supabase),
    supabase.from("milestones").select("id, title").order("start_date"),
  ]);
  const milestoneTitle = new Map((milestones ?? []).map((m) => [m.id, m.title]));

  const tasks: BoardTask[] = (rows ?? []).map((t) => ({
    id: t.id!,
    title: t.title!,
    status: t.status!,
    priority: t.priority!,
    dueDate: t.due_date!,
    assigneeName: people.nameOf(t.assignee_id),
    departmentLabel: jobRoleLabel(t.department!),
    milestoneTitle: t.milestone_id ? (milestoneTitle.get(t.milestone_id) ?? null) : null,
    canEdit: canEditTask(viewer, t),
  }));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Board</h1>
        <Button asChild>
          <Link href="/tasks/new">New task</Link>
        </Button>
      </div>
      <BoardFilters
        current={filters}
        people={people.people.map((p) => ({ id: p.id, name: people.nameOf(p.id)! }))}
        milestones={(milestones ?? []).map((m) => ({ id: m.id, name: m.title }))}
      />
      <p className="text-xs text-muted-foreground">
        Drag a card to another column to change its status. You can move tasks you created or are
        assigned to{viewer.is_admin || viewer.job_role === "director" ? " (you can move every task)" : ""}.
      </p>
      {/* A new key resets the board whenever the filters change. */}
      <Board key={JSON.stringify(filters)} initialTasks={tasks} today={jakartaToday()} />
    </div>
  );
}
