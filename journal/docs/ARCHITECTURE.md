# JOURNAL — Free-Tier Architecture & Blueprint

_Last reviewed: 2026-10-31. Free-tier limits change. Re-check the provider pricing pages linked below every quarter._

This document covers the five items you asked for before implementation:

1. The complete free-tier architecture.
2. The limits of every free service.
3. The features that need a paid service.
4. The expected monthly cost.
5. The plan for keeping recurring cost at $0.

It also covers the history audit, the agent-to-module mapping, the workflows, the schema, security and the roadmap.

---

## 0. History audit: what I could and could not see

I could not access your ChatGPT history, your other Claude conversations, your email, your calendar or your financial accounts. Everything below comes from the brief you wrote, which describes your past requests: the job tracker, STAR performance reviews, paper trading, the 3D portfolio, sociology research, travel planning, financial and career planning, and recording analysis. It also comes from this repository, your public portfolio site. I have not made up any history beyond that. When you want a deeper audit, export your conversations and use the **AI prompt builder** with your own subscription.

### Prioritised needs assessment

| # | Need | Evidence in your brief | What JOURNAL does now | Keep under your control |
|---|------|------------------------|-----------------------|-------------------------|
| 1 | One place for goals, priorities and commitments | Many parallel projects; you named overcommitment as a risk | Goals, Projects and Tasks modules; overcommitment flags | What to drop |
| 2 | Accomplishments captured during the year, not rebuilt at review time | STAR review agents; GE rotations | STAR Accomplishments database | What to claim |
| 3 | A single job pipeline | Job tracker; tailored resumes | Job Pipeline with fit score, next step and follow-up flags | Every submission |
| 4 | A full financial picture | Multiple incomes, Roth/401k/brokerage, the G-Wagon decision | Accounts, Cash Flow, Contributions, net worth and savings rate | Every transaction |
| 5 | Decisions you can trace back | Vehicle, job and business choices | Decisions module (criteria, assumptions, review date) | The decision |
| 6 | Learning that builds on itself | Sociology, statistics, AI | Knowledge Library with open questions and counter-arguments | — |
| 7 | Nothing slipping (renewals, follow-ups) | Workflow G | Renewals & Bills and Network follow-ups, both flagged | Cancellations |
| 8 | Ideas that either move forward or get killed | Prolific Dreamer; many ideas | Idea Pipeline with an idle-idea flag | Investment of time and money |

**Pushback (you asked for it):**

- **Live trading:** the automated trading system should not live in JOURNAL. JOURNAL logs the *decision* to fund a strategy, and nothing more. Only paper trading should be automated, and nothing can promise a 90% win rate.
- **Fourteen agents is too many:** most of them describe the same thing, which is rules running on shared data. They are folded into eight areas below. A separate "agent" only earns its place once it does work that rules cannot do.
- **The 3D portfolio and Prolific Dreamer:** treat each as a project with a measurable outcome, such as interviews generated or revenue. Otherwise they are hobbies, and that is fine, but they should be labelled as hobbies.

---

## 1. Free-tier architecture

```
          You (browser, phone)
                │  HTTPS
                ▼
┌───────────────────────────────┐        ┌──────────────────────────────┐
│  Vercel Hobby (free)          │        │  GitHub (private repo, free) │
│  Next.js 16 app               │◄───────│  source, issues, Actions     │
│  • proxy.ts: session refresh  │ deploy │  • keep-alive ping (3 days)  │
│  • Server Components + Actions│        └──────────────────────────────┘
│  • rule-based "agents"        │
│    (lib/insights.ts)          │
└──────────────┬────────────────┘
               │ supabase-js (user JWT, anon key)
               ▼
┌───────────────────────────────┐
│  Supabase Free                │
│  • Auth (email + password)    │
│  • Postgres: 21 tables, RLS   │   ← single source of truth
│    on every table             │
│  • Storage (reserved, unused) │
└───────────────────────────────┘

AI: "manual" provider. JOURNAL builds the prompt, you paste it into your
existing Claude subscription. No API keys, no per-token billing.
```

