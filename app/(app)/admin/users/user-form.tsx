"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { JOB_ROLES, LOGIN_EMAIL_DOMAIN, PASSWORD_MIN_LENGTH } from "@/lib/constants";

type Initial = { fullName: string; username: string; jobRole: string; isAdmin: boolean };

export function UserForm({
  action,
  initial,
  mode,
  isSelf = false,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial?: Initial;
  mode: "create" | "edit";
  isSelf?: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const v = state.values;

  return (
    <form action={formAction} className="grid max-w-md gap-4">
      <FormMessage state={state} />
      <div className="grid gap-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          name="fullName"
          required
          maxLength={100}
          defaultValue={v?.fullName ?? initial?.fullName}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="username">Username</Label>
        <div className="flex items-center gap-2">
          <Input
            id="username"
            name="username"
            required
            autoCapitalize="none"
            spellCheck={false}
            maxLength={40}
            defaultValue={v?.username ?? initial?.username}
          />
          <span className="text-sm whitespace-nowrap text-muted-foreground">
            @{LOGIN_EMAIL_DOMAIN}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Lowercase letters, numbers, dot, dash or underscore. The person logs in with this.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="jobRole">Job role</Label>
        <NativeSelect
          id="jobRole"
          name="jobRole"
          required
          className="w-full"
          defaultValue={v?.jobRole ?? initial?.jobRole ?? ""}
        >
          <NativeSelectOption value="" disabled>
            Choose a job role
          </NativeSelectOption>
          {JOB_ROLES.map((role) => (
            <NativeSelectOption key={role.value} value={role.value}>
              {role.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isAdmin"
            className="size-4 accent-primary"
            disabled={isSelf}
            defaultChecked={!isSelf && v ? v.isAdmin === "on" : initial?.isAdmin}
          />
          Admin permission (can manage user accounts)
        </label>
        {isSelf && (
          <p className="text-xs text-muted-foreground">
            You cannot remove your own Admin permission.
          </p>
        )}
      </div>
      {mode === "create" && (
        <div className="grid gap-2">
          <Label htmlFor="password">First password</Label>
          <Input
            id="password"
            name="password"
            type="text"
            autoComplete="off"
            required
            minLength={PASSWORD_MIN_LENGTH}
          />
          <p className="text-xs text-muted-foreground">
            At least {PASSWORD_MIN_LENGTH} characters. Share it privately; the person can change it
            after logging in.
          </p>
        </div>
      )}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : mode === "create" ? "Create account" : "Save changes"}
      </Button>
    </form>
  );
}
