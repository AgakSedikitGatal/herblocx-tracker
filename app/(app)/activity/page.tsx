import Link from "next/link";
import { ActivityList } from "@/components/activity-list";
import { Button } from "@/components/ui/button";
import { toActivityRows } from "@/lib/activity-rows";
import { requireProfile } from "@/lib/auth";
import { getPeople } from "@/lib/people";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 50;

export default async function ActivityPage({ searchParams }: PageProps<"/activity">) {
  await requireProfile();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Math.min(10_000, Number.parseInt(String(pageParam ?? "1"), 10) || 1));
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const [{ data: entries, count }, people] = await Promise.all([
    supabase
      .from("activity_log")
      .select("*", { count: "exact" })
      .order("id", { ascending: false })
      .range(from, from + PAGE_SIZE - 1),
    getPeople(supabase),
  ]);
  const rows = await toActivityRows(supabase, entries ?? [], people);
  const lastPage = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Everything that happened to tasks, newest first. Recorded automatically by the database;
          nobody, Admin included, can edit or delete these entries.
        </p>
      </div>

      <ActivityList showTask rows={rows} />

      {lastPage > 1 && (
        <nav className="flex items-center gap-3 text-sm" aria-label="Pages">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/activity?page=${page - 1}`}>Newer</Link>
            </Button>
          ) : null}
          <span className="text-muted-foreground">
            Page {page} of {lastPage}
          </span>
          {page < lastPage ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/activity?page=${page + 1}`}>Older</Link>
            </Button>
          ) : null}
        </nav>
      )}
    </div>
  );
}
