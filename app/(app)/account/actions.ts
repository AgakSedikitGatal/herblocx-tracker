"use server";

import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { FormState } from "@/components/form-message";
import { getAuthState } from "@/lib/auth";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `The new password needs at least ${PASSWORD_MIN_LENGTH} characters.`)
      .max(PASSWORD_MAX_LENGTH, `The new password can have at most ${PASSWORD_MAX_LENGTH} characters.`),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "The two new passwords do not match.",
  });

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const { profile } = await getAuthState();
  if (!profile) return { error: "Your session has ended. Please log in again." };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Confirm the current password with a separate, throw-away login that does not touch
  // this browser's session, then close that extra session straight away.
  const checker = createStatelessClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
  const { error: checkError } = await checker.auth.signInWithPassword({
    email: profile.email,
    password: parsed.data.currentPassword,
  });
  if (checkError) return { error: "Your current password is not correct." };
  await checker.auth.signOut({ scope: "local" });

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) {
    if (error.code === "same_password") {
      return { error: "The new password must be different from the current one." };
    }
    if (error.code === "weak_password") {
      return { error: "That password is too weak. Please choose a longer one." };
    }
    return { error: `Could not change the password: ${error.message}` };
  }

  return { success: "Your password has been changed." };
}
