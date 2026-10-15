"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/form-message";
import { getAdminForAction } from "@/lib/auth";
import { JOB_ROLE_VALUES, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/constants";
import { toLoginEmail, USERNAME_PATTERN } from "@/lib/login-name";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Every action here re-checks that the caller is an active Admin. Profile changes go
// through the Admin's own session, so the database permission rules apply as well.
// The secret-key client is used only for the login system itself.

const NOT_ADMIN: FormState = { error: "Only an active Admin can do this." };
// "Block forever": Supabase needs a duration, so ~100 years.
const BAN_FOREVER = "876000h";

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `The password needs at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `The password can have at most ${PASSWORD_MAX_LENGTH} characters.`);

const userFields = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Enter the person's full name.")
    .max(100, "The name can have at most 100 characters."),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      USERNAME_PATTERN,
      "Username: 2–40 characters, lowercase letters, numbers, dot, dash or underscore, starting with a letter or number.",
    ),
  jobRole: z.enum(JOB_ROLE_VALUES, { message: "Choose a job role." }),
  isAdmin: z.boolean(),
});

function readUserFields(formData: FormData) {
  return {
    fullName: String(formData.get("fullName") ?? ""),
    username: String(formData.get("username") ?? ""),
    jobRole: String(formData.get("jobRole") ?? ""),
    isAdmin: formData.get("isAdmin") === "on",
  };
}

function echo(raw: ReturnType<typeof readUserFields>) {
  return {
    fullName: raw.fullName,
    username: raw.username,
    jobRole: raw.jobRole,
    isAdmin: raw.isAdmin ? "on" : "",
  };
}

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await getAdminForAction())) return NOT_ADMIN;

  const raw = readUserFields(formData);
  const parsed = userFields.extend({ password }).safeParse({
    ...raw,
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: echo(raw) };
  const { fullName, username, jobRole, isAdmin } = parsed.data;

  const { data, error } = await createAdminClient().auth.admin.createUser({
    email: toLoginEmail(username),
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: fullName, job_role: jobRole },
  });
  if (error || !data.user) {
    if (error?.code === "email_exists") {
      return { error: `The username "${username}" is already taken.`, values: echo(raw) };
    }
    if (error?.code === "weak_password") {
      return { error: "That password is too weak. Please choose a longer one.", values: echo(raw) };
    }
    return {
      error: `Could not create the account: ${error?.message ?? "unknown error"}`,
      values: echo(raw),
    };
  }

  // New accounts start switched off (a database safety rule). Switch this one on.
  const supabase = await createClient();
  const { error: activateError } = await supabase
    .from("profiles")
    .update({ is_active: true, is_admin: isAdmin })
    .eq("id", data.user.id)
    .select("id")
    .single();
  if (activateError) {
    return {
      error:
        "The account was created but could not be switched on. Open it from the user list and click Reactivate.",
    };
  }

  revalidatePath("/admin/users");
  redirect(`/admin/users?created=${encodeURIComponent(username)}`);
}

export async function updateUser(
  userId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await getAdminForAction();
  if (!admin) return NOT_ADMIN;

  const raw = readUserFields(formData);
  const parsed = userFields.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: echo(raw) };
  const { fullName, username, jobRole, isAdmin } = parsed.data;

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  if (!current) return { error: "This account no longer exists." };

  const newEmail = toLoginEmail(username);
  if (newEmail !== current.email) {
    // Changing the login name is a login-system change, so it needs the secret key.
    // A database trigger copies the new address into the profile.
    const { error } = await createAdminClient().auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true,
    });
    if (error) {
      if (error.code === "email_exists") {
        return { error: `The username "${username}" is already taken.`, values: echo(raw) };
      }
      return { error: `Could not change the username: ${error.message}`, values: echo(raw) };
    }
  }

  const changes =
    userId === admin.id
      ? { full_name: fullName, job_role: jobRole } // an Admin cannot change their own Admin flag
      : { full_name: fullName, job_role: jobRole, is_admin: isAdmin };
  const { error } = await supabase
    .from("profiles")
    .update(changes)
    .eq("id", userId)
    .select("id")
    .single();
  if (error) return { error: `Could not save: ${error.message}`, values: echo(raw) };

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/", "layout");
  return { success: "Saved.", values: echo(raw) };
}

export async function setUserPassword(
  userId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await getAdminForAction())) return NOT_ADMIN;

  const parsed = password.safeParse(String(formData.get("password") ?? ""));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await createAdminClient().auth.admin.updateUserById(userId, {
    password: parsed.data,
  });
  if (error) {
    if (error.code === "weak_password") {
      return { error: "That password is too weak. Please choose a longer one." };
    }
    return { error: `Could not set the password: ${error.message}` };
  }
  return { success: "New password set. Share it with the person privately." };
}

export async function setUserActive(userId: string, active: boolean): Promise<FormState> {
  const admin = await getAdminForAction();
  if (!admin) return NOT_ADMIN;
  if (userId === admin.id) return { error: "You cannot deactivate your own account." };

  const supabase = await createClient();
  const authAdmin = createAdminClient().auth.admin;

  if (active) {
    const { error: unbanError } = await authAdmin.updateUserById(userId, { ban_duration: "none" });
    if (unbanError) return { error: `Could not unblock the login: ${unbanError.message}` };
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: true })
      .eq("id", userId)
      .select("id")
      .single();
    if (error) return { error: `Could not reactivate: ${error.message}` };
  } else {
    // Block the login, then switch off access in the database. The database switch takes
    // effect immediately, even for a browser that is still logged in.
    const { error: banError } = await authAdmin.updateUserById(userId, {
      ban_duration: BAN_FOREVER,
    });
    if (banError) return { error: `Could not block the login: ${banError.message}` };
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", userId)
      .select("id")
      .single();
    if (error) {
      return {
        error: `The login is blocked, but switching off access failed (${error.message}). Click Deactivate again.`,
      };
    }
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: active ? "Account reactivated." : "Account deactivated." };
}
