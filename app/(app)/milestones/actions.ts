"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/form-message";
import { getAuthState } from "@/lib/auth";
import { describeDbError } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

const milestoneSchema = z
  .object({
    title: z.string().trim().min(1, "Enter a title.").max(200, "The title can have at most 200 characters."),
    description: z.string().max(5000, "The description can have at most 5000 characters."),
    startDate: z.iso.date("Choose a start date."),
    endDate: z.iso.date("Choose an end date."),
    ownerId: z.uuid("Choose an owner."),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "The end date cannot be before the start date.",
  });

function readForm(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    ownerId: String(formData.get("ownerId") ?? ""),
  };
}

function toRow(v: z.infer<typeof milestoneSchema>) {
  return {
    title: v.title,
    description: v.description,
    start_date: v.startDate,
    end_date: v.endDate,
    owner_id: v.ownerId,
  };
}

export async function createMilestone(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await getAuthState()).profile) return { error: "Your session has ended. Please log in again." };

  const raw = readForm(formData);
  const parsed = milestoneSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: raw };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("milestones")
    .insert(toRow(parsed.data))
    .select("id")
    .single();
  if (error) return { error: describeDbError(error, "create the milestone"), values: raw };

  revalidatePath("/milestones");
  redirect(`/milestones/${data.id}`);
}

export async function updateMilestone(
  milestoneId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = readForm(formData);
  const parsed = milestoneSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: raw };

  const supabase = await createClient();
  const { error } = await supabase
    .from("milestones")
    .update(toRow(parsed.data))
    .eq("id", milestoneId)
    .select("id")
    .single();
  if (error) return { error: describeDbError(error, "save the milestone"), values: raw };

  revalidatePath("/milestones");
  revalidatePath(`/milestones/${milestoneId}`);
  return { success: "Saved.", values: raw };
}

export async function deleteMilestone(milestoneId: string): Promise<FormState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("milestones")
    .delete()
    .eq("id", milestoneId)
    .select("id");
  if (error) return { error: describeDbError(error, "delete the milestone") };
  if (!data.length) return { error: "You don't have permission to delete this milestone." };

  revalidatePath("/milestones");
  revalidatePath("/board");
  redirect("/milestones");
}