**Why this shape:**

- **One deployable and one database.** There are no microservices, no queue and no separate server.
- **Every request uses your own JWT.** Postgres Row Level Security (RLS) is the final guard, so even a bug in the app cannot expose another user's rows.
- **The service-role key is never used by the app.** It has no reason to exist in Vercel.

**Vercel or Cloudflare?** Vercel Hobby is the better fit. It runs Next.js 16 natively, including Server Actions, Proxy and streaming. Cloudflare Workers can run Next.js through the OpenNext adapter, but that adds build complexity and has edge-runtime caveats. Cloudflare is the fallback if Vercel's terms or limits ever stop working for you (see §3).

### Agents become modules

You asked to keep all eight intelligence areas without running eight paid agents. Each area is a module group with its own data, rules and dashboard tiles:

| Area | Modules (tables) | Rule-based "agent" behaviour today | Later (with approved AI) |
|------|------------------|-------------------------------------|--------------------------|
| Executive Intelligence | goals, projects, tasks, decisions | top-3 priorities, overcommitment, goals with no plan, overdue work, decision reviews | narrative briefing, trade-off analysis |
| Career & Professional | accomplishments, job_applications, opportunities, contacts | missed next steps, 14-day no-reply nudges, deadline alerts, follow-ups | resume tailoring from verified accomplishments only |
| Financial Intelligence | accounts, cash_flow, contributions | net worth, savings rate < 20%, overspending, stale balances | scenario projections |
| Research & Learning | knowledge_items, notes | reading queue, in-progress items | summaries, knowledge maps |
| Technical Builder | automations | hours-saved ranking, permission level per automation | — |
| Performance & Habits | habits, habit_logs | weekly pace vs target | pattern analysis |
| Lifestyle & Operations | obligations, experiences | due/overdue renewals, auto-renew warnings, budgets | trip research |
| Ventures & Creative | ideas | idle-idea "research, park or kill" | market research briefs |

The extra agents from your brief fold into these areas instead of becoming separate services:

- **Opportunity Radar** is the `opportunities` table.
- **Decision Intelligence** is the `decisions` table.
- **Knowledge Archivist** is `knowledge_items` plus `notes`.
- **Personal Operations** is `obligations`.
- **Communication** is `contacts` follow-ups. Drafting messages goes through the prompt builder.
- **Risk & Compliance** is the permission framework plus the flags.

### How the agents share information

There is one database and one row per fact. Modules reference each other by foreign key (task → project → goal; contribution → account; habit_log → habit) instead of copying data. `lib/insights.ts` reads across all modules to build one snapshot, and the dashboard, the briefing and the AI prompt builder all use that same snapshot. To upgrade an "agent", you change its rules, or add an AI step behind `lib/ai/provider.ts`. The tables stay the same.

### Module registry (the way to extend JOURNAL)

`src/lib/modules.ts` describes every module: its fields, types, list columns, sort order and status filter. The list, create, edit and delete pages are generic, and so are validation, export and import. **Adding a module** means writing one `create table` migration (copy any table, including the RLS loop) and adding one registry entry.

---

## 2. Limits of every free service

Values below come from the providers' pricing and limits pages as of this review. Verify them at [supabase.com/pricing](https://supabase.com/pricing) and [vercel.com/docs/limits](https://vercel.com/docs/limits).

