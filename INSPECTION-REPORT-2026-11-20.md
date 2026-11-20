# CareerPilot AI — Deep Inspection Report

**Date:** 2026-11-20 (read-only audit; no files modified, no pushes, no deploys, no GitHub sign-in)
**Audited repo:** `~/workspace/projects/careerpilot-ai` — HEAD `5808a55` ("Broaden positioning: for all university students, any target role"), 178 src files, ~42,000 lines of TypeScript/TSX, 23 Supabase migrations
**Compared against:** `~/workspace/projects/careerpilot-studio` — HEAD `93f397a`, 189 src files, 26 migrations

## Verdict in one paragraph

The project is much stronger than "too weak" in its engineering bones and much weaker than it claims in its data. The build passes cleanly, the typecheck passes, auth and RLS are genuinely solid, and the AI plumbing makes real multi-provider LLM calls with real Tavily search. What is weak is the product truth: the "market research" performs no research, the company data is 8 hardcoded profiles plus a function that **invents** a hiring profile for any company name a user types, several features silently serve stale or fabricated content stamped as fresh, the Safepay money flow would charge a user Rs 499 and activate nothing, and the best intelligence code ever written for this product (~6,000 lines, Phase 2–5) sits in the *other* repo and was never ported. It does not need to be rebuilt from scratch. It needs a data-integrity rebuild, a billing fix, and a merge of the two repos.

---

## 1. Which repo is canonical — and the split-brain problem

**Canonical: `careerpilot-ai`.** Evidence:

| Signal | careerpilot-ai | careerpilot-studio |
|---|---|---|
| Commits | 166 | 92 |
| HEAD date | 2026-10-30 | 2026-10-30 |
| Deployment | `vercel.json`, `postbuild.mjs`, Vercel preset, `vercel-build` script | No vercel.json; `build` runs `vite build && nitro build` |
| Monetization | Safepay (`@sfpy/node-core`), billing, Pricing page, Rs 499 Proof Plan | None |
| Legal / onboarding | Privacy, Terms, login, register routes; NIC-ready homepage | None (only `auth.tsx`) |
| Docs / proof | README, MARKET_REALITY_CHANGES.md, hackathon PDF, 4 screenshots, `scripts/generate-documentation-pdf.mjs` | README, MARKET_REALITY_CHANGES.md only |
| Direction of ports | Commit `4de1964`: "Port Oct 30 bug fixes **onto careerpilot-ai baseline**" — fixes flow *into* this repo | Source of the ported fixes |

**Critical structural fact: the two repos share no git history.** They are separate repositories (different object stores), not branches of one repo. They diverged from a common ancestor state and can never be merged with git — any unification is a manual file port.

### What each repo has that the other lacks

**Only in `careerpilot-ai` (the product/deployment side):**
- Billing + Safepay: `src/lib/billing.server.ts`, `billing.functions.ts`, `safepay.server.ts`, `safepay-webhook.server.ts`
- Routes: `login.tsx`, `register.tsx`, `pricing.tsx`, `privacy.tsx`, `terms.tsx`, `_authenticated/events.tsx`
- Notifications: `NotificationBell.tsx`, `NotificationSubscriptionCard.tsx` (dead, see §6), `push-notifications.ts`
- Tech events: `tech-events.server.ts`, `tech-events.functions.ts`, `src/data/tech-events.ts`, `TechEventsSection.tsx`
- RAG/intelligence server: `rag.server.ts`, `intelligence.server.ts`, `daily-intel.ts`
- `public/sw.js`, `CompletionCertificate.tsx`, `postbuild.mjs`, `vercel.json`, `scripts/`, screenshots, PDF docs
- Migrations: `20260908000000_scope_avatar_storage_policies`, `20260912000000_add_city_to_profiles`, `20260912_add_performance_indexes`, `20261020000000_add_intelligence_rag`

**Only in `careerpilot-studio` (the intelligence side — the better engineering):**
- Phase 2 evidence foundation: `src/lib/evidence/` (chunking, embeddings, ingestion, matching, retrieval, schemas, skill-aliases) + tests
- Phase 3 market intelligence: `src/lib/jobs/` (providers, research, requirements, coverage, urls, intelligence + 1,100 lines of tests), `cache-keys.ts`, `coerce.ts`
- Phase 4 company intelligence: `src/lib/companies/` (research, cache, seed, normalization, company.server) + `src/data/company.ts`
- Phase 5 job intelligence: `src/lib/job-intel.functions.ts`, `src/data/job-intel.ts`, `SavedPostings.tsx`
- Route `_authenticated/company.tsx`, `src/lib/ai-quota.server.ts`
- Migrations: `20261002000000_add_ai_usage_quota`, `20261002000001_enable_pgvector`, `20261002000002_evidence_model`, `20261003000000_evidence_grants_and_fixes`, `20261003000001_market_intelligence`, `20261003000002_company_intelligence`, `20261003000003_job_intelligence`
- **A test suite**: `vitest.standalone.config.ts`, `test` and `typecheck` scripts. careerpilot-ai has zero test files and no test script.

The studio's company research is done *right*: Tavily over careers pages, then deterministic parsing (role titles from result titles, skill frequencies by counting taxonomy-known skills), with an explicit contract that "zero results is a failure, not an invitation to guess" (`careerpilot-studio/src/lib/companies/research.ts:1-18`). That discipline is exactly what the canonical repo lacks.

---

## 2. Architecture (canonical repo)

