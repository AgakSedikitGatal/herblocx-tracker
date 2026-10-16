"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/form-message";
import { describeDbError } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

// Who may edit or delete a comment is decided by the database rules:
// only the author edits; the author or an Admin deletes.

const body = z
  .string()
  .trim()
  .min(1, "Write something first.")
  .max(5000, "A comment can have at most 5000 characters.");

function refresh(taskId: string) {
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/activity");
}

export async function addComment(taskId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const raw = String(formData.get("body") ?? "");
  const parsed = body.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: { body: raw } };

  const supabase = await createClient();
  const { error } = await supabase.from("task_comments").insert({ task_id: taskId, body: parsed.data });
  if (error) return { error: describeDbError(error, "post the comment"), values: { body: raw } };

  refresh(taskId);
  return {};
}

export async function editComment(
  commentId: string,
  taskId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = String(formData.get("body") ?? "");
  const parsed = body.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: { body: raw } };

  const supabase = await createClient();
  const { error } = await supabase
    .from("task_comments")
    .update({ body: parsed.data })
    .eq("id", commentId)
    .select("id")
    .single();
  if (error) {
    return {
      error:
        error.code === "PGRST116"
          ? "You can only edit your own comments."
          : describeDbError(error, "save the comment"),
      values: { body: raw },
    };
  }

  refresh(taskId);
  return { success: "saved" };
}

export async function deleteComment(commentId: string, taskId: string): Promise<FormState> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("task_comments").delete().eq("id", commentId).select("id");
  if (error) return { error: describeDbError(error, "delete the comment") };
  if (!data.length) return { error: "You can only delete your own comments." };

  refresh(taskId);
  return {};
}
