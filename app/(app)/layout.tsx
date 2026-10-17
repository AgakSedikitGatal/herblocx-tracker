import Link from "next/link";
import { logout } from "@/app/login/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { APP_NAME, jobRoleLabel } from "@/lib/constants";
import { NavLinks } from "./nav-links";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await requireProfile();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span
              aria-hidden="true"
              className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
            >
              H
            </span>
            {APP_NAME}
          </Link>
          <NavLinks isAdmin={profile.is_admin} />
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span>
              {profile.full_name}{" "}
              <span className="text-muted-foreground">· {jobRoleLabel(profile.job_role)}</span>
            </span>
            {profile.is_admin && <Badge className="bg-accent text-accent-foreground">Admin</Badge>}
            <Link href="/account" className="text-muted-foreground hover:text-foreground">
              Change password
            </Link>
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
