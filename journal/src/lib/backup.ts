import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MODULES } from "@/lib/modules";

export const EXPORT_TABLES = [...MODULES.map((m) => m.table), "reports", "activity_log"];

export async function exportAll(supabase: SupabaseClient) {
  const tables: Record<string, unknown[]> = {};
  for (const table of EXPORT_TABLES) {
    const all: unknown[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from(table).select("*").order("created_at").range(from, from + 999);
      if (error) throw new Error(`${table}: ${error.message}`);
      all.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    tables[table] = all;
  }
  return { app: "journal", version: 1, exported_at: new Date().toISOString(), tables };
}