| Service | Free allowance | Limit that matters for JOURNAL | Expected JOURNAL use | Mitigation |
|---------|----------------|--------------------------------|----------------------|------------|
| **Supabase Free** | 500 MB database, 1 GB file storage, 5 GB egress, 50k monthly active users, 2 projects | **Paused after ~7 days with no activity** | Text-only personal data is roughly 5–50 MB over years | Keep-alive Action every 3 days; Settings shows DB size with amber/red warnings at 60%/80% |
| | No point-in-time recovery; daily backups are not downloadable on Free | Data loss risk if you delete something by mistake | — | Built-in JSON export and restore; download monthly |
| | Built-in auth email is heavily rate-limited | Password-reset and magic-link emails are unreliable | 1 user | Password login. Reset the password from the Supabase dashboard. |
| **Vercel Hobby** | ~100 GB transfer, ~1M function invocations, 4 active CPU-hours/month | **Personal, non-commercial use only** | Far below the limits | Fine for a personal OS. If JOURNAL ever runs a business, move to Cloudflare or pay |
| | Hobby cron jobs are limited (roughly daily) | No frequent scheduled jobs | None used | GitHub Actions does the scheduling |
| | 4.5 MB request body | Caps the backup restore upload | Backups are well under 4 MB for years | Upload limit set to 4 MB |
| | **No overage billing on Hobby.** Usage past the limit pauses the project; it does not charge you | — | — | — |
| **GitHub Free** | Unlimited private repos; 2,000 Actions minutes/month on private repos | Actions minutes | ~10 min/month (keep-alive) | — |
| **Your Claude subscription** | Already paid for, outside JOURNAL | Manual copy and paste | — | AI prompt builder |

**No free service here can bill you unexpectedly**, because none of them has a payment method on file. Do not add a card to Supabase or Vercel unless you have approved an upgrade.

## 3. Features that cannot work for free

| Feature | Why it isn't free | Free alternative used now | Cost if you approve it later |
|---------|-------------------|---------------------------|------------------------------|
| AI agents that reason on their own (API calls) | Per-token billing | Manual prompt builder with your existing subscription | Pay-as-you-go API; a weekly briefing costs cents a month. **Requires approval** |
| Automatic bank and brokerage sync | Aggregators (Plaid and similar) charge per connection | Manual entry. A monthly balance update takes about 10 minutes | Varies; often $0 for development tiers that can't use real accounts |
| Job discovery by scraping | Most boards forbid scraping; paid APIs | Paste postings into Job Pipeline and Opportunity Radar | — |
| Point-in-time recovery and no pausing | Supabase Pro | Keep-alive + JSON exports | Supabase Pro, ~$25/month |
| Reliable transactional email (alerts) | Needs an SMTP provider | Dashboard flags; GitHub emails you when the keep-alive fails | Many SMTP providers have free tiers (~100/day); can be added at $0 |
| Telegram notifications | Free, but needs a bot token and a scheduled job | Not built yet; possible at $0 (Phase 9) | $0 |
| Gmail / Calendar ingestion | Google APIs are free, but OAuth verification is extra work | Not built; use the connectors in Claude itself | $0 |

## 4. Expected monthly cost

| Item | Monthly |
|------|---------|
| Vercel Hobby | $0 |
| Supabase Free | $0 |
| GitHub private repo + Actions | $0 |
| AI (manual provider) | $0 |
| Domain (optional; `*.vercel.app` is free) | $0 (a custom domain costs ~$10–15/year) |
| **Total** | **$0** |

## 5. Plan for keeping recurring cost at $0

1. Never put a payment method on Supabase or Vercel. With no card on file, a plan cannot upgrade itself.
2. Every dependency is listed in `docs/COST_REGISTER.md`. A pull request that adds a service must update that file.
3. Settings → Usage shows database size against the free limit and warns at 60%. The keep-alive Action fails loudly, and GitHub emails you about failed runs.
4. AI stays on the `manual` provider. A billable provider has to be added in code (`billable: true`), be listed in the register and get your approval.
5. Export a backup every month. Owning your data is what makes leaving a free tier painless.

---

## 6. Workflows

### A. Weekly briefing (built)
```
Sunday: open /briefing
  → gatherSnapshot()  reads every module (one round-trip per table, in parallel)
  → analyse()         flags by area + scored top-3 priorities
  → markdown          shown live; "Save to archive" stores it in `reports`
  → activity_log      records workflow run (ok | error)
  → optional          AI prompt builder → paste into Claude for narrative
Failure: a failing query returns an empty list for that table, so the briefing
still renders. A failed save shows an error and is logged with status=error.
```

