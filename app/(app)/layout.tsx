import Link from "next/link";
import { logout } from "@/app/login/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { APP_NAME, jobRoleLabel } from "@/lib/constants";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await requireProfile();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="font-semibold">
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/board" className="text-muted-foreground hover:text-foreground">
              Board
            </Link>
            <Link href="/milestones" className="text-muted-foreground hover:text-foreground">
              Milestones
            </Link>
            <Link href="/activity" className="text-muted-foreground hover:text-foreground">
              Activity
            </Link>
            {profile.is_admin && (
              <Link href="/admin/users" className="text-muted-foreground hover:text-foreground">
                Users
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span>
              {profile.full_name}{" "}
              <span className="text-muted-foreground">· {jobRoleLabel(profile.job_role)}</span>
            </span>
            {profile.is_admin && <Badge variant="secondary">Admin</Badge>}
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
