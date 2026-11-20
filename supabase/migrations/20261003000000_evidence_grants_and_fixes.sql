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
