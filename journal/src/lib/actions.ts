"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { isUuid, logActivity, requireModule, rowFromForm, ValidationError } from "@/lib/records";
import { today } from "@/lib/dates";

export type FormState = { error?: string } | undefined;

export async function saveRecord(
  moduleKey: string,
  id: string | null,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireUser();
  let savedId: string;
  try {
    const mod = requireModule(moduleKey);
    const row = rowFromForm(mod, form);
    const title = String(row[mod.titleField] ?? "");
    if (id) {
      if (!isUuid(id)) throw new ValidationError("Invalid record.");
      const { error } = await supabase.from(mod.table).update(row).eq("id", id);
      if (error) throw new ValidationError(error.message);
      savedId = id;
      await logActivity(supabase, { action: "update", module: mod.key, record_id: id, summary: title });
    } else {
      const { data, error } = await supabase.from(mod.table).insert(row).select("id").single();
      if (error) throw new ValidationError(error.message);
      savedId = data.id;
      await logActivity(supabase, { action: "create", module: mod.key, record_id: savedId, summary: title });
    }
  } catch (e) {
    if (e instanceof ValidationError) return { error: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(id ? `/m/${moduleKey}/${savedId}?saved=1` : `/m/${moduleKey}?saved=1`);
}

export async function deleteRecord(moduleKey: string, id: string) {
  const { supabase } = await requireUser();
  const mod = requireModule(moduleKey);
  if (!isUuid(id)) throw new Error("Invalid record.");
  const { error } = await supabase.from(mod.table).delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logActivity(supabase, { action: "delete", module: mod.key, record_id: id });
  revalidatePath("/", "layout");
  redirect(`/m/${moduleKey}?deleted=1`);
}

export async function quickAddTask(form: FormData) {
  const { supabase } = await requireUser();
  const title = String(form.get("title") ?? "").trim().slice(0, 500);
  if (!title) return;
  const due = String(form.get("due_date") ?? "");
  const { data } = await supabase
    .from("tasks")
    .insert({ title, due_date: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null })
    .select("id")
    .single();
  await logActivity(supabase, { action: "create", module: "tasks", record_id: data?.id, summary: title });
  revalidatePath("/");
}

export async function completeTask(id: string) {
  const { supabase } = await requireUser();
  if (!isUuid(id)) return;
  await supabase.from("tasks").update({ status: "done" }).eq("id", id);
  await logActivity(supabase, { action: "complete", module: "tasks", record_id: id });
  revalidatePath("/");
}

export async function toggleHabit(habitId: string, done: boolean) {
  const { supabase } = await requireUser();
  if (!isUuid(habitId)) return;
  const day = today();
  if (done) {
    await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("log_date", day);
  } else {
    await supabase.from("habit_logs").upsert({ habit_id: habitId, log_date: day }, { onConflict: "habit_id,log_date", ignoreDuplicates: true });
  }
  revalidatePath("/");
}

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/login");
}
