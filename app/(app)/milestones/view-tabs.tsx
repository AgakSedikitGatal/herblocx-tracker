import Link from "next/link";

// Switches between the two milestone views.
export function MilestoneViewTabs({ active }: { active: "timeline" | "calendar" }) {
  const tab = (key: "timeline" | "calendar", label: string, href: string) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={`rounded-md px-3 py-1 text-sm ${
        active === key ? "bg-background font-medium shadow-xs" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav aria-label="Milestone views" className="flex w-fit gap-1 rounded-lg bg-muted p-1">
      {tab("timeline", "Timeline", "/milestones")}
      {tab("calendar", "Calendar", "/milestones/calendar")}
    </nav>
  );
}
