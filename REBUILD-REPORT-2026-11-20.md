# CareerPilot AI — Rebuild Report

**Date:** 2026-11-20
**Base:** `careerpilot-ai@5808a55` ("Broaden positioning: for all university students, any target role")
**Result:** 7 local commits on top of base (HEAD `31ba162` at the time of writing, plus this report). **Nothing pushed, nothing deployed, no GitHub operations at all** — all work is local, per Amina's instruction.
**Spec:** `INSPECTION-REPORT-2026-11-20.md` §9 (approved plan: keep the real engines, rewrite the fake layers, port the studio code in, rebuild the recruiter on real data).

**Scale of the change:** 143 files changed, +18,346 / −6,522 lines. 9 new migrations (32 total). Test suite: 0 → 150 tests, all passing.

**New core rule, enforced across the rebuild:** a fallback may degrade, never impersonate. Every fallback path now carries a visible label and, where the record supports it, a persisted `source` field.

---

## Verification (all green, run by the coordinator after each wave)

| Check | Result |
|---|---|
| `npm ci` | PASS — 523 packages, clean |
| `npx tsc --noEmit` (incl. test files) | PASS — 0 errors |
| `npm run build` (`vite build` + Nitro/Vercel) | PASS — exit 0 |
| `npm test` (vitest) | PASS — 150/150, 9 files |
| Fabrication grep (`matchCompanyTruth` branch, "75%+") | GONE — 0 matches in `src/` |
| Daily-intel "78%" stat | GONE — 0 matches in `src/` |
| Push facade grep (`pushManager`, `isPushSubscribed`, "Offline Alerts") | GONE (only explanatory comments remain) |
| "Head of Talent" roleplay | GONE as a persona (only negations remain: "You are NOT its Head of Talent") |

One test failure was found and fixed during verification: the new billing contract test assumed both quota helpers call the `consume_ai_quota` RPC directly; after the Wave 2 reconciliation, `ai-quota.server.ts` correctly delegates to `billing.server.ts`'s `consumeAiCall`, so the test was updated to pin the delegation instead. One tsc failure was found and fixed during verification: the ported `jobs.test.ts` expects a `marketCacheKey` export that the studio port had not brought over; the coordinator ported it plus the version/location-scoped market cache from the studio (see Phase 2).

---

## Phase 1 — Stop the bleeding (commit `db69233` billing, `ac055b4` truth)

### Billing — the single most dangerous defect, fixed
- **New migration `20261120000000_billing.sql`**: `payments`, `user_subscriptions`, `ai_usage`, `ai_call_logs` tables + the `consume_ai_quota` RPC (atomic check-and-consume, caller isolation, returns `{allowed, calls, limit}`). RLS enabled on all four; authenticated users get SELECT own-row only; **no** client INSERT/UPDATE/DELETE policies and no write grants to `authenticated` — only the service role and the SECURITY DEFINER RPC write. Column names/types match the activation upserts exactly (`order_id` PK so the upsert is idempotent).
- **Safepay redirect now carries `?tracker=`**, so the "Check payment" fallback is reachable (it was likely unreachable before).
- **Quotas are now FAIL-CLOSED** (`billing.server.ts`): a quota-check error or an exhausted quota refuses the AI call with a clear message, instead of logging a warning and letting it through. Wired into **every** AI feature: diagnosis, resume, roadmap v2 + legacy roadmap, flight plan, market research, tech trends (+ detail), outdated-tech, tech events, career discovery, target-job analysis, weekly goals, job-mirror personalization, plus the pre-existing mentor + recruiter-audit wiring.
- **Resume nuance fixed by the coordinator:** the deterministic ATS scan always runs; only the optional AI enhancement is quota-gated, degrading to a labelled deterministic result (with a distinct "AI limit reached" note when the quota, not the provider, is the reason).
- `SAFEPAY_*` vars added to `.env.example` (placeholders only). Manual payment and privacy-deletion now point to a real contact: **ah.systemsss@gmail.com** (no support email existed anywhere in the codebase; the privacy page previously pointed at a LinkedIn link that does not exist).
- **New `billing.test.ts`** (11 tests) pins the code-to-migration contract — tables, columns, RPC signature, RLS posture — so the "tables do not exist" defect cannot regress silently.

