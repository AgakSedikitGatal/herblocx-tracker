import type { Enums } from "@/lib/database.types";

export const APP_NAME = "HerblocX Tracker";

// Accounts are internal to this website. Login names look like emails only because
// Supabase requires that; no email is ever sent to these addresses.
export const LOGIN_EMAIL_DOMAIN = "herblocx.internal";

export const JOB_ROLES: { value: Enums<"job_role">; label: string }[] = [
  { value: "director", label: "Director" },
  { value: "head_of_finance", label: "Head of Finance" },
  { value: "finance", label: "Finance" },
  { value: "marketing", label: "Marketing" },
  { value: "software_dev", label: "Software Dev" },
  { value: "legal", label: "Legal" },
];

export const JOB_ROLE_VALUES = JOB_ROLES.map((role) => role.value) as [
  Enums<"job_role">,
  ...Enums<"job_role">[],
];

export function jobRoleLabel(role: Enums<"job_role">) {
  return JOB_ROLES.find((r) => r.value === role)?.label ?? role;
}

export const PASSWORD_MIN_LENGTH = 8;
// Supabase ignores anything past 72 characters, so longer passwords are refused.
export const PASSWORD_MAX_LENGTH = 72;

export const TASK_STATUSES: { value: Enums<"task_status">; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
];

export const TASK_STATUS_VALUES = TASK_STATUSES.map((s) => s.value) as [
  Enums<"task_status">,
  ...Enums<"task_status">[],
];

export function taskStatusLabel(status: Enums<"task_status">) {
  return TASK_STATUSES.find((s) => s.value === status)?.label ?? status;
}

// Highest first, the order cards are sorted in on the board.
export const TASK_PRIORITIES: { value: Enums<"task_priority">; label: string }[] = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export const TASK_PRIORITY_VALUES = TASK_PRIORITIES.map((p) => p.value) as [
  Enums<"task_priority">,
  ...Enums<"task_priority">[],
];

export function taskPriorityLabel(priority: Enums<"task_priority">) {
  return TASK_PRIORITIES.find((p) => p.value === priority)?.label ?? priority;
}
