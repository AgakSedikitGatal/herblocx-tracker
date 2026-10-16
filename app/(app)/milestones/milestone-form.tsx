"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type Values = {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  ownerId: string;
};

export function MilestoneForm({
  action,
  initial,
  people,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial: Values;
  people: { id: string; name: string }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const v = (state.values as Values | undefined) ?? initial;

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
          rows={4}
          maxLength={5000}
          defaultValue={v.description}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" required defaultValue={v.startDate} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" name="endDate" type="date" required defaultValue={v.endDate} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ownerId">Owner</Label>
        <NativeSelect id="ownerId" name="ownerId" required className="w-full" defaultValue={v.ownerId}>
          <NativeSelectOption value="" disabled>
            Choose an owner
          </NativeSelectOption>
          {people.map((person) => (
            <NativeSelectOption key={person.id} value={person.id}>
              {person.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
