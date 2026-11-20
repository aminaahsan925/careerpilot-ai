# CareerPilot UI — Direction 3 (Character-Led / Living World) build report

**Date:** 2026-11-20
**Pick:** Fresh Direction 3, Character-Led / Living World — Amina picked it 20 Nov
17:33 PKT from the round-2 directions (Pinterest + Dribbble, 16 references).
**Base:** revert of Direction 2 (`f051bbe`) on top of `4bbf96b`.
**Result:** one local commit (see below). **Nothing pushed, nothing deployed, no
GitHub operations, no `.env` reads** — all work is local, per Amina's standing
GitHub rule.

## How it was built

Direction 2 (commit `0b9bad2`) was reverted first with `git revert --no-edit`
(commit `f051bbe`). The revert kept the round-1 exploration docs,
`DIRECTION-2-BUILD-REPORT-2026-11-20.md` and the pick file as history, and kept
the direction-agnostic roadmap-streak plumbing (`src/data/roadmap-streak.ts`,
`src/lib/roadmap-streak.server.ts`, `src/lib/roadmap-streak.functions.ts`) for
the new loop header to reuse. Five workers then built in parallel by
screen/feature (tokens + landing + shell; mascot + recruiter; roadmap loop;
koi pond; dashboard + resume), and the coordinator verified, fixed three
defects found in screenshots, and committed.

## What changed per screen

### Tokens + app shell (`src/styles.css`, `__root.tsx`, AppLayout, AppSidebar, NotificationBell)
- Direction 3 token contract: cream ground `#FFF6E3`, paper `#FFFDF6`,
  chocolate `#3B2314`, ink `#241407`, mustard `#E4B41C`, orange-red `#D83B0F`,
  green `#528F38`, lime `#A7D13D`, navy `#1F2A5A`, periwinkle `#AAB8F5`, sky
  `#7FB8E8`, pond teal `#0E7C7B`, koi orange `#F58220`, koi gold `#F2B705`.
  All 14 `--d3-*` variables registered in `@theme inline`, so `bg-d3-cream`
  etc. work as Tailwind utilities.
- Utilities: `.d3-card` (2rem radius, chunky shadow, paper surface),
  `.d3-tilt-l` / `.d3-tilt-r` (plus/minus 1.5deg, straighten on hover/focus),
  `.d3-chip` (rounded-full bold pill; colour comes from the call site),
  `.d3-display` (Baloo 2, 600-800, loaded via a Google Fonts link mirroring the
  existing Plus Jakarta Sans pattern). Body text stays Plus Jakarta Sans.
- Semantic tokens remapped onto the palette (background cream, primary
  chocolate, accent mustard, sidebar cream with mustard active state); legacy
  `--ink`/`--terracotta`/`--clay` remapped to flame/koi so not-yet-reskinned
  screens land in the new palette automatically. `prefers-reduced-motion`
  global rule untouched.
- Shell: cream sidebar, chocolate text, mustard chunky active states, flame
  accents, display-font wordmark. Navigation and behaviour identical.

### Landing (`src/routes/index.tsx`, `src/components/landing/landing-decor.tsx`)
- Full rewrite in Direction 3: cream ground, paper hero panel with
  mustard/lime/periwinkle colour blocks, chunky Baloo 2 "Build Your Future"
  headline with a squiggle underline, Pilot greeting visitors in a mustard
  circle with the speech bubble "Hi, I'm Pilot! Ready for your first
  interview?", a teal koi-pond strip, and a tilted collage of the four feature
  cards (Resume, Roadmap, Market Mirror, AI Recruiter) as solid toy-bright
  colour blocks. Workflow stages, spotlights, platform suite, before/after
  and final CTA (navy block, cheering Pilot, mustard CTA) all re-skinned.
- Hero copy reworded to drop the old "job-readiness score" claim (now: top 3
  gaps + the 1 proof task to build first, matching the rebuilt recruiter
  verdict). No HireabilityCalculator (removed with Direction 2, not rebuilt).
  All links, anchors, mobile nav, recovery redirect and no-JS-visible content
  preserved. The old `hero-person.png` import was removed from the landing
  (the asset is still used by `src/data/user.ts`, so the file stays).
