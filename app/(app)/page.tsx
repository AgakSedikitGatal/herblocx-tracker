import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";

export default async function HomePage() {
  const profile = await requireProfile();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Welcome, {profile.full_name}</CardTitle>
        <CardDescription>
          You are logged in. Milestones, the task board and the dashboard will appear here in the
          next phases.
        </CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
