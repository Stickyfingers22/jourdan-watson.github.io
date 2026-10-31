// The module registry is the single description of every JOURNAL data type.
// Pages, forms, validation, export and import are all driven from it, so a
// new module is: one SQL table (supabase/migrations) + one entry here.

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "money"
  | "percent"
  | "rating"
  | "date"
  | "select"
  | "tags"
  | "url"
  | "email"
  | "boolean"
  | "ref";

export type Option = { value: string; label: string };

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: Option[];
  /** For type "ref": the module key whose rows can be referenced. */
  ref?: string;
  help?: string;
  placeholder?: string;
  defaultValue?: string;
};

export type AreaKey =
  | "executive"
  | "career"
  | "finance"
  | "research"
  | "builder"
  | "performance"
  | "lifestyle"
  | "ventures";

export type Area = { key: AreaKey; label: string; short: string; description: string };

export type Module = {
  key: string;
  table: string;
  label: string;
  singular: string;
  area: AreaKey;
  description: string;
  titleField: string;
  fields: Field[];
  listColumns: string[];
  sort: { column: string; ascending: boolean };
  /** Field used for the status filter on the list page. */
  statusField?: string;
};

export const AREAS: Area[] = [
  { key: "executive", label: "Executive Intelligence", short: "Executive", description: "Goals, priorities, projects, tasks and decisions." },
  { key: "career", label: "Career & Professional", short: "Career", description: "Accomplishments, job pipeline, opportunities and network." },
  { key: "finance", label: "Financial Intelligence", short: "Finance", description: "Accounts, cash flow, contributions and net worth (manual entry)." },
  { key: "research", label: "Research & Learning", short: "Research", description: "Knowledge library, research notes and learning paths." },
  { key: "builder", label: "Technical Builder", short: "Builder", description: "Automations and systems that remove manual work." },
  { key: "performance", label: "Performance & Habits", short: "Performance", description: "Routines, habits and consistency tracking." },
  { key: "lifestyle", label: "Lifestyle & Operations", short: "Lifestyle", description: "Trips, purchases, renewals, bills and appointments." },
  { key: "ventures", label: "Ventures & Creative", short: "Ventures", description: "Prolific Dreamer, business ideas and the idea-to-product pipeline." },
];

const opts = (...values: string[]): Option[] =>
  values.map((v) => ({ value: v, label: v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) }));

const areaField: Field = {
  name: "area",
  label: "Area",
  type: "select",
  options: AREAS.map((a) => ({ value: a.key, label: a.short })),
  defaultValue: "executive",
};
const priority: Field = { name: "priority", label: "Priority", type: "select", options: opts("high", "medium", "low"), defaultValue: "medium" };
const notes: Field = { name: "notes", label: "Notes", type: "textarea" };

