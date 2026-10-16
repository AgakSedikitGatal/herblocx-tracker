import { jobRoleLabel, taskPriorityLabel, taskStatusLabel } from "@/lib/constants";
import type { Enums, Json, Tables } from "@/lib/database.types";
import { formatDate } from "@/lib/format";

// Turns an activity log entry (written by the database triggers) into a short sentence,
// e.g. "moved it from To Do to In Progress".

export type ActivityEntry = Tables<"activity_log">;

type Lookups = {
  nameOf: (id: string | null | undefined) => string | null;
  milestoneTitle: (id: string) => string | undefined;
};

type Details = Record<string, Json | undefined>;

function asDetails(value: Json): Details {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Details) : {};
}

function text(value: Json | undefined) {
  return typeof value === "string" ? value : null;
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
      return `"${lookups.milestoneTitle(v) ?? "a deleted milestone"}"`;
    default:
      return `"${v}"`;
  }
}

const FIELD_LABELS: Record<string, string> = {
  title: "title",
  description: "description",
  department: "role/department",
  priority: "priority",
  due_date: "due date",
  milestone_id: "milestone",
};

export function describeActivity(entry: ActivityEntry, lookups: Lookups): string {
  const d = asDetails(entry.details);

  switch (entry.action) {
    case "task_created":
      return "created the task";
    case "task_deleted":
      return "deleted the task";
    case "status_changed": {
      const from = text(d.from);
      const to = text(d.to);
      return `moved it from ${from ? taskStatusLabel(from as Enums<"task_status">) : "?"} to ${
        to ? taskStatusLabel(to as Enums<"task_status">) : "?"
      }`;
    }
    case "reassigned": {
      const from = lookups.nameOf(text(d.from));
      const to = lookups.nameOf(text(d.to));
      if (!from && to) return `assigned it to ${to}`;
      if (from && !to) return `unassigned it (was ${from})`;
      return `reassigned it from ${from} to ${to}`;
    }
    case "task_updated": {
      const changes = asDetails(d.changes ?? null);
      const parts = Object.entries(changes).map(([field, change]) => {
        const label = FIELD_LABELS[field] ?? field;
        if (field === "description") return "the description";
        const c = asDetails(change ?? null);
        return `${label} from ${describeField(field, c.from, lookups)} to ${describeField(field, c.to, lookups)}`;
      });
      return parts.length ? `changed ${parts.join("; ")}` : "edited the task";
    }
    case "commented":
      return "commented";
    case "comment_edited":
      return "edited a comment";
    case "comment_deleted": {
      const author = text(d.author_id);
      return author && author !== entry.actor_id
        ? `deleted a comment by ${lookups.nameOf(author)}`
        : "deleted a comment";
    }
    case "attachment_added":
    case "attachment_removed": {
      const kind = text(d.kind) === "file" ? "file" : "link";
      const verb = entry.action === "attachment_added" ? "added the" : "removed the";
      return `${verb} ${kind} "${text(d.name) ?? ""}"`;
    }
    default:
      return entry.action;
  }
}

// Who did it. Changes made outside the app (e.g. in the Supabase dashboard) have no person.
export function actorName(entry: ActivityEntry, lookups: Lookups) {
  return entry.actor_id ? (lookups.nameOf(entry.actor_id) ?? "Unknown") : "System";
}
