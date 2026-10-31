import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, daysBetween, monthStart, today, weekStart } from "@/lib/dates";
import { money } from "@/lib/format";

// Rule-based intelligence: everything here runs on your own data with plain
// code — no AI API calls, no cost. The AI prompt builder can hand the result
// to an AI subscription you already pay for when deeper reasoning is useful.

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type Flag = { level: "info" | "warn" | "risk"; area: string; text: string; href?: string };
export type Priority = { title: string; why: string; href: string; score: number };

export type Snapshot = Awaited<ReturnType<typeof gatherSnapshot>>;

async function rows(p: PromiseLike<{ data: unknown }>): Promise<Row[]> {
  const { data } = await p;
  return (data ?? []) as Row[];
}

export async function gatherSnapshot(supabase: SupabaseClient) {
  const now = today();
  const in7 = addDays(now, 7);
  const in30 = addDays(now, 30);
  const week = weekStart(now);
  const ago7 = addDays(now, -7);
  const thisMonth = monthStart(now);
  const lastMonth = monthStart(addDays(thisMonth, -1));
  const yearStart = now.slice(0, 4) + "-01-01";

  const [
    openTasks, doneTasks, goals, projects, jobs, obligations, contacts, opportunities,
    decisions, accounts, cash, contributions, habits, habitLogs, reading, ideas, activity,
  ] = await Promise.all([
    rows(supabase.from("tasks").select("id,title,priority,due_date,status,area,project_id").not("status", "in", "(done,cancelled)").order("due_date", { ascending: true, nullsFirst: false }).limit(500)),
    rows(supabase.from("tasks").select("id,title,area,completed_at").eq("status", "done").gte("completed_at", ago7 + "T00:00:00Z").limit(200)),
    rows(supabase.from("goals").select("id,title,area,status,progress,target_date,horizon").in("status", ["not_started", "active", "on_hold"]).limit(200)),
    rows(supabase.from("projects").select("id,title,area,status,priority,due_date,goal_id").in("status", ["planned", "active", "blocked"]).limit(200)),
    rows(supabase.from("job_applications").select("id,role,company,status,next_step,next_step_on,applied_on,updated_at,fit_score").not("status", "in", "(rejected,withdrawn,accepted)").limit(300)),
    rows(supabase.from("obligations").select("id,name,kind,amount,cadence,next_due_on,auto_renews").lte("next_due_on", in30).order("next_due_on").limit(100)),
    rows(supabase.from("contacts").select("id,name,organization,next_follow_up_on").lte("next_follow_up_on", in7).order("next_follow_up_on").limit(50)),
    rows(supabase.from("opportunities").select("id,title,kind,status,deadline,fit_score").in("status", ["new", "evaluating", "pursuing"]).limit(200)),
    rows(supabase.from("decisions").select("id,title,status,review_on,created_at").in("status", ["open", "decided", "reviewing"]).limit(100)),
    rows(supabase.from("accounts").select("id,name,kind,balance,is_liability,as_of").limit(200)),
    rows(supabase.from("cash_flow").select("month,direction,amount,category").gte("month", lastMonth).limit(2000)),
    rows(supabase.from("contributions").select("contributed_on,amount,kind").gte("contributed_on", yearStart).limit(2000)),
    rows(supabase.from("habits").select("id,name,target_per_week,cadence").eq("active", true).order("name").limit(50)),
    rows(supabase.from("habit_logs").select("habit_id,log_date").gte("log_date", week).limit(1000)),
    rows(supabase.from("knowledge_items").select("id,title,kind,topic").eq("status", "in_progress").limit(50)),
    rows(supabase.from("ideas").select("id,title,stage,created_at,updated_at").not("stage", "in", "(killed,launched)").limit(200)),
    rows(supabase.from("activity_log").select("action,module,summary,created_at,status").order("created_at", { ascending: false }).limit(12)),
  ]);

  // ----- finance
  const assets = accounts.filter((a) => !a.is_liability).reduce((s, a) => s + Number(a.balance), 0);
  const liabilities = accounts.filter((a) => a.is_liability).reduce((s, a) => s + Number(a.balance), 0);
  const sumCash = (month: string, dir: string) =>
    cash.filter((c) => c.month.slice(0, 7) === month.slice(0, 7) && c.direction === dir).reduce((s, c) => s + Number(c.amount), 0);
  const cashMonth = (month: string) => {
    const income = sumCash(month, "income");
    const expense = sumCash(month, "expense");
    return { month, income, expense, net: income - expense, savingsRate: income > 0 ? (income - expense) / income : null };
  };
  const contribThisMonth = contributions.filter((c) => c.contributed_on >= thisMonth).reduce((s, c) => s + Number(c.amount), 0);
  const contribYtd = contributions.reduce((s, c) => s + Number(c.amount), 0);

  // ----- habits
  const habitWeek = habits.map((h) => {
    const logs = habitLogs.filter((l) => l.habit_id === h.id);
    return {
      id: h.id as string,
      name: h.name as string,
      target_per_week: h.target_per_week as number | null,
      count: logs.length,
      doneToday: logs.some((l) => l.log_date === now),
    };
  });

  return {
    now, in7, in30, week,
    tasks: {
      open: openTasks,
      overdue: openTasks.filter((t) => t.due_date && t.due_date < now),
      dueThisWeek: openTasks.filter((t) => t.due_date && t.due_date >= now && t.due_date <= in7),
      doneThisWeek: doneTasks,
    },
    goals, projects, jobs, obligations, contacts, opportunities, decisions, reading, ideas, activity,
    finance: {
      accounts,
      assets, liabilities, netWorth: assets - liabilities,
      thisMonth: cashMonth(thisMonth),
      lastMonth: cashMonth(lastMonth),
      contribThisMonth, contribYtd,
    },
    habits: habitWeek,
  };
}

