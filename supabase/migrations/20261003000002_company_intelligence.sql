-- Phase 4: company intelligence tables.
--
-- Adds:
--   companies              canonical company reference data, deduped by
--                          normalized name + domain (service-role writes only,
--                          authenticated reads — the skill_aliases pattern).
--   company_sources        source URLs behind each company's data
--                          (source label + retrieved_at provenance).
--   company_snapshots      versioned research snapshots per company with
--                          expires_at; the shared company-evidence cache
--                          reads through here first.
--   company_requirements   canonical skills observed for a company with
--                          frequency counts and must_have/preferred
--                          importance; normalized via the skill-aliases
--                          taxonomy. Index on (company_id, skill_name).
--   company_research_cache shared company-research cache, keyed by
--                          (company, dataset version) with a longer TTL
--                          than per-user candidate analysis caches.
--
-- Run in the Supabase SQL editor as the project owner, AFTER
-- 20261003000001_market_intelligence.sql. Safe to re-run: every
-- statement is idempotent.
--
-- Provenance rule (Phase 4): any seeded statistic without a cited source
-- is stored with verification_status = 'unverified' and must be badged
-- as unverified in the UI — never presented as fact.

-- ---------------------------------------------------------------------------
-- 1. companies: canonical reference data, dedup by (normalized_name, domain)
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  -- Lowercased, punctuation-stripped company name; part of the dedup key.
  normalized_name text not null,
  display_name text not null,
  domain text,
  category text,
  location text,
  tier text,
  tagline text,
  careers_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_name, domain)
);

create index if not exists companies_normalized_name_idx
  on public.companies (normalized_name);

alter table public.companies enable row level security;

-- Readable by everyone authenticated; only the service role (seeding /
-- research pipeline) writes.
drop policy if exists "companies readable" on public.companies;
create policy "companies readable"
  on public.companies for select
  using (true);

-- ---------------------------------------------------------------------------
-- 2. company_sources: provenance behind each company's claims
-- ---------------------------------------------------------------------------
create table if not exists public.company_sources (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  url text not null,
  source_label text not null,
  retrieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (company_id, url)
);

create index if not exists company_sources_company_idx
  on public.company_sources (company_id);

alter table public.company_sources enable row level security;

drop policy if exists "company_sources readable" on public.company_sources;
create policy "company_sources readable"
  on public.company_sources for select
  using (true);

-- ---------------------------------------------------------------------------
-- 3. company_snapshots: versioned research snapshots with expiry
-- ---------------------------------------------------------------------------
create table if not exists public.company_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  -- 'seed' for the company-truth.ts migration, 'research' for live
  -- careers-page research; future formats bump this.
  dataset_version text not null default 'v1',
  snapshot jsonb not null default '{}'::jsonb,
  retrieved_at timestamptz not null default now(),
  -- Snapshots expire so stale research is visibly stale.
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  unique (company_id, dataset_version)
);

create index if not exists company_snapshots_company_version_idx
  on public.company_snapshots (company_id, dataset_version);
create index if not exists company_snapshots_expires_idx
  on public.company_snapshots (expires_at);

alter table public.company_snapshots enable row level security;

drop policy if exists "company_snapshots readable" on public.company_snapshots;
create policy "company_snapshots readable"
  on public.company_snapshots for select
  using (true);

-- ---------------------------------------------------------------------------
-- 4. company_requirements: canonical skill frequencies per company
-- ---------------------------------------------------------------------------
create table if not exists public.company_requirements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  -- Canonical skill name per the skill-aliases taxonomy.
  skill_name text not null,
  category text,
  frequency_count integer not null default 1 check (frequency_count >= 0),
  importance text not null default 'preferred'
    check (importance in ('must_have', 'preferred')),
  source text not null default 'research'
    check (source in ('seed', 'research', 'manual')),
  created_at timestamptz not null default now(),
  unique (company_id, skill_name, source)
);

create index if not exists company_requirements_company_skill_idx
  on public.company_requirements (company_id, skill_name);
create index if not exists company_requirements_company_freq_idx
  on public.company_requirements (company_id, frequency_count desc);

alter table public.company_requirements enable row level security;

drop policy if exists "company_requirements readable" on public.company_requirements;
create policy "company_requirements readable"
  on public.company_requirements for select
  using (true);

-- ---------------------------------------------------------------------------
-- 5. company_research_cache: SHARED company evidence cache.
--
-- Keyed by (company + dataset version) and shared across users — it is a
-- different cache from per-user candidate analysis. Longer TTL (30 days);
-- per-user candidate caches must NEVER read or write these keys.
-- ---------------------------------------------------------------------------
create table if not exists public.company_research_cache (
  cache_key text primary key,
  company_id uuid references public.companies (id) on delete cascade,
  dataset_version text not null,
  payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

create index if not exists company_research_cache_company_idx
  on public.company_research_cache (company_id);
create index if not exists company_research_cache_expires_idx
  on public.company_research_cache (expires_at);

alter table public.company_research_cache enable row level security;

drop policy if exists "company_research_cache readable" on public.company_research_cache;
create policy "company_research_cache readable"
  on public.company_research_cache for select
  using (true);
