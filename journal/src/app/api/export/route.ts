import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { exportAll } from "@/lib/backup";
import { logActivity } from "@/lib/records";
import { today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase } = await requireUser();
  const dump = await exportAll(supabase);
  const count = Object.values(dump.tables).reduce((n, rows) => n + rows.length, 0);
  await logActivity(supabase, { action: "export", summary: `${count} rows exported` });
  return new NextResponse(JSON.stringify(dump, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="journal-backup-${today()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
