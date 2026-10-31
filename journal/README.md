# JOURNAL — Personal Intelligence & Operations System

_Think. Build. Execute. Compound._

A private, single-user command center covering goals, tasks, career, finance,
learning, habits, operations and ventures. It is built to run at **$0/month**
on Vercel Hobby, Supabase Free and GitHub.

- Architecture, free-tier limits, workflows, schema, security, roadmap: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Cost & dependency register: [`docs/COST_REGISTER.md`](docs/COST_REGISTER.md)

## What's in it

| Page | What it does |
|------|--------------|
| `/` Command center | Net worth, savings rate, open tasks, pipeline, top-3 priorities, habit check-offs, signals, goals, activity log |
| `/briefing` | Rule-based weekly briefing with a saved archive |
| `/assistant` | Builds a context-rich prompt from your data to paste into your own Claude subscription |
| `/m/<module>` | Search, filter, create, edit and delete for 19 modules in 8 areas |
| `/settings` | Free-tier usage meter, full JSON backup and restore, permission framework |

## Setup (about 20 minutes, $0)

1. **Create the Supabase project.** Go to supabase.com and create a new project on the Free plan. **Do not add a payment method.**
2. **Create the schema.** Open SQL Editor, paste `supabase/migrations/0001_init.sql`, and run it.
3. **Lock down sign-ups.** Go to Authentication → Sign In / Providers → Email. Turn off **Allow new users to sign up**. Then go to Authentication → Users → **Add user** and create your own account with a strong password ("auto-confirm").
4. **Run locally.**
   ```bash
   cd journal
   cp .env.example .env.local   # fill in URL + anon key (Project Settings → API) and your email
   npm install
   npm run dev                  # http://localhost:3000
   ```
5. **Deploy.** On vercel.com (Hobby), import the repository. Set **Root Directory** to `journal` if this folder is still inside another repo. Add the environment variables from `.env.example`, then deploy.
6. **Keep the database awake.** Add the repository secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Once JOURNAL is in its own repo, `.github/workflows/keep-alive.yml` pings every 3 days so Supabase does not pause.
7. **Back up.** Go to Settings → **Download full backup** once a month.

Optional: set `JOURNAL_TIMEZONE` (e.g. `America/New_York`) so "today" matches your local day.

## Adding a module

1. Add a `create table` to a new migration (copy an existing table) and add its name to the RLS loop.
2. Add an entry to `src/lib/modules.ts`. The list, form, validation, export and import all pick it up automatically.

## Scripts

- `npm run dev`: local development
- `npm run build`: production build (also type-checks)
- `npm run typecheck`: TypeScript only
