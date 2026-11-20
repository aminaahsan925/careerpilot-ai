-- ============================================================================
-- CareerPilot AI — apply the 9 rebuild migrations in one go
-- Generated 2026-11-20 from the 9 migration files, in timestamp order.
-- Paste this WHOLE file into the Supabase SQL Editor and press Run.
-- Every statement is idempotent: safe to run again if anything interrupts it.
-- This does NOT record the migrations in schema_migrations (SQL Editor
-- cannot do that); that is harmless because every statement is idempotent,
-- so a later 'supabase db push' would simply re-apply them as no-ops.
-- ============================================================================

-- ============================================================================
-- 1 of 9: 20261002000000_add_ai_usage_quota.sql
-- ============================================================================
-- Phase 1: AI cost control — per-user daily quotas + usage logging.
--
-- Run this in the Supabase SQL editor (as the project owner) BEFORE deploying
-- the Phase 1 code. Safe to re-run: every statement is idempotent.

-- 1. Daily per-user AI call counters ---------------------------------------
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  calls integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- 2. Per-call audit log (which endpoint spent the call) ----------------------
create table if not exists public.ai_call_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_call_logs_user_created_idx
  on public.ai_call_logs (user_id, created_at desc);

-- 3. Row-level security: users may read their own rows; only the RPC below
--    (security definer) and the service role may write.
alter table public.ai_usage enable row level security;
alter table public.ai_call_logs enable row level security;

drop policy if exists "Users can view their own AI usage" on public.ai_usage;
create policy "Users can view their own AI usage"
  on public.ai_usage for select
  using (auth.uid() = user_id);

drop policy if exists "Users can view their own AI call logs" on public.ai_call_logs;
create policy "Users can view their own AI call logs"
  on public.ai_call_logs for select
  using (auth.uid() = user_id);