- Decoration is hand-written inline SVG only (Squiggle, StarBurst,
  DoodleCircle, KoiFish, KoiStrip).

### The Pilot mascot (`src/components/mascot/PilotMascot.tsx`, `index.ts`)
- **Originality note:** the mascot is 100% original, hand-written inline SVG
  (200x200 viewBox), drawn in code by the builder. No image files, no
  AI-generated imagery, no copied art. Design: a lime-green blob with a
  deliberately lopsided, wobbly outline and faint darker speckles so it reads
  hand-inked; two enormous googly eyes, intentionally slightly uneven in size
  and height, with pupils that drift subtly toward the cursor (rAF-throttled,
  disabled under `prefers-reduced-motion`); a navy pilot cap tilted -10deg
  with a mustard sparkle badge; rosy cheeks; feet nubs; little side-nub arms
  in calm moods and stubby raised arms only when cheering; sleeping shows
  closed-eye curves, a soft "o" mouth and a floating "z".
- API: `PilotMascot({ mood, size, className })`, moods `happy | thinking |
  cheering | encouraging | neutral | sleeping` (eyes + mouth change per
  mood). Also `PilotSays` (mascot + speech bubble; `showMascot` prop defaults
  true). JSDoc documents the score-band mapping (no score = thinking, strong
  = cheering, middling = happy, needs work = encouraging).

### AI Recruiter (`recruiter.tsx`, RecruiterHeroCard, RecruiterPipelineStepper, RecruiterDashboardWidgets)
- The mascot is the recruiter's face: it reacts to the verdict band (cheering
  for "Ready to apply", encouraging for "One gap to close", thinking for "Not
  yet"), asks "Ready for your first interview?" at the mock-interview step,
  pops matches ("Pilot found a match"), thinks in the scanning overlay,
  sleeps on the "Run an audit first" empty state, and is the coach-chat avatar
  ("Pilot is typing...", "Ask Pilot...").
- The hero card drops the old stock photo: Pilot breaks out of the top of a
  tilted frame card with a target-role pill and a floating evidence-score
  chip. Badge reframed to "CareerPilot Coach, AI screening coach". The
  funnel logic is untouched (checklist, evidence audit, bar comparison, mock
  interview, banded verdicts); no percentages-as-probabilities; honest empty
  states kept. Pilot is never called a hiring manager or Head of Talent.
- Widgets: tilted cards, leaf ring, mustard dots, plus honest explainer lines
  clarifying the dots show presence in evidence, not a rating out of five.

### Roadmap (`roadmap.tsx`, `LoopHeader.tsx`, `CompletionCertificate.tsx`, `roadmap-v2.ts`)
- The header is now a friendly loop (Loop pattern): a chocolate poster-board
  panel with a faint dot texture, a hand-drawn smiling infinity-loop SVG
  (`LoopMotif`), the real streak count in gold display type, and copy that
  warms with the streak ("It's never too late to start a new thing!" at 0,
  "Look at this loop go" at 3-6, "A full week around the loop!" at 7+). A
  7-dot week strip shows `completedThisWeek` as a labelled count. Pilot's
  mood follows the streak (encouraging 0-1, happy 2-6, cheering 7+).
- Streak data is `useRoadmapStreak()` only (passed MCQ attempts, the only
  real completion records); `getDayStreak` untouched. A failed read shows
  "Streak unavailable right now", never a fake zero. The `useSubmitMcq`
  invalidation of `ROADMAP_STREAK_QUERY_KEY` was re-added. No points system
  (none existed in the reverted code, none invented).
- Path cards are a tilted collage (alternating tilt, straight day rows inside
  for readability); toy-bright level chips, mustard progress bars, navy Next
  Action card. Empty state uses the loop motif + Pilot on a chocolate panel
  (old stock PNG dropped). Certificate re-skinned; unlocked certificate is a
  chocolate panel with a gold seal. All roadmap logic preserved.

