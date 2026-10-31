"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { briefingMarkdown, gatherSnapshot } from "@/lib/insights";
import { addDays } from "@/lib/dates";
import { logActivity } from "@/lib/records";

export async function saveBriefing() {
  const { supabase } = await requireUser();
  const s = await gatherSnapshot(supabase);
  const body = briefingMarkdown(s, true);
  const { data, error } = await supabase
    .from("reports")
    .insert({ kind: "weekly_briefing", title: `Weekly briefing — ${s.week}`, period_start: s.week, period_end: addDays(s.week, 6), body })
    .select("id")
    .single();
  await logActivity(supabase, {
    action: "workflow:weekly_briefing",
    module: "reports",
    record_id: data?.id,
    status: error ? "error" : "ok",
    summary: error ? error.message : "Briefing generated and saved",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/briefing");
  redirect(`/briefing?report=${data.id}`);
}
