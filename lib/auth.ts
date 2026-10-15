import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Who is logged in, and their profile. profile is null when the account is deactivated
// (the database hides every row from deactivated accounts).
export const getAuthState = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ?? null;
  if (!userId) return { userId: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return { userId, profile: profile?.is_active ? profile : null };
});

// For pages: logged-out or deactivated people go back to the login page.
export async function requireProfile() {
  const { userId, profile } = await getAuthState();
  if (!userId) redirect("/login");
  if (!profile) redirect("/login?reason=inactive");
  return profile;
}

// For Admin pages: non-Admins are sent to the home page.
export async function requireAdminPage() {
  const profile = await requireProfile();
  if (!profile.is_admin) redirect("/");
  return profile;
}

// For Admin server actions: returns the Admin's profile, or null if the caller is not an active Admin.
export async function getAdminForAction() {
  const { profile } = await getAuthState();
  return profile?.is_admin ? profile : null;
}