### Market Mirror (`market.tsx`, `KoiPond.tsx`, `FutureTechRadar.tsx`)
- The hero is a living koi pond: teal water panel with hand-drawn inline SVG
  lily pads, pebbles and light blobs, and a mustard "Your shore" bank. Each
  koi is one real posting (original hand-written SVG fish in koi orange,
  gold, white and pale teal; gold koi = matched, clustered toward the shore;
  others roam on slow deterministic drift paths seeded from the posting id).
  Max 10 koi, newest first, with an honest "(showing 10)" note when there are
  more. Tap/click a koi for a detail card (title, company, location, coverage
  chip, "Saved {date}, via {source}", "Open posting" link when a URL exists,
  "Open Job Mirror"). Coverage null renders "Coverage not measured yet".
- "Drop your resume in" fires an expanding ripple ring, then navigates to
  `/resume` after 650ms (no resume flow exists on this page). Tapping the
  water also ripples. Koi dart gently away from the cursor (rAF-throttled,
  max ~16px); `prefers-reduced-motion` disables the dart and the global rule
  freezes the swim, so koi sit still. Honest empty state: still water, "No
  live postings yet", plus Refresh Data and a Job Mirror link. No fake fish.
- **Data source:** the reverted `market.tsx` had no live-postings feed, so the
  pond is fed by the existing `useStoredJobsWithCoverage()` hook (stored real
  postings persisted by `refreshJobMarket` from Tavily search + ATS boards,
  newest first) with deterministic per-posting coverage. "Matched" =
  `coveragePct >= 70`, the same bar the Flight Plan's SavedPostings badges
  use. Refresh now also invalidates the stored-jobs query so the pond refills
  after a fresh research pass.
- The old 227-line dark hero (and its `/market-reality-hero.png`
  illustration, now deleted as unreferenced) is replaced by the pond; the
  scope switcher and the same four stats survive as tilted `d3-card`s. Step
  1-6 content bodies are untouched (they re-skin automatically via the
  remapped tokens). FutureTechRadar re-skinned in place (it is used by
  `future-tech.tsx`, not `market.tsx`).
- **Honesty fixes by the coordinator:** the revert had restored the unsourced
  "70-85% rejected" and "PKR 40-80k/mo" hero stats that Direction 2 removed;
  both now read "Not measured yet". The "—" null placeholder in the match
  gauge is now "?", and the page title meta lost its em dash.

