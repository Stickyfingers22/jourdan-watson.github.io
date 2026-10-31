-- JOURNAL — initial schema
-- Run in Supabase: SQL Editor -> paste -> Run (or `supabase db push`).
-- Every user-data table has: id, user_id (owner), created_at, updated_at,
-- Row Level Security on, and a single owner-only policy.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------ executive
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  area text not null default 'executive',
  horizon text,
  status text not null default 'active',
  progress smallint not null default 0 check (progress between 0 and 100),
  target_date date,
  metric text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  area text not null default 'executive',
  status text not null default 'planned',
  priority text default 'medium',
  goal_id uuid references public.goals(id) on delete set null,
  start_date date,
  due_date date,
  outcome text,
  repo_url text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  area text not null default 'executive',
  status text not null default 'todo',
  priority text default 'medium',
  due_date date,
  project_id uuid references public.projects(id) on delete set null,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  area text not null default 'executive',
  status text not null default 'open',
  context text,
  options text,
  criteria text,
  assumptions text,
  financial_impact numeric(14,2),
  reversible boolean not null default false,
  recommendation text,
  decision text,
  decided_on date,
  review_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------------- career
create table public.accomplishments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  occurred_on date,
  employer text,
  project text,
  situation text,
  task text,
  action text,
  result text,
  metric text,
  business_impact text,
  skills text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null,
  company text not null,
  status text not null default 'researching',
  fit_score smallint check (fit_score between 0 and 100),
  location text,
  work_mode text,
  salary_min numeric(14,2),
  salary_max numeric(14,2),
  posting_url text,
  applied_on date,
  next_step text,
  next_step_on date,
  contact_name text,
  resume_version text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  kind text default 'job',
  area text not null default 'executive',
  status text not null default 'new',
  fit_score smallint check (fit_score between 0 and 100),
  deadline date,
  source_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  organization text,
  relationship text,
  email text,
  linkedin_url text,
  last_contacted_on date,
  next_follow_up_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------- finance
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'checking',
  institution text,
  balance numeric(14,2) not null default 0,
  is_liability boolean not null default false,
  as_of date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cash_flow (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month date not null,
  direction text not null check (direction in ('income', 'expense')),
  category text not null,
  source text,
  amount numeric(14,2) not null check (amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asset text not null,
  contributed_on date not null,
  account_id uuid references public.accounts(id) on delete set null,
  kind text default 'employee',
  amount numeric(14,2) not null check (amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------- research
create table public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  kind text default 'book',
  topic text,
  status text not null default 'queued',
  author text,
  source_url text,
  rating smallint check (rating between 1 and 5),
  summary text,
  key_ideas text,
  open_questions text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  area text not null default 'executive',
  body text,
  tags text[] not null default '{}',
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------- builder
create table public.automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'idea',
  manual_process text,
  trigger text,
  hours_saved_per_month numeric(8,2),
  permission_level smallint not null default 1 check (permission_level between 1 and 3),
  repo_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- performance
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  area text not null default 'performance',
  cadence text not null default 'daily',
  target_per_week smallint default 5 check (target_per_week between 0 and 7),
  active boolean not null default true,
  why text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  log_date date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

-- ------------------------------------------------------------------ lifestyle
create table public.obligations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  kind text default 'subscription',
  amount numeric(14,2),
  cadence text default 'monthly',
  next_due_on date not null,
  auto_renews boolean not null default false,
  cancel_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  kind text default 'trip',
  status text not null default 'wishlist',
  est_cost numeric(14,2),
  budget numeric(14,2),
  target_date date,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------- ventures
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  area text not null default 'ventures',
  stage text not null default 'captured',
  problem text,
  audience text,
  existing_solutions text,
  complexity text,
  value_estimate numeric(14,2),
  next_step text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------------- system
-- Saved briefings and reports produced by JOURNAL workflows.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  period_start date,
  period_end date,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Audit log: every create/update/delete/import/export and workflow run.
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  action text not null,
  module text,
  record_id uuid,
  summary text,
  status text not null default 'ok',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------- shared plumbing per table
create or replace function public.journal_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.journal_task_completed_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done') then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end $$;

create trigger tasks_completed_at before insert or update on public.tasks
  for each row execute function public.journal_task_completed_at();

do $$
declare
  t text;
begin
  foreach t in array array[
    'goals','projects','tasks','decisions','accomplishments','job_applications',
    'opportunities','contacts','accounts','cash_flow','contributions',
    'knowledge_items','notes','automations','habits','habit_logs','obligations',
    'experiences','ideas','reports','activity_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t || '_owner', t);
    execute format('create index %I on public.%I (user_id)', t || '_user_idx', t);
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.journal_touch_updated_at()',
      t || '_touch', t);
  end loop;
end $$;

-- The audit log is append-only from the app.
revoke update on public.activity_log from authenticated;

-- ------------------------------------------------------------ helper functions
-- Database size, so the Settings page can warn before the free-tier limit.
create or replace function public.journal_usage()
returns json language sql stable set search_path = '' as $$
  select json_build_object('db_bytes', pg_catalog.pg_database_size(pg_catalog.current_database()));
$$;
revoke all on function public.journal_usage() from public, anon;
grant execute on function public.journal_usage() to authenticated;

-- Keep-alive target for the scheduled GitHub Action (free projects pause
-- after a week of inactivity). Returns only the server time.
create or replace function public.journal_ping()
returns timestamptz language sql stable set search_path = '' as $$
  select pg_catalog.now();
$$;
revoke all on function public.journal_ping() from public;
grant execute on function public.journal_ping() to anon, authenticated;
