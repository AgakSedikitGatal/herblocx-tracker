import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityList } from "@/components/activity-list";
import { DeleteButton } from "@/components/delete-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { actorName, describeActivity } from "@/lib/activity";
import { jobRoleLabel, taskPriorityLabel, taskStatusLabel } from "@/lib/constants";
import { formatDate, formatDateTime, jakartaToday } from "@/lib/format";
import { getPeople } from "@/lib/people";
import { canDeleteTask, canEditTask } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { deleteTask, updateTask } from "../actions";
import { TaskForm } from "../task-form";
import { Comments } from "./comments";

export default async function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  const viewer = await requireProfile();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: task }, people, { data: milestones }, { data: comments }, { data: history }] =
    await Promise.all([
      supabase.from("tasks").select("*").eq("id", id).maybeSingle(),
      getPeople(supabase),
      supabase.from("milestones").select("id, title").order("start_date"),
      supabase.from("task_comments").select("*").eq("task_id", id).order("created_at"),
      supabase
        .from("activity_log")
        .select("*")
        .eq("task_id", id)
        .order("id", { ascending: false })
        .limit(200),
    ]);
  if (!task) notFound();

  const milestoneName = new Map((milestones ?? []).map((m) => [m.id, m.title]));
  const lookups = { nameOf: people.nameOf, milestoneTitle: (mid: string) => milestoneName.get(mid) };
  const canEdit = canEditTask(viewer, task);
  const overdue = task.status !== "done" && task.due_date < jakartaToday();

  return (
    <div className="grid gap-4">
      <Link href="/board" className="text-sm text-muted-foreground hover:text-foreground">
        ← Board
      </Link>
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{task.title}</h1>
          <Badge variant="secondary">{taskStatusLabel(task.status)}</Badge>
          {overdue && <Badge variant="destructive">Overdue</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          Created by {people.nameOf(task.created_by)} on {formatDateTime(task.created_at)} · Last
          changed {formatDateTime(task.updated_at)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{canEdit ? "Edit task" : "Details"}</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <TaskForm
              action={updateTask.bind(null, task.id)}
              people={people.choicesWith(task.assignee_id)}
              milestones={(milestones ?? []).map((m) => ({ id: m.id, name: m.title }))}
              submitLabel="Save changes"
              initial={{
                title: task.title,
                description: task.description,
                status: task.status,
                assigneeId: task.assignee_id ?? "",
                department: task.department,
                priority: task.priority,
                dueDate: task.due_date,
                milestoneId: task.milestone_id ?? "",
              }}
            />
          ) : (
            <div className="grid gap-4 text-sm">
              <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2">
                <dt className="text-muted-foreground">Assignee</dt>
                <dd>{people.nameOf(task.assignee_id) ?? "Unassigned"}</dd>
                <dt className="text-muted-foreground">Role / department</dt>
                <dd>{jobRoleLabel(task.department)}</dd>
                <dt className="text-muted-foreground">Priority</dt>
                <dd>{taskPriorityLabel(task.priority)}</dd>
                <dt className="text-muted-foreground">Due date</dt>
                <dd>{formatDate(task.due_date)}</dd>
                <dt className="text-muted-foreground">Milestone</dt>
                <dd>
                  {task.milestone_id ? (
                    <Link href={`/milestones/${task.milestone_id}`} className="hover:underline">
                      {milestoneName.get(task.milestone_id)}
                    </Link>
                  ) : (
                    "No milestone"
                  )}
                </dd>
              </dl>
              <p className="whitespace-pre-wrap">
                {task.description || <span className="text-muted-foreground">No description.</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                Only the creator, the assignee
                {task.department === "finance" || task.department === "head_of_finance"
                  ? ", Head of Finance"
                  : ""}
                , Director and Admin can edit this task.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <Comments
            taskId={task.id}
            comments={(comments ?? []).map((c) => ({
              id: c.id,
              authorName: people.nameOf(c.author_id) ?? "Unknown",
              body: c.body,
              createdAt: formatDateTime(c.created_at),
              edited: c.edited_at !== null,
              canEdit: c.author_id === viewer.id,
              canDelete: c.author_id === viewer.id || viewer.is_admin,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <ActivityList
            showTask={false}
            rows={(history ?? []).map((entry) => ({
              id: entry.id,
              actor: actorName(entry, lookups),
              sentence: describeActivity(entry, lookups),
              when: formatDateTime(entry.created_at),
            }))}
          />
          <p className="text-xs text-muted-foreground">
            Recorded automatically by the database. Nobody can edit or delete history entries.
          </p>
        </CardContent>
      </Card>

      {canDeleteTask(viewer, task) && (
        <Card>
          <CardHeader>
            <CardTitle>Delete</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              The task is removed; its entry in the activity log stays.
            </p>
            <DeleteButton
              action={deleteTask.bind(null, task.id)}
              label="Delete task"
              question="Delete this task? This cannot be undone."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
