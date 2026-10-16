import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

// Supabase client in the browser, acting as the logged-in user (database rules apply).
// Used only to upload files straight to storage, so large files never pass through our server.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
