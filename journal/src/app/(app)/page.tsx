import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { analyse, gatherSnapshot, type Flag } from "@/lib/insights";
import { completeTask, quickAddTask, toggleHabit } from "@/lib/actions";
import { money, shortDate } from "@/lib/format";
import { AREAS } from "@/lib/modules";

const FLAG_STYLE: Record<Flag["level"], string> = {
  risk: "border-red-200 bg-red-50 text-red-800",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-slate-200 bg-slate-50 text-slate-700",
};

export default async function CommandCenter() {
  const { supabase } = await requireUser();
  const s = await gatherSnapshot(supabase);
  const { flags, priorities } = analyse(s);
  const f = s.finance;
  const pipeline = ["researching", "applied", "screening", "interviewing", "offer"].map((st) => ({
    status: st,
    n: s.jobs.filter((j) => j.status === st).length,
  }));
  const pipelineMax = Math.max(1, ...pipeline.map((p) => p.n));
  const dueSoon = s.obligations.filter((o) => o.next_due_on <= s.in7);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="h2">Command center</p>
          <h1 className="h1">{new Date(s.now + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}</h1>
        </div>
        <Link href="/briefing" className="btn-ghost">Open weekly briefing →</Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Net worth" value={money(f.netWorth)} sub={`${f.accounts.length} account(s)`} href="/m/accounts" />
        <Stat
          label="Savings rate (last month)"
          value={f.lastMonth.savingsRate === null ? "—" : `${(f.lastMonth.savingsRate * 100).toFixed(0)}%`}
          sub={`${money(f.lastMonth.income)} in · ${money(f.lastMonth.expense)} out`}
          href="/m/cashflow"
        />
        <Stat label="Open tasks" value={String(s.tasks.open.length)} sub={`${s.tasks.overdue.length} overdue · ${s.tasks.doneThisWeek.length} done in 7d`} href="/m/tasks" />
        <Stat label="Active applications" value={String(s.jobs.length)} sub={`${s.opportunities.length} opportunities on radar`} href="/m/jobs" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="h2">Top priorities</h2>
          {priorities.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing urgent. Good time to move a goal forward.</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {priorities.map((p, i) => (
                <li key={p.href + i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-accent">{i + 1}</span>
                  <div>
                    <Link href={p.href} className="font-medium hover:underline">{p.title}</Link>
                    <p className="text-xs text-muted">{p.why}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <form action={quickAddTask} className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <input name="title" className="input min-w-0 flex-1" placeholder="Quick-capture a task…" required />
            <input name="due_date" type="date" className="input w-auto" />
            <button className="btn">Add</button>
          </form>
        </div>

        <div className="card">
          <h2 className="h2">Habits this week</h2>
          {s.habits.length === 0 ? (
            <p className="mt-3 text-sm text-muted"><Link className="text-accent underline" href="/m/habits">Add a habit</Link> to track consistency.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {s.habits.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2">
                  <form action={toggleHabit.bind(null, h.id, h.doneToday)}>
                    <button className={`flex items-center gap-2 text-sm ${h.doneToday ? "text-emerald-700" : ""}`} title="Toggle today">
                      <span className={`flex h-5 w-5 items-center justify-center rounded border ${h.doneToday ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"}`}>
                        {h.doneToday ? "✓" : ""}
                      </span>
                      {h.name}
                    </button>
                  </form>
                  <span className="text-xs text-muted">{h.count}/{h.target_per_week ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="h2">Due in the next 7 days</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {[...s.tasks.overdue, ...s.tasks.dueThisWeek].slice(0, 12).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                <Link href={`/m/tasks/${t.id}`} className="min-w-0 truncate hover:underline">
                  <span className={t.due_date < s.now ? "font-semibold text-red-700" : "text-muted"}>{shortDate(t.due_date)}</span> · {t.title}
                </Link>
                <form action={completeTask.bind(null, t.id)}>
                  <button className="text-xs text-accent hover:underline">Done</button>
                </form>
              </li>
            ))}
            {dueSoon.map((o) => (
              <li key={o.id} className="py-2">
                <Link href={`/m/obligations/${o.id}`} className="hover:underline">
                  <span className="text-muted">{shortDate(o.next_due_on)}</span> · {o.name} {o.amount ? `(${money(o.amount)})` : ""}
                  {o.auto_renews && <span className="pill ml-2">auto-renews</span>}
                </Link>
              </li>
            ))}
            {s.tasks.overdue.length + s.tasks.dueThisWeek.length + dueSoon.length === 0 && (
              <li className="py-2 text-muted">Nothing scheduled.</li>
            )}
          </ul>
        </div>

        <div className="card">
          <h2 className="h2">Job pipeline</h2>
          <div className="mt-3 space-y-2">
            {pipeline.map((p) => (
              <Link key={p.status} href={`/m/jobs?status=${p.status}`} className="block text-xs">
                <div className="flex justify-between"><span className="capitalize">{p.status}</span><span>{p.n}</span></div>
                <div className="mt-1 h-2 rounded bg-slate-100">
                  <div className="h-2 rounded bg-accent" style={{ width: `${(p.n / pipelineMax) * 100}%` }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="h2">Signals ({flags.length})</h2>
          <ul className="mt-3 space-y-2">
            {flags.slice(0, 12).map((fl, i) => (
              <li key={i} className={`rounded-lg border px-3 py-2 text-sm ${FLAG_STYLE[fl.level]}`}>
                <span className="mr-2 text-[11px] font-semibold uppercase tracking-wide opacity-70">{fl.area}</span>
                {fl.href ? <Link href={fl.href} className="hover:underline">{fl.text}</Link> : fl.text}
              </li>
            ))}
            {flags.length === 0 && <li className="text-sm text-muted">No signals. Everything recorded is on track.</li>}
          </ul>
        </div>
        <div className="card">
          <h2 className="h2">Goals</h2>
          <ul className="mt-3 space-y-3">
            {s.goals.slice(0, 6).map((g) => (
              <li key={g.id}>
                <Link href={`/m/goals/${g.id}`} className="text-sm font-medium hover:underline">{g.title}</Link>
                <div className="mt-1 h-1.5 rounded bg-slate-100"><div className="h-1.5 rounded bg-emerald-500" style={{ width: `${g.progress}%` }} /></div>
              </li>
            ))}
            {s.goals.length === 0 && <li className="text-sm text-muted"><Link href="/m/goals" className="text-accent underline">Set your first goal</Link>.</li>}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="h2">Intelligence areas</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {AREAS.map((a) => (
              <div key={a.key} className="rounded-lg border border-line p-3">
                <p className="text-sm font-semibold">{a.label}</p>
                <p className="text-xs text-muted">{a.description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2 className="h2">Agent activity log</h2>
          <ul className="mt-3 space-y-1.5 text-xs">
            {s.activity.map((a, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="truncate"><span className="font-semibold">{a.action}</span> {a.module} {a.summary ? `· ${a.summary}` : ""}</span>
                <span className="shrink-0 text-muted">{shortDate(a.created_at)}</span>
              </li>
            ))}
            {s.activity.length === 0 && <li className="text-muted">No activity yet.</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, sub, href }: { label: string; value: string; sub: string; href: string }) {
  return (
    <Link href={href} className="card block hover:border-indigo-200">
      <p className="h2">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </Link>
  );
}
