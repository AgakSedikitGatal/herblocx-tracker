import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthState } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { profile } = await getAuthState();
  if (profile) redirect("/");

  const { reason } = await searchParams;
  const notice =
    reason === "inactive"
      ? "This account has been deactivated. Please contact your Admin."
      : undefined;

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">{APP_NAME}</CardTitle>
          <CardDescription>Log in with the account your Admin gave you.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm notice={notice} />
        </CardContent>
      </Card>
    </main>
  );
}
