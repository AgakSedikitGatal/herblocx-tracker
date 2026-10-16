import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { TASK_STATUS_VALUES } from "@/lib/constants";
import type { Enums } from "@/lib/database.types";
import { getPeople } from "@/lib/people";
import { createClient } from "@/lib/supabase/server";
import { createTask } from "../actions";
import { TaskForm } from "../task-form";

export default async function NewTaskPage({ searchParams }: PageProps<"/tasks/new">) {
  const viewer = await requireProfile();
  const { status, milestone } = await searchParams;
  const supabase = await createClient();

  const [people, { data: milestones }] = await Promise.all([
    getPeople(supabase),
    supabase.from("milestones").select("id, title").order("start_date"),
  ]);
  const milestoneOptions = (milestones ?? []).map((m) => ({ id: m.id, name: m.title }));

  const startStatus = TASK_STATUS_VALUES.includes(status as Enums<"task_status">)
    ? (status as string)
    : "todo";
  const startMilestone = milestoneOptions.some((m) => m.id === milestone) ? (milestone as string) : "";

  return (
    <div className="grid gap-4">
      <Link href="/board" className="text-sm text-muted-foreground hover:text-foreground">
        ← Board
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New task</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskForm
            action={createTask}
            people={people.choices}
            milestones={milestoneOptions}
            submitLabel="Create task"
            initial={{
              title: "",
              description: "",
              status: startStatus,
              assigneeId: viewer.id,
              department: viewer.job_role,
              priority: "medium",
              dueDate: "",
              milestoneId: startMilestone,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
