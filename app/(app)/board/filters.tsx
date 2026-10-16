"use client";

import Form from "next/form";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { JOB_ROLES } from "@/lib/constants";

export type BoardFilterValues = {
  assignee: string;
  role: string;
  milestone: string;
  overdue: boolean;
};

type Option = { id: string; name: string };

// Changing any filter reloads the board with the filter in the address bar,
// so a filtered board can be bookmarked or shared.
export function BoardFilters({
  current,
  people,
  milestones,
}: {
  current: BoardFilterValues;
  people: Option[];
  milestones: Option[];
}) {
  const submit = (event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    event.currentTarget.form?.requestSubmit();
  const active = current.assignee || current.role || current.milestone || current.overdue;

  return (
    <Form action="/board" className="flex flex-wrap items-end gap-3">
      <div className="grid gap-1">
        <Label htmlFor="assignee" className="text-xs">Assignee</Label>
        <NativeSelect id="assignee" name="assignee" size="sm" defaultValue={current.assignee} onChange={submit}>
          <NativeSelectOption value="">Everyone</NativeSelectOption>
          <NativeSelectOption value="none">Unassigned</NativeSelectOption>
          {people.map((p) => (
            <NativeSelectOption key={p.id} value={p.id}>
              {p.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="role" className="text-xs">Role / department</Label>
        <NativeSelect id="role" name="role" size="sm" defaultValue={current.role} onChange={submit}>
          <NativeSelectOption value="">All roles</NativeSelectOption>
          {JOB_ROLES.map((r) => (
            <NativeSelectOption key={r.value} value={r.value}>
              {r.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="milestone" className="text-xs">Milestone</Label>
        <NativeSelect id="milestone" name="milestone" size="sm" defaultValue={current.milestone} onChange={submit}>
          <NativeSelectOption value="">All milestones</NativeSelectOption>
          <NativeSelectOption value="none">No milestone</NativeSelectOption>
          {milestones.map((m) => (
            <NativeSelectOption key={m.id} value={m.id}>
              {m.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <label className="flex h-7 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="overdue"
          value="1"
          className="size-4 accent-primary"
          defaultChecked={current.overdue}
          onChange={submit}
        />
        Overdue only
      </label>
      {active && (
        <Link href="/board" className="h-7 text-sm leading-7 text-muted-foreground underline-offset-4 hover:underline">
          Clear filters
        </Link>
      )}
    </Form>
  );
}
