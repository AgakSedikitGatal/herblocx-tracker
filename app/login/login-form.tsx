"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOGIN_EMAIL_DOMAIN } from "@/lib/constants";
import { login } from "./actions";

export function LoginForm({ notice }: { notice?: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(login, {
    error: notice,
  });

  return (
    <form action={formAction} className="grid gap-4">
      <FormMessage state={state} />
      <div className="grid gap-2">
        <Label htmlFor="login">Username</Label>
        <Input
          id="login"
          name="login"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state.values?.login}
        />
        <p className="text-xs text-muted-foreground">
          For example <span className="font-mono">budi</span> or{" "}
          <span className="font-mono">budi@{LOGIN_EMAIL_DOMAIN}</span>
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
