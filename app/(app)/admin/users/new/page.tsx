import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminPage } from "@/lib/auth";
import { createUser } from "../actions";
import { UserForm } from "../user-form";

export default async function NewUserPage() {
  await requireAdminPage();

  return (
    <div className="grid gap-4">
      <Link href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground">
        ← All users
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add a user</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm action={createUser} mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