- **Stack:** TanStack Start + TanStack Router + React 19 + TypeScript + Vite 8 + Nitro (Vercel preset, `nodejs22.x`), Tailwind 4 + Radix/shadcn ("new-york"), TanStack Query, Motion, Supabase (Auth, Postgres, Storage, RLS).
- **Origin:** Lovable-generated (`@lovable.dev/vite-tanstack-config` wrapper in `vite.config.ts`; AGENTS.md is only a Lovable no-rewrite-history notice; 60 of 166 commits are from `gpt-engineer-app[bot]`). Package name is still the template default `"tanstack_start_ts"`.
- **Server functions:** `.server.ts` modules + `createServerFn` in `.functions.ts`, auth via `requireSupabaseAuth` (JWT verified with `getClaims`/`getUser` fallback, `src/integrations/supabase/auth-middleware.ts:92-128`); CSRF middleware in `src/start.ts:24-27`.
- **AI client:** `src/lib/ai.server.ts` — one shared `groqChat()` (misnamed; it is multi-provider) with failover across Groq → Gemini → OpenRouter and across models within each provider, 52s total budget. Models: Groq `qwen/qwen3.8-27b` (default), Gemini `gemini-3-flash-preview` (default), OpenRouter `openai/gpt-oss-20b` (default). No direct OpenAI client.
- **Live research:** `src/lib/tavily.server.ts` — real Tavily client (timeout, 401/403/429 handling), imported by diagnosis, flightplan, outdated-tech, tech-events, tech-trends. **Not** imported by market-research (see §3).
- **Routes (public):** `/` (landing), `/auth`, `/login`, `/register` (7-line redirects to `/auth`), `/pricing`, `/privacy`, `/terms`. **Authenticated (13 + guard):** dashboard, onboarding, diagnosis, resume, flightplan, jobmirror, recruiter, roadmap, mentor, market, future-tech, events, profile.
- **Scale:** 42,073 lines in `src/`; 9,783 lines of server lib; 30 tables; 60 dependencies. Commit activity: 66 (Aug 2026), 64 (Sep), 33 (Oct) — quiet since 30 Oct.

---

## 3. Feature truth table (claimed vs actual)

Verdicts: **REAL** = works as claimed · **PARTIAL** = real core, materially misleading or incomplete · **STUB/MOCK** = hardcoded/fake · **BROKEN** = does not work.

