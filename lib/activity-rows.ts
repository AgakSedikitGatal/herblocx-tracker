import type { ActivityRow } from "@/components/activity-list";
import { actorName, describeActivity, type ActivityEntry } from "@/lib/activity";
import { formatDateTime } from "@/lib/format";
import type { getPeople } from "@/lib/people";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;
type People = Awaited<ReturnType<typeof getPeople>>;

// Turns log entries into display rows, linking tasks that still exist.
export async function toActivityRows(
  supabase: Client,
  entries: ActivityEntry[],
  people: People,
): Promise<ActivityRow[]> {
  const taskIds = [...new Set(entries.map((e) => e.task_id).filter((id): id is string => !!id))];
  const [{ data: liveTasks }, { data: milestones }] = await Promise.all([
    taskIds.length
      ? supabase.from("tasks").select("id").in("id", taskIds)
      : Promise.resolve({ data: [] as { id: string }[] }),
    supabase.from("milestones").select("id, title"),
  ]);
  const live = new Set((liveTasks ?? []).map((t) => t.id));
  const milestoneName = new Map((milestones ?? []).map((m) => [m.id, m.title]));
  const lookups = { nameOf: people.nameOf, milestoneTitle: (id: string) => milestoneName.get(id) };

  return entries.map((entry) => ({
    id: entry.id,
    actor: actorName(entry, lookups),
    sentence: describeActivity(entry, lookups),
    when: formatDateTime(entry.created_at),
    taskTitle: entry.task_title,
    taskHref: entry.task_id && live.has(entry.task_id) ? `/tasks/${entry.task_id}` : null,
  }));
}
