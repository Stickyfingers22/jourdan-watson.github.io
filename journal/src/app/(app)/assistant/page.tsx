import { requireUser } from "@/lib/supabase/server";
import { briefingMarkdown, gatherSnapshot } from "@/lib/insights";
import { getProvider } from "@/lib/ai/provider";
import { logActivity } from "@/lib/records";
import { CopyButton } from "@/components/CopyButton";

const TASKS: Record<string, { label: string; task: string; finance: boolean }> = {
  weekly: { label: "Weekly executive review", task: "Review my week. Identify the three highest-value priorities, anything I am overcommitted on, and opportunities I am overlooking.", finance: false },
  career: { label: "Career strategy", task: "Assess my career pipeline and goals. What skill gaps, projects or applications would most improve my trajectory toward data science / AI / engineering roles?", finance: false },
  finance: { label: "Financial check-in", task: "Analyse my net worth, savings rate and contributions. Flag risks and recommend adjustments. Do not recommend specific securities.", finance: true },
  decision: { label: "Challenge my priorities", task: "Act as Decision Intelligence. Challenge my current goals and projects: which should I stop, which deserve more focus, and what assumptions am I making?", finance: false },
};

export default async function Assistant({ searchParams }: { searchParams: Promise<{ t?: string; finance?: string }> }) {
  const sp = await searchParams;
  const key = sp.t && TASKS[sp.t] ? sp.t : "weekly";
  const preset = TASKS[key];
  const includeFinance = sp.finance === "1" || (sp.finance === undefined && preset.finance);
  const { supabase } = await requireUser();
  const snapshot = await gatherSnapshot(supabase);
  const context = briefingMarkdown(snapshot, includeFinance);
  const provider = getProvider();
  const result = await provider.run({ task: preset.task, context, categories: includeFinance ? ["planning", "career", "finance"] : ["planning", "career"] });
  if (result.kind === "completion") {
    await logActivity(supabase, { action: "ai:completion", module: "assistant", summary: `${provider.id}: ${preset.label}` });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <p className="h2">AI prompt builder · provider: {provider.name}</p>
        <h1 className="h1">Ask your AI with full context</h1>
        <p className="mt-1 text-sm text-muted">
          JOURNAL assembles a prompt from your data. Copy it into Claude (or another subscription you already pay for).
          Nothing is sent anywhere automatically.
        </p>
      </header>
      <form className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="t">Prompt</label>
          <select id="t" name="t" defaultValue={key} className="input">
            {Object.entries(TASKS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="finance" value="1" defaultChecked={includeFinance} /> Include financial figures
        </label>
        <button className="btn-ghost">Build</button>
      </form>
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">
            Contains: goals, tasks, projects, job pipeline{includeFinance ? ", balances, cash flow" : ""}. Review before pasting.
          </p>
          {result.kind === "prompt" && <CopyButton text={result.prompt} label="Copy prompt" />}
        </div>
        <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-xs">
          {result.kind === "prompt" ? result.prompt : result.text}
        </pre>
      </div>
    </div>
  );
}
