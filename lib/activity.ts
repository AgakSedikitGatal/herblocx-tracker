import { jobRoleLabel, taskPriorityLabel } from "@/lib/constants";
import type { Enums, Json, Tables } from "@/lib/database.types";
import { formatDate } from "@/lib/format";

// Turns an activity log entry (written by the database triggers) into a short, structured
// sentence, e.g. [moved] [task] [To Do] → [In Progress], so the screen can style each part.

export type ActivityEntry = Tables<"activity_log">;

export type ActivityKind = "created" | "moved" | "assigned" | "edited" | "comment" | "file" | "deleted";

export type Segment =
  | { t: "text"; v: string } // plain words
  | { t: "em"; v: string } // a name or value, shown in medium weight
  | { t: "status"; v: Enums<"task_status"> } // a coloured status chip
  | { t: "task" }; // the task's title (a link), or "the task" inside a task's own history

export type DescribedActivity = { kind: ActivityKind; segments: Segment[] };

// Which log actions belong to each filter on the Activity page.
export const ACTIVITY_FILTERS: { value: string; label: string; actions: Enums<"activity_action">[] }[] = [
  { value: "status", label: "Status changes", actions: ["status_changed"] },
  { value: "assign", label: "Assignments", actions: ["reassigned"] },
  { value: "edit", label: "Task edits", actions: ["task_updated"] },
  { value: "created", label: "Created / deleted", actions: ["task_created", "task_deleted"] },
  { value: "comment", label: "Comments", actions: ["commented", "comment_edited", "comment_deleted"] },
  { value: "file", label: "Files and links", actions: ["attachment_added", "attachment_removed"] },
];

type Lookups = {
  nameOf: (id: string | null | undefined) => string | null;
  milestoneTitle: (id: string) => string | undefined;
};

type Details = Record<string, Json | undefined>;

function asDetails(value: Json | undefined): Details {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Details) : {};
}

function text(value: Json | undefined) {
  return typeof value === "string" ? value : null;
}

const STATUSES = new Set(["todo", "in_progress", "review", "done"]);
function status(value: Json | undefined): Segment {
  const v = text(value);
  return v && STATUSES.has(v) ? { t: "status", v: v as Enums<"task_status"> } : { t: "em", v: "?" };
}

function describeField(field: string, value: Json | undefined, lookups: Lookups) {
  const v = text(value);
  if (v === null) return "none";
  switch (field) {
    case "priority":
      return taskPriorityLabel(v as Enums<"task_priority">);
    case "department":
      return jobRoleLabel(v as Enums<"job_role">);
    case "due_date":
      return formatDate(v);
    case "milestone_id":
      return lookups.milestoneTitle(v) ?? "a deleted milestone";
    default:
      return v;
  }
}

const FIELD_LABELS: Record<string, string> = {
  title: "title",
  description: "description",
  department: "division",
  priority: "priority",
  due_date: "due date",
  milestone_id: "milestone",
};

const t = (v: string): Segment => ({ t: "text", v });
const em = (v: string): Segment => ({ t: "em", v });
const TASK: Segment = { t: "task" };

export function describeActivity(entry: ActivityEntry, lookups: Lookups): DescribedActivity {
  const d = asDetails(entry.details);

  switch (entry.action) {
    case "task_created":
      return { kind: "created", segments: [t("created"), TASK] };
    case "task_deleted":
      return { kind: "deleted", segments: [t("deleted"), TASK] };
    case "status_changed":
      return { kind: "moved", segments: [t("moved"), TASK, status(d.from), t("→"), status(d.to)] };
    case "reassigned": {
      const from = lookups.nameOf(text(d.from));
      const to = lookups.nameOf(text(d.to));
      if (!from && to) return { kind: "assigned", segments: [t("assigned"), TASK, t("to"), em(to)] };
      if (from && !to) return { kind: "assigned", segments: [t("unassigned"), TASK, t(`(was ${from})`)] };
      return { kind: "assigned", segments: [t("reassigned"), TASK, t("from"), em(from ?? "?"), t("to"), em(to ?? "?")] };
    }
    case "task_updated": {
      const changes = Object.entries(asDetails(d.changes));
      const segments: Segment[] = [t("updated"), TASK];
      changes.forEach(([field, change]) => {
        segments.push(t("·"));
        if (field === "description") {
          segments.push(em("description"));
          return;
        }
        const c = asDetails(change);
        segments.push(
          t(FIELD_LABELS[field] ?? field),
          em(describeField(field, c.from, lookups)),
          t("→"),
          em(describeField(field, c.to, lookups)),
        );
      });
      return { kind: "edited", segments };
    }
    case "commented":
      return { kind: "comment", segments: [t("commented on"), TASK] };
    case "comment_edited":
      return { kind: "comment", segments: [t("edited a comment on"), TASK] };
    case "comment_deleted": {
      const author = text(d.author_id);
      const by = author && author !== entry.actor_id ? [t("by"), em(lookups.nameOf(author) ?? "?")] : [];
      return { kind: "comment", segments: [t("deleted a comment"), ...by, t("on"), TASK] };
    }
    case "attachment_added":
    case "attachment_removed": {
      const kind = text(d.kind) === "file" ? "file" : "link";
      const added = entry.action === "attachment_added";
      return {
        kind: "file",
        segments: [t(added ? `added the ${kind}` : `removed the ${kind}`), em(text(d.name) ?? ""), t(added ? "to" : "from"), TASK],
      };
    }
    default:
      return { kind: "edited", segments: [t(entry.action)] };
  }
}

// Who did it. Changes made outside the app (e.g. in the Supabase dashboard) have no person.
export function actorName(entry: ActivityEntry, lookups: Lookups) {
  return entry.actor_id ? (lookups.nameOf(entry.actor_id) ?? "Unknown") : "System";
}
