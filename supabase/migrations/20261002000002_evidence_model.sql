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
