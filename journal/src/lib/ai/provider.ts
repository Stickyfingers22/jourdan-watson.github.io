// Provider-independent AI interface.
//
// JOURNAL ships with only the "manual" provider: it assembles a prompt from
// your data and you paste it into an AI subscription you already have. No
// data leaves JOURNAL unless you copy it. To add a paid API later, implement
// AIProvider (e.g. ./anthropic.ts), register it below and set
// JOURNAL_AI_PROVIDER — after approving the cost (see docs/COST_REGISTER.md).

export type AIRequest = {
  task: string;
  context: string;
  /** Data categories included in context, for the approval/audit trail. */
  categories: string[];
};

export type AIResult =
  | { kind: "prompt"; prompt: string } // manual: user copies it
  | { kind: "completion"; text: string; provider: string };

export interface AIProvider {
  id: string;
  name: string;
  /** True when the provider makes network calls that may cost money. */
  billable: boolean;
  run(req: AIRequest): Promise<AIResult>;
}

export function buildPrompt(req: AIRequest): string {
  return [
    "You are my chief of staff inside JOURNAL, my personal intelligence system.",
    "Be direct. Challenge weak assumptions. Quantify trade-offs where you can.",
    "Use only the data below; say when something is missing rather than inventing it.",
    "Never fabricate experience, accomplishments or numbers.",
    "",
    `TASK: ${req.task}`,
    "",
    "DATA (exported from JOURNAL):",
    "<<<",
    req.context,
    ">>>",
  ].join("\n");
}

export const manualProvider: AIProvider = {
  id: "manual",
  name: "Manual (copy into your own AI subscription)",
  billable: false,
  async run(req) {
    return { kind: "prompt", prompt: buildPrompt(req) };
  },
};

const PROVIDERS: Record<string, AIProvider> = { manual: manualProvider };

export function getProvider(): AIProvider {
  return PROVIDERS[process.env.JOURNAL_AI_PROVIDER ?? "manual"] ?? manualProvider;
}
