import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdminPage } from "@/lib/auth";
import { jobRoleLabel } from "@/lib/constants";
import { formatDateOfTimestamp } from "@/lib/format";
import { toUsername } from "@/lib/login-name";
import { createClient } from "@/lib/supabase/server";

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireAdminPage();
  const { created } = await searchParams;

  const supabase = await createClient();
  const { data: users, error } = await supabase
    .from("profiles")
    .select("*")
    .order("is_active", { ascending: false })
    .order("full_name");

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Users</h1>
        <Button asChild>
          <Link href="/admin/users/new">Add user</Link>
        </Button>
      </div>

      {typeof created === "string" && (
        <Alert>
          <AlertDescription>
            Account &quot;{created}&quot; created. Share the username and first password with the
            person privately.
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>Could not load users: {error.message}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Job role</TableHead>
              <TableHead>Permission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(users ?? []).map((user) => (
              <TableRow key={user.id} className={user.is_active ? "" : "text-muted-foreground"}>
                <TableCell className="font-medium">{user.full_name}</TableCell>
                <TableCell className="font-mono text-xs">{toUsername(user.email)}</TableCell>
                <TableCell>{jobRoleLabel(user.job_role)}</TableCell>
                <TableCell>{user.is_admin ? <Badge variant="secondary">Admin</Badge> : "—"}</TableCell>
                <TableCell>
                  {user.is_active ? (
                    "Active"
                  ) : (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell>{formatDateOfTimestamp(user.created_at)}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/users/${user.id}`}>Edit</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
