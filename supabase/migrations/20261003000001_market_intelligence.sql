-- Phase 3: market intelligence tables.
--
-- Adds, without touching existing tables (except the two ALTERs noted):
--   job_sources      registry of job listing providers (tavily, manual, ...)
--   jobs             normalized job postings, user-scoped, with dedup hash
--                    and published_at / retrieved_at / expires_at provenance
--   job_requirements structured skill requirements per job (canonical skills
--                    via the skill-aliases taxonomy)
--   job_snapshots    per-user persisted job analyses (coverage report +
--                    dataset version, for Phase 5 job matching)
--
-- Also:
--   ALTER market_reality_cache ADD dataset_version + location (cache key fix)
--   ALTER career_goals ADD location (Market Reality location input)
--
-- Run in the Supabase SQL editor as the project owner, AFTER
-- 20261003000000_evidence_grants_and_fixes.sql. Safe to re-run: every
-- statement is idempotent.

-- ---------------------------------------------------------------------------
-- 1. job_sources: provider registry (static; service-role writes only)
-- ---------------------------------------------------------------------------
create table if not exists public.job_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  base_url text,
  reliability_note text,
  created_at timestamptz not null default now()
);

alter table public.job_sources enable row level security;

drop policy if exists "job_sources readable" on public.job_sources;
create policy "job_sources readable"
  on public.job_sources for select
  to authenticated
  using (true);

insert into public.job_sources (name, base_url, reliability_note) values
  ('tavily', 'https://api.tavily.com', 'Live web search over job boards and company career pages. Result quality depends on query specificity.'),
  ('manual', null, 'Job details entered or pasted by the user. Treated as unverified until corroborated.')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- 2. jobs: normalized postings, user-scoped
-- ---------------------------------------------------------------------------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_id uuid references public.job_sources (id) on delete set null,
  external_id text,
  title text not null,
  company text,
  location_country text,
  location_city text,
  remote_type text not null default 'unknown'
    check (remote_type in ('remote', 'hybrid', 'onsite', 'unknown')),
  url text,
  description text,
  published_at timestamptz,
  retrieved_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  -- sha256 over normalized (title, company, location, description head):
  -- the same posting re-fetched is an update, not a duplicate.
  dedup_hash text not null,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, dedup_hash)
);

create index if not exists jobs_user_retrieved_idx
  on public.jobs (user_id, retrieved_at desc);
create index if not exists jobs_user_expires_idx
  on public.jobs (user_id, expires_at);
create index if not exists jobs_user_company_idx
  on public.jobs (user_id, company);

alter table public.jobs enable row level security;

drop policy if exists "jobs self access" on public.jobs;
create policy "jobs self access"
  on public.jobs for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. job_requirements: structured skill requirements per job
-- ---------------------------------------------------------------------------
create table if not exists public.job_requirements (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Canonical skill name via the skill-aliases taxonomy (e.g. "PostgreSQL").
  skill text not null,
  category text not null default 'other'
    check (category in (
      'language','framework','database','cloud','devops','testing',
      'architecture','ai','data','frontend','backend','mobile',
      'soft_skill','other'
    )),
  importance text not null check (importance in ('must_have', 'preferred')),
  -- Raw requirement text from the posting, for citation in the UI.
  source_text text,
  created_at timestamptz not null default now()
);

create index if not exists job_requirements_job_idx
  on public.job_requirements (job_id);
create index if not exists job_requirements_user_skill_idx
  on public.job_requirements (user_id, skill);
create index if not exists job_requirements_user_importance_idx
  on public.job_requirements (user_id, importance);

alter table public.job_requirements enable row level security;

drop policy if exists "job_requirements self access" on public.job_requirements;
create policy "job_requirements self access"
  on public.job_requirements for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. job_snapshots: per-user persisted job analyses
-- ---------------------------------------------------------------------------
create table if not exists public.job_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  target_role text,
  location text,
  -- Deterministic CoverageReport (see src/lib/evidence/matching.ts).
  coverage jsonb not null default '{}'::jsonb,
  dataset_version text,
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create index if not exists job_snapshots_user_idx
  on public.job_snapshots (user_id, created_at desc);

alter table public.job_snapshots enable row level security;

drop policy if exists "job_snapshots self access" on public.job_snapshots;
create policy "job_snapshots self access"
  on public.job_snapshots for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. Cache-key fix: market_reality_cache gains dataset_version + location
-- ---------------------------------------------------------------------------
alter table public.market_reality_cache
  add column if not exists dataset_version text;
alter table public.market_reality_cache
  add column if not exists location text;

create index if not exists market_cache_user_role_version_location_idx
  on public.market_reality_cache (user_id, target_role, dataset_version, location, expires_at desc);

-- ---------------------------------------------------------------------------
-- 6. Market Reality location input: career_goals gains location
-- ---------------------------------------------------------------------------
alter table public.career_goals
  add column if not exists location text;
