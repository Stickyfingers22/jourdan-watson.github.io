import { requireUser } from "@/lib/supabase/server";
import { MODULES } from "@/lib/modules";
import { limitMb } from "@/lib/env";
import { getProvider } from "@/lib/ai/provider";
import { ImportForm } from "@/components/ImportForm";

const PERMISSIONS = [
  { level: "1 · Automatic", items: "Categorising, summaries, dashboard updates, rule-based briefings, recommendations, keep-alive ping." },
  { level: "2 · Approval required", items: "Sending email, submitting applications, calendar changes, publishing, sharing documents, sending data to any AI API." },
  { level: "3 · Restricted (never automated)", items: "Moving money, trades, investment transactions, signing agreements, deleting important data, sharing confidential information." },
];

export default async function Settings() {
  const { supabase, user } = await requireUser();
  const [{ data: usage }, counts] = await Promise.all([
    supabase.rpc("journal_usage"),
    Promise.all(
      MODULES.map(async (m) => {
        const { count } = await supabase.from(m.table).select("id", { count: "exact", head: true });
        return { label: m.label, count: count ?? 0 };
      }),
    ),
  ]);
  const dbLimit = limitMb("JOURNAL_DB_LIMIT_MB", 500);
  const dbMb = usage?.db_bytes ? usage.db_bytes / 1024 / 1024 : null;
  const pct = dbMb === null ? null : (dbMb / dbLimit) * 100;
  const provider = getProvider();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="h2">Settings</p>
        <h1 className="h1">Backup, usage &amp; permissions</h1>
        <p className="mt-1 text-sm text-muted">Signed in as {user.email}</p>
      </header>

      <section className="card space-y-3">
        <h2 className="h2">Free-tier usage</h2>
        {pct === null ? (
          <p className="text-sm text-muted">Usage unavailable (run the migration to create <code>journal_usage()</code>).</p>
        ) : (
          <>
            <div className="flex justify-between text-sm">
              <span>Database: {dbMb!.toFixed(1)} MB of {dbLimit} MB</span>
              <span>{pct.toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded bg-slate-100">
              <div className={`h-2 rounded ${pct > 80 ? "bg-red-500" : pct > 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            {pct > 60 && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                Approaching the free database limit. Export a backup and archive old activity-log rows before upgrading anything.
              </p>
            )}
          </>
        )}
        <p className="text-xs text-muted">
          Reported size includes Postgres system overhead, so a new project starts well above 0 MB. Supabase pauses free
          projects after ~7 days with no activity; the keep-alive workflow in <code>.github/workflows</code> prevents this.
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 pt-2 text-xs sm:grid-cols-3">
          {counts.map((c) => (
            <div key={c.label} className="flex justify-between"><span className="text-muted">{c.label}</span><span>{c.count}</span></div>
          ))}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Backup &amp; export</h2>
        <p className="text-sm text-muted">
          Download everything as one JSON file you own. Do this at least monthly and keep copies off-platform (e.g. your own
          drive). Restoring upserts by id, so it is safe to run more than once.
        </p>
        <a href="/api/export" className="btn">Download full backup (.json)</a>
        <div className="border-t border-line pt-3">
          <ImportForm />
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">AI provider</h2>
        <p className="text-sm">
          Active: <strong>{provider.name}</strong> {provider.billable ? <span className="pill bg-amber-100">billable</span> : <span className="pill bg-emerald-100">$0</span>}
        </p>
        <p className="text-xs text-muted">
          No AI API is connected. Adding one requires your approval, an API key in environment variables (never in Git), and an
          entry in <code>docs/COST_REGISTER.md</code>.
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="h2">Permission framework</h2>
        <ul className="space-y-2 text-sm">
          {PERMISSIONS.map((p) => (
            <li key={p.level}><strong>{p.level}:</strong> <span className="text-muted">{p.items}</span></li>
          ))}
        </ul>
        <p className="text-xs text-muted">JOURNAL currently performs only Level 1 actions. It cannot send email, submit applications or touch money.</p>
      </section>
    </div>
  );
}
