import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { areaLabel, getModule } from "@/lib/modules";
import { loadRefOptions } from "@/lib/records";
import { displayValue } from "@/lib/format";
import { saveRecord } from "@/lib/actions";
import { RecordForm } from "@/components/RecordForm";

type Search = { q?: string; status?: string; saved?: string; deleted?: string };

export default async function ModuleList({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<Search>;
}) {
  const { module: key } = await params;
  const sp = await searchParams;
  const mod = getModule(key);
  if (!mod) notFound();
  const { supabase } = await requireUser();

  let query = supabase.from(mod.table).select("*", { count: "exact" });
  const q = (sp.q ?? "").trim().slice(0, 100);
  if (q) query = query.ilike(mod.titleField, `%${q.replace(/[\\%_]/g, (c) => "\\" + c)}%`);
  const statusField = mod.fields.find((f) => f.name === mod.statusField);
  if (statusField && sp.status && statusField.options?.some((o) => o.value === sp.status)) {
    query = query.eq(statusField.name, sp.status);
  }
  const { data, count, error } = await query
    .order(mod.sort.column, { ascending: mod.sort.ascending, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  const refs = await loadRefOptions(supabase, mod);
  const refNames = new Map<string, string>();
  refs.forEach((list) => list.forEach((o) => refNames.set(o.value, o.label)));
  const columns = mod.listColumns
    .map((c) => mod.fields.find((f) => f.name === c) ?? (c === "updated_at" ? { name: c, label: "Updated", type: "date" as const } : null))
    .filter((f) => f !== null);
  const rows = (data ?? []) as Record<string, unknown>[];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="h2">{areaLabel(mod.area)}</p>
        <h1 className="h1">{mod.label}</h1>
        <p className="mt-1 text-sm text-muted">{mod.description}</p>
      </header>

      {sp.saved && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Saved.</p>}
      {sp.deleted && <p className="rounded-lg bg-slate-100 p-3 text-sm">Deleted.</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Could not load: {error.message}</p>}

      <details className="card" open={rows.length === 0 && !q}>
        <summary className="cursor-pointer text-sm font-semibold">+ New {mod.singular.toLowerCase()}</summary>
        <div className="mt-4">
          <RecordForm
            fields={mod.fields}
            refOptions={Object.fromEntries(refs)}
            action={saveRecord.bind(null, mod.key, null)}
            submitLabel={`Add ${mod.singular.toLowerCase()}`}
          />
        </div>
      </details>

      <form className="flex flex-wrap gap-2" role="search">
        <input className="input max-w-xs" name="q" defaultValue={q} placeholder={`Search ${mod.label.toLowerCase()}…`} />
        {statusField && (
          <select className="input max-w-[12rem]" name="status" defaultValue={sp.status ?? ""}>
            <option value="">All {statusField.label.toLowerCase()}es</option>
            {statusField.options?.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
        <button className="btn-ghost">Filter</button>
        <span className="self-center text-xs text-muted">{count ?? 0} total</span>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-wide text-muted">
            <tr>{columns.map((c) => <th key={c.name} className="px-4 py-2 font-semibold">{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td className="px-4 py-6 text-muted" colSpan={columns.length}>Nothing here yet.</td></tr>
            )}
            {rows.map((row) => (
              <tr key={String(row.id)} className="border-b border-line last:border-0 hover:bg-slate-50">
                {columns.map((c, i) => (
                  <td key={c.name} className="px-4 py-2 align-top">
                    {i === 0 ? (
                      <Link className="font-medium text-accent hover:underline" href={`/m/${mod.key}/${row.id}`}>
                        {displayValue(c, row[c.name], refNames)}
                      </Link>
                    ) : (
                      displayValue(c, row[c.name], refNames)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
