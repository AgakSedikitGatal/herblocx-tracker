"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/form-message";
import { Button } from "@/components/ui/button";

// A delete button that asks for confirmation first and shows any error the server returns.
export function DeleteButton({
  action,
  label,
  question,
}: {
  action: () => Promise<FormState>;
  label: string;
  question: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form
      action={formAction}
      className="grid gap-2"
      onSubmit={(event) => {
        if (!window.confirm(question)) event.preventDefault();
      }}
    >
      <FormMessage state={state} />
      <Button type="submit" variant="destructive" disabled={pending} className="w-fit">
        {pending ? "Deleting…" : label}
      </Button>
    </form>
  );
}