export const MODULES: Module[] = [
  // ---------------------------------------------------------------- executive
  {
    key: "goals",
    table: "goals",
    label: "Goals",
    singular: "Goal",
    area: "executive",
    description: "Outcomes you are working toward, at every horizon.",
    titleField: "title",
    statusField: "status",
    sort: { column: "target_date", ascending: true },
    listColumns: ["title", "area", "horizon", "status", "progress", "target_date"],
    fields: [
      { name: "title", label: "Goal", type: "text", required: true },
      areaField,
      { name: "horizon", label: "Horizon", type: "select", options: opts("week", "quarter", "year", "five_year", "lifetime"), defaultValue: "year" },
      { name: "status", label: "Status", type: "select", options: opts("not_started", "active", "on_hold", "achieved", "dropped"), defaultValue: "active" },
      { name: "progress", label: "Progress", type: "percent", defaultValue: "0" },
      { name: "target_date", label: "Target date", type: "date" },
      { name: "metric", label: "How it is measured", type: "text", placeholder: "e.g. $50k invested, offer at L5, 24 books" },
      { name: "description", label: "Why it matters", type: "textarea" },
    ],
  },
  {
    key: "projects",
    table: "projects",
    label: "Projects",
    singular: "Project",
    area: "executive",
    description: "Multi-step efforts with a measurable outcome.",
    titleField: "title",
    statusField: "status",
    sort: { column: "due_date", ascending: true },
    listColumns: ["title", "area", "status", "priority", "due_date"],
    fields: [
      { name: "title", label: "Project", type: "text", required: true },
      areaField,
      { name: "status", label: "Status", type: "select", options: opts("idea", "planned", "active", "blocked", "done", "archived"), defaultValue: "planned" },
      priority,
      { name: "goal_id", label: "Supports goal", type: "ref", ref: "goals" },
      { name: "start_date", label: "Start", type: "date" },
      { name: "due_date", label: "Due", type: "date" },
      { name: "outcome", label: "Measurable outcome", type: "text" },
      { name: "repo_url", label: "Repo / link", type: "url" },
      { name: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    key: "tasks",
    table: "tasks",
    label: "Tasks",
    singular: "Task",
    area: "executive",
    description: "Single next actions. Completed tasks feed the weekly briefing.",
    titleField: "title",
    statusField: "status",
    sort: { column: "due_date", ascending: true },
    listColumns: ["title", "area", "status", "priority", "due_date", "project_id"],
    fields: [
      { name: "title", label: "Task", type: "text", required: true },
      areaField,
      { name: "status", label: "Status", type: "select", options: opts("todo", "doing", "waiting", "done", "cancelled"), defaultValue: "todo" },
      priority,
      { name: "due_date", label: "Due", type: "date" },
      { name: "project_id", label: "Project", type: "ref", ref: "projects" },
      notes,
    ],
  },
  {
    key: "decisions",
    table: "decisions",
    label: "Decisions",
    singular: "Decision",
    area: "executive",
    description: "Decision Intelligence: structured evaluation of consequential choices.",
    titleField: "title",
    statusField: "status",
    sort: { column: "created_at", ascending: false },
    listColumns: ["title", "area", "status", "financial_impact", "review_on"],
    fields: [
      { name: "title", label: "Decision", type: "text", required: true, placeholder: "e.g. Buy a G-Wagon in 2027?" },
      areaField,
      { name: "status", label: "Status", type: "select", options: opts("open", "decided", "reviewing", "closed"), defaultValue: "open" },
      { name: "context", label: "Context & constraints", type: "textarea" },
      { name: "options", label: "Options considered", type: "textarea" },
      { name: "criteria", label: "Criteria & weights", type: "textarea", help: "e.g. long-term wealth 40%, career growth 30%, wellbeing 30%" },
      { name: "assumptions", label: "Assumptions to challenge", type: "textarea" },
      { name: "financial_impact", label: "Financial impact ($)", type: "money", help: "Negative for a cost." },
      { name: "reversible", label: "Easily reversible", type: "boolean" },
      { name: "recommendation", label: "Recommendation", type: "textarea" },
      { name: "decision", label: "Final decision", type: "textarea" },
      { name: "decided_on", label: "Decided on", type: "date" },
      { name: "review_on", label: "Review outcome on", type: "date" },
    ],
  },
  // ------------------------------------------------------------------- career
  {
    key: "accomplishments",
    table: "accomplishments",
    label: "Accomplishments",
    singular: "Accomplishment",
    area: "career",
    description: "Achievement database in STAR format, captured as it happens.",
    titleField: "title",
    sort: { column: "occurred_on", ascending: false },
    listColumns: ["title", "employer", "occurred_on", "metric"],
    fields: [
      { name: "title", label: "Accomplishment", type: "text", required: true },
      { name: "occurred_on", label: "Date", type: "date" },
      { name: "employer", label: "Employer / team", type: "text" },
      { name: "project", label: "Project / user story", type: "text" },
      { name: "situation", label: "Situation", type: "textarea" },
      { name: "task", label: "Task", type: "textarea" },
      { name: "action", label: "Action (what you did)", type: "textarea" },
      { name: "result", label: "Result", type: "textarea" },
      { name: "metric", label: "Key metric", type: "text", placeholder: "e.g. cut report time 6h → 20m" },
      { name: "business_impact", label: "Business priority it served", type: "text" },
      { name: "skills", label: "Skills", type: "tags", placeholder: "python, sql, stakeholder mgmt" },
    ],
  },
  {
    key: "jobs",
    table: "job_applications",
    label: "Job Pipeline",
    singular: "Application",
    area: "career",
    description: "Every opportunity, its score, status and next step. Nothing is submitted for you.",
    titleField: "role",
    statusField: "status",
    sort: { column: "updated_at", ascending: false },
    listColumns: ["role", "company", "status", "fit_score", "next_step_on"],
    fields: [
      { name: "role", label: "Role", type: "text", required: true },
      { name: "company", label: "Company", type: "text", required: true },
      { name: "status", label: "Status", type: "select", options: opts("researching", "applied", "screening", "interviewing", "offer", "accepted", "rejected", "withdrawn"), defaultValue: "researching" },
      { name: "fit_score", label: "Fit score", type: "percent", help: "Compensation, skills, trajectory, location." },
      { name: "location", label: "Location", type: "text" },
      { name: "work_mode", label: "Work mode", type: "select", options: opts("remote", "hybrid", "onsite") },
      { name: "salary_min", label: "Salary min", type: "money" },
      { name: "salary_max", label: "Salary max", type: "money" },
      { name: "posting_url", label: "Posting", type: "url" },
      { name: "applied_on", label: "Applied on", type: "date" },
      { name: "next_step", label: "Next step", type: "text" },
      { name: "next_step_on", label: "Next step date", type: "date" },
      { name: "contact_name", label: "Contact", type: "text" },
      { name: "resume_version", label: "Resume version", type: "text" },
      notes,
    ],
  },
  {
    key: "opportunities",
    table: "opportunities",
    label: "Opportunity Radar",
    singular: "Opportunity",
    area: "career",
    description: "Promotions, fellowships, contracts and business openings worth evaluating.",
    titleField: "title",
    statusField: "status",
    sort: { column: "deadline", ascending: true },
    listColumns: ["title", "kind", "status", "fit_score", "deadline"],
    fields: [
      { name: "title", label: "Opportunity", type: "text", required: true },
      { name: "kind", label: "Kind", type: "select", options: opts("job", "promotion", "fellowship", "contract", "business", "learning", "other"), defaultValue: "job" },
      areaField,
      { name: "status", label: "Status", type: "select", options: opts("new", "evaluating", "pursuing", "passed", "won", "lost"), defaultValue: "new" },
      { name: "fit_score", label: "Fit score", type: "percent" },
      { name: "deadline", label: "Deadline", type: "date" },
      { name: "source_url", label: "Link", type: "url" },
      notes,
    ],
  },
  {
    key: "contacts",
    table: "contacts",
    label: "Network",
    singular: "Contact",
    area: "career",
    description: "People to stay in touch with, and when to follow up.",
    titleField: "name",
    sort: { column: "next_follow_up_on", ascending: true },
    listColumns: ["name", "organization", "relationship", "next_follow_up_on"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "organization", label: "Organization", type: "text" },
      { name: "relationship", label: "Relationship", type: "select", options: opts("mentor", "manager", "colleague", "recruiter", "friend", "other") },
      { name: "email", label: "Email", type: "email" },
      { name: "linkedin_url", label: "LinkedIn", type: "url" },
      { name: "last_contacted_on", label: "Last contacted", type: "date" },
      { name: "next_follow_up_on", label: "Next follow-up", type: "date" },
      notes,
    ],
  },
  // ------------------------------------------------------------------ finance
  {
    key: "accounts",
    table: "accounts",
    label: "Accounts",
    singular: "Account",
    area: "finance",
    description: "Current balances for net worth. Never store account numbers or logins here.",
    titleField: "name",
    sort: { column: "balance", ascending: false },
    listColumns: ["name", "kind", "institution", "balance", "is_liability", "as_of"],
    fields: [
      { name: "name", label: "Account", type: "text", required: true, placeholder: "e.g. Fidelity Roth IRA" },
      { name: "kind", label: "Type", type: "select", options: opts("checking", "savings", "brokerage", "roth_ira", "traditional_ira", "401k", "hsa", "crypto", "property", "vehicle", "loan", "credit_card", "other"), defaultValue: "checking" },
      { name: "institution", label: "Institution", type: "text" },
      { name: "balance", label: "Balance", type: "money", required: true, help: "Enter debts as positive and tick 'Liability'." },
      { name: "is_liability", label: "Liability (debt)", type: "boolean" },
      { name: "as_of", label: "As of", type: "date" },
      notes,
    ],
  },
  {
    key: "cashflow",
    table: "cash_flow",
    label: "Cash Flow",
    singular: "Entry",
    area: "finance",
    description: "Monthly income and expenses by category (manual entry).",
    titleField: "category",
    sort: { column: "month", ascending: false },
    listColumns: ["month", "direction", "category", "source", "amount"],
    fields: [
      { name: "month", label: "Month", type: "date", required: true, help: "Any day in the month; use the 1st." },
      { name: "direction", label: "Direction", type: "select", options: opts("income", "expense"), defaultValue: "expense", required: true },
      { name: "category", label: "Category", type: "text", required: true, placeholder: "salary, rent, food, subscriptions…" },
      { name: "source", label: "Source / payee", type: "text", placeholder: "e.g. GE, second job" },
      { name: "amount", label: "Amount", type: "money", required: true },
      notes,
    ],
  },
  {
    key: "contributions",
    table: "contributions",
    label: "Contributions",
    singular: "Contribution",
    area: "finance",
    description: "Money moved into investments, so you can track savings rate.",
    titleField: "asset",
    sort: { column: "contributed_on", ascending: false },
    listColumns: ["contributed_on", "asset", "kind", "account_id", "amount"],
    fields: [
      { name: "asset", label: "Asset / fund", type: "text", required: true, placeholder: "e.g. VTI, target-date 2060" },
      { name: "contributed_on", label: "Date", type: "date", required: true },
      { name: "account_id", label: "Account", type: "ref", ref: "accounts" },
      { name: "kind", label: "Kind", type: "select", options: opts("employee", "employer_match", "ira", "brokerage", "hsa", "other"), defaultValue: "employee" },
      { name: "amount", label: "Amount", type: "money", required: true },
      notes,
    ],
  },
  // ----------------------------------------------------------------- research
  {
    key: "library",
    table: "knowledge_items",
    label: "Knowledge Library",
    singular: "Item",
    area: "research",
    description: "Books, papers, articles and courses with summaries and open questions.",
    titleField: "title",
    statusField: "status",
    sort: { column: "updated_at", ascending: false },
    listColumns: ["title", "kind", "topic", "status", "rating"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "kind", label: "Kind", type: "select", options: opts("book", "article", "paper", "course", "video", "podcast", "dataset", "other"), defaultValue: "book" },
      { name: "topic", label: "Topic", type: "select", options: opts("sociology", "statistics", "ai", "data_science", "technology", "finance", "history", "faith", "other"), defaultValue: "sociology" },
      { name: "status", label: "Status", type: "select", options: opts("queued", "in_progress", "done", "archived"), defaultValue: "queued" },
      { name: "author", label: "Author / source", type: "text" },
      { name: "source_url", label: "Link", type: "url" },
      { name: "rating", label: "Rating (1–5)", type: "rating" },
      { name: "summary", label: "Summary", type: "textarea" },
      { name: "key_ideas", label: "Key ideas", type: "textarea" },
      { name: "open_questions", label: "Open questions & counter-arguments", type: "textarea" },
      { name: "tags", label: "Tags", type: "tags" },
    ],
  },
  {
    key: "notes",
    table: "notes",
    label: "Notes",
    singular: "Note",
    area: "research",
    description: "Ideas, meeting notes, research briefs — searchable later.",
    titleField: "title",
    sort: { column: "updated_at", ascending: false },
    listColumns: ["title", "area", "tags", "updated_at"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      areaField,
      { name: "body", label: "Body", type: "textarea" },
      { name: "tags", label: "Tags", type: "tags" },
      { name: "source_url", label: "Source", type: "url" },
    ],
  },
  // ------------------------------------------------------------------ builder
  {
    key: "automations",
    table: "automations",
    label: "Automations",
    singular: "Automation",
    area: "builder",
    description: "Manual processes to automate, and the systems you have built.",
    titleField: "name",
    statusField: "status",
    sort: { column: "hours_saved_per_month", ascending: false },
    listColumns: ["name", "status", "permission_level", "hours_saved_per_month"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "status", label: "Status", type: "select", options: opts("idea", "building", "live", "paused", "retired"), defaultValue: "idea" },
      { name: "manual_process", label: "Manual process it replaces", type: "textarea" },
      { name: "trigger", label: "Trigger", type: "text", placeholder: "schedule, new email, form submit…" },
      { name: "hours_saved_per_month", label: "Hours saved / month", type: "number" },
      {
        name: "permission_level",
        label: "Permission level",
        type: "select",
        options: [
          { value: "1", label: "1 · Automatic" },
          { value: "2", label: "2 · Approval required" },
          { value: "3", label: "3 · Restricted" },
        ],
        defaultValue: "1",
      },
      { name: "repo_url", label: "Repo / link", type: "url" },
      notes,
    ],
  },
  // -------------------------------------------------------------- performance
  {
    key: "habits",
    table: "habits",
    label: "Habits",
    singular: "Habit",
    area: "performance",
    description: "Routines to keep. Check them off from the dashboard.",
    titleField: "name",
    sort: { column: "name", ascending: true },
    listColumns: ["name", "area", "cadence", "target_per_week", "active"],
    fields: [
      { name: "name", label: "Habit", type: "text", required: true, placeholder: "Read 20 min, gym, prayer…" },
      { ...areaField, defaultValue: "performance" },
      { name: "cadence", label: "Cadence", type: "select", options: opts("daily", "weekly"), defaultValue: "daily" },
      { name: "target_per_week", label: "Target per week", type: "number", defaultValue: "5" },
      { name: "active", label: "Active", type: "boolean", defaultValue: "true" },
      { name: "why", label: "Why", type: "textarea" },
    ],
  },
  {
    key: "habit-logs",
    table: "habit_logs",
    label: "Habit Log",
    singular: "Check-in",
    area: "performance",
    description: "One row per habit per day.",
    titleField: "log_date",
    sort: { column: "log_date", ascending: false },
    listColumns: ["log_date", "habit_id", "note"],
    fields: [
      { name: "habit_id", label: "Habit", type: "ref", ref: "habits", required: true },
      { name: "log_date", label: "Date", type: "date", required: true },
      { name: "note", label: "Note", type: "text" },
    ],
  },
  // ---------------------------------------------------------------- lifestyle
  {
    key: "obligations",
    table: "obligations",
    label: "Renewals & Bills",
    singular: "Obligation",
    area: "lifestyle",
    description: "Subscriptions, renewals, appointments and deadlines that must not slip.",
    titleField: "name",
    sort: { column: "next_due_on", ascending: true },
    listColumns: ["name", "kind", "cadence", "amount", "next_due_on", "auto_renews"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "kind", label: "Kind", type: "select", options: opts("subscription", "renewal", "bill", "appointment", "deadline", "document"), defaultValue: "subscription" },
      { name: "amount", label: "Amount", type: "money" },
      { name: "cadence", label: "Cadence", type: "select", options: opts("once", "weekly", "monthly", "quarterly", "yearly"), defaultValue: "monthly" },
      { name: "next_due_on", label: "Next due", type: "date", required: true },
      { name: "auto_renews", label: "Auto-renews", type: "boolean" },
      { name: "cancel_url", label: "Manage / cancel link", type: "url" },
      notes,
    ],
  },
  {
    key: "experiences",
    table: "experiences",
    label: "Trips & Purchases",
    singular: "Experience",
    area: "lifestyle",
    description: "Trips, major purchases and experiences, with budgets.",
    titleField: "title",
    statusField: "status",
    sort: { column: "target_date", ascending: true },
    listColumns: ["title", "kind", "status", "est_cost", "budget", "target_date"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "kind", label: "Kind", type: "select", options: opts("trip", "purchase", "event", "experience"), defaultValue: "trip" },
      { name: "status", label: "Status", type: "select", options: opts("wishlist", "researching", "planned", "booked", "done", "dropped"), defaultValue: "wishlist" },
      { name: "est_cost", label: "Estimated cost", type: "money" },
      { name: "budget", label: "Budget", type: "money" },
      { name: "target_date", label: "Target date", type: "date" },
      { name: "location", label: "Location", type: "text" },
      notes,
    ],
  },
  // ----------------------------------------------------------------- ventures
  {
    key: "ideas",
    table: "ideas",
    label: "Idea Pipeline",
    singular: "Idea",
    area: "ventures",
    description: "Capture → research → validate → MVP. Kill ideas that don't earn their time.",
    titleField: "title",
    statusField: "stage",
    sort: { column: "updated_at", ascending: false },
    listColumns: ["title", "stage", "complexity", "value_estimate", "next_step"],
    fields: [
      { name: "title", label: "Idea", type: "text", required: true },
      { ...areaField, defaultValue: "ventures" },
      { name: "stage", label: "Stage", type: "select", options: opts("captured", "researching", "validated", "mvp", "launched", "parked", "killed"), defaultValue: "captured" },
      { name: "problem", label: "Problem", type: "textarea" },
      { name: "audience", label: "Who has it", type: "text" },
      { name: "existing_solutions", label: "Existing solutions", type: "textarea" },
      { name: "complexity", label: "Build complexity", type: "select", options: opts("low", "medium", "high") },
      { name: "value_estimate", label: "Potential value ($/yr)", type: "money" },
      { name: "next_step", label: "Next step", type: "text" },
      notes,
    ],
  },
];

const byKey = new Map(MODULES.map((m) => [m.key, m]));

export function getModule(key: string): Module | undefined {
  return byKey.get(key);
}

export function modulesForArea(area: AreaKey): Module[] {
  return MODULES.filter((m) => m.area === area);
}

export function areaLabel(key: string): string {
  return AREAS.find((a) => a.key === key)?.short ?? key;
}

/** System tables that are exported/imported but not edited through the generic UI. */
export const SYSTEM_TABLES = ["reports", "activity_log"] as const;
