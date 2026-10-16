import type { Enums, Tables } from "@/lib/database.types";

// These mirror the database permission rules (supabase/migrations/*_rls.sql) only to
// decide which buttons to show. The database is what actually allows or refuses a change.

type Viewer = Pick<Tables<"profiles">, "id" | "is_admin" | "job_role">;
type TaskLike = { created_by: string | null; assignee_id: string | null; department: Enums<"job_role"> | null };

const FINANCE_DEPARTMENTS: Enums<"job_role">[] = ["finance", "head_of_finance"];

export function canManageMilestones(viewer: Viewer) {
  return viewer.is_admin || viewer.job_role === "director" || viewer.job_role === "head_of_finance";
}

export function canEditMilestone(viewer: Viewer, milestone: { owner_id: string }) {
  return canManageMilestones(viewer) || milestone.owner_id === viewer.id;
}

export function canDeleteMilestone(viewer: Viewer) {
  return viewer.is_admin || viewer.job_role === "director";
}

export function canEditTask(viewer: Viewer, task: TaskLike) {
  return (
    viewer.is_admin ||
    viewer.job_role === "director" ||
    (viewer.job_role === "head_of_finance" &&
      task.department !== null &&
      FINANCE_DEPARTMENTS.includes(task.department)) ||
    task.created_by === viewer.id ||
    task.assignee_id === viewer.id
  );
}

export function canDeleteTask(viewer: Viewer, task: TaskLike) {
  return (
    viewer.is_admin ||
    viewer.job_role === "director" ||
    (viewer.job_role === "head_of_finance" &&
      task.department !== null &&
      FINANCE_DEPARTMENTS.includes(task.department))
  );
}

export function canDeleteAttachment(viewer: Viewer, attachment: { added_by: string }) {
  return viewer.is_admin || viewer.job_role === "director" || attachment.added_by === viewer.id;
}
