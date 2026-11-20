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
