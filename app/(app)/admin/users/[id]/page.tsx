import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminPage } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { toUsername } from "@/lib/login-name";
import { createClient } from "@/lib/supabase/server";
import { updateUser } from "../actions";
import { UserForm } from "../user-form";
import { ActiveToggle, SetPasswordForm } from "./account-controls";

export default async function EditUserPage({ params }: PageProps<"/admin/users/[id]">) {
  const admin = await requireAdminPage();
  const { id } = await params;

  const supabase = await createClient();
  const { data: user } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!user) notFound();

  const isSelf = user.id === admin.id;

  return (
    <div className="grid gap-4">
      <Link href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground">
        ← All users
      </Link>
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{user.full_name}</h1>
        {user.is_active ? (
          <Badge variant="secondary">Active</Badge>
        ) : (
          <Badge variant="destructive">Inactive</Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">Created {formatDateTime(user.created_at)}</p>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm
            action={updateUser.bind(null, user.id)}
            mode="edit"
            isSelf={isSelf}
            initial={{
              fullName: user.full_name,
              username: toUsername(user.email),
              jobRole: user.job_role,
              isAdmin: user.is_admin,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <SetPasswordForm userId={user.id} />
        </CardContent>
      </Card>

      {!isSelf && (
        <Card>
          <CardHeader>
            <CardTitle>Access</CardTitle>
          </CardHeader>
          <CardContent>
            <ActiveToggle userId={user.id} isActive={user.is_active} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