### B. Career achievement capture (built: data + flags)
Capture a STAR entry when the work happens, including metric, business impact and skills. At review time, filter by date, then use the prompt builder ("Career strategy") to draft talking points. **Nothing is invented:** the prompt tells the AI to use only the data provided.

### C. Job pipeline (built: tracking; tailoring is manual)
The pipeline runs Researching → Applied → Screening → Interviewing → Offer, and every application has a next step and a date. The flags catch missed next steps and 14 days with no reply. JOURNAL never submits anything.

### D. Financial loop (built: manual entry)
At the start of each month: update account balances, enter last month's income and expense totals by category, and log contributions. The dashboard then shows net worth, savings rate and YTD contributions. The flags catch savings rate below 20%, spending above income, and balances older than 45 days.

### E. Research to knowledge (built)
Each item has a summary, key ideas and open questions or counter-arguments. Status runs queued → in progress → done.

### F. Idea to product (built)
Stages run captured → researching → validated → mvp → launched, or parked or killed. An idea that sits in "captured" for more than 30 days gets flagged so you make a call on it.

### G. Personal operations (built)
Obligations have a next due date and cadence. JOURNAL flags them 7 days ahead and warns when something auto-renews. Rolling the date forward is manual.

### H. Decision intelligence (built: structured template)
Each decision records context, options, weighted criteria, assumptions, financial impact, reversibility, the recommendation, the decision and a review date. The flags fire when a review is due or a decision has been open for 30+ days. For deeper analysis, use the "Challenge my priorities" preset in the prompt builder.

### Fifteen more workflow opportunities (ranked by value ÷ effort)

| # | Workflow | Trigger | Approval | Time saved/mo | Status |
|---|----------|---------|----------|---------------|--------|
| 1 | Auto-advance recurring obligations when marked paid | edit | none | 30 min | next |
| 2 | Monthly finance snapshot saved to `reports` (net-worth history chart) | 1st of month / button | none | 30 min | next |
| 3 | Promotion packet: accomplishments in a date range as markdown | button | none | 3 h at review time | next |
| 4 | Resume bullet bank built from accomplishments (no fabrication) | button | none | 1 h/application | next |
| 5 | Interview debrief template linked to an application | status → interviewing | none | 30 min | planned |
| 6 | Subscription audit: yearly cost of all subscriptions, sorted | button | none | 1 h | planned |
| 7 | "Stop doing" review: projects with no task activity in 30 days | weekly briefing | none | — | planned |
| 8 | Skill-gap map: skills in accomplishments vs. skills in target postings | button | none | 2 h | planned |
| 9 | Networking cadence: auto-suggest next follow-up based on relationship | contact saved | none | 30 min | planned |
| 10 | Learning path: ordered queue per topic with prerequisites | manual | none | — | planned |
| 11 | Major-purchase calculator (G-Wagon): opportunity cost vs. invested at assumed return | decision saved | none | — | planned |
| 12 | Free-tier guard: email when DB > 60% | GitHub Action + free SMTP | none | — | planned |
| 13 | Telegram daily digest of the top 3 priorities | daily Action | none | 15 min | planned ($0) |
| 14 | Paper-trading journal (strategy, hypothesis, results), with no live execution | manual | Level 3 for any live step | — | planned |
| 15 | Meeting prep: contact + related notes + open tasks as one page | button | none | 20 min/meeting | planned |
| 16 | Document intake: upload PDF → Supabase Storage → note with summary via prompt builder | upload | Level 2 if AI API | 1 h | planned |
| 17 | Quarterly goal review that archives goals that were achieved or dropped | quarter start | none | 1 h | planned |

---

## 7. Database schema (summary)

The full DDL is in `supabase/migrations/0001_init.sql`. Every table has `id uuid`, `user_id uuid → auth.users`, `created_at` and `updated_at`.