-- 4. Atomic check-and-consume. Called once per AI call, BEFORE the call is
--    made, so concurrent requests can't race past the limit.
create or replace function public.consume_ai_quota(
  p_user_id uuid,
  p_daily_limit integer,
  p_endpoint text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_calls integer;
begin
  -- Caller isolation: an authenticated caller may only consume their own
  -- quota. service_role (server-side jobs) may pass any user id.
  if auth.uid() is distinct from p_user_id and auth.role() <> 'service_role' then
    raise exception 'consume_ai_quota: caller may only consume their own quota';
  end if;

  insert into public.ai_usage (user_id, day, calls)
  values (p_user_id, current_date, 1)
  on conflict (user_id, day)
  do update set calls = ai_usage.calls + 1, updated_at = now()
  returning ai_usage.calls into v_calls;

  insert into public.ai_call_logs (user_id, endpoint)
  values (p_user_id, p_endpoint);

  return jsonb_build_object(
    'allowed', v_calls <= p_daily_limit,
    'calls', v_calls,
    'limit', p_daily_limit
  );
end;
$$;

revoke all on function public.consume_ai_quota(uuid, integer, text) from public, anon;
grant execute on function public.consume_ai_quota(uuid, integer, text)
  to authenticated, service_role;

-- ============================================================================
-- 2 of 9: 20261002000001_enable_pgvector.sql
-- ============================================================================
-- Phase A4: enable pgvector for the evidence retrieval layer.
-- Run in the Supabase SQL editor as the project owner. Safe to re-run.
create extension if not exists vector;

-- ============================================================================
-- 3 of 9: 20261002000002_evidence_model.sql
-- ============================================================================
-- Phase A5: canonical evidence model for the career intelligence layer.
--
-- Adds, without touching existing tables:
--   skill_aliases    canonical skill taxonomy (Postgres -> PostgreSQL, ...)
--   evidence_items   first-class evidence ledger (claim + source + strength + lifecycle)
--   evidence_sources provenance registry for ingested documents (idempotent re-ingest)
--   evidence_chunks  source-aware chunks with pgvector embeddings for retrieval
--   match_evidence_chunks() RPC for user-scoped vector search
--
-- Existing tables (skill_evidence, resumes, target_jobs, ...) are NOT modified.
-- A backfill from skill_evidence/user_skills/resumes runs in application code
-- (src/lib/evidence/ingestion.ts), not here, so it can be retried and observed.
--
-- Run in the Supabase SQL editor as the project owner, AFTER
-- 20261002000001_enable_pgvector.sql. Safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- 1. Skill taxonomy: alias -> canonical name + category
-- ---------------------------------------------------------------------------
create table if not exists public.skill_aliases (
  alias text primary key,
  canonical text not null,
  category text not null default 'other'
    check (category in (
      'language','framework','database','cloud','devops','testing',
      'architecture','ai','data','frontend','backend','mobile',
      'soft_skill','other'
    ))
);

alter table public.skill_aliases enable row level security;

-- Readable by everyone authenticated; only the service role (seeding) writes.
drop policy if exists "skill_aliases readable" on public.skill_aliases;
create policy "skill_aliases readable"
  on public.skill_aliases for select
  using (true);

-- Seed a pragmatic starter taxonomy. Application code falls back to its own
-- map when a skill is missing here; this table lets curators fix aliases
-- without a deploy.
insert into public.skill_aliases (alias, canonical, category) values
  ('postgresql','PostgreSQL','database'),('postgres','PostgreSQL','database'),
  ('mysql','MySQL','database'),('mongodb','MongoDB','database'),
  ('redis','Redis','database'),('sqlite','SQLite','database'),
  ('reactjs','React','frontend'),('react','React','frontend'),
  ('nextjs','Next.js','frontend'),('next','Next.js','frontend'),
  ('vuejs','Vue.js','frontend'),('vue','Vue.js','frontend'),
  ('angularjs','Angular','frontend'),('angular','Angular','frontend'),
  ('typescript','TypeScript','language'),('ts','TypeScript','language'),
  ('javascript','JavaScript','language'),('js','JavaScript','language'),
  ('python','Python','language'),('java','Java','language'),
  ('csharp','C#','language'),('c#','C#','language'),('cpp','C++','language'),
  ('c++','C++','language'),('golang','Go','language'),('go','Go','language'),
  ('rust','Rust','language'),('php','PHP','language'),('ruby','Ruby','language'),
  ('kotlin','Kotlin','mobile'),('swift','Swift','mobile'),
  ('nodejs','Node.js','backend'),('node','Node.js','backend'),
  ('expressjs','Express','backend'),('express','Express','backend'),
  ('django','Django','backend'),('flask','Flask','backend'),
  ('springboot','Spring Boot','backend'),('spring','Spring Boot','backend'),
  ('docker','Docker','devops'),('kubernetes','Kubernetes','devops'),
  ('k8s','Kubernetes','devops'),('jenkins','Jenkins','devops'),
  ('githubactions','GitHub Actions','devops'),('cicd','CI/CD','devops'),
  ('aws','AWS','cloud'),('amazonwebservices','AWS','cloud'),
  ('gcp','GCP','cloud'),('googlecloud','GCP','cloud'),
  ('azure','Azure','cloud'),('terraform','Terraform','devops'),
  ('git','Git','devops'),('linux','Linux','devops'),
  ('jest','Jest','testing'),('pytest','pytest','testing'),
  ('cypress','Cypress','testing'),('playwright','Playwright','testing'),
  ('tensorflow','TensorFlow','ai'),('pytorch','PyTorch','ai'),
  ('scikitlearn','scikit-learn','ai'),('pandas','pandas','data'),
  ('graphql','GraphQL','backend'),('restapi','REST APIs','backend'),
  ('rest','REST APIs','backend'),('html','HTML','frontend'),
  ('css','CSS','frontend'),('tailwindcss','Tailwind CSS','frontend'),
  ('tailwind','Tailwind CSS','frontend'),('figma','Figma','frontend'),
  ('systemdesign','System Design','architecture'),
  ('microservices','Microservices','architecture'),
  ('agile','Agile','soft_skill'),('communication','Communication','soft_skill'),
  ('leadership','Leadership','soft_skill'),('teamwork','Teamwork','soft_skill')
on conflict (alias) do nothing;

-- ---------------------------------------------------------------------------
-- 2. evidence_items: canonical first-class evidence ledger
-- ---------------------------------------------------------------------------
create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Canonical skill this evidence supports (normalized via skill_aliases).
  skill_key text not null,
  -- Human-readable claim, e.g. "Built REST API with PostgreSQL and Redis".
  claim text not null,

  source_type text not null check (source_type in (
    'resume','github','project','portfolio','certificate','course',
    'interview','application','manual_claim','achievement','hackathon','other'
  )),
  -- Pointer to the source row/document (resume id, project id, repo full name...).
  source_id text,
  source_url text,
  -- Supporting excerpt, quoted from the source. Never generated prose.
  content text,

  -- Deterministic strength 0..3: 0 = claim only, 1 = listed/named,
  -- 2 = demonstrated in an artifact, 3 = verified (deployed, tested, reviewed).
  evidence_strength smallint not null default 1
    check (evidence_strength between 0 and 3),

  verification_status text not null default 'unverified' check (verification_status in (
    'unverified','extracted','validated','verified','stale'
  )),
  confidence real not null default 0.5 check (confidence between 0 and 1),

  observed_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evidence_items_user_skill_idx
  on public.evidence_items (user_id, skill_key);
create index if not exists evidence_items_user_source_idx
  on public.evidence_items (user_id, source_type);

alter table public.evidence_items enable row level security;

drop policy if exists "evidence_items self access" on public.evidence_items;
create policy "evidence_items self access"
  on public.evidence_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trg_evidence_items_updated_at on public.evidence_items;
create trigger trg_evidence_items_updated_at
  before update on public.evidence_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. evidence_sources: provenance registry (idempotent ingestion)
-- ---------------------------------------------------------------------------
create table if not exists public.evidence_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  domain text not null check (domain in ('candidate','market')),
  source_type text not null,
  -- External identifier: resume uuid, project uuid, repo full_name, job snapshot id...
  source_id text not null,
  source_url text,
  title text,
  -- sha256 of the source content at ingest time; unchanged hash => skip reprocessing.
  content_hash text not null,
  chunk_count integer not null default 0,
  last_ingested_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, domain, source_type, source_id)
);

