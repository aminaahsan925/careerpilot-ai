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
