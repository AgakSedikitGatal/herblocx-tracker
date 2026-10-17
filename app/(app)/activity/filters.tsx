"use client";

import Form from "next/form";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ACTIVITY_FILTERS } from "@/lib/activity";
import { JOB_ROLES } from "@/lib/constants";

export type ActivityFilterValues = { person: string; division: string; kind: string };

// Changing a filter reloads the list; the filter is kept in the address bar.
export function ActivityFilters({
  current,
  people,
}: {
  current: ActivityFilterValues;
  people: { id: string; name: string }[];
}) {
  const submit = (event: React.ChangeEvent<HTMLSelectElement>) => event.currentTarget.form?.requestSubmit();
  const active = current.person || current.division || current.kind;

  return (
    <Form action="/activity" className="flex flex-wrap items-end gap-3">
      <div className="grid gap-1">
        <Label htmlFor="person" className="text-xs">Person</Label>
        <NativeSelect id="person" name="person" size="sm" defaultValue={current.person} onChange={submit}>
          <NativeSelectOption value="">Everyone</NativeSelectOption>
          {people.map((p) => (
            <NativeSelectOption key={p.id} value={p.id}>
              {p.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="division" className="text-xs">Division (of the person)</Label>
        <NativeSelect id="division" name="division" size="sm" defaultValue={current.division} onChange={submit}>
          <NativeSelectOption value="">All divisions</NativeSelectOption>
          {JOB_ROLES.map((r) => (
            <NativeSelectOption key={r.value} value={r.value}>
              {r.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="kind" className="text-xs">What happened</Label>
        <NativeSelect id="kind" name="kind" size="sm" defaultValue={current.kind} onChange={submit}>
          <NativeSelectOption value="">Everything</NativeSelectOption>
          {ACTIVITY_FILTERS.map((k) => (
            <NativeSelectOption key={k.value} value={k.value}>
              {k.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {active && (
        <Link href="/activity" className="h-7 text-sm leading-7 text-muted-foreground underline-offset-4 hover:underline">
          Clear filters
        </Link>
      )}
    </Form>
  );
}
