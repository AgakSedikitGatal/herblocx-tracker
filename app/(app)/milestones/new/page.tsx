import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { jakartaToday } from "@/lib/format";
import { getPeople } from "@/lib/people";
import { canManageMilestones } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { createMilestone } from "../actions";
import { MilestoneForm } from "../milestone-form";

export default async function NewMilestonePage() {
  const viewer = await requireProfile();
  if (!canManageMilestones(viewer)) redirect("/milestones");
  const { choices } = await getPeople(await createClient());
  const today = jakartaToday();

  return (
    <div className="grid gap-4">
      <Link href="/milestones" className="text-sm text-muted-foreground hover:text-foreground">
        ← All milestones
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New milestone</CardTitle>
        </CardHeader>
        <CardContent>
          <MilestoneForm
            action={createMilestone}
            people={choices}
            submitLabel="Create milestone"
            initial={{ title: "", description: "", startDate: today, endDate: "", ownerId: viewer.id }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
