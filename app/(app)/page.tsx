import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";

export default async function HomePage() {
  const profile = await requireProfile();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Welcome, {profile.full_name}</CardTitle>
        <CardDescription>
          Use <strong>Board</strong> for tasks and <strong>Milestones</strong> for the timeline (top
          menu). The dashboard will appear here in a later phase.
        </CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