| # | Feature | Claimed | Actual | Verdict |
|---|---|---|---|---|
| 1 | Career diagnosis | AI diagnosis over real evidence + live research | Real LLM diagnosis over real Supabase state + real Tavily (restricted to onetonline.org, bls.gov, skillsengland.education.gov.uk) + deterministic benchmark. But Tavily failure is swallowed (`diagnosis.server.ts:719-724`), and AI failure silently swaps in a fully templated diagnosis (`:839-847`, `raw = "{}"` then `deterministicCompanyDiag`) with **no flag on the saved record** that AI never ran. | **PARTIAL** |
| 2 | Resume ATS intelligence | Resume upload → ATS + career-fit analysis | Genuinely real: PDF via `unpdf`, DOCX via `fflate`, 13 deterministic ATS format checks, 141-term skill vocab scan, short optional LLM enhancement (8s timeout). Failure honestly labelled ("AI analysis unavailable — showing ATS formatting checks only", `resume.server.ts:791-796`). Caveat: "ATS score" is the app's own format rubric, not a real ATS simulation. | **REAL** |
| 3 | Flight plan | JD vs evidence readiness assessment | Real LLM assessment of pasted JD vs real profile evidence, real Tavily market search, and a **real GitLab API inspection** (repo tree, README/CI/tests scoring, `flightplan.server.ts:85-190`). Market status honestly `live` vs `unavailable`; AI-failure fallback states plainly the assessment is unavailable. Best-labelled failure path in the codebase. Naming is wrong though: this route is the Job Mirror; daily work lives in `/roadmap`. | **REAL** |
| 4 | Job mirror | Employer expectations vs your proof | Genuinely computed: user evidence matched against the role dataset via `market-fit.ts`, coverage %, salary bands, staleness flags. LLM writes only 3 prose fields under a 4s race; unresearched roles flagged `isFallback`. Honest — but a mirror against a **static dataset**, not live postings. | **REAL** (deterministic) |
| 5 | Recruiter audit ("AI recruiter") | Company-specific recruiter screening | **No real recruiter.** Deterministic rubric score + an LLM asked to roleplay "HEAD OF TALENT ACQUISITION at {company}" using the hardcoded company dataset. The LLM's score is **discarded** (`finalScore = baseline.score`, `recruiter.server.ts:318-320`). `hireChance`/`rejectChance` are `score` / `100-score` dressed as probabilities (`:367-369`; comments admit they are evidence coverage, not probabilities). Silently defaults to Systems Limited + "Associate Software Engineer" (`:261-263`). Follow-up chat is a real LLM chat in persona. | **PARTIAL** (roleplay) |
| 6 | Roadmap / roadmap-v2 | Gaps → learning paths, MCQs | Most honestly AI-dependent feature: rich prompt from profile, role truth, rejection reasons, market reality, diagnosis, live tech trends; **fails honestly** (`{success:false}`, keeps old roadmap) if AI fails or returns ≠4 paths (`roadmap-v2.server.ts:375-398`). No fake fallback. MCQs AI-generated at creation, persisted; `mcq.server.ts` is pure retrieval/grading. | **REAL** |
| 7 | AI mentor + RAG | Contextual mentor grounded in your evidence | Real LLM chat grounded in real profile/goals/skills/resume/roadmap/applications/projects from Supabase, history persisted, failure labelled. The "RAG" that actually runs is **lexical keyword-overlap over the static dataset** (`intelligence.server.ts:106-139`). Real pgvector code exists (migration `20261020000000`, `rag.server.ts:169-205`) but silently returns `[]` when unconfigured (`:157-160`), auto-index gated on `RAG_AUTO_INDEX`, nothing seeds it except diagnosis research. Dormant by default. | **PARTIAL** |
| 8 | Market reality | Live market report for your role | **No live data at all.** Default provider `MarketTruthProvider` "makes no network calls" (`market-research.server.ts:21-34, 383`). `GroqResearchProvider` is dead code, never instantiated. Tavily never called here despite `src/data/market.ts:86` claiming it uses Tavily. Dataset last researched **2026-08-31** (`market-truth/meta.ts:17`), 8 roles, 11 sources; quarterly-refresh fields due ~2026-11-30, i.e. **stale now** (the code's own `isStale` flags them). | **PARTIAL** (stale snapshot) |
| 9 | Tech trends / future tech | Live trend radar | Real live path (Tavily multi-query + AI synthesis + 7-day Supabase cache). But Tavily failure or empty results silently serve a **5-item hardcoded fallback that is then cached 7 days** and stamped `lastResearched: now` with `sources: []` (`tech-trends.server.ts:98-114, 570-611, 755-786`). | **PARTIAL** |
| 10 | Outdated-tech check | Are my skills going stale? | Real Tavily + AI, but **two defects**: `queries.slice(0, 2)` (`outdated-tech.server.ts:144`) drops the skill-specific third query, so the student's actual skills are never searched; and AI failure returns a report with **zero outdated items and all skills "healthy"** (`:258-267`) — a fake clean bill of health, dated `researchedAt: now`. | **PARTIAL** (buggy) |
| 11 | Company data | Hiring truth for real companies | 8 featured companies hardcoded (`company-truth.ts:53-862`: Systems Limited, NetSol, Arbisoft, 10Pearls, Devsinc, Folio3, Motive, generic "Global Tech"), **zero sources, citations, or research dates**; 31-name `PAKISTAN_COMPANY_DIRECTORY` is bare strings with no data. **Worst finding: `matchCompanyTruth` fabricates a profile for any unknown company** (`:899-1046`, "Generate a dynamic, highly accurate generic employer profile") — invented rejection rates ("75%+ rejected at resume & test filter"), rejection reasons naming the company, interview stages — fed into diagnosis, recruiter audit, and interview intel as if researched. | **PARTIAL** (8 cos.) / **STUB-MOCK** (all others) |
| 12 | Daily intel | Daily briefing card | Pure hardcoded text (`daily-intel.ts:15-58`): no AI, no DB, no network. Fixed roadmap/future-tech lines, plus a market claim — "78% of generic applications rejected without public proof" — that **appears nowhere in the dataset** (only occurrence in the repo). | **STUB/MOCK** |
| 13 | Tech events | Upcoming events/hackathons | Real live path (Tavily advanced search + AI extraction with URL/date/city validation). But any failure silently falls back to **12 hardcoded events dated 2026-09-22 to 2026-11-04, all `isVerified: true, registrationOpen: true`** (`tech-events.ts:23-231`) — by late Nov most are past yet shown as open, verified, upcoming. Events page renders the stale list immediately and only fetches live on manual refresh; city hardcoded `"Lahore"` despite `user.city` existing. | **PARTIAL** |
| 14 | Interview prep (jobmirror route) | AI interview cockpit | Static local question bank (`data/interview-intel.ts`) behind an "AI interview cockpit" label. "Prep readiness" is an arbitrary formula `42 + practiced*12 + checklist*4` (`jobmirror.tsx:348`). **All progress is local `useState` — practiced questions, checklist, MCQ, answer drafts reset on refresh** (`:331-333`). | **STUB/MOCK** (as "AI") |
| 15 | Auth | Sign up / sign in / reset | Email/password only, real end to end: signup → profile via `handle_new_user()` trigger + client upsert fallback; protected-route guard with session check + onboarding gate. No OAuth, no magic link, no OTP anywhere. Email verification half-handled (signup shows "check your inbox" but no route checks `email_confirmed_at`). One fail-open: profile-read timeout sets `onboarded = true` (`_authenticated/route.tsx:107-113`) — navigation only, not an auth bypass. | **REAL** |
| 16 | Payments / Safepay | Rs 499/mo Proof Plan, automatic checkout | Code is genuine (`@sfpy/node-core`, checkout session, webhook route, tracker re-fetch verification). **Money flow is broken (see §5): activation writes to tables that do not exist; the "Check payment" fallback is likely unreachable; quotas fail open and cover only 2 features.** Real money flow today is manual JazzCash/Easypaisa + screenshot, founder-activated. `.env.example` documents no `SAFEPAY_*` variables at all. | **PARTIAL** code / **BROKEN** flow |
| 17 | Push notifications | Push alerts | `public/sw.js` is a real service worker, but **no push system behind it**: zero `pushManager.subscribe`, zero VAPID key, zero server send path, zero subscription storage. `push-notifications.ts` only does local test alerts; "subscribed" is a localStorage boolean. In-app notifications (DB-backed `roadmap_notifications` + bell) are real and separate. | **STUB** (push) / **REAL** (in-app) |
| 18 | Supabase / RLS | User-scoped data | 23 migrations, 30 tables, all coherent; every user table has `user_id` FK + RLS + own-row policies; no table wide open; no cross-user read found. Stale generated types omit roadmap-v2 + intelligence tables (worked around with `as any`). No migration for billing tables (see §5). | **REAL** |

### Cross-cutting pattern: the fallback problem

`groqChat` itself fails honestly (throws `AiError`, `ai.server.ts:148-152`). **Nearly every caller swallows the error.** The honest ones label it (resume, flight plan, roadmap, mentor). The dishonest ones substitute template/static content and stamp it as fresh research (diagnosis, tech trends, outdated-tech, tech events, daily intel). The product's core promise is "honest readiness" (README: "CareerPilot does not promise a job or invent evidence") — the fallback paths break that promise in at least 6 places.

## 4. Build health

Run 2026-11-20 on this machine (Node v24.22.1, npm 10.9.4), from a clean checkout with no `node_modules`:

| Check | Result |
|---|---|
| `npm ci` | **PASS** — 480 packages in 41s. Two deprecation warnings only (`tsconfck@3.1.6` unmaintained, `eslint@9.39.5` unsupported). |
| `npm run build` (`vite build` + Nitro/Vercel) | **PASS** — exit 0. Client built in 3.25s, Nitro server in 3.04s. No errors, no warnings in the log. |
| `npx tsc --noEmit` | **PASS** — 0 errors. |
| Tests | **NONE** — no test script, zero test files. (Studio has vitest + ~1,800 lines of tests.) |

Notes:
- Server bundle is large: `.vercel/output/functions/__server.func/index.mjs` **6,809.81 kB (1,564.57 kB gzip)** — one function carrying everything, including the big static datasets. Worth code-splitting the datasets out of the server bundle.
- `postbuild.mjs` exists to copy `tslib` into every Vercel function and patch `maxDuration` to 60s — a workaround for a packaging gap, not a defect, but it means the build is Vercel-coupled.
- `vite.config.ts` loads `.env` into `process.env` at config time and delegates almost everything to `@lovable.dev/vite-tanstack-config` — the Lovable wrapper is a single point of failure for future Vite/TanStack upgrades.
- The `market.tsx` route alone is 2,227 lines; `diagnosis.tsx` 1,190; `onboarding.tsx` 1,316. Route files this large are a maintainability smell, not a build problem.

## 5. Payments deep dive — the single most dangerous defect

The Safepay code is genuine, not a mock: session creation for **Rs 499 = 49,900 paisa, PKR**, with `metadata: {order_id, user_id, plan}` (`safepay.server.ts:49-69`), passport token + hosted checkout URL (`:71-86`), webhook route `POST /api/safepay-webhook` (`src/server.ts:55-57`), and a handler that treats the payload as untrusted and re-fetches the tracker with the secret key, activating only on `TRACKER_ENDED` + amount/currency/user match (`safepay.server.ts:92-149`). There is no HMAC/signature check on the webhook — the authenticated re-fetch is the verification, which is acceptable since a forged payload cannot fake Safepay's own tracker state.

But the money flow is broken in three places:

1. **Activation writes to tables that do not exist.** `activateFromTracker` upserts into `payments` then `user_subscriptions` (`safepay.server.ts:117-127`). Neither table exists in any of the 23 migrations, in the generated types, or in git history. Commit `8e4da53` ("Monetization foundation… subscriptions table support") touched 6 files and added no migration. The "Section 8 migration" cited in `billing.server.ts:47` never landed. **A real paid checkout ends in "Could not record the payment. Please try again." — the user is charged Rs 499 and gets no plan and no in-app payment record** (only Safepay's dashboard would show it). Verified by grep: zero migration files reference `user_subscriptions` or `consume_ai_quota`.
2. **The "Check payment" fallback is likely unreachable.** The checkout `redirect_url` is `${origin}/pricing?paid=1` with **no tracker parameter** (`safepay.server.ts:81`), but `CheckPaymentButton` only renders when `?tracker=` is present (`pricing.tsx:96-108`). Unless Safepay appends the tracker itself, the user has no way to trigger fallback activation.
3. **Quotas are barely enforced and fail open.** `consumeAiCall` is called only by mentor and recruiter-audit (`mentor.server.ts:142`, `recruiter.server.ts:257`); diagnosis, resume, roadmap, flightplan, and market AI calls have no quota check. When the (nonexistent) `consume_ai_quota` RPC errors, it logs a warning and **lets the call through** (`billing.server.ts:105-109`); `getUserPlan` returns `"free"` on any error (`:72-77`). Today, free vs Proof is effectively unenforced.

Mitigations already in place: if Safepay keys are missing, the Pay button shows "Automatic payments are not open yet — Safepay approval is pending. Pay manually by JazzCash/Easypaisa" (`pricing.tsx:60-63,148-154`) instead of a fake checkout. **Keep Safepay unconfigured until the billing migration exists.** The manual path itself is a dead end in the UI: "send your payment screenshot" gives no address, email, or WhatsApp number to send it to (`pricing.tsx:162-167`).

## 6. UI/UX audit

**Landing page (`src/routes/index.tsx`, 800 lines) — distinctive, not a generic template.** Dark editorial hero ("BUILD / YOUR / FUTURE", terracotta circle + grayscale person image), 5-step numbered workflow rows, 3 feature spotlights with in-product mockups, 6-card platform suite, Before/After cards, final CTA. No gradient hero, no testimonial carousel, no stats bar, no fake logo strip. Mockups are honestly labeled ("Example", "Sample Market Snapshot", "Example daily sprint"). No lorem, no TODOs anywhere in the codebase (grep clean). Weaknesses: **no mobile nav** (nav is `hidden lg:flex`, `:175` — anchor links unreachable on phones); below-fold content is `opacity: 0` until scrolled into view (`whileInView`, `:281`), so full-page captures and no-JS renders show a mostly blank page; and the landing promises a "Daily Flight Plan" with "daily sprint tasks" (`:78-83`) that **does not exist** — `/flightplan` has no daily tasks (they live in `/roadmap`), and the route names are swapped vs their content (`/flightplan` is the Job Mirror, `/jobmirror` is Interview Prep).

**Screens:** dashboard, diagnosis, resume, flight plan, recruiter, roadmap, mentor, market, future-tech, onboarding, profile, auth are all substantially built with generally good skeletons and empty states (dashboard `CardEmpty` is the best in the app). The recurring UI failures are: error states masquerading as empty states; invented numbers presented as personal data; dead or decorative controls; and "Verified" labels on unverified content. Full per-screen verdicts fed the ranked list in §8.

**Mobile:** responsive design is genuinely present (hamburger + slide-over nav, collapsing grids, `overflow-x-auto` tables, `overflow-x-clip` guards). Weak spots: landing nav (above), mentor chat `min-h-[640px]`, recruiter stepper `min-w-[130px]` items in horizontal scroll.

**Design system:** mostly one coherent theme (Plus Jakarta Sans, ink/terracotta/clay oklch tokens, shadcn "new-york"). Deviations: hardcoded hex palettes in `market.tsx:405-424`, `FlightPlanHero.tsx:43` (off-palette teal), `RecruiterHeroCard.tsx:16`, `future-tech.tsx:378-380`; emoji severity badges in recruiter (the only emoji in the UI); **dark mode is dead code** (`@custom-variant dark` exists but no `.dark` token block and no toggle, so 71 `dark:` classes can never trigger). **Dead components (0 imports):** `FlightPlanStepRail.tsx`, `NotificationSubscriptionCard.tsx`, `use-mobile.tsx`, `ui/sidebar.tsx`, ~34 unused shadcn primitives (tree-shaken but repo clutter). The AppLayout search box is decorative with a fake ⌘K hint (`AppLayout.tsx:57-66`); sidebar user-card `ChevronDown` has no menu.

**Accessibility:** mostly good (real buttons/labels, `aria-label` on icon buttons, `aria-expanded` on accordions). Glaring issues: roadmap day rows are `div role="button"` with manual key handling (`roadmap.tsx:256-263`); no `prefers-reduced-motion` handling anywhere despite motion-heavy entrances; meaningful labels set at 10–11px uppercase throughout.

## 7. Security findings

No secret values are printed in this report. Severity: **no critical findings.** Two mediums, the rest low/latent.

| # | Finding | Severity | Evidence |
|---|---|---|---|
| S1 | **`.env` was committed to git history** (2026-08-09 → 2026-09-04, commits `0bdff92` → `97b625a`, which deleted it). The committed file contained real-looking Supabase publishable config (project ID, URL, publishable key) and an **empty** `GROQ_API_KEY`. No service-role key and no AI key was ever committed. Publishable keys are public by design, so exposure is low — but the key has been public since August and RLS is the only thing standing between it and user data. | Low–Medium | `git log --all -- .env`; `git show 0bdff92:.env` (names + value lengths only) |
| S2 | **Publishable key + project URL hardcoded as fallbacks** in `client.ts:44-45` and `auth-middleware.ts:41-42`. Public by design, but rotation then requires a code change. Worse, `isValidKey` in `client.ts:48` accepts an `sb_secret_` prefix, so a misconfigured `VITE_` var could ship a secret key to the browser. Latent, not active. | Medium (latent) | `src/integrations/supabase/client.ts:44-48` |
| S3 | No HMAC/signature verification on the Safepay webhook. Mitigated by design: the handler re-fetches the tracker with the secret key and activates only on verified tracker state, so a forged payload cannot activate anything. Acceptable; document it. | Low | `safepay-webhook.server.ts:12-58` |
| S4 | `skills` table allows any authenticated user to INSERT with `WITH CHECK (true)` — shared catalogue, spam-able by any signed-in user. Low impact. | Low | Migration `20260809095250` |
| S5 | `intelligence_documents/chunks`: rows with `user_id IS NULL` are readable by all authenticated users (shared intelligence by design); no DELETE policy, so users cannot delete even their own docs. | Low | Migration `20261020000000` |
| S6 | Profile-read timeout in the auth guard sets `onboarded = phase1Done = true` (fail-open for navigation only; the user is already verified, not an auth bypass). | Low | `_authenticated/route.tsx:107-113` |
| S7 | Historical, fixed: the 20260902 avatar storage policies let any authenticated user update/delete any avatar; fixed by the 20260908 migration scoping writes to `<user_id>/`. | Fixed | Migrations `20260902000000:28-39`, `20260908000000` |

**What is solid:** no hardcoded secrets in HEAD (pattern scan of `src/`, `public/`, `scripts/`, `vite.config.ts` clean); `.env.example` is placeholders only; service-role key is server-only, env-only, imported only from `.server.ts` files (`client.server.ts:40-54`, throws if missing); no user ID is ever taken from client input — all server functions use `context.userId` from the verified JWT; every `createServerFn` uses `requireSupabaseAuth` except `getBillingStatus`, which leaks only a boolean; admin-client paths check ownership manually (`daily-work.server.ts:86-94`, `mcq.server.ts:14-22`, `roadmap-notifications.server.ts:107-122`); no IDOR found in checked paths. RLS: all 30 tables enabled with own-row policies; `roadmap_mcq_tests` correctly scopes through its parent path.

**Recommended actions:** rotate the Supabase publishable key (cheap, closes S1); remove the hardcoded key fallbacks and make `isValidKey` reject `sb_secret_`; add a pre-commit secret scan (e.g. gitleaks) since `.env` was committed once already.

## 8. Ranked top 10 weaknesses

1. **Safepay would take real money and activate nothing.** `activateFromTracker` upserts into `payments` and `user_subscriptions`, which have no migration, no types, no history (`safepay.server.ts:117-127`; `billing.server.ts:47,65,100`). A Rs 499 checkout ends in "Could not record the payment" with no plan and no record. The "Check payment" fallback is likely unreachable (`redirect_url` has no `?tracker=`, `safepay.server.ts:81` vs `pricing.tsx:96-108`). **Fix before Safepay keys are ever configured.**
2. **`matchCompanyTruth` fabricates company hiring intelligence.** Any typed company name gets invented specifics — "75%+ rejected at resume & test filter", named rejection reasons, interview stages — presented as researched truth and fed into diagnosis, recruiter audit, and interview intel (`company-truth.ts:899-1046`). This is the single worst trust defect: the product invents evidence about real companies.
3. **"Market research" performs no research, and the dataset is stale.** Dataset-only provider, dead `GroqResearchProvider`, misleading Tavily comment (`market-research.server.ts:21-34, 383`; `src/data/market.ts:86`). Last researched 2026-08-31, 8 roles, quarterly fields due ~2026-11-30 — stale now by the code's own flags.
4. **Silent fallbacks stamped as fresh research.** Tech trends: 5-item hardcoded fallback cached 7 days with `lastResearched: now` (`tech-trends.server.ts:98-114, 570-611`). Outdated-tech: AI failure returns a fake "all healthy" report (`outdated-tech.server.ts:258-267`) and `queries.slice(0, 2)` (`:144`) never searches the student's own skills. Diagnosis: AI failure silently swaps in a template with no flag on the saved record (`diagnosis.server.ts:839-847`). Tech events: past events shown as verified and open (`tech-events.ts:23-231`). Daily intel: hardcoded text + an unsourced "78%" stat (`daily-intel.ts:24-32`).
5. **The "AI recruiter" is a roleplay, not a recruiter.** LLM score discarded (`recruiter.server.ts:318-320`); `hireChance` is `score`/`100-score` cosplaying as probability (`:367-369`); silently defaults to Systems Limited (`:261-263`); chat framed as a real company's "Head of Talent" (`recruiter.tsx:258`). No connection to any company, ATS, or hiring data.
6. **Zero tests in the canonical repo.** No test script, no test files — for 42k lines including money-adjacent code. The studio repo has vitest + ~1,800 lines of tests that were never ported. The Safepay defect (§5) is exactly the kind of thing a migration-presence test catches.
7. **Split-brain repos.** The best intelligence code (Phase 2–5: evidence/RAG, company research, job providers, ~6,000 lines + 7 migrations + tests) lives in `careerpilot-studio`, which shares no git history with the canonical repo and was never ported. Every week the two diverge further; the canonical repo's company/job data stays hardcoded while the researched-data code rots in the other repo.
8. **Dead and broken UI on the main paths.** The dashboard hero "Start Roadmap" button has no `onClick` (`CareerHero.tsx:121-130`). Recruiter stepper steps 2–5 render blank before an audit (`recruiter.tsx:529,573`). Dashboard sparklines divide by `data.length - 1` = 0 and render `NaN` (`Sparkline.tsx:14`; `data/user.ts:214-243`). Silent failures disguised as empty states: resume errors ignored (`resume.tsx:109-110`), roadmap paths error ignored (`roadmap.tsx:534`), market conflates fetch error with missing role (`market.tsx:140`), profile error shows a wrong "please sign in" (`profile.tsx:243-251`).
9. **Invented numbers presented as personal data, plus "Verified" labels on unverified content.** Market no-role state shows hardcoded "Frontend Developer 82% fit / Data Analyst 74% / Backend 68%" (`market.tsx:183-205`); `localMatchPct` defaults to 45 with `globalMatchPct = local - 15` (`:294-298`); interview "readiness" starts at 42% by formula (`jobmirror.tsx:348`); roadmap "In Progress" shown as 50% (`data/user.ts:243`). "Verified Recruiter Feedback" on AI-generated quotes (`diagnosis.tsx:790`); "Verified learning achievement" + fake credential ID on the certificate (`CompletionCertificate.tsx:72-73`); "Market verified" badge (`FlightPlanHero.tsx:55`).
10. **Dead-end product paths and stale defaults.** Pricing's manual payment gives nowhere to send the screenshot (`pricing.tsx:162-167`); Privacy's deletion route points to a LinkedIn link that doesn't exist on the homepage (`privacy.tsx:44-47`); push notifications are a facade (real `sw.js`, zero backend); interview-prep progress, "Add to roadmap" toasts, and future-tech "Add to blueprint" all promise persistence that never happens (local `useState` only); "Systems Limited" hardcoded as the default company in 5+ places; city hardcoded to Lahore in events/notifications despite `user.city` existing; Privacy/Terms still describe the product as "final-year CS students in Pakistan / backend roles" while the landing says "whatever career you want next."

## 9. Rebuild plan

**Do not rewrite from scratch.** The stack, auth, RLS, AI plumbing, resume engine, roadmap engine, and flight-plan engine are real and good. The rebuild is: (a) fix the money flow, (b) kill every fabrication path, (c) port the studio intelligence work in, (d) rebuild the recruiter as a real feature on real data, (e) fix the dead UI. Estimated shape: 2–3 focused passes, not a rewrite.

### 9.1 What to keep (as is)

- Stack and structure: TanStack Start + React 19 + Supabase + Tailwind/shadcn; the `.server.ts` / `.functions.ts` split; `requireSupabaseAuth` middleware.
- `src/lib/ai.server.ts` — the multi-provider failover client is the right design (rename `groqChat` to `aiChat`; verify the `qwen3.8` / `gemini-3.x` model IDs against provider catalogs, since the failover chain is currently masking possibly-dead defaults).
- Resume engine (`resume.server.ts`), roadmap v2 (`roadmap-v2.server.ts`), flight plan (`flightplan.server.ts` incl. real GitLab inspection), job mirror (`jobmirror.server.ts`), mentor chat (`mentor.server.ts`) — real, honestly-labelled, keep.
- Auth + RLS + migrations (except add the missing billing migration).
- Landing page design system (ink/terracotta editorial) — distinctive, keep; fix the mobile nav and the false "Daily Flight Plan" promise.
- `tavily.server.ts` — real client; extend its use (see §9.4).

### 9.2 What to rewrite from scratch

1. **Company data layer (highest priority).** Delete `matchCompanyTruth`'s fabrication branch entirely (`company-truth.ts:899-1046`). Replace with: researched company profiles with provenance (source URLs + researched date + "not researched yet" state). Port the studio's `src/lib/companies/` (research, cache, normalization, seed) and its `company_intelligence` migration — it already implements the honest contract. Unknown company must show "not researched yet — research it" (a Tavily research job), never invented specifics. The 8 hardcoded profiles become seed data with sources and dates, or are re-researched.
2. **Market research provider.** Delete the dead `GroqResearchProvider`; make the live path real: Tavily-backed job/company research (port studio `src/lib/jobs/` providers + research + `market_intelligence` migration) with the static dataset as a clearly-labelled fallback ("snapshot from 2026-08-31", never "live"). Add a refresh job and a visible staleness badge. Fix the misleading Tavily comment in `src/data/market.ts:86`.
3. **Daily intel.** Delete `daily-intel.ts` as written. Rebuild it as a computed card from real user state (next roadmap day, tracked techs with fresh trend data, market cache age) — or remove the card until it can be real. Never ship an unsourced percentage again.
4. **Billing.** Write the missing migration (`user_subscriptions`, `payments`, `consume_ai_quota` RPC) with RLS denying direct client writes; add `?tracker=` to the Safepay redirect URL (or read the tracker from Safepay's return payload); enforce quotas on all AI features with fail-closed behavior; add `SAFEPAY_*` vars to `.env.example`; give the manual-payment path a real destination (email/WhatsApp); add a test that the migration exists and activation succeeds end to end in sandbox. **Keep Safepay unconfigured until this lands.**
5. **Fallback policy (cross-cutting).** One rule, enforced in code review: *a fallback may degrade, never impersonate.* Every fallback path gets a visible label ("template diagnosis — AI unavailable", "snapshot from {date}", "showing sample events — live refresh failed") and a `source` field persisted on the record. Fix the four worst offenders first: tech-trends fallback stamp, outdated-tech fake-healthy + `slice(0,2)` bug, diagnosis template swap, tech-events stale list (add date filtering + auto live-fetch on mount).
6. **Interview prep persistence.** Persist practiced questions, checklist, MCQ attempts, and answer drafts to Supabase (new migration) or remove the progress UI. Same for "Add to roadmap" (market, future-tech) — wire it to a real mutation or remove the toast promise.
7. **Push notifications.** Either build the real system (VAPID keys, subscription storage, server send path) or delete `sw.js` push handling and the "subscribed" localStorage facade. A fake push toggle is worse than none.

### 9.3 What the "AI recruiter" should concretely do

The current feature is an LLM roleplaying a Head of Talent over invented company data. A real AI recruiter mirrors an actual screening funnel, uses only real inputs, and never presents estimates as probabilities. Concrete spec:

1. **Inputs (all real, all shown to the user):** the user's parsed resume, their projects (with live GitLab/GitHub inspection, already built in flight plan), their skills evidence from Supabase, a target company (researched profile with provenance, §9.2.1 — or "not researched yet"), and a target role + real pasted JD.
2. **Stage 1 — Resume screen (the 6-second scan).** Deterministic checks against the JD: must-have skills present/absent with line references, years/degree/location knockout checks (configurable, shown as pass/fail, never hidden), formatting gates from the existing ATS checks. Output: a checklist, not a score.
3. **Stage 2 — Evidence audit (claimed vs demonstrated).** For each skill the resume claims, find the proof: project, repo link, or nothing. Score = share of claimed skills with linked proof, labelled "evidence coverage", never "hire chance". This reuses the existing deterministic rubric (`recruiter.server.ts:93-247`) — keep it, relabel it.
4. **Stage 3 — Bar comparison.** Compare the evidence profile against the *researched* company bar (hiring stages, non-negotiables, rejection reasons — only from researched profiles). Output: "meets / partial / missing" per bar item, each citing its source. If the company is unresearched, this stage is skipped with an explicit "bar unknown" state.
5. **Stage 4 — Mock interview.** Generate role- and company-specific questions from the JD + researched intel (LLM, grounded in the retrieved context, never freeform), run a timed Q&A, and score answers against a rubric (structure, specificity, evidence cited) with the rubric shown. Persist attempts; show progress over time. This replaces the current persona chat, which should be reframed as "practice with a recruiter-style coach" — never "Head of Talent at {real company}".
6. **Verdict.** No percentages-as-probabilities. Use readiness bands with plain language ("Ready to apply", "One gap to close: {specific}", "Not yet — {top 3 fixes}") plus the single highest-value next action, linked into the roadmap. Every claim in the verdict traces to a stage output.
7. **Honesty rules for the whole feature:** the LLM writes narrative and questions only — never scores, never company facts, never probabilities (the current code already discards the LLM score; keep that invariant and document it). Every company fact carries a source URL and researched date. The stepper disables steps 2–5 until a session exists (fixes the blank-steps bug).

### 9.4 Where "real companies data" can feasibly come from

No LinkedIn scraping (ToS + blocks), no invented data. Feasible sources, in priority order:

| Source | What it gives | Access | Fit |
|---|---|---|---|
| **Greenhouse public job boards API** (`boards-api.greenhouse.io/v1/boards/{token}/jobs`) | Live job postings per company, JSON, no key | Free, official, no auth | Best for global/US tech companies with Greenhouse boards |
| **Lever public postings API** (`api.lever.co/v0/postings/{site}`) | Live postings per company, JSON, no key | Free, official, no auth | Same; many startups |
| **Ashby public posting API** (`api.ashbyhq.com/posting-api/job-board/{board}`) | Live postings per company, JSON, no key | Free, official, no auth | Same; growing startup coverage |
| **Tavily careers-page research** (already wired) | Roles, requirements, hiring pages for any company with a public careers page | Paid API key, already integrated | **Best for Pakistani companies**, which mostly do not use Greenhouse/Lever/Ashby. Port the studio's `companies/research.ts` + `jobs/providers.ts` — deterministic parsing, provenance, "zero results is a failure" contract |
| **Adzuna API** (developer.adzuna.com) | Aggregated listings + salary data, incl. some PK coverage | Free tier with key | Salary bands + demand counts to replace the stale dataset's salary figures |
| **Company careers pages (direct fetch)** | The ground truth for a specific company | Free; respect robots.txt, cache aggressively | Fallback when no ATS board exists; parse with the studio's deterministic normalizer, never an LLM inventing requirements |
| **Small hand-maintained dataset with provenance** | The 8 featured Pakistani companies, re-researched | Manual, quarterly | Acceptable *only* with source URLs + research dates + a visible staleness badge — the current file has none of these |

Architecture: a `companies` table (port the studio's `company_intelligence` migration) with `researched_at`, `sources`, `ats_board` (greenhouse/lever/ashby/none), and a research job that refreshes on demand + nightly for popular companies; a `job_postings` cache (port `job_intelligence` + `market_intelligence` migrations) fed by the ATS APIs + Tavily; the UI always shows "researched {date} · {n} live postings · sources" or "not researched yet". Pakistani-company coverage will always be thinner than global tech — say so in the UI instead of fabricating parity.

### 9.5 Suggested order of work

1. **Week 1 — stop the bleeding:** billing migration + Safepay redirect fix + quota enforcement (fail-closed); delete `matchCompanyTruth` fabrication; delete/replace daily intel; label all four silent fallbacks; fix the dead "Start Roadmap" button, recruiter blank steps, sparkline NaN, and the four silent-failure empty states. Rotate the Supabase publishable key.
2. **Week 2 — port the studio:** `src/lib/evidence/`, `src/lib/companies/`, `src/lib/jobs/`, `company.tsx` route, the 7 intelligence migrations, and the vitest suite into `careerpilot-ai` (manual file port — no shared git history). Wire market research and company profiles to the live providers. Archive `careerpilot-studio` (README note: "merged into careerpilot-ai on {date}; do not develop here").
3. **Week 3 — rebuild the recruiter** per §9.3 on top of the researched company data; persist interview-prep progress; fix the landing promise mismatch (rename routes or rewrite the hero copy — do not leave `/flightplan` meaning Job Mirror); add date filtering + auto-fetch to events; give pricing/privacy real contact paths.
4. **Ongoing:** quarterly dataset refresh with a visible "researched {date}" badge everywhere; keep the no-fabrication rule in code review; add tests for every money-adjacent path.

## 10. Appendix — repo comparison detail

**Files only in careerpilot-ai:** `public/CareerPilot-AI-Hackathon-Documentation.pdf`, `public/careerpilot-certificate-preview.svg`, `public/careerpilot-learning-illustration.png`, `public/sw.js`, `scripts/generate-documentation-pdf.mjs`, `src/components/app/NotificationBell.tsx`, `src/components/market/TechEventsSection.tsx`, `src/components/notifications/NotificationSubscriptionCard.tsx`, `src/components/roadmap/CompletionCertificate.tsx`, `src/data/interview-intel.ts`, `src/data/tech-events.ts`, `src/lib/billing.functions.ts`, `src/lib/billing.server.ts`, `src/lib/daily-intel.ts`, `src/lib/intelligence.server.ts`, `src/lib/push-notifications.ts`, `src/lib/rag.server.ts`, `src/lib/safepay-webhook.server.ts`, `src/lib/safepay.server.ts`, `src/lib/tech-events.functions.ts`, `src/lib/tech-events.server.ts`, `src/routes/_authenticated/events.tsx`, `src/routes/login.tsx`, `src/routes/pricing.tsx`, `src/routes/privacy.tsx`, `src/routes/register.tsx`, `src/routes/terms.tsx`, `vercel.json`, `postbuild.mjs`, `output/`, screenshots, `CareerPilot-AI-Hackathon-Documentation.pdf`, `careerpilot_presentation.html`.

**Files only in careerpilot-studio:** `src/components/flightplan/SavedPostings.tsx`, `src/data/company.ts`, `src/data/job-intel.ts`, `src/lib/ai-quota.server.ts`, `src/lib/cache-keys.ts`, `src/lib/coerce.ts`, `src/lib/companies/{cache,company.server,companies.test,normalization,research,seed}.ts`, `src/lib/company.functions.ts`, `src/lib/evidence/{chunking,chunking.test,embeddings,ingestion,matching,matching.test,retrieval,schemas,skill-aliases,skill-aliases.test}.ts`, `src/lib/job-intel.functions.ts`, `src/lib/jobs/{coverage,intelligence,intelligence.test,jobs.test,providers,requirements,research,urls}.ts`, `src/routes/_authenticated/company.tsx`, `bun.lock`, `vitest.standalone.config.ts`, the 7 intelligence migrations listed in §1.

**Shared files that differ most** (by inspection, not line-diffed exhaustively): `src/lib/market-research.server.ts` (studio has the provider architecture; ai has the dataset-only provider + dead Groq provider), `src/data/market.ts`, `src/lib/recruiter.server.ts` (ai has quota enforcement; studio has company sync fixes), `package.json` (ai: `@sfpy/node-core`, `axios`, `tslib`, newer TanStack pins; studio: vitest, `test`/`typecheck` scripts, `nitro build` in `build`).

**Method note:** this report synthesizes three parallel read-only audits (AI/data layer; Supabase/auth/payments; UI/UX) plus direct verification by the lead auditor of the headline claims (fabrication function, billing-table absence, dead button, sparkline NaN, Safepay redirect, fake fit percentages, dataset date, `.env` in history) and a clean `npm ci` + `npm run build` + `tsc --noEmit` run. Line numbers refer to the audited HEADs (`careerpilot-ai@5808a55`, `careerpilot-studio@93f397a`).
