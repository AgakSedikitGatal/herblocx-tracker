"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { JOB_ROLES, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";

export type TaskFormValues = {
  title: string;
  description: string;
  status: string;
  assigneeId: string;
  department: string;
  priority: string;
  dueDate: string;
  milestoneId: string;
};

type Option = { id: string; name: string };

export function TaskForm({
  action,
  initial,
  people,
  milestones,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial: TaskFormValues;
  people: Option[];
  milestones: Option[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const v = (state.values as TaskFormValues | undefined) ?? initial;

  return (
    <form action={formAction} className="grid max-w-xl gap-4">
      <FormMessage state={state} />
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required maxLength={200} defaultValue={v.title} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={5}
          maxLength={10000}
          defaultValue={v.description}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Status" name="status" value={v.status} required>
          {TASK_STATUSES.map((s) => (
            <NativeSelectOption key={s.value} value={s.value}>
              {s.label}
            </NativeSelectOption>
          ))}
        </SelectField>
        <SelectField label="Priority" name="priority" value={v.priority} required>
          {TASK_PRIORITIES.map((p) => (
            <NativeSelectOption key={p.value} value={p.value}>
              {p.label}
            </NativeSelectOption>
          ))}
        </SelectField>
        <SelectField label="Assignee" name="assigneeId" value={v.assigneeId}>
          <NativeSelectOption value="">Unassigned</NativeSelectOption>
          {people.map((person) => (
            <NativeSelectOption key={person.id} value={person.id}>
              {person.name}
            </NativeSelectOption>
          ))}
        </SelectField>
        <SelectField label="Role / department" name="department" value={v.department} required>
          {JOB_ROLES.map((role) => (
            <NativeSelectOption key={role.value} value={role.value}>
              {role.label}
            </NativeSelectOption>
          ))}
        </SelectField>
        <div className="grid gap-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" required defaultValue={v.dueDate} />
        </div>
        <SelectField label="Milestone" name="milestoneId" value={v.milestoneId}>
          <NativeSelectOption value="">No milestone</NativeSelectOption>
          {milestones.map((m) => (
            <NativeSelectOption key={m.id} value={m.id}>
              {m.name}
            </NativeSelectOption>
          ))}
        </SelectField>
      </div>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

function SelectField({
  label,
  name,
  value,
  required,
  children,
}: {
  label: string;
  name: string;
  value: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <NativeSelect id={name} name={name} required={required} className="w-full" defaultValue={value}>
        {children}
      </NativeSelect>
    </div>
  );
}
