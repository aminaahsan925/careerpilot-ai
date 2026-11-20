# CareerPilot AI — Supabase migration steps

**What this is:** the rebuilt app needs 9 new database migrations applied to your
Supabase project BEFORE the new code is deployed. Until they are applied, the
new limits will refuse every AI call, so this step comes first.

**Time needed:** about 15 minutes.
**Risk:** low. These migrations only ADD new tables, functions and indexes. No
existing table is changed or deleted, and no existing data is touched. The one
seed insert goes into a brand new table.

**What you need:** access to the CareerPilot project at supabase.com/dashboard.
If you have more than one Supabase project, use the one the CareerPilot app is
connected to.

**The file to run:** `supabase/APPLY-9-MIGRATIONS-2026-11-20.sql` in this repo.
It is the 9 migrations joined into one file, in the right order. You paste the
whole thing once and press Run. Every statement is safe to run again, so if
anything interrupts it, just run it again.

---

## Step 1 — Pre-checks (2 minutes)

In the Supabase dashboard, open the CareerPilot project, then **SQL Editor**,
then **New query**. Run these two checks first. Do not skip them: they catch
the two things that could go wrong.

### Check A — where is pgvector installed?

```sql
select extname, nspname as schema
from pg_extension
join pg_namespace on pg_extension.extnamespace = pg_namespace.oid
where extname = 'vector';
```

Write down the answer. There are three possible results:

- **One row, schema = `public`** — good, nothing extra to do.
- **One row, schema = `extensions`** — good, but you will need the one-line fix
  in Step 3.
- **No rows** — also fine. Step 2 installs it.

### Check B — are the older tables there?

The new migrations build on 7 tables the app already has. This check confirms
they exist:

```sql
select tablename from pg_tables
where schemaname = 'public'
and tablename in (
  'recruiter_sessions', 'resume_analyses', 'skill_gaps',
  'readiness_snapshots', 'career_diagnoses', 'skill_evidence',
  'market_reality_cache'
)
order by 1;
```

You should get **7 rows**. If you get fewer, STOP and tell Merlin which ones
are missing. It means your database is missing an older migration, and running
Step 2 would fail partway. Do not guess or skip this.

---

## Step 2 — Run the 9 migrations (2 minutes)

1. Open `supabase/APPLY-9-MIGRATIONS-2026-11-20.sql` from this repo.
2. Select all and copy it.
3. In the Supabase SQL Editor, open a **New query**, paste it, and press **Run**.
4. Wait. It takes about 30 to 60 seconds. You should see
   **"Success. No rows returned."**

The 9 migrations, in the order they run:

| # | File | What it adds |
|---|------|--------------|
| 1 | 20261002000000_add_ai_usage_quota.sql | AI usage counters, call log, the quota function |
| 2 | 20261002000001_enable_pgvector.sql | Vector search support (skips itself if already installed) |
| 3 | 20261002000002_evidence_model.sql | Evidence ledger, sources, chunks, vector search |
| 4 | 20261003000000_evidence_grants_and_fixes.sql | Access grants + missing indexes on older tables |
| 5 | 20261003000001_market_intelligence.sql | Job sources, jobs, requirements, snapshots |
| 6 | 20261003000002_company_intelligence.sql | Companies, sources, snapshots, requirements, research cache |
| 7 | 20261003000003_job_intelligence.sql | Job link checks |
| 8 | 20261120000000_billing.sql | Payments, subscriptions, AI usage (the billing fix) |
| 9 | 20261120000001_interview_prep.sql | Interview prep progress, MCQ attempts, mock interview attempts |

---

## Step 3 — One-line fix, ONLY if Check A said `extensions`

If pgvector lives in the `extensions` schema, the new vector search function
cannot see the vector tools when it runs, because it is locked to the `public`
schema. Fix it with this one line (run it in the SQL Editor after Step 2):

```sql
alter function public.match_evidence_chunks(uuid, text, vector, integer, text[])
set search_path = public, extensions;
```

Skip this step entirely if Check A said `public` or returned no rows.

---

## Step 4 — Verify it worked (2 minutes)

Run these two checks in the SQL Editor.

### New tables — expect 21 rows

```sql
select tablename from pg_tables
where schemaname = 'public'
and tablename in (
  'payments', 'user_subscriptions', 'ai_usage', 'ai_call_logs',
  'skill_aliases', 'evidence_items', 'evidence_sources', 'evidence_chunks',
  'job_sources', 'jobs', 'job_requirements', 'job_snapshots',
  'companies', 'company_sources', 'company_snapshots',
  'company_requirements', 'company_research_cache', 'job_link_checks',
  'interview_prep_progress', 'interview_mcq_attempts', 'mock_interview_attempts'
)
order by 1;
```

### New functions — expect 2 rows

```sql
select proname from pg_proc
join pg_namespace on pg_proc.pronamespace = pg_namespace.oid
where nspname = 'public'
and proname in ('consume_ai_quota', 'match_evidence_chunks');
```

If either check comes up short, copy the exact result (or error) and send it to
Merlin. Do not try to fix it by editing the SQL yourself.

---

## Step 5 — What NOT to do yet

- **Do not deploy the new code yet.** The next step after this is the Safepay
  sandbox test, and that comes before any deploy.
- **Do not add Safepay keys anywhere yet.** Same reason.

Once Step 4 passes, tell Merlin the migrations are done, and the Safepay
sandbox test gets prepared next.

---

## If something goes wrong

- **"Success. No rows returned."** — that is the good result.
- **An error naming a table that does not exist** — your database is missing an
  older migration. Stop, copy the exact error, send it to Merlin.
- **"policy already exists" or "already exists" errors** — these should not
  happen, because every statement checks first. If one appears, copy the exact
  error and send it to Merlin.
- **The page froze or the run was interrupted** — just run the whole file
  again. Everything in it is safe to repeat.

## One note for later

Running migrations through the SQL Editor does not record them in Supabase's
migration history table. That is harmless here: every statement is idempotent,
so if the migrations are ever applied again (for example by `supabase db push`
from a computer), they will simply do nothing the second time.
