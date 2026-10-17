import Link from "next/link";
import { ActivityList } from "@/components/activity-list";
import { Button } from "@/components/ui/button";
import { ACTIVITY_FILTERS } from "@/lib/activity";
import { toActivityRows } from "@/lib/activity-rows";
import { requireProfile } from "@/lib/auth";
import { JOB_ROLE_VALUES } from "@/lib/constants";
import type { Enums } from "@/lib/database.types";
import { getPeople } from "@/lib/people";
import { createClient } from "@/lib/supabase/server";
import { ActivityFilters, type ActivityFilterValues } from "./filters";

const PAGE_SIZE = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ActivityPage({ searchParams }: PageProps<"/activity">) {
  await requireProfile();
  const params = await searchParams;
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const filters: ActivityFilterValues = {
    person: UUID.test(one("person")) ? one("person") : "",
    division: JOB_ROLE_VALUES.includes(one("division") as Enums<"job_role">) ? one("division") : "",
    kind: ACTIVITY_FILTERS.some((k) => k.value === one("kind")) ? one("kind") : "",
  };
  const page = Math.max(1, Math.min(10_000, Number.parseInt(one("page") || "1", 10) || 1));
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const people = await getPeople(supabase);

  let query = supabase
    .from("activity_log")
    .select("*", { count: "exact" })
    .order("id", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (filters.person) query = query.eq("actor_id", filters.person);
  if (filters.division) {
    const ids = people.people.filter((p) => p.job_role === filters.division).map((p) => p.id);
    query = query.in("actor_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }
  if (filters.kind) query = query.in("action", ACTIVITY_FILTERS.find((k) => k.value === filters.kind)!.actions);

  const { data: entries, count } = await query;
  const rows = await toActivityRows(supabase, entries ?? [], people);
  const lastPage = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const pageHref = (n: number) => {
    const q = new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), page: String(n) });
    return `/activity?${q}`;
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Everything that happened to tasks, newest first. Recorded automatically by the database;
          nobody, Admin included, can edit or delete these entries.
        </p>
      </div>

      <ActivityFilters
        current={filters}
        people={people.people.map((p) => ({ id: p.id, name: people.nameOf(p.id)! }))}
      />

      {rows.length === 0 && (filters.person || filters.division || filters.kind) ? (
        <p className="text-sm text-muted-foreground">Nothing matches these filters.</p>
      ) : (
        <ActivityList showTask rows={rows} />
      )}

      {lastPage > 1 && (
        <nav className="flex items-center gap-3 text-sm" aria-label="Pages">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page - 1)}>Newer</Link>
            </Button>
          ) : null}
          <span className="text-muted-foreground">
            Page {page} of {lastPage}
          </span>
          {page < lastPage ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page + 1)}>Older</Link>
            </Button>
          ) : null}
        </nav>
      )}
    </div>
  );
}