create index if not exists evidence_sources_user_domain_idx
  on public.evidence_sources (user_id, domain);

alter table public.evidence_sources enable row level security;

drop policy if exists "evidence_sources self access" on public.evidence_sources;
create policy "evidence_sources self access"
  on public.evidence_sources for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. evidence_chunks: source-aware chunks + embeddings for retrieval
-- ---------------------------------------------------------------------------
create table if not exists public.evidence_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  evidence_id uuid references public.evidence_items (id) on delete cascade,

  domain text not null check (domain in ('candidate','market')),
  source_type text not null,
  source_id text,
  chunk_index integer not null default 0,
  -- Source-aware section label: resume 'experience'/'projects'/'skills',
  -- job 'requirements_must_have'/'responsibilities', etc.
  section text,
  content text not null,
  -- sha256 of content; identical hash => embedding reused, never recomputed.
  content_hash text not null,
  -- Gemini text-embedding-004 => 768 dimensions.
  embedding vector(768),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),

  unique (user_id, domain, source_type, source_id, chunk_index)
);

create index if not exists evidence_chunks_user_domain_idx
  on public.evidence_chunks (user_id, domain);
create index if not exists evidence_chunks_content_hash_idx
  on public.evidence_chunks (content_hash);
-- HNSW: good recall without the training step IVFFlat needs on empty tables.
create index if not exists evidence_chunks_embedding_idx
  on public.evidence_chunks using hnsw (embedding vector_cosine_ops);

alter table public.evidence_chunks enable row level security;