### Truth — fabrication deleted, fallbacks labelled
- **`matchCompanyTruth` fabrication branch deleted** (147 lines). Unknown companies return `null`; all callers (diagnosis, recruiter, interview intel) show an honest "not researched yet" state. The invented "75%+" string is gone.
- **`daily-intel.ts` deleted** (pure hardcoded text + an unsourced "78%" stat); its use sites cleaned. A computed replacement was judged not feasible without new data plumbing (the bell has no roadmap/trend/market data feed), so the card is gone rather than faked.
- **Tech trends:** sample fallback is labelled, stamped `lastResearched: null`, never cached as fresh; poisoned legacy cache entries (empty sources) are detected and labelled sample.
- **Outdated-tech:** the `slice(0,2)` bug is fixed (the student's own skills are now searched); AI failure throws an honest error instead of a fake "all healthy" report.
- **Diagnosis:** template fallback is flagged on the saved record (`diagnosis_source`, `research_available`) and shown as a banner; Tavily failure is surfaced instead of swallowed.
- **Tech events:** fallback list is date-filtered (all 12 samples are past as of 20 Nov, so the fallback list is currently empty — honest), marked sample + unverified, auto-fetches live data on mount, and uses the user's own city instead of hardcoded Lahore.
- **Small fixes:** dead "Start Roadmap" button navigates to `/roadmap`; sparkline NaN (divide by zero) fixed; resume + profile errors surfaced instead of swallowed or mislabelled.

## Phase 2 — Port the studio (commit `2318cc7`)

Manual file port (the repos share no git history — no git merge is possible). **+10,998 / −1,054 lines**, the largest single commit.
- `src/lib/evidence/` (chunking, embeddings, ingestion, matching, retrieval, skill aliases + tests) — the real RAG foundation.
- `src/lib/companies/` (Tavily careers-page research, cache, normalization, seed + tests) with the honest contract that zero results is a failure, never an invitation to guess.
- `src/lib/jobs/` (providers, research, requirements, coverage, intelligence + tests) — live job-market research.
- The `/company` route, job-intel server functions + hooks, `SavedPostings`, and the **7 intelligence migrations** (ai_usage_quota, pgvector, evidence_model, evidence grants, market/company/job intelligence). No filename collisions with existing migrations.
- The **vitest suite** (101 ported tests, all passing) + `test`/`typecheck` scripts. The canonical repo previously had zero tests.
- **Market research wired to the live providers** (Tavily via `refreshJobMarket`); the static dataset survives only as a labelled fallback snapshot from 2026-08-31. The dead `GroqResearchProvider` is gone. The coordinator also ported the studio's `marketCacheKey` + version/location-scoped market cache, so a dataset update or location change can no longer serve a stale report.
- `careerpilot-studio/README.md` now carries an ARCHIVED banner (committed in the studio repo, `454b693`): merged into careerpilot-ai on 2026-11-20, do not develop there.

## Phase 3 — UI/UX (commit `367f677`)

Design system KEPT (ink/terracotta editorial, Plus Jakarta Sans) — no brand redesign.
- Landing: mobile nav (hamburger + panel below `lg`), below-fold content renders without scroll or JS (CSS rise-in instead of opacity-0 motion), and the "Daily Flight Plan / daily sprint tasks" copy is rewritten to what the product actually does (roadmap-based daily work). No routes renamed.
- `market.tsx`: off-palette hex onto theme tokens; fetch errors shown as errors (not as a missing role); the invented "82%/74%/68% fit" percentages removed (null = "Not assessed yet"); the fake `globalMatchPct = local − 15` deleted.
- `roadmap.tsx`: day rows are real `<button>` elements; paths errors surfaced.
- FlightPlanHero + future-tech gradients onto theme tokens; remaining dead `dark:` classes removed from FutureTechRadar, diagnosis, resume, and recruiter (the recruiter one went with the Wave 2 rebuild).
- AppLayout decorative search box + fake Cmd-K removed; sidebar user-card ChevronDown with no menu removed.
- `prefers-reduced-motion` support (global CSS rule + `MotionConfig reducedMotion="user"`); 165 tiny (9–11.5px) labels raised to 12px.
- **35 dead components deleted** (FlightPlanStepRail, use-mobile, ui/sidebar, 33 unused shadcn primitives), each verified zero imports first.

## Phase 4 — Recruiter rebuild (commit `9c1f218`)

The old "AI recruiter" was an LLM roleplaying a Head of Talent over invented company data, with its own score discarded and a fake hireChance. The rebuild mirrors an actual screening funnel:
1. **Inputs** — parsed resume (stored text or storage download + extraction), projects (live repo links via the evidence ledger + project URLs), skills evidence from `evidence_items`, researched company via `getCompanyDashboard` with provenance shown in Step 1, target role + pasted JD. (Flight-plan GitLab inspection was not duplicated; repo proof reuses project URLs + evidence links.)
2. **Stage 1 — Resume screen**: deterministic JD checks with resume line numbers + excerpts; degree/experience/location knockouts as pass/fail/unknown (experience-years is honestly "unknown" — CareerPilot doesn't track it); formatting gates reuse the ATS checks. A checklist, not a score.
3. **Stage 2 — Evidence audit**: every claimed skill matched to its proof; the headline is the linked-proof share labelled **"evidence coverage"**, never "hire chance". The original deterministic rubric is kept verbatim as the secondary "evidence rubric".
4. **Stage 3 — Bar comparison**: meets/partial/missing per bar item, each citing source label + URL + retrieved date, from RESEARCHED profiles only; unresearched companies get an explicit "bar unknown" skip.
5. **Stage 4 — Mock interview**: 5 LLM-drafted questions grounded in the JD + bar + evidence gaps (same single quota-counted call as the narrative), with a labelled deterministic template fallback; 90-second timed Q&A; answers scored by a deterministic 0–6 rubric (structure/specificity/evidence) with the rubric shown; attempts persisted with progress over time. Persona chat reframed as "practice with a recruiter-style coach".
6. **Verdict**: readiness bands ("Ready to apply" / "One gap to close: {specific}" / "Not yet — top 3 fixes"), each fix tagged with its source stage, plus the single highest-value next action wired to the existing Add-to-Roadmap flow. **No percentages-as-probabilities anywhere in the UI.**
7. **Honesty rules**: the LLM is never asked for a score (the prompt no longer requests one) and any numeric field it returns is ignored; the invariant is documented in a module comment. The stepper disables steps 2–5 until a session exists (blank-steps bug fixed).
- **Interview-prep persistence** (new migration `20261120000001_interview_prep.sql`): practiced questions, checklist, MCQ attempts, and answer drafts persist per (company, role), RLS own-row. The invented "42 + practiced×12 + checklist×4" readiness number is replaced by a real practiced-prompts count; "AI interview cockpit" is now "Interview practice plan".
- **Push-notification facade removed**: `sw.js` push handlers gone (minimal worker + explanatory comment), `push-notifications.ts` facade deleted, "Offline Alerts" tab gone, reminder toasts no longer claim things are "scheduled"/"saved", dashboard no longer advertises "4-in-1 offline push alerts". In-app (DB-backed) notifications are untouched.

## Phase 5 — Real companies data (commit `31ba162`)

- **ATS public job-board clients** (`src/lib/jobs/ats-providers.ts`, Greenhouse/Lever/Ashby — free, no key, official APIs), **all verified live**: GitLab 246 jobs, Airbnb 203, Motive 186 (Greenhouse); Spotify 94 (Lever); Ashby 79, Linear 32 (Ashby). No tokens guessed — boards that 404 stay unregistered. Failures surface as "live postings unavailable", never fake postings. Wired into the company dashboard (fresh fetch every load for board companies) and job research.
- **Tavily careers-page research** is the path for companies with no ATS board (i.e. Pakistani companies), reachable via "Research this company" (force-refresh server fn), cached with source URLs + retrieved date. The "zero results is a failure" contract is untouched.
- **Seed provenance**: all 8 hardcoded profiles now ship `sources: []`, `researchedOn: null`, `verified: false`, badged "Unverified seed data — research date unknown". All unsourced stats dropped, including the "78% rejected" screening stat. **No research dates or sources were invented** — the seeds honestly have none.
- **Company identity gains `atsBoard`** (provider + token), seeded ONLY where verifiable: Motive (Greenhouse `gomotive`, verified via its careers page HTML + a live 186-job response). The other 7 are null. The registry additionally holds the 5 globally verified boards above.
- **Company dashboard**: unresearched companies get a typed `not_researched` state with the research action instead of an error throw. Every view shows "Researched {date} · {n} live postings · sources" (clickable source links) or "not researched yet". Seed dashboards no longer stamp a fake "now" date (dataset version bumped v1 → v2 to invalidate poisoned cache entries).
- **Adzuna salary client** implemented from the official docs (histogram API, vacancy-weighted p25/median/p75); free-tier key path documented in `.env.example`. No key configured, so salary bands stay on the labelled stale dataset; **not wired into pages yet**. No Pakistan coverage confirmed.
- **Quota helpers reconciled to ONE plan-based rule**: the ported `ai-quota.server.ts` now delegates to `billing.server.ts`'s `consumeAiCall` (free 10/day, Proof 100/day); the flat 25/day rule is deleted. `guardedChat` keeps its export shape.
- 38 new tests (ATS parsers on real-payload fixtures, Adzuna percentile math, seed provenance).

---

## What still needs Amina (in order)

1. **Apply the 9 new migrations to the Supabase project** (billing + 7 intelligence + interview prep). This needs Supabase console access, which the rebuild did not have. **Order matters: apply the migrations BEFORE deploying this code** — until the billing migration is applied, the new fail-closed quotas will refuse EVERY AI call with "We could not verify your AI plan right now." That is the intended fail-closed behavior, but the migration must ship first.
2. **Run a live end-to-end Safepay activation test in sandbox** after the migration is applied (checkout → webhook → plan active). The static contract is test-pinned, but no live-DB run was possible here (no Postgres or Supabase access in this environment).
3. **Safepay keys: do NOT configure them** until (1) and (2) are done. The pricing page already says automatic payments are not open yet; keep it that way.
4. **Rotate the Supabase publishable key.** A `.env` file was committed to git history Aug–Sep 2026 (publishable config only, empty Groq key — low severity), and RLS is the only thing standing between that key and user data. Cheap to rotate in the Supabase console.
5. **Regenerate Supabase types** (`supabase gen types`) after applying the migrations — the billing + intelligence tables are missing from the generated `Database` types and the code works around that with `as any`.
6. **AI + research keys in the deployment env**: Groq/Gemini/OpenRouter + Tavily keys must be configured wherever this deploys for live AI/research to work. No keys were created or stored during the rebuild; the code reads them from env as before. **Also verify the model IDs** (`qwen3.8`, `gemini-3.x` defaults in `ai.server.ts`) against the provider catalogs — the failover chain may be masking dead defaults (flagged in the inspection, not verified here).
7. **Adzuna free key** (developer.adzuna.com, self-serve, no payment details) if salary bands are wanted — then wire the client into the market/job-mirror pages and test `pk` coverage. Do not promise Pakistan salary bands until `pk` is tested.
8. **Deploy decision + GitHub push permission.** Nothing is deployed and nothing was pushed. Pushing needs Amina's say-so in the moment (her standing GitHub rule). Note the Lovable rule in `AGENTS.md`: never rewrite pushed history (no rebase/amend/squash of pushed commits).
9. **pgvector schema check on migration day:** the ported `20261002000001_enable_pgvector` creates the extension in the default schema, while the pre-existing `20261020000000_add_intelligence_rag` migration references it `with schema extensions`. Verify `vector(768)` resolves when the migrations are applied.
10. **Manual payments go to ah.systemsss@gmail.com now** (pricing + privacy pages). Confirm someone monitors that inbox for payment screenshots.
11. **Recruiter coverage decision (follow-up):** the audit still requires one of the 8 featured companies — custom companies can be researched but not audited, because the rubric needs a `CompanyHiringTruth` and synthesising one risks inventing data. Relaxing this needs a design that derives bar items ONLY from researched sources. Left as a deliberate limitation, stated in the UI.

## Deliberately NOT done

- **No full rewrite.** Per the approved plan: the stack, auth/RLS, AI failover client, resume/roadmap/flight-plan engines were kept. The rebuild fixed the money flow, killed every fabrication path, ported the studio intelligence in, and rebuilt the recruiter — it did not throw away working code.
- **No deploy, no GitHub operations, no push, no sign-in.** All work is local commits only.
- **No Safepay keys configured; no key rotation** (needs the owner's console access).
- **No live-DB end-to-end activation test** (no Postgres/Supabase access in this environment — see item 2 above).
- **Daily intel not rebuilt as a computed card** (no real data feed exists to build one from; the card was removed instead of faked).
- **Push notifications not built** (the facade was removed instead; building the real system needs VAPID keys + a send path, a separate decision).
- **Adzuna not wired into pages** (no key configured).
- **No new visual direction / brand redesign.** The existing design system was kept throughout, per the brief; no direction pick was needed.
- **`hireChance`/`rejectChance` columns kept** as legacy schema mirrors of the rubric score (documented in code, never rendered in the UI). Dropping them needs a schema migration + old-session handling; not worth the risk in this pass.
- **Dark mode not implemented** (dead classes removed instead of building a toggle + token set).
- **SavedPostings deep-link to jobmirror (`?job=`) not restored** — it needs the studio's jobmirror UI, which was not ported (careerpilot-ai's jobmirror is the Interview Prep screen).
- **Studio's `guardedChat` change to market.server.ts not ported** — quota is enforced via `consumeAiCall` at the top of `generateMarketReality` instead, which covers the same call.
- **Roadmap-v2 can consume up to 3 quota units** per generation when the market and trends caches are cold (roadmap + internal market reality + internal trends — each is a real AI call; usually 1 because caches are 7-day). Noted in a code comment, not changed.

## Commit list (all local, on top of `5808a55`)

| Commit | Subject |
|---|---|
| `468b6d3` | docs: add deep inspection report (2026-11-20) |
| `db69233` | billing: add the missing migration, fail-closed quotas, Safepay tracker fix |
| `ac055b4` | truth: delete fabricated company data + label every silent fallback |
| `2318cc7` | port: merge careerpilot-studio intelligence code (Phase 2–5) in |
| `367f677` | ui: mobile nav, honest copy, no-JS content, dead-code removal |
| `9c1f218` | recruiter: rebuild as a real screening funnel on real data |
| `31ba162` | companies: real data via ATS APIs + Tavily, honest provenance everywhere |
| (+ this report) | docs: add rebuild report (2026-11-20) |

Studio repo: `454b693` docs: mark repo archived, merged into careerpilot-ai (2026-11-20).

## Minor notes

- Server bundle grew slightly with the ported code: 6.81 MB → 7.12 MB (1.56 → 1.60 MB gzip). The datasets are still bundled into the single server function; code-splitting them out is a future optimisation, not a defect.
- The ported `companies/seed.ts` still documents the featured-8 seeds as unverified; re-researching them through the Tavily research job (once keys are configured) is the way to earn real provenance.
- `market.tsx`'s Global card is kept as an honest "Not measured" state (removing it would leave the default global-scope view empty).
