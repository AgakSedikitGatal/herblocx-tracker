"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/form-message";
import { ATTACHMENT_BUCKET } from "@/lib/attachments";
import { getAuthState } from "@/lib/auth";
import {
  JOB_ROLE_VALUES,
  TASK_PRIORITY_VALUES,
  TASK_STATUS_VALUES,
} from "@/lib/constants";
import type { Enums } from "@/lib/database.types";
import { describeDbError } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

const optionalId = z.union([z.literal(""), z.uuid()]).transform((v) => v || null);

const taskSchema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(200, "The title can have at most 200 characters."),
  description: z.string().max(10000, "The description can have at most 10000 characters."),
  status: z.enum(TASK_STATUS_VALUES, { message: "Choose a status." }),
  assigneeId: optionalId,
  department: z.enum(JOB_ROLE_VALUES, { message: "Choose a role / department." }),
  priority: z.enum(TASK_PRIORITY_VALUES, { message: "Choose a priority." }),
  dueDate: z.iso.date("Choose a due date."),
  milestoneId: optionalId,
});

function readForm(formData: FormData) {
  const field = (name: string) => String(formData.get(name) ?? "");
  return {
    title: field("title"),
    description: field("description"),
    status: field("status"),
    assigneeId: field("assigneeId"),
    department: field("department"),
    priority: field("priority"),
    dueDate: field("dueDate"),
    milestoneId: field("milestoneId"),
  };
}

function toRow(v: z.infer<typeof taskSchema>) {
  return {
    title: v.title,
    description: v.description,
    status: v.status,
    assignee_id: v.assigneeId,
    department: v.department,
    priority: v.priority,
    due_date: v.dueDate,
    milestone_id: v.milestoneId,
  };
}

function revalidateTaskPages(taskId?: string) {
  revalidatePath("/board");
  revalidatePath("/milestones", "layout");
  revalidatePath("/activity");
  revalidatePath("/");
  if (taskId) revalidatePath(`/tasks/${taskId}`);
}

export async function createTask(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await getAuthState()).profile) return { error: "Your session has ended. Please log in again." };

  const raw = readForm(formData);
  const parsed = taskSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: raw };

  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").insert(toRow(parsed.data)).select("id").single();
  if (error) return { error: describeDbError(error, "create the task"), values: raw };

  revalidateTaskPages(data.id);
  redirect("/board");
}

export async function updateTask(
  taskId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = readForm(formData);
  const parsed = taskSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: raw };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update(toRow(parsed.data))
    .eq("id", taskId)
    .select("id")
    .single();
  if (error) return { error: describeDbError(error, "save the task"), values: raw };

  revalidateTaskPages(taskId);
  return { success: "Saved.", values: raw };
}

// Used by drag and drop on the board.
export async function moveTask(taskId: string, status: Enums<"task_status">): Promise<FormState> {
  if (!TASK_STATUS_VALUES.includes(status)) return { error: "Unknown column." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId)
    .select("id")
    .single();
  if (error) {
    return {
      error:
        error.code === "PGRST116"
          ? "You can only move tasks you created or are assigned to."
          : describeDbError(error, "move the task"),
    };
  }

  revalidateTaskPages(taskId);
  return {};
}

export async function deleteTask(taskId: string): Promise<FormState> {
  const supabase = await createClient();
  const { data: files } = await supabase
    .from("task_attachments")
    .select("storage_path")
    .eq("task_id", taskId)
    .eq("kind", "file");

  const { data, error } = await supabase.from("tasks").delete().eq("id", taskId).select("id");
  if (error) return { error: describeDbError(error, "delete the task") };
  if (!data.length) return { error: "You don't have permission to delete this task." };

  // Deleting the task removed its attachment records; now remove the uploaded files too.
  const paths = (files ?? []).map((f) => f.storage_path).filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from(ATTACHMENT_BUCKET).remove(paths);

  revalidateTaskPages();
  redirect("/board");
}