drop policy if exists "evidence_chunks self access" on public.evidence_chunks;
create policy "evidence_chunks self access"
  on public.evidence_chunks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. User-scoped vector search RPC (security definer with caller check:
--    authenticated callers may only query their own evidence)
-- ---------------------------------------------------------------------------
create or replace function public.match_evidence_chunks(
  p_user_id uuid,
  p_domain text,
  p_embedding vector(768),
  p_match_count integer default 8,
  p_source_types text[] default null
)
returns table (
  chunk_id uuid,
  evidence_id uuid,
  content text,
  section text,
  source_type text,
  source_id text,
  similarity real
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Caller isolation: an authenticated caller may only search their own
  -- evidence. service_role (server-side jobs) may pass any user id.
  if auth.uid() is distinct from p_user_id and auth.role() <> 'service_role' then
    raise exception 'match_evidence_chunks: caller may only query their own evidence';
  end if;

  return query
  select
    c.id,
    c.evidence_id,
    c.content,
    c.section,
    c.source_type,
    c.source_id,
    1 - (c.embedding <=> p_embedding) as similarity
  from public.evidence_chunks c
  where c.user_id = p_user_id
    and c.domain = p_domain
    and (p_source_types is null or c.source_type = any (p_source_types))
    and c.embedding is not null
  order by c.embedding <=> p_embedding
  limit p_match_count;
end;
$$;

revoke all on function public.match_evidence_chunks(uuid, text, vector, integer, text[])
  from public, anon;
grant execute on function public.match_evidence_chunks(uuid, text, vector, integer, text[])
  to authenticated, service_role;

-- ============================================================================
-- 4 of 9: 20261003000000_evidence_grants_and_fixes.sql
-- ============================================================================
-- Phase 2: evidence-layer access fix + missing hot-path indexes
-- (fixes the audit finding that the 20261002000002 tables were unreachable via JWT)
--
-- 1. GRANTs on the evidence tables. RLS policies (user-scoped, auth.uid() = user_id)
--    already exist from 20261002000002; without GRANTs PostgREST rejects every
--    request with "permission denied" before RLS is even evaluated.
-- 2. Missing FK / hot-path indexes found in the Phase 1 audit.

-- ---------------------------------------------------------------------------
-- 1. GRANTs
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.evidence_items   to authenticated;
grant select, insert, update, delete on public.evidence_chunks  to authenticated;
grant select, insert, update, delete on public.evidence_sources to authenticated;

-- skill_aliases is a shared read-only taxonomy (no user_id); writes stay
-- service-role-only so the catalogue cannot be poisoned by clients.
grant select on public.skill_aliases to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Missing indexes (all IF NOT EXISTS — safe to re-run)
-- ---------------------------------------------------------------------------
create index if not exists resume_analyses_resume_id_idx
  on public.resume_analyses (resume_id);

create index if not exists skill_gaps_target_job_id_idx
  on public.skill_gaps (target_job_id);

create index if not exists readiness_snapshots_target_job_id_idx
  on public.readiness_snapshots (target_job_id);

create index if not exists career_diagnoses_target_job_id_idx
  on public.career_diagnoses (target_job_id);

-- Hot-path composite for the legacy skill-evidence lookups
create index if not exists skill_evidence_user_skill_idx
  on public.skill_evidence (user_id, skill_name);

-- ============================================================================
-- 5 of 9: 20261003000001_market_intelligence.sql
-- ============================================================================
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

-- ============================================================================
-- 6 of 9: 20261003000002_company_intelligence.sql
-- ============================================================================
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

-- ============================================================================
-- 7 of 9: 20261003000003_job_intelligence.sql
-- ============================================================================
-- Phase 5: job intelligence tables.
--
-- Adds, without touching existing tables (except the two ALTERs noted):
--   job_link_checks   shared broken-link / URL-validation results, keyed by
--                     normalized-URL hash. No user data: readable by
--                     authenticated users, service-role writes only
--                     (the skill_aliases / company reference-data pattern).
-- ALTER job_snapshots ADD expires_at + requirements_hash:
--                     per job+user deterministic analysis cache
--                     (Phase 5 scope item 1). The existing unique
--                     (user_id, job_id) constraint already indexes the hot
--                     per-user+job lookup path.
--
-- Run in the Supabase SQL editor as the project owner, AFTER
-- 20261003000002_company_intelligence.sql. Safe to re-run: every
-- statement is idempotent.

-- ---------------------------------------------------------------------------
-- 1. job_link_checks: shared URL validation results (broken-link detection)
-- ---------------------------------------------------------------------------
create table if not exists public.job_link_checks (
  -- sha256 over the normalized URL (lowercased host, tracking params
  -- stripped). The same link checked for any user is one row.
  url_hash text primary key,
  url text not null,
  status text not null check (status in ('reachable', 'unreachable')),
  -- Last observed HTTP status (null when the check never got a response).
  http_status int,
  -- URL after following redirects (null when no redirect observed).
  final_url text,
  checked_at timestamptz not null default now(),
  -- Reachable links are trusted longer; unreachable links expire fast so
  -- transient outages self-heal instead of permanently marking a link dead.
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists job_link_checks_expires_idx
  on public.job_link_checks (expires_at);

alter table public.job_link_checks enable row level security;

-- Authenticated users can read shared link checks; only the service role
-- writes them (no write policies).
drop policy if exists "job_link_checks readable" on public.job_link_checks;
create policy "job_link_checks readable"
  on public.job_link_checks for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 2. job_snapshots: per job+user analysis cache columns
-- ---------------------------------------------------------------------------
alter table public.job_snapshots
  add column if not exists expires_at timestamptz
    not null default (now() + interval '30 days');

-- Hash over the posting's structured requirements at analysis time.
-- When requirements change (re-extraction, new posting version), the
-- cached analysis is invalidated and recomputed.
alter table public.job_snapshots
  add column if not exists requirements_hash text;

-- ============================================================================
-- 8 of 9: 20261120000000_billing.sql
-- ============================================================================
-- Billing — Safepay activation records, subscriptions, and AI quotas.
--
-- This is the migration the billing code already expects:
-- - safepay.server.ts activateFromTracker() upserts into `payments`
--   (order_id, user_id, tracker, amount, currency, status) and then
--   into `user_subscriptions` (user_id, plan, status). Before this
--   migration neither table existed, so a real Rs 499 checkout ended in
--   "Could not record the payment" with no plan and no payment record.
-- - billing.server.ts getUserPlan() reads `user_subscriptions`
--   (plan, status) for active rows, and consumeAiCall() calls the
--   `consume_ai_quota` RPC below. Before this migration the RPC did
--   not exist, so every quota check errored.
--
-- Security posture: RLS is enabled on all four tables. Authenticated
-- users may only SELECT their own rows. There are deliberately NO
-- INSERT / UPDATE / DELETE policies for client roles, and no write
-- grants to `authenticated` — only the service role (server-side
-- activation) and the SECURITY DEFINER quota RPC may write.
-- Safe to re-run: every statement is idempotent.

-- ============================================================================
-- 1. payments — one row per Safepay checkout, keyed by our order id.
--    order_id is the primary key so the activation upsert (which passes
--    no onConflict target) is idempotent on re-delivery / re-check.
-- ============================================================================

create table if not exists public.payments (
  order_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  tracker text not null unique,
  amount integer not null check (amount > 0),
  currency text not null,
  status text not null check (status in ('paid', 'pending', 'refunded', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx
  on public.payments (user_id);

grant select on public.payments to authenticated;
grant all on public.payments to service_role;

alter table public.payments enable row level security;

drop policy if exists "Users can view their own payments" on public.payments;
create policy "Users can view their own payments"
  on public.payments for select
  using (auth.uid() = user_id);

-- ============================================================================
-- 2. user_subscriptions — one row per user; the plan of record.
--    user_id is the primary key so the activation upsert (which passes
--    no onConflict target) flips a user to proof idempotently.
-- ============================================================================

create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null check (plan in ('free', 'proof')),
  status text not null check (status in ('active', 'cancelled', 'expired', 'past_due')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.user_subscriptions to authenticated;
grant all on public.user_subscriptions to service_role;

alter table public.user_subscriptions enable row level security;

drop policy if exists "Users can view their own subscription" on public.user_subscriptions;
create policy "Users can view their own subscription"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

-- ============================================================================
-- 3. ai_usage — daily per-user AI call counters.
-- ============================================================================

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  calls integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

grant select on public.ai_usage to authenticated;
grant all on public.ai_usage to service_role;

alter table public.ai_usage enable row level security;

drop policy if exists "Users can view their own AI usage" on public.ai_usage;
create policy "Users can view their own AI usage"
  on public.ai_usage for select
  using (auth.uid() = user_id);

-- ============================================================================
-- 4. ai_call_logs — per-call audit log (which endpoint spent the call).
-- ============================================================================

create table if not exists public.ai_call_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_call_logs_user_created_idx
  on public.ai_call_logs (user_id, created_at desc);

grant select on public.ai_call_logs to authenticated;
grant all on public.ai_call_logs to service_role;

alter table public.ai_call_logs enable row level security;

drop policy if exists "Users can view their own AI call logs" on public.ai_call_logs;
create policy "Users can view their own AI call logs"
  on public.ai_call_logs for select
  using (auth.uid() = user_id);

-- ============================================================================
-- 5. consume_ai_quota — atomic check-and-consume. Called once per AI call,
--    BEFORE the call is made, so concurrent requests can't race past the
--    limit. Returns { allowed, calls, limit } as jsonb, matching what
--    billing.server.ts consumeAiCall() reads.
-- ============================================================================

create or replace function public.consume_ai_quota(
  p_user_id uuid,
  p_daily_limit integer,
  p_endpoint text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_calls integer;
begin
  -- Caller isolation: an authenticated caller may only consume their own
  -- quota. service_role (server-side flows) may pass any user id.
  if auth.uid() is distinct from p_user_id and auth.role() <> 'service_role' then
    raise exception 'consume_ai_quota: caller may only consume their own quota';
  end if;

  insert into public.ai_usage (user_id, day, calls)
  values (p_user_id, current_date, 1)
  on conflict (user_id, day)
  do update set calls = ai_usage.calls + 1, updated_at = now()
  returning ai_usage.calls into v_calls;

  insert into public.ai_call_logs (user_id, endpoint)
  values (p_user_id, p_endpoint);

  return jsonb_build_object(
    'allowed', v_calls <= p_daily_limit,
    'calls', v_calls,
    'limit', p_daily_limit
  );
end;
$$;

revoke all on function public.consume_ai_quota(uuid, integer, text) from public, anon;
grant execute on function public.consume_ai_quota(uuid, integer, text)
  to authenticated, service_role;

-- ============================================================================
-- 9 of 9: 20261120000001_interview_prep.sql
-- ============================================================================
-- Interview prep persistence + mock-interview attempts.
--
-- Before this migration, interview-prep progress on /jobmirror (practiced
-- questions, the evidence checklist, MCQ answers, answer-lab drafts) lived
-- only in React useState and reset on every refresh, while the page showed
-- a "Prep readiness" percentage computed from an arbitrary formula. The
-- recruiter mock interview likewise had nowhere to store attempts.
--
-- This migration adds three user-scoped tables:
-- - interview_prep_progress: one row per user per (company, role) holding
--   the practiced-question list, the checklist state, and answer drafts
--   (keyed by question text). The question bank itself is derived from
--   role + company, so progress is scoped to that pair.
-- - interview_mcq_attempts: one row per answered MCQ (append-only log;
--   the latest row per mcq_id is the current answer, earlier rows are
--   history for progress over time).
-- - mock_interview_attempts: one row per mock-interview answer submitted
--   from a recruiter session, with the deterministic rubric breakdown
--   (structure / specificity / evidence, each 0-2) and time spent.
--
-- Security posture: RLS is enabled on all three tables with own-row
-- policies for select/insert/update/delete, the same pattern as
-- recruiter_sessions. No cross-user reads are possible.
-- Safe to re-run: every statement is idempotent.

-- ============================================================================
-- 1. interview_prep_progress — per-user, per-(company, role) prep state.
-- ============================================================================

create table if not exists public.interview_prep_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null default '',
  role text not null default '',
  practiced_questions text[] not null default '{}',
  checklist_items text[] not null default '{}',
  answer_drafts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, company, role)
);

grant select, insert, update, delete on public.interview_prep_progress to authenticated;
grant all on public.interview_prep_progress to service_role;

alter table public.interview_prep_progress enable row level security;

drop policy if exists interview_prep_progress_select_own on public.interview_prep_progress;
create policy interview_prep_progress_select_own
  on public.interview_prep_progress for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists interview_prep_progress_insert_own on public.interview_prep_progress;
create policy interview_prep_progress_insert_own
  on public.interview_prep_progress for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists interview_prep_progress_update_own on public.interview_prep_progress;
create policy interview_prep_progress_update_own
  on public.interview_prep_progress for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists interview_prep_progress_delete_own on public.interview_prep_progress;
create policy interview_prep_progress_delete_own
  on public.interview_prep_progress for delete to authenticated
  using (auth.uid() = user_id);

-- ============================================================================
-- 2. interview_mcq_attempts — append-only log of MCQ answers.
-- ============================================================================

create table if not exists public.interview_mcq_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null default '',
  role text not null default '',
  mcq_id text not null,
  selected_option text not null check (selected_option in ('a', 'b', 'c', 'd')),
  correct boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists interview_mcq_attempts_user_context_idx
  on public.interview_mcq_attempts (user_id, company, role, mcq_id, created_at desc);

grant select, insert, delete on public.interview_mcq_attempts to authenticated;
grant all on public.interview_mcq_attempts to service_role;

alter table public.interview_mcq_attempts enable row level security;

drop policy if exists interview_mcq_attempts_select_own on public.interview_mcq_attempts;
create policy interview_mcq_attempts_select_own
  on public.interview_mcq_attempts for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists interview_mcq_attempts_insert_own on public.interview_mcq_attempts;
create policy interview_mcq_attempts_insert_own
  on public.interview_mcq_attempts for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists interview_mcq_attempts_delete_own on public.interview_mcq_attempts;
create policy interview_mcq_attempts_delete_own
  on public.interview_mcq_attempts for delete to authenticated
  using (auth.uid() = user_id);

-- ============================================================================
-- 3. mock_interview_attempts — recruiter mock-interview answers + rubric.
--    session_id references recruiter_sessions so attempts die with the
--    session; scores are the deterministic rubric (0-2 each), never an
--    LLM judgement.
-- ============================================================================

create table if not exists public.mock_interview_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.recruiter_sessions (id) on delete cascade,
  question_id text not null,
  question text not null,
  answer text not null,
  structure_score integer not null default 0 check (structure_score between 0 and 2),
  specificity_score integer not null default 0 check (specificity_score between 0 and 2),
  evidence_score integer not null default 0 check (evidence_score between 0 and 2),
  time_spent_seconds integer not null default 0 check (time_spent_seconds >= 0),
  created_at timestamptz not null default now()
);

create index if not exists mock_interview_attempts_session_created_idx
  on public.mock_interview_attempts (session_id, created_at desc);

grant select, insert, delete on public.mock_interview_attempts to authenticated;
grant all on public.mock_interview_attempts to service_role;

alter table public.mock_interview_attempts enable row level security;

drop policy if exists mock_interview_attempts_select_own on public.mock_interview_attempts;
create policy mock_interview_attempts_select_own
  on public.mock_interview_attempts for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists mock_interview_attempts_insert_own on public.mock_interview_attempts;
create policy mock_interview_attempts_insert_own
  on public.mock_interview_attempts for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists mock_interview_attempts_delete_own on public.mock_interview_attempts;
create policy mock_interview_attempts_delete_own
  on public.mock_interview_attempts for delete to authenticated
  using (auth.uid() = user_id);

