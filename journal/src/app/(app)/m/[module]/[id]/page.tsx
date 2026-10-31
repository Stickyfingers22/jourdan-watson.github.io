import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getModule } from "@/lib/modules";
import { isUuid, loadRefOptions } from "@/lib/records";
import { deleteRecord, saveRecord } from "@/lib/actions";
import { shortDate } from "@/lib/format";
import { RecordForm } from "@/components/RecordForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";

export default async function RecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string; id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { module: key, id } = await params;
  const { saved } = await searchParams;
  const mod = getModule(key);
  if (!mod || !isUuid(id)) notFound();
  const { supabase } = await requireUser();
  const { data } = await supabase.from(mod.table).select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const refs = await loadRefOptions(supabase, mod);
  const row = data as Record<string, unknown>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href={`/m/${mod.key}`} className="text-sm text-muted hover:text-ink">← {mod.label}</Link>
      <header>
        <h1 className="h1">{String(row[mod.titleField] ?? mod.singular)}</h1>
        <p className="mt-1 text-xs text-muted">
          Created {shortDate(String(row.created_at))} · Updated {shortDate(String(row.updated_at))}
        </p>
      </header>
      {saved && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Saved.</p>}
      <div className="card">
        <RecordForm
          fields={mod.fields}
          values={row}
          refOptions={Object.fromEntries(refs)}
          action={saveRecord.bind(null, mod.key, id)}
          submitLabel="Save changes"
        />
      </div>
      <form action={deleteRecord.bind(null, mod.key, id)}>
        <ConfirmSubmit className="btn-danger" message={`Delete this ${mod.singular.toLowerCase()}? This cannot be undone (export a backup first if unsure).`}>Delete {mod.singular.toLowerCase()}</ConfirmSubmit>
      </form>
    </div>
  );
}
