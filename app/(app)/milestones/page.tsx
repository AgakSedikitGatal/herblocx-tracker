import Link from "next/link";
import { ProgressBar } from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireProfile } from "@/lib/auth";
import { formatDate, jakartaToday } from "@/lib/format";
import { getPeople } from "@/lib/people";
import { canManageMilestones } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { Timeline } from "./timeline";
import { MilestoneViewTabs } from "./view-tabs";

export default async function MilestonesPage() {
  const viewer = await requireProfile();
  const supabase = await createClient();

  const [{ data: milestones }, { data: progress }, people] = await Promise.all([
    supabase.from("milestones").select("*").order("start_date").order("end_date"),
    supabase.from("milestone_progress").select("*"),
    getPeople(supabase),
  ]);
  const progressById = new Map((progress ?? []).map((p) => [p.milestone_id, p]));
  const today = jakartaToday();

  const rows = (milestones ?? []).map((m) => {
    const p = progressById.get(m.id);
    return {
      ...m,
      progress: p?.progress_pct ?? 0,
      done: p?.done_tasks ?? 0,
      total: p?.total_tasks ?? 0,
    };
  });

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Milestones</h1>
        {canManageMilestones(viewer) && (
          <Button asChild>
            <Link href="/milestones/new">New milestone</Link>
          </Button>
        )}
      </div>
      <MilestoneViewTabs active="timeline" />

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No milestones yet.</p>
      ) : (
        <>
          <Timeline
            today={today}
            items={rows.map((m) => ({
              id: m.id,
              title: m.title,
              startDate: m.start_date,
              endDate: m.end_date,
              progress: m.progress,
            }))}
          />

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead className="w-48">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      <Link href={`/milestones/${m.id}`} className="hover:underline">
                        {m.title}
                      </Link>
                    </TableCell>
                    <TableCell>{people.nameOf(m.owner_id)}</TableCell>
                    <TableCell>{formatDate(m.start_date)}</TableCell>
                    <TableCell>{formatDate(m.end_date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ProgressBar value={m.progress} />
                        <span className="w-24 text-xs whitespace-nowrap text-muted-foreground">
                          {m.progress}% ({m.done}/{m.total})
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Progress = tasks in Done ÷ all tasks in the milestone.
          </p>
        </>
      )}
    </div>
  );
}