### Dashboard + resume (`dashboard.tsx`, `resume.tsx`, `CareerHero.tsx`, `Sparkline.tsx`, `src/components/destinations/`)
- Dashboard: tilted collage on a cream poster board (tilt on wrapper divs so
  motion transforms never fight it), personality framing ("Your personality
  is the hireable part", skills card retitled "What makes you, you"). Photos
  replaced with hand-written inline SVG scenes. The decorative `MoreVertical`
  icon (no menu behind it) was dropped; 10.5px quick-action labels raised to
  12px.
- Destinations strip (Santorini pattern): target role as "home base" + up to
  3 applied-company cards, each with an original SVG scene (skyline/campus/
  harbour/hills, picked deterministically from the name) and a round weather
  bubble. Weather rule stated in the UI: Busy = 5+ new postings in the last
  7 days, Steady = 1-4, Quiet = 0, each card labelled "based on N new
  postings in the last 7 days". Destinations come only from the dashboard's
  own data (`user.goal`/`overview.targetRole` + `targetIndustry`,
  `user.applications`). Weather comes from live ATS postings via
  `useCompanyDashboard`, but only for companies with a verified ATS board
  (checked client-side via `resolveAtsBoard`); all others show "Not measured:
  no live job board to measure" with no fetch, because `getCompanyDashboard`
  triggers a Tavily research run on cache miss. No role and no applications
  gives an honest empty state ("Add a target role to see where hiring is
  warm", CTA to onboarding).
- Resume: a `ScoreFace` band above the rings maps the real deterministic ATS
  score to a Pilot mood (null = thinking, >=80 = cheering, 65-79 = happy,
  <65 = encouraging), labelled "ATS checklist score. Deterministic format
  checks, not a hiring chance." Empty state shows the thinking face. Rings
  re-skinned to leaf/flame/mustard. "What changes your odds next" is now
  "What to fix next" (odds implies probability). All upload/analysis/
  checklist logic untouched.
- CareerHero rewritten as a bright hand-drawn SVG scene (sun, hills, winding
  path, paper plane); the `personImage` prop was dropped (only the dashboard
  used it). Sparkline default colour is now flame; logic untouched.

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npm run build` | exit 0 |
| `npm test` (vitest) | 150/150, 9 files (baseline held) |
| Visual proof | Landing + all new components screenshotted at 1280px and 390px with a headless browser; proofs in `~/workspace/careerpilot-d3-proof/` |
| Em-dash grep across all D3-touched files | Clean (user-facing copy; pre-existing em dashes in code comments and untouched files remain) |
| Preview route | Temporary `/preview-d3` route deleted after screenshots; `routeTree.gen.ts` restored; zero trace in the tree (grep verified) |

Proof screenshots (`~/workspace/careerpilot-d3-proof/`):
- `landing-1280.png` — landing hero, desktop
- `landing-390.png` — landing hero, mobile
- `preview-1280.png` — mascot moods, loop header, koi pond, destinations strip, recruiter hero card (SAMPLE data), desktop
- `preview-390.png` — same, mobile

Defects found in the screenshots and fixed by the coordinator:
1. Landing hero StarBurst doodle overlapped the "For university students..."
   pill on desktop and the "B" of "Build" on mobile. Moved to the empty space
   between the text column and the mascot (`left-[50%] top-[8%]`, desktop
   only).
2. Recruiter hero "Target:" pill truncated the role mid-word
   (`targetRole.slice(0, 18)` rendered "Junior Frontend De"). The slice is
   removed; the pill now shows the full role and wraps within a max-width.
3. Recruiter hero bottom bar wrapped awkwardly on mobile ("PILOT · COACH"
   split across lines). The label is now `shrink-0` and the company name
   truncates with an ellipsis.

Screenshot caveats: the headless shell has no internet access, so Baloo 2 and
Plus Jakarta Sans fall back to system fonts in the proofs (layout and colours
are unaffected). Framer-motion entrance animations freeze near their start
state under virtual time in some shots (the Target pill and evidence chip are
invisible in a few frames); both were verified visible with full text in the
final proof shots and confirmed present in the rendered DOM.

## Deviations and caveats

- **Koi data source:** the brief assumed live ATS postings were already wired
  into `market.tsx`; they were not. The pond uses stored postings from
  `useStoredJobsWithCoverage()` instead (see above). Stored postings only
  exist after a market-research pass has run, so most users will see the
  honest empty state until they hit Refresh; there is no standalone "research
  jobs" button anywhere in the product.
- **Destinations weather is board-gated:** only companies with a verified ATS
  board get a live weather fetch; everything else is honestly "Not measured".
  The target-role card counts role-title-matching postings across the applied
  companies' boards only.
- **Koi pond is the market hero, not a full replacement:** the step 1-6 market
  content bodies are unchanged apart from automatic token re-skinning.
- **No HireabilityCalculator:** it was a Direction 2 feature and was not
  rebuilt for Direction 3; the landing carries no calculator.
- **Roadmap streak plumbing kept from Direction 2:** the MCQ-attempt streak
  (`useRoadmapStreak`) survived the revert and powers the loop header;
  `getDayStreak` remains broken and unused, as before.
- **`public/market-reality-hero.png` (915 KB) deleted** as unreferenced after
  the pond replaced the old hero. `hero-person.png` stays (used by
  `src/data/user.ts`).
- **Pre-existing em dashes outside this build's files** (flightplan
  components, `UniversitySearch`, `TechEventsSection`, `company-truth.ts`,
  `market-truth/builders.ts`) were left untouched.
- **Fonts in proof screenshots fall back** (see screenshot caveats above);
  verify Baloo 2 in a real browser when showing Amina.
- The white-background learning illustration keeps its light panel in
  `diagnosis.tsx` (unchanged from Direction 2).
- No fake probabilities, no fabricated company data, no invented progress:
  every number on screen comes from real user state, real APIs, or labelled
  sample data in the (now deleted) preview route.