const PRIORITY_WEIGHT: Record<string, number> = { high: 30, medium: 15, low: 5 };

export function analyse(s: Snapshot): { flags: Flag[]; priorities: Priority[] } {
  const flags: Flag[] = [];
  const add = (level: Flag["level"], area: string, text: string, href?: string) => flags.push({ level, area, text, href });

  // Executive
  if (s.tasks.overdue.length) add("risk", "Executive", `${s.tasks.overdue.length} overdue task(s).`, "/m/tasks?status=todo");
  const loadThisWeek = s.tasks.overdue.length + s.tasks.dueThisWeek.length;
  if (loadThisWeek > 15) add("warn", "Executive", `${loadThisWeek} tasks due or overdue in the next 7 days — likely overcommitted. Defer or drop some.`);
  const activeProjects = s.projects.filter((p) => p.status === "active");
  if (activeProjects.length > 5) add("warn", "Executive", `${activeProjects.length} active projects. More than ~5 parallel projects usually means none get finished.`, "/m/projects?status=active");
  for (const p of s.projects.filter((p) => p.status === "blocked")) add("warn", "Executive", `Project blocked: ${p.title}.`, `/m/projects/${p.id}`);
  for (const g of s.goals) {
    if (g.target_date && g.target_date < s.now) add("risk", "Executive", `Goal past target date at ${g.progress}%: ${g.title}. Re-plan or close it.`, `/m/goals/${g.id}`);
    else if (g.status === "active" && !s.projects.some((p) => p.goal_id === g.id)) add("info", "Executive", `Goal has no active project behind it: ${g.title}.`, `/m/goals/${g.id}`);
  }
  for (const d of s.decisions) {
    if (d.review_on && d.review_on <= s.now) add("info", "Executive", `Decision due for review: ${d.title}.`, `/m/decisions/${d.id}`);
    else if (d.status === "open" && daysBetween(d.created_at.slice(0, 10), s.now) > 30) add("info", "Executive", `Decision open for 30+ days: ${d.title}.`, `/m/decisions/${d.id}`);
  }

  // Career
  for (const j of s.jobs) {
    if (j.next_step_on && j.next_step_on < s.now) add("risk", "Career", `Missed next step for ${j.role} @ ${j.company}: ${j.next_step ?? "follow up"}.`, `/m/jobs/${j.id}`);
    else if (j.status === "applied" && j.applied_on && daysBetween(j.applied_on, s.now) >= 14 && !j.next_step_on)
      add("info", "Career", `No response from ${j.company} in ${daysBetween(j.applied_on, s.now)} days — consider a follow-up.`, `/m/jobs/${j.id}`);
  }
  for (const c of s.contacts) add("info", "Career", `Follow up with ${c.name}${c.organization ? ` (${c.organization})` : ""}.`, `/m/contacts/${c.id}`);
  for (const o of s.opportunities) {
    if (o.deadline && o.deadline >= s.now && o.deadline <= s.in7) add("warn", "Career", `Opportunity deadline in ${daysBetween(s.now, o.deadline)} day(s): ${o.title}.`, `/m/opportunities/${o.id}`);
  }

  // Finance
  const f = s.finance;
  if (f.accounts.length === 0) add("info", "Finance", "No accounts yet — add balances to start tracking net worth.", "/m/accounts");
  for (const a of f.accounts) {
    if (!a.as_of || daysBetween(a.as_of, s.now) > 45) add("info", "Finance", `Balance for ${a.name} is stale — update it.`, `/m/accounts/${a.id}`);
  }
  const lm = f.lastMonth;
  if (lm.income > 0 && lm.savingsRate !== null && lm.savingsRate < 0.2)
    add("warn", "Finance", `Savings rate last month was ${(lm.savingsRate * 100).toFixed(0)}% (income ${money(lm.income)}, spend ${money(lm.expense)}). Target ≥ 20%.`, "/m/cashflow");
  if (lm.income > 0 && lm.expense > lm.income) add("risk", "Finance", "Spent more than you earned last month.", "/m/cashflow");

  // Lifestyle / operations
  for (const o of s.obligations) {
    if (o.next_due_on < s.now) add("risk", "Lifestyle", `${o.name} was due ${o.next_due_on} — roll its date forward or resolve it.`, `/m/obligations/${o.id}`);
    else if (o.next_due_on <= s.in7) add(o.auto_renews ? "warn" : "info", "Lifestyle", `${o.name} ${o.auto_renews ? "auto-renews" : "is due"} on ${o.next_due_on}${o.amount ? ` (${money(o.amount)})` : ""}.${o.auto_renews ? " Keep or cancel?" : ""}`, `/m/obligations/${o.id}`);
  }

  // Performance
  const dayOfWeek = daysBetween(s.week, s.now) + 1;
  for (const h of s.habits) {
    const expected = Math.ceil(((h.target_per_week ?? 0) * dayOfWeek) / 7);
    if (expected > 0 && h.count < expected - 1) add("info", "Performance", `${h.name}: ${h.count}/${h.target_per_week} this week — behind pace.`);
  }

  // Ventures
  for (const i of s.ideas) {
    if (i.stage === "captured" && daysBetween(i.created_at.slice(0, 10), s.now) > 30)
      add("info", "Ventures", `Idea idle for 30+ days: ${i.title}. Research it, park it, or kill it.`, `/m/ideas/${i.id}`);
  }

  // Priorities: score candidate actions; keep the top three.
  const candidates: Priority[] = [];
  for (const t of [...s.tasks.overdue, ...s.tasks.dueThisWeek]) {
    const daysLeft = daysBetween(s.now, t.due_date);
    candidates.push({
      title: t.title,
      why: daysLeft < 0 ? `Overdue by ${-daysLeft} day(s)` : daysLeft === 0 ? "Due today" : `Due in ${daysLeft} day(s)`,
      href: `/m/tasks/${t.id}`,
      score: (PRIORITY_WEIGHT[t.priority] ?? 10) + Math.max(0, 20 - daysLeft * 3),
    });
  }
  for (const j of s.jobs) {
    if (!j.next_step_on || j.next_step_on > s.in7) continue;
    candidates.push({ title: `${j.next_step ?? "Next step"} — ${j.company}`, why: `Job pipeline, ${j.status}`, href: `/m/jobs/${j.id}`, score: 35 + (j.fit_score ?? 50) / 5 });
  }
  for (const o of s.opportunities) {
    if (!o.deadline || o.deadline > s.in7 || o.deadline < s.now) continue;
    candidates.push({ title: o.title, why: `Opportunity deadline ${o.deadline}`, href: `/m/opportunities/${o.id}`, score: 30 + (o.fit_score ?? 50) / 5 });
  }
  for (const p of s.projects) {
    if (p.priority === "high" && p.status === "active" && !s.tasks.open.some((t) => t.project_id === p.id))
      candidates.push({ title: `Define the next action for “${p.title}”`, why: "High-priority project with no open tasks", href: `/m/projects/${p.id}`, score: 28 });
  }
  candidates.sort((a, b) => b.score - a.score);

  const order = { risk: 0, warn: 1, info: 2 };
  flags.sort((a, b) => order[a.level] - order[b.level]);
  return { flags, priorities: candidates.slice(0, 3) };
}

