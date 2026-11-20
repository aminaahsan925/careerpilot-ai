# CareerPilot AI — Direction 2 (Dark Analytics) Build Report

**Date:** 2026-11-20
**Pick:** Direction 2, Dark Analytics — Amina, 2026-11-20 16:56 PKT
  (`UI-DIRECTION-PICK-2026-11-20.md`). Directions 1 and 3 and the hybrid are
  set aside; this build is Direction 2 throughout.
**Base:** `e024b9b` (migration guide) on top of the rebuild (`f18fc77`).
**Result:** local commits only. **Nothing pushed, nothing deployed, no GitHub
  operations** — per Amina's standing GitHub rule.

## Accent choice

**Vivid violet.** The synthesis offered lime green or vivid violet; violet was
picked because it is the only accent that works with the whole direction: it
matches the aubergine-black ground (#1C0B34), it is the Cyera/Imogen character
colour, and it blends into the magenta/pink gradients reserved for the AI
character moments. Lime would have clashed with those gradients. One hue
family (violet → magenta) is used for everything; lime appears nowhere.

Two violet values, one hue: the deep violet #642BB4 (`--violet-deep`) is for
fills, gradients and glows; a brightened violet (`--primary`,
oklch(0.65 0.18 295), ≈ #8B5CF6) is the interactive accent, because #642BB4 is
too dim for text and chart highlights on near-black. The `--terracotta` /
`--clay` token names still exist for compatibility but now resolve to violet
values (rename debt, noted in `styles.css`); new code uses `primary` /
`violet-deep`.

## What changed

### Foundation (coordinator)
- `src/styles.css`: full dark token flip — near-black ground #040405,
  aubergine-black panels, white numerals, violet accent, dark shadows + violet
  glow shadow. New utilities: `numeral`, `glow-card`,
  `text-gradient-accent`, `serif-accent`. `prefers-reduced-motion` support
  kept (global CSS rule + `MotionConfig`).
- `src/routes/__root.tsx`: Newsreader italic added to the Google Fonts load
  (the serif counterpoint for headlines).
- `src/components/analytics/index.tsx`: shared dependency-free chart kit —
  `KpiStat`, `Ring`, `Donut`, `MiniBars`, `HeatmapGrid`, `GlowCard`. Every
  component renders an honest empty state when given no data.

### Landing + hireability calculator
- `src/routes/index.tsx`: dark hero (violet glow, grotesk headline + italic
  serif gradient second line), KPI strip with real counts only (8 researched
  roles, 5 pipeline stages, 3 gaps + 1 proof task), all section headings in
  the Direction 2 voice, recruiter mockup fixed to the rebuilt output format
  (banded verdict + evidence coverage, no invented "84/100"), market mockup
  now dataset-driven (Donut of the role's real 16 listed expectations,
  "Dataset snapshot 2026-08-31" badge).
- `src/components/landing/HireabilityCalculator.tsx` (new): role select (8
  researched roles) + 3 sliders + must-have skill chips. Maths: skill
  coverage = ticked skills ∩ the role's listed `mustHaveSkills` (dataset
  snapshot 2026-08-31), shown as a count + ring; project bar per role from
  each role's own `portfolioExpectations`; verdict bands (Ready to apply /
  One gap to close / Not yet); months of experience never changes the band
  (stated in the UI). Labelled "Self-assessment, not a prediction" in three
  places. **No salary figures anywhere** — the disclosure says the calculator
  has no salary data source.

### Job-market mirror
- `src/components/market/MarketAnalyticsGrid.tsx` (new, presentational):
  Pulse grid — KPI strip, MiniBars (demand by category, matched bar
  highlighted), Donut (matched vs missing high-demand skills, counts only),
  AI-insight card reusing the report's existing `marketSignals` (no new AI
  call), heatmap card. Provenance line on every view: researched date,
  source count, provider.
- `src/lib/market-heatmap.functions.ts` (new): `getPostingActivityHeatmap`
  fetches the 6 verified ATS boards and buckets real `publishedAt` dates
  Mon–Sun over the last 6 weeks. Undated postings count toward the total but
  never enter a cell; total failure renders the honest empty state. Labelled
  board-wide, not role-filtered.
- `src/routes/_authenticated/market.tsx`: grid wired in above the step flow
  (steps, role change, refresh, add-to-roadmap untouched); full dark re-skin.
