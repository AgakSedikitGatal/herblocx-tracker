import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getPeople } from "@/lib/people";
import { canDeleteMilestone, canEditMilestone } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { deleteMilestone, updateMilestone } from "../actions";
import { MilestoneForm } from "../milestone-form";

export default async function MilestonePage({ params }: PageProps<"/milestones/[id]">) {
  const viewer = await requireProfile();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: milestone }, { data: progress }, { data: tasks }, people] = await Promise.all([
    supabase.from("milestones").select("*").eq("id", id).maybeSingle(),
    supabase.from("milestone_progress").select("*").eq("milestone_id", id).maybeSingle(),
    supabase
      .from("task_board")
      .select("id, title, status, assignee_id, due_date, is_overdue")
      .eq("milestone_id", id)
      .order("due_date"),
    getPeople(supabase),
  ]);
  if (!milestone) notFound();

  const canEdit = canEditMilestone(viewer, milestone);
  const pct = progress?.progress_pct ?? 0;

  return (
    <div className="grid gap-4">
      <Link href="/milestones" className="text-sm text-muted-foreground hover:text-foreground">
        ← All milestones
      </Link>
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold">{milestone.title}</h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(milestone.start_date)} – {formatDate(milestone.end_date)} · Owner:{" "}
          {people.nameOf(milestone.owner_id)}
        </p>
        <div className="flex max-w-md items-center gap-2 pt-1">
          <ProgressBar value={pct} />
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {pct}% ({progress?.done_tasks ?? 0}/{progress?.total_tasks ?? 0} tasks done)
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks in this milestone</CardTitle>
        </CardHeader>
        <CardContent>
          {!tasks?.length ? (
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
          ) : (
            <ul className="grid gap-2">
              {tasks.map((task) => (
                <li key={task.id} className="flex flex-wrap items-center gap-2 text-sm">
                  {task.status && <StatusBadge status={task.status} />}
                  <Link href={`/tasks/${task.id}`} className="font-medium hover:underline">
                    {task.title}
                  </Link>
                  <span className="text-muted-foreground">
                    · {people.nameOf(task.assignee_id) ?? "Unassigned"} · due {formatDate(task.due_date)}
                  </span>
                  {task.is_overdue && <Badge variant="destructive">Overdue</Badge>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <MilestoneForm
              action={updateMilestone.bind(null, milestone.id)}
              people={people.choicesWith(milestone.owner_id)}
              submitLabel="Save changes"
              initial={{
                title: milestone.title,
                description: milestone.description,
                startDate: milestone.start_date,
                endDate: milestone.end_date,
                ownerId: milestone.owner_id,
              }}
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap">
              {milestone.description || <span className="text-muted-foreground">No description.</span>}
            </p>
          )}
        </CardContent>
      </Card>

      {canDeleteMilestone(viewer) && (
        <Card>
          <CardHeader>
            <CardTitle>Delete</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Deleting a milestone keeps its tasks; they become &quot;No milestone&quot;.
            </p>
            <DeleteButton
              action={deleteMilestone.bind(null, milestone.id)}
              label="Delete milestone"
              question="Delete this milestone? Its tasks stay, without a milestone."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

