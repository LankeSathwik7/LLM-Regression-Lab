create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.suites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  description text,
  tags text[] default '{}',
  config_json jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  suite_id uuid not null references public.suites(id) on delete cascade,
  key text not null,
  description text,
  input jsonb not null,
  expectations jsonb not null,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  unique (suite_id, key)
);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  suite_id uuid not null references public.suites(id) on delete cascade,
  baseline_run_id uuid references public.runs(id) on delete set null,
  git_branch text,
  git_commit text,
  status text not null check (status in ('queued', 'running', 'completed', 'failed')),
  triggered_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.run_configs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.runs(id) on delete cascade,
  model_name text not null,
  temperature numeric,
  extra_params jsonb default '{}'::jsonb
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  run_config_id uuid not null references public.run_configs(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  status text not null check (status in ('pass', 'fail', 'error')),
  scores jsonb default '{}'::jsonb,
  failure_reasons text[] default '{}',
  raw_input jsonb default '{}'::jsonb,
  raw_output jsonb default '{}'::jsonb,
  latency_ms integer default 0,
  cost numeric default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.run_metrics (
  run_id uuid primary key references public.runs(id) on delete cascade,
  run_config_id uuid not null references public.run_configs(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  pass_rate numeric not null default 0,
  avg_correctness numeric not null default 0,
  avg_latency_ms integer not null default 0,
  p90_latency_ms integer not null default 0,
  total_cost numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_suites_project_id on public.suites(project_id);
create index if not exists idx_tests_suite_id on public.tests(suite_id);
create index if not exists idx_runs_project_id on public.runs(project_id);
create index if not exists idx_runs_suite_id on public.runs(suite_id);
create index if not exists idx_results_run_id on public.results(run_id);
create index if not exists idx_results_test_id on public.results(test_id);
create index if not exists idx_run_metrics_project_id on public.run_metrics(project_id);

alter table public.projects enable row level security;
alter table public.suites enable row level security;
alter table public.tests enable row level security;
alter table public.runs enable row level security;
alter table public.run_configs enable row level security;
alter table public.results enable row level security;
alter table public.run_metrics enable row level security;

drop policy if exists "projects_owner_select" on public.projects;
create policy "projects_owner_select" on public.projects
for select using (created_by = auth.uid());

drop policy if exists "projects_owner_insert" on public.projects;
create policy "projects_owner_insert" on public.projects
for insert with check (created_by = auth.uid());

drop policy if exists "projects_owner_update" on public.projects;
create policy "projects_owner_update" on public.projects
for update using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists "projects_owner_delete" on public.projects;
create policy "projects_owner_delete" on public.projects
for delete using (created_by = auth.uid());

drop policy if exists "suites_owner_all" on public.suites;
create policy "suites_owner_all" on public.suites
for all
using (
  exists (
    select 1 from public.projects p
    where p.id = suites.project_id and p.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = suites.project_id and p.created_by = auth.uid()
  )
);

drop policy if exists "tests_owner_all" on public.tests;
create policy "tests_owner_all" on public.tests
for all
using (
  exists (
    select 1
    from public.suites s
    join public.projects p on p.id = s.project_id
    where s.id = tests.suite_id and p.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.suites s
    join public.projects p on p.id = s.project_id
    where s.id = tests.suite_id and p.created_by = auth.uid()
  )
);

drop policy if exists "runs_owner_all" on public.runs;
create policy "runs_owner_all" on public.runs
for all
using (
  exists (
    select 1 from public.projects p
    where p.id = runs.project_id and p.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = runs.project_id and p.created_by = auth.uid()
  )
);

drop policy if exists "run_configs_owner_all" on public.run_configs;
create policy "run_configs_owner_all" on public.run_configs
for all
using (
  exists (
    select 1
    from public.runs r
    join public.projects p on p.id = r.project_id
    where r.id = run_configs.run_id and p.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.runs r
    join public.projects p on p.id = r.project_id
    where r.id = run_configs.run_id and p.created_by = auth.uid()
  )
);

drop policy if exists "results_owner_all" on public.results;
create policy "results_owner_all" on public.results
for all
using (
  exists (
    select 1
    from public.runs r
    join public.projects p on p.id = r.project_id
    where r.id = results.run_id and p.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.runs r
    join public.projects p on p.id = r.project_id
    where r.id = results.run_id and p.created_by = auth.uid()
  )
);

drop policy if exists "run_metrics_owner_all" on public.run_metrics;
create policy "run_metrics_owner_all" on public.run_metrics
for all
using (
  exists (
    select 1 from public.projects p
    where p.id = run_metrics.project_id and p.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = run_metrics.project_id and p.created_by = auth.uid()
  )
);
