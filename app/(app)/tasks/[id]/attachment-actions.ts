"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/form-message";
import { ALLOWED_TYPES, ATTACHMENT_BUCKET, MAX_FILE_BYTES } from "@/lib/attachments";
import { describeDbError } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

// Who may add or remove attachments is decided by the database rules:
// anyone active can add; the person who added it, Director or Admin can remove.

function refresh(taskId: string) {
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/activity");
  revalidatePath("/");
}

const linkSchema = z.object({
  url: z
    .string()
    .trim()
    .max(2000, "The link is too long.")
    .refine((v) => /^https?:\/\//i.test(v) && URL.canParse(v), "Paste a full link starting with https://"),
  name: z.string().trim().max(200, "The name can have at most 200 characters."),
});

export async function addLink(taskId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const raw = { url: String(formData.get("url") ?? ""), name: String(formData.get("name") ?? "") };
  const parsed = linkSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: raw };

  const name = parsed.data.name || new URL(parsed.data.url).hostname;
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_attachments")
    .insert({ task_id: taskId, kind: "link", name, url: parsed.data.url });
  if (error) return { error: describeDbError(error, "add the link"), values: raw };

  refresh(taskId);
  return {};
}

const uploadSchema = z.object({
  path: z.string().min(1).max(400),
  name: z.string().trim().min(1).max(200),
  size: z.number().int().min(0).max(MAX_FILE_BYTES),
  type: z.string().refine((t) => ALLOWED_TYPES.has(t)),
});

// Called after the browser has uploaded the file to storage: records it on the task.
export async function recordUpload(
  taskId: string,
  file: { path: string; name: string; size: number; type: string },
): Promise<FormState> {
  const supabase = await createClient();
  const parsed = uploadSchema.safeParse(file);
  const inTaskFolder = file.path.startsWith(`${taskId}/`);

  if (parsed.success && inTaskFolder) {
    const { error } = await supabase.from("task_attachments").insert({
      task_id: taskId,
      kind: "file",
      name: parsed.data.name,
      storage_path: parsed.data.path,
      size_bytes: parsed.data.size,
      mime_type: parsed.data.type,
    });
    if (!error) {
      refresh(taskId);
      return {};
    }
    await supabase.storage.from(ATTACHMENT_BUCKET).remove([file.path]);
    return { error: describeDbError(error, "attach the file") };
  }

  // Not recorded: remove the uploaded file so it doesn't sit unused in storage.
  if (inTaskFolder) await supabase.storage.from(ATTACHMENT_BUCKET).remove([file.path]);
  return { error: "That file can't be attached." };
}

export async function deleteAttachment(attachmentId: string, taskId: string): Promise<FormState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_attachments")
    .delete()
    .eq("id", attachmentId)
    .select("storage_path");
  if (error) return { error: describeDbError(error, "remove the attachment") };
  if (!data.length) {
    return { error: "Only the person who added it, a Director or an Admin can remove this." };
  }

  // The record is gone, so the storage rules now allow removing the file itself.
  const path = data[0].storage_path;
  if (path) await supabase.storage.from(ATTACHMENT_BUCKET).remove([path]);

  refresh(taskId);
  return {};
}
