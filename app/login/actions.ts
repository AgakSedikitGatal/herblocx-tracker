"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/form-message";
import { toLoginEmail } from "@/lib/login-name";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  login: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
});

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    login: formData.get("login"),
    password: formData.get("password"),
  });
  const login = String(formData.get("login") ?? "");
  if (!parsed.success) {
    return { error: "Enter your username and password.", values: { login } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: toLoginEmail(parsed.data.login),
    password: parsed.data.password,
  });

  if (error) {
    if (error.code === "user_banned") {
      return {
        error: "This account has been deactivated. Please contact your Admin.",
        values: { login },
      };
    }
    if (error.name === "AuthRetryableFetchError" || !error.status) {
      return {
        error: "Cannot reach the login server. Check your internet connection and try again.",
        values: { login },
      };
    }
    if (error.status === 429) {
      return { error: "Too many attempts. Please wait a few minutes.", values: { login } };
    }
    return { error: "Wrong username or password.", values: { login } };
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
