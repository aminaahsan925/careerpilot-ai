-- CareerPilot Intelligence Engine
-- Additive migration: existing features do not depend on these tables.

create extension if not exists vector with schema extensions;

create table if not exists public.intelligence_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  source_type text not null check (source_type in (
    'market_truth', 'job_description', 'company_truth', 'resume', 'project', 'portfolio', 'system'
  )),
  source_key text not null,
  title text not null,
  source_url text,
  content_hash text not null,
  trust_score numeric not null default 0.5 check (trust_score >= 0 and trust_score <= 1),
  published_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_type, source_key, content_hash)
);

create table if not exists public.intelligence_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.intelligence_documents(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null,
  embedding extensions.vector(768),
  token_count integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index if not exists intelligence_documents_user_idx
  on public.intelligence_documents(user_id, source_type, updated_at desc);
create index if not exists intelligence_documents_expiry_idx
  on public.intelligence_documents(expires_at);
create index if not exists intelligence_chunks_document_idx
  on public.intelligence_chunks(document_id);
create index if not exists intelligence_chunks_embedding_idx
  on public.intelligence_chunks using hnsw (embedding extensions.vector_cosine_ops);

alter table public.intelligence_documents enable row level security;
alter table public.intelligence_chunks enable row level security;

drop policy if exists "Users can read shared intelligence and their own documents"
  on public.intelligence_documents;
create policy "Users can read shared intelligence and their own documents"
  on public.intelligence_documents for select
  using (user_id is null or user_id = auth.uid());

drop policy if exists "Users can add their own intelligence documents"
  on public.intelligence_documents;
create policy "Users can add their own intelligence documents"
  on public.intelligence_documents for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own intelligence documents"
  on public.intelligence_documents;
create policy "Users can update their own intelligence documents"
  on public.intelligence_documents for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can read shared intelligence and their own chunks"
  on public.intelligence_chunks;
create policy "Users can read shared intelligence and their own chunks"
  on public.intelligence_chunks for select
  using (
    exists (
      select 1 from public.intelligence_documents d
      where d.id = document_id
        and (d.user_id is null or d.user_id = auth.uid())
    )
  );

drop policy if exists "Users can add chunks to their own documents"
  on public.intelligence_chunks;
create policy "Users can add chunks to their own documents"
  on public.intelligence_chunks for insert
  with check (
    exists (
      select 1 from public.intelligence_documents d
      where d.id = document_id and d.user_id = auth.uid()
    )
  );

create or replace function public.match_intelligence_chunks(
  query_embedding extensions.vector(768),
  match_count integer default 8,
  match_user_id uuid default auth.uid(),
  minimum_similarity real default 0.35
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity real,
  source_type text,
  title text,
  source_url text,
  trust_score numeric,
  published_at timestamptz,
  expires_at timestamptz,
  metadata jsonb
)
language sql stable security invoker
set search_path = public, extensions
as $$
  select
    c.id,
    c.document_id,
    c.content,
    (1 - (c.embedding <=> query_embedding))::real as similarity,
    d.source_type,
    d.title,
    d.source_url,
    d.trust_score,
    d.published_at,
    d.expires_at,
    d.metadata || c.metadata as metadata
  from public.intelligence_chunks c
  join public.intelligence_documents d on d.id = c.document_id
  where c.embedding is not null
    and (d.user_id is null or d.user_id = match_user_id)
    and (d.expires_at is null or d.expires_at > now())
    and (1 - (c.embedding <=> query_embedding)) >= minimum_similarity
  order by c.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;

comment on table public.intelligence_documents is
  'Versioned, attributable knowledge sources used by CareerPilot retrieval.';
comment on table public.intelligence_chunks is
  'Semantically searchable chunks. Embeddings use 768 dimensions.';