- **Honesty fix (coordinator):** the hero's unsourced "70-85% rejected" and
  "PKR 40-80k/mo" are gone (replaced by the real skill-gap count and the
  report's entry-level band or "Not measured"); the hardcoded salary
  fallbacks ("65,000 – 120,000 PKR" etc.) now read "Not measured"; the fully
  hardcoded global USD bands are replaced by an honest "not measured yet"
  card; the "$1,500 – $4,500/month … reject 90%+" sentence is rewritten
  without invented numbers.

### Roadmap gamification
- `src/components/roadmap/GamifiedHeader.tsx` (new, presentational): streak,
  points with breakdown, overall + this-week rings, week-challenge strip with
  the named next day, one ring per learning path. Fresh users see 0s honestly.
- **Points formula** (one place, `roadmap.tsx` comment): 10 per completed day
  + 5 per checkpoint (MCQ) passed, from `useRoadmapProgress()` only.
- **Streak** (`src/lib/roadmap-streak.server.ts` + `.functions.ts` +
  `src/data/roadmap-streak.ts`, all new): computed from passed MCQ attempts —
  the only real completion records with timestamps. Deliberate deviation: the
  pre-existing `getDayStreak` in `daily-work.server.ts` was NOT used, because
  it reads `created_at` of generated day rows (the generation date, not the
  completion date) and returns 0–1 for nearly everyone. Rules: distinct UTC
  dates of passed attempts, consecutive days ending today or yesterday; week
  is Monday-start, UTC. A failed read throws so the UI shows "Streak
  unavailable" instead of a fake 0.
- `src/data/roadmap-v2.ts`: `useSubmitMcq` now invalidates the streak key, so
  the streak refreshes instantly after a passed checkpoint.
- `src/routes/_authenticated/roadmap.tsx`: old hero replaced by the gamified
  header; day rows, quiz flow and certificate logic untouched.

### AI recruiter quest framing
- `src/components/recruiter/QuestMap.tsx` (new, presentational): AI character
  ("CareerPilot Coach · AI screening coach", explicitly not a hiring manager),
  three worlds with status from real session state (Resume: stage-1 screen;
  Skills: stage-2 evidence audit with coverage ring; Job Market: stage-3 bar
  researched vs "bar unknown"), shield showing the verdict BAND only
  ("Untested" before a verdict, never a percentage), missions = exactly
  `verdict.topFixes` tagged with their source stage.
- `src/routes/_authenticated/recruiter.tsx`: QuestMap wired between hero and
  stepper; funnel, stepper gating, rubric, mock interview and verdict logic
  untouched; LLM-never-scores invariant untouched.
- Recruiter components re-skinned; hero pill now reads "AI SCREENING COACH"
  (was "RECRUITER"); dashboard widgets use the shared `Ring`.

### Resume, dashboard, app shell, remaining routes
- `resume.tsx`: score rings via the kit `Ring` (null role-fit renders a dashed
  empty ring, never a fabricated number); evidence health as `KpiStat` cards;
  decision rail as a `GlowCard`. Scoring data, thresholds and copy untouched.
- `dashboard.tsx`: 4 score cards as `KpiStat` (Readiness highlighted);
  sparklines removed deliberately (every trend array is a single data point —
  a flat line that said nothing); invisible-on-dark pills/cards fixed.
- App shell: violet active/hover states in the sidebar, dark mobile drawer,
  CareerHero in the Direction 2 voice, NotificationBell/Sparkline/
  UniversitySearch re-skinned.
- Light-touch dark-legibility fixes (no restructuring): diagnosis, company,
  jobmirror, future-tech, FutureTechRadar, career-illustration. Verified
  clean with no changes needed: flightplan, mentor, profile, onboarding,
  events, pricing, privacy, terms, auth, login/register (redirects),
  CompletionCertificate.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npm run build` | exit 0 |
| `npm test` (vitest) | 150/150, 9 files (baseline held) |
| Visual proof | Landing + all new components screenshotted at 1280px and 390px with a headless browser; proofs in `~/workspace/careerpilot-d2-proof/` |

Visual proof notes: authenticated pages cannot be screenshotted without a
signed-in session, so the new presentational components were rendered through
a temporary `/preview-d2` route with clearly-labelled SAMPLE data, then the
route was deleted and `routeTree.gen.ts` restored (verified: no trace in the
tree). The landing (public) was shot directly. Three defects found in the
screenshots and fixed: truncated MiniBars labels, a cramped QuestMap ring
sublabel, and a missing period in a calculator sentence. One pre-existing
screenshot artifact: the auth form renders with `opacity: 0` in the headless
shell because its framer-motion entrance animation does not advance under
virtual time; the form is untouched by this build and works in real browsers.

## Deliberately NOT done

- No deploy, no GitHub push, no sign-in, no `.env` reads.
- No live posting counts in the landing calculator: the ATS helpers are
  per-company (6 verified boards) while the calculator is per-role, and the
  server-function pattern requires auth, which anonymous landing visitors
  don't have.
- No salary bands anywhere (no salary-data source is connected; Adzuna is
  still unwired, no key).
- No new AI calls (the market insight card reuses existing report text).
- `getDayStreak` in `daily-work.server.ts` left as-is (broken by the
  generation-date `created_at`, superseded by the MCQ-attempt streak); fixing
  it needs a `completed_at` column, a migration, and is out of scope.
- The `careerpilot-learning-illustration.png` (white background baked in)
  keeps its light panel in diagnosis.tsx; recolouring the asset is a separate
  decision.
- No fake probabilities, no fabricated company data, no invented progress:
  every number on screen comes from real user state, real APIs, or the
  labelled dataset snapshot.
