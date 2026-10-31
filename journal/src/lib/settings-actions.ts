"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { MODULES } from "@/lib/modules";
import { isUuid, logActivity, rowFromImport, ValidationError } from "@/lib/records";

export type ImportState = { ok?: string; error?: string } | undefined;

/**
 * Restores a JOURNAL JSON export. Upserts by id, so importing the same file
 * twice is safe. Only registered tables and declared columns are accepted;
 * ownership always comes from the signed-in user, never from the file.
 */
export async function importBackup(_prev: ImportState, form: FormData): Promise<ImportState> {
  const { supabase } = await requireUser();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a JOURNAL backup file." };
  let dump: { app?: string; tables?: Record<string, unknown> };
  try {
    dump = JSON.parse(await file.text());
  } catch {
    return { error: "That file is not valid JSON." };
  }
  if (dump.app !== "journal" || typeof dump.tables !== "object" || !dump.tables) return { error: "Not a JOURNAL backup." };

  const summary: string[] = [];
  try {
    // MODULES is ordered so referenced tables are restored before referencing ones.
    for (const mod of MODULES) {
      const input = dump.tables[mod.table];
      if (!Array.isArray(input) || input.length === 0) continue;
      const rows = input.map((r, i) => {
        try {
          return rowFromImport(mod, r as Record<string, unknown>);
        } catch (e) {
          throw new ValidationError(`${mod.label} row ${i + 1}: ${(e as Error).message}`);
        }
      });
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from(mod.table).upsert(rows.slice(i, i + 500), { onConflict: "id" });
        if (error) throw new ValidationError(`${mod.label}: ${error.message}`);
      }
      summary.push(`${mod.label}: ${rows.length}`);
    }
    const reports = dump.tables.reports;
    if (Array.isArray(reports) && reports.length) {
      const rows = reports.map((r) => {
        const x = r as Record<string, unknown>;
        return {
          ...(typeof x.id === "string" && isUuid(x.id) ? { id: x.id } : {}),
          kind: String(x.kind ?? "report").slice(0, 100),
          title: String(x.title ?? "Report").slice(0, 500),
          period_start: typeof x.period_start === "string" ? x.period_start : null,
          period_end: typeof x.period_end === "string" ? x.period_end : null,
          body: String(x.body ?? ""),
        };
      });
      const { error } = await supabase.from("reports").upsert(rows, { onConflict: "id" });
      if (error) throw new ValidationError(`Reports: ${error.message}`);
      summary.push(`Reports: ${rows.length}`);
    }
  } catch (e) {
    const message = e instanceof ValidationError ? e.message : "Import failed.";
    await logActivity(supabase, { action: "import", status: "error", summary: message });
    return { error: `${message} Rows before this point were restored; fix the file and re-run (it is safe to repeat).` };
  }
  await logActivity(supabase, { action: "import", summary: summary.join(", ") || "nothing to import" });
  revalidatePath("/", "layout");
  return { ok: summary.length ? `Restored — ${summary.join(", ")}.` : "The backup contained no rows." };
}