/** Markdown briefing: saved to `reports`, and the input to the AI prompt builder. */
export function briefingMarkdown(s: Snapshot, includeFinance: boolean): string {
  const { flags, priorities } = analyse(s);
  const lines: string[] = [];
  lines.push(`# JOURNAL weekly briefing — week of ${s.week}`, "");
  lines.push("## Top 3 priorities");
  if (priorities.length === 0) lines.push("- Nothing urgent is scheduled. Pick one goal and define its next action.");
  priorities.forEach((p, i) => lines.push(`${i + 1}. **${p.title}** — ${p.why}`));
  lines.push("", "## Last 7 days");
  lines.push(`- Tasks completed: ${s.tasks.doneThisWeek.length}`);
  s.tasks.doneThisWeek.slice(0, 15).forEach((t) => lines.push(`  - ${t.title}`));
  lines.push("", "## Next 7 days");
  lines.push(`- Open tasks due: ${s.tasks.dueThisWeek.length} (overdue: ${s.tasks.overdue.length})`);
  s.tasks.dueThisWeek.slice(0, 15).forEach((t) => lines.push(`  - ${t.due_date} · ${t.title}`));
  s.obligations.filter((o) => o.next_due_on <= s.in7).forEach((o) => lines.push(`- ${o.next_due_on} · ${o.name}${o.auto_renews ? " (auto-renews)" : ""}`));
  lines.push("", "## Goals");
  if (s.goals.length === 0) lines.push("- No active goals recorded.");
  s.goals.forEach((g) => lines.push(`- ${g.title} — ${g.progress}%${g.target_date ? `, target ${g.target_date}` : ""}`));
  lines.push("", "## Career pipeline");
  const byStatus = new Map<string, number>();
  s.jobs.forEach((j) => byStatus.set(j.status, (byStatus.get(j.status) ?? 0) + 1));
  lines.push(byStatus.size ? `- ${[...byStatus].map(([k, v]) => `${k}: ${v}`).join(", ")}` : "- No active applications.");
  if (includeFinance) {
    const f = s.finance;
    lines.push("", "## Finance");
    lines.push(`- Net worth: ${money(f.netWorth)} (assets ${money(f.assets)}, liabilities ${money(f.liabilities)})`);
    lines.push(`- Last month: income ${money(f.lastMonth.income)}, spend ${money(f.lastMonth.expense)}, savings rate ${f.lastMonth.savingsRate === null ? "—" : (f.lastMonth.savingsRate * 100).toFixed(0) + "%"}`);
    lines.push(`- Invested this month: ${money(f.contribThisMonth)}; year to date: ${money(f.contribYtd)}`);
  }
  lines.push("", "## Habits this week");
  if (s.habits.length === 0) lines.push("- No active habits.");
  s.habits.forEach((h) => lines.push(`- ${h.name}: ${h.count}/${h.target_per_week ?? "—"}`));
  lines.push("", "## Flags");
  const shown = includeFinance ? flags : flags.filter((f) => f.area !== "Finance");
  if (shown.length === 0) lines.push("- None.");
  shown.forEach((f) => lines.push(`- [${f.level.toUpperCase()}] ${f.area}: ${f.text}`));
  return lines.join("\n");
}