| Table | Key columns | References |
|-------|-------------|------------|
| goals | title, area, horizon, status, progress 0–100, target_date, metric | — |
| projects | title, area, status, priority, due_date, outcome | goal_id → goals |
| tasks | title, area, status, priority, due_date, completed_at (trigger) | project_id → projects |
| decisions | context, options, criteria, assumptions, financial_impact, reversible, decision, review_on | — |
| accomplishments | STAR fields, metric, business_impact, skills[] | — |
| job_applications | role, company, status, fit_score, salary range, next_step(_on) | — |
| opportunities | kind, status, fit_score, deadline | — |
| contacts | organization, relationship, next_follow_up_on | — |
| accounts | kind, balance, is_liability, as_of | — |
| cash_flow | month, direction, category, amount ≥ 0 | — |
| contributions | asset, contributed_on, kind, amount ≥ 0 | account_id → accounts |
| knowledge_items | kind, topic, status, rating 1–5, summary, key_ideas, open_questions, tags[] | — |
| notes | area, body, tags[] | — |
| automations | manual_process, trigger, hours_saved_per_month, permission_level 1–3 | — |
| habits / habit_logs | cadence, target_per_week / log_date, unique(habit, day) | habit_id → habits |
| obligations | kind, amount, cadence, next_due_on, auto_renews | — |
| experiences | kind, status, est_cost, budget, target_date | — |
| ideas | stage, problem, audience, complexity, value_estimate | — |
| reports | kind, period, body (markdown) | — |
| activity_log | action, module, record_id, status. Append-only (no UPDATE grant) | — |

## 8. Security & permissions

- **Auth.** Supabase email and password. Public sign-up is **disabled** in the dashboard, and `JOURNAL_ALLOWED_EMAILS` is enforced at sign-in and on every request (`requireUser`).
- **Authorisation.** RLS is enabled and **forced** on all 21 tables, with one owner-only policy each. `anon` has no table access at all; its only grant is `journal_ping()`.

  This was tested against Postgres 16 with simulated users. User B reads 0 of user A's rows. B's updates and deletes affect 0 rows. B cannot insert rows that claim A's `user_id`. The audit log rejects updates.
- **Input validation.** Only fields declared in the registry are written, which blocks mass assignment. Each value is coerced and range-checked, URLs must be http(s), and select values must be on the allowed list. Imports go through the same validation, and ownership always comes from the session, never from the file.
- **Secrets.** Only the public anon key and the URL are used, both from environment variables. `.env*` is git-ignored. The service-role key is never needed.
- **Headers.** `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and `noindex`.
- **Data you should not store here:** account numbers, SSNs, passwords and full card numbers. The account form says so.
- **Permission levels.** Shown in Settings. JOURNAL only performs Level 1 actions, and nothing in the codebase can send email, submit applications or move money.

## 9. Roadmap

| Phase | Deliverable | Status |
|-------|-------------|--------|
| 1 | Auth + secure dashboard | ✅ built |
| 2 | Database (21 tables, RLS), generic data management, export/restore | ✅ built |
| 3 | Goals, tasks, projects, notes | ✅ built |
| 4 | Career: STAR accomplishments, job pipeline, opportunities, network | ✅ built |
| 5 | Finance: accounts, cash flow, contributions, net worth, savings rate | ✅ built (manual entry) |
| 6 | Knowledge library | ✅ built |
| 7 | Personal operations + habits (check-off from dashboard) | ✅ built |
| 8 | Agent-style workflows: rule engine, weekly briefing + archive, AI prompt builder, activity log | ✅ built |
| 9 | Optional integrations: net-worth history chart, promotion packet, Telegram digest, free SMTP alerts, Storage uploads | next |
| 10 | (Approval required) AI API provider behind `lib/ai/provider.ts` | not started — needs your cost approval |

**Testing done:**

- `next build` and a strict TypeScript check pass.
- The migration applies cleanly to Postgres 16, and the RLS isolation tests pass (see §8).
- A smoke test of the production server confirmed that unauthenticated requests to every page and to `/api/export` redirect to `/login`, and that the security headers are present.

**Not yet tested:** the app has not run against a live Supabase project. That happens on first deploy (checklist in `README.md`).

**Maintenance:**

- Monthly: export a backup and update balances.
- Quarterly: re-check the free-tier limits in this file and run `npm outdated`.
