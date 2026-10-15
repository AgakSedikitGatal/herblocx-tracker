"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants";
import { setUserActive, setUserPassword } from "../actions";

export function SetPasswordForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    setUserPassword.bind(null, userId),
    {},
  );

  return (
    <form action={formAction} className="grid max-w-md gap-4">
      <FormMessage state={state} />
      <div className="grid gap-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="text"
          autoComplete="off"
          required
          minLength={PASSWORD_MIN_LENGTH}
        />
        <p className="text-xs text-muted-foreground">
          Use this when someone forgot their password. At least {PASSWORD_MIN_LENGTH} characters.
        </p>
      </div>
      <Button type="submit" variant="outline" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}

export function ActiveToggle({ userId, isActive }: { userId: string; isActive: boolean }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    setUserActive.bind(null, userId, !isActive),
    {},
  );

  return (
    <form
      action={formAction}
      className="grid max-w-md gap-4"
      onSubmit={(event) => {
        const question = isActive
          ? "Deactivate this account? The person will be logged out and blocked. Their history stays."
          : "Reactivate this account? The person will be able to log in again.";
        if (!window.confirm(question)) event.preventDefault();
      }}
    >
      <FormMessage state={state} />
      <p className="text-sm text-muted-foreground">
        {isActive
          ? "Deactivating blocks this person from logging in and from seeing anything. Their tasks, comments and history stay. You can reactivate them later."
          : "This account is deactivated. Reactivating lets the person log in again with their old password."}
      </p>
      <Button
        type="submit"
        variant={isActive ? "destructive" : "default"}
        disabled={pending}
        className="w-fit"
      >
        {pending ? "Saving…" : isActive ? "Deactivate account" : "Reactivate account"}
      </Button>
    </form>
  );
}
