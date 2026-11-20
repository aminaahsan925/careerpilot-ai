# CareerPilot UI — Round 3 Direction 2 (Cursor as Flashlight / Lens) build report

**Date:** 2026-11-20 · **Pick:** Direction 2, Cursor as Flashlight / Lens (Amina,
20 Nov 20:36 PKT) · **Base:** `b085c75` (docs: R3 exploration + pick), on top of
`4cda30d` (pushed) · **Local only:** nothing pushed, nothing deployed, no `.env`
reads.

Direction 3 (Character-Led / Living World) is DEAD — fully rejected by Amina
20 Nov 20:22 PKT, both versions. This build removes Pilot, the koi pond, the
loop header, the toy-bright palette and Baloo 2 entirely. Verified by grep:
zero matches for `PilotMascot | PilotSays | KoiPond | LoopHeader | Baloo` in
`src/` (one historical comment in `RoadmapHeader.tsx` explaining what it
replaces), zero `d3-*` classes anywhere.

## What was built

### Motion engine — `src/components/lens/` (new, worker 1 + coordinator fixes)

- `Lens` — a cursor-following glass lens that genuinely magnifies live content:
  a live scaled duplicate (default 1.6x) with its transform origin pinned to the
  spring-smoothed cursor, clipped to a circle at the cursor. The rim carries an
  SVG `feTurbulence` + `feDisplacementMap` refraction wobble, backdrop
  blur/saturate, an inset highlight, a chromatic edge (lime one way, ember the
  other) and a specular arc. Radius tracks container width (110-160px).
- `Flashlight` — children render dimmed; a genuinely different `lit` layer is
  revealed only inside a radial light following the cursor, plus a soft halo.
  A "Reveal the hidden detail" toggle shows the lit layer in full (always
  visible on touch / keyboard focus / reduced motion).
- `SpotlightCard` — Kiln-style cursor-tracked border glow (mask-composite ring
  trick) plus a soft radial glow; focus shows the glow at centre.
- `MagneticButton` — magnetic CTA with a real force field (see coordinator fix
  below): leans toward the cursor before being touched, label travels 1.6x the
  button, spring release. Internal `href`s render a TanStack `Link`.
- `KineticText` — scroll-linked headline morph (word-by-word reveal).
- `useCursorSpring` (spring-smoothed cursor, touch pins at last tap) and
  `usePrefersReducedMotion`. `motion` v13 only; no new dependencies.
- Grey-to-colour under the lens: elements marked `.cp-colour-under-lens`
  render monochrome in the base layer and in full colour inside the magnified
  copy (used by the hero data strip). No photography exists in the product, so
  the colour reveal applies to the data strip, not a portrait.

### Landing (workers 1 + 2)

- Hero (`HeroLens.tsx`): near-black ground, giant grotesk capitals "GET HIRED
  ON EVIDENCE", tilted lime slab "LESS GUESSWORK", mono micro-labels, magnetic
  primary CTA, serif kinetic reveal heading, greyscale data strip (5 real
  feature facts, no invented numbers) that gains colour under the lens.
- Below the hero (`BelowHero.tsx`): 4-to-2-to-1 bento grid of the four pillars
  in `SpotlightCard` with subtle tilt, 3-step how-it-works strip, market teaser
  (postings from public Greenhouse/Lever/Ashby boards, unresearched companies
  say so), footer CTA with `MagneticButton`, minimal footer. Honest copy
  throughout: no invented numbers anywhere.
- Type system + tokens (`styles.css`, `__root.tsx`): near-black `#040403`,
  neon lime `#E1F10D` / `#9BF80D`, ember `#FF7A45` (alternate accent only),
  warm stone `#C6C5BF`, paper `#F4F1EA`, panel `#0E0E0C`. Cabinet Grotesk
  (display), Satoshi (body), JetBrains Mono (labels/metrics), Fraunces (serif
  reveal moments). Semantic tokens remapped to the dark ground; legacy
  `--terracotta`/`--clay` now map to ember and `--ink` to ink, so un-restyled
  routes land on dark instead of cream. Direction 3 tokens, utilities and
  Baloo 2 removed. `landing-decor.tsx` rewritten as quiet geometric decor.
  Deleted the unreferenced `career-pilot-cream-visual.png`.

### Resume + Market Mirror (worker 3)

- Resume (`resume.tsx`): full dark restyle + real flashlight reveal over real
  resume-analysis state. Summary, skills, strengths and role matches render
  dimmed; the light reveals the real ATS score (banded verdict, with the
  "deterministic format checks, not a hiring chance" disclaimer) and the top 3
  real gaps from `analysis.weaknesses`, the score under a `Lens`. Honest empty
  state, no fake score. All features preserved (upload, analysis, history).
- Market Mirror (`market.tsx`, `jobmirror.tsx`, `MarketLens.tsx`): the koi pond
  is deleted. Replacement is a talent constellation of up to 10 real stored
  postings (deterministic hash layout, starfield, cursor parallax, travelling
  lime glow; lime = meets the 70% coverage bar, hollow dashed = "not measured
  yet"). Tap/click/focus a node for its real gap analysis via `useJobAnalysis`.
  The skill strip reveals researched high-demand skills with real counts (title
  mentions in stored postings, labelled exactly as such) plus have/missing
  badges from the real profile match. Empty state: "No stored postings yet".

### Recruiter + Roadmap + Dashboard + app shell (worker 4)

- Recruiter (`recruiter.tsx`, `RecruiterHeroCard.tsx`, widgets, stepper): stark
  verdict statement (band label + serif-italic headline, always fully visible);
  below it a `Flashlight` reveals WHY from the real screening funnel, one line
  per stage (resume screen pass/fail counts, evidence coverage, bar comparison
  meets/partial/missing or "Bar unknown", mock-interview question count, biggest
  gap from `topFixes[0]`). Banded verdicts kept, no fake probabilities, no
  invented bars. Mascot moments replaced by a `CoachNote`; scanning overlay is
  a lime beam; chat is "the coach".
- Roadmap (`roadmap.tsx`, `RoadmapHeader.tsx`): loop header deleted, replaced by
  a disciplined dark header (lime top rule, streak as a big lime number under
  `Lens`, 7 week dots, real progress bar, honest zero/loading/error states).
  Empty state is a "How it starts" 3-step panel. Cards in `SpotlightCard`,
  tilt removed. Progress from real user state only.
- Dashboard + shell (`dashboard.tsx`, `diagnosis.tsx`, destinations, `app/*`):
  dark restyle throughout; Pilot removed from the destinations strip and
  `CareerHero` (restyled as disciplined cards/scenes with real data); sidebar
  near-black with lime active states and mono labels; `career-illustration.tsx`
  cartoon figure replaced with an abstract lens-over-resume-score motif (no
  score number shown, no invented data).
- Deleted: `src/components/mascot/` (whole directory), `LoopHeader.tsx`.

### Coordinator fixes (found in rendered proof, fixed and re-proven)

1. **Lens/flashlight double image:** the magnified duplicate and the lit layer
   were transparent, so the base showed through inside the disc/light and the
   two copies doubled up into unreadable text. Fixed with opaque backings:
   `.cp-lens-zoom-wrap` gets `var(--cp-lens-bg, var(--cp-ink))`,
   the flashlight lit layer gets `var(--cp-panel)`.
2. **MagneticButton had no force field:** it only tracked the pointer while
   hovering the button itself, so it never leaned before being touched.
   Rebuilt on window-level pointer tracking with a 110px proximity field and
   falloff; pull fades to zero at the field edge.
3. **Magnetic pull overlapped neighbours:** the original 28px clamp let the
   hero CTA slide over the secondary button. Clamped to 14px; the lean stays
   clearly visible and never overlaps.
4. **FutureTechRadar leftovers:** the only file still carrying dead `d3-*`
   classes (its owner route was out of scope for all workers). Mechanically
   remapped to the new tokens (`d3-flame` to `cp-ember`, `d3-navy` to
   `cp-panel`, `d3-paper` to `cp-paper`, `d3-mustard` to `cp-lime2`,
   `d3-card` to `card-surface`).
5. **Em-dash placeholder:** `RecruiterHeroCard` used "—" for a null score;
   now "n/a". (Remaining em dashes in `src/` are code comments only.)

## Verification (coordinator, on the final tree)

- `npx tsc --noEmit`: **0 errors**
- `npm run build`: **exit 0**
- `npm test`: **150/150 passing, 9 files** (baseline held)
- Greps: zero mascot/koi/loop/Baloo traces in `src/`; zero `d3-*` classes;
  zero em dashes in user-facing copy in the rebuilt areas.
- No commit history rewritten; commits go on top of `b085c75`. Nothing pushed
  or deployed.

## Rendered proof (`~/workspace/careerpilot-r3-proof/`, 14 frames)

Captured with a CDP driver (real mouse moves, taps, scrolls) against the dev
server, across the motion timeline — not just page load. Every frame was read
by the coordinator; defects found were fixed and the same frames re-captured.

- `landing-1280.png` — hero at rest: giant type, lime slab, clean, no overflow.
- `lens-hero-1.png` — lens over the headline: clean magnified letter fragments
  on a solid ink disc, glass ring + highlight. The screenshot moment.
- `lens-hero-2.png` — lens moved to empty space: clean ink disc, ring, no
  artefacts, magnified letter fragment at the rim.
- `magnetic-cta.png` — hero CTA leaning ~14px toward the cursor, no overlap.
- `landing-pillars.png` — bento pillars, honest copy, surfaced cards.
- `preview-1280.png` — all five motion systems at rest (temporary route).
- `lens-preview.png` — lens over "SHIFT YOUR VIEW".
- `flashlight-reveal.png` — lit serif "why" text inside the light, base dimmed
  outside it, readable.
- `spotlight-card.png` — border glow following the cursor; kinetic text
  mid-morph ("LESS" bright, "GUESSWORK." dim).
- `magnetic-preview.png` — preview CTA leaning toward the cursor.
- `landing-390.png` / `landing-390-tap.png` — mobile hero clean; tap pins the
  lens and the magnified body copy reads cleanly inside the disc.
- `preview-390.png` / `preview-390-flashlight.png` — mobile preview; tap pins
  the light and the lit text is readable (dimmed base visible outside the
  light, as designed).

The temporary `/preview-r3` route was deleted after proof; `routeTree.gen.ts`
restored; zero trace verified by grep.

## Caveats and what could not be done as briefed

- **Fonts fall back in proof screenshots:** the headless shell has no internet,
  so Cabinet Grotesk / Satoshi / Fraunces / JetBrains Mono render as their
  system fallbacks in the proof frames. The real fonts load from Fontshare /
  Google Fonts in a real browser. Fallbacks were chosen to stay close
  (system grotesk / Georgia serif / ui-monospace).
- **No monochrome-to-colour portrait:** the screenshot test in the brief
  mentions a monochrome portrait turning to colour under the lens. There is no
  photography in this product and none may be added (no-AI-imagery rule), so
  the colour reveal applies to the hero data strip instead. The lens-over-lime-
  type moment is the screenshot shot.
- **Skill counts are title mentions, not requirement counts:** the market skill
  strip counts skill mentions in stored posting titles (real, exactly labelled
  in the UI). Requirement-level aggregation exists server-side
  (`aggregateStoredJobs`) but has no server-function/hook exposure; a thin
  server function + hook would upgrade this. Suggested follow-up, not done.
- **Out-of-scope routes are dark but not restyled:** flightplan, mentor,
  onboarding, profile, company, events, future-tech, auth, pricing, privacy,
  terms inherit the dark ground via the remapped semantic tokens (terracotta
  now renders as ember), but their layouts were not rebuilt to the Round 3
  system. They render correctly, just not in the full new language.
- **Worker 4's CTAs are styled Buttons, not MagneticButton:** worker 4 checked
  before worker 1's component landed. The hero + footer CTAs are magnetic; the
  recruiter/dashboard CTAs are plain lime buttons. Easy swap if wanted.
- **Mobile flashlight radius:** the light is 140-200px by container width, so
  on a phone it covers most but not all of a wide card; the dimmed base stays
  visible at the card edges. Intended: move the light to read each part.
- **"MOVE YOUR CURSOR TO LOOK CLOSER" on touch:** the hero micro-label still
  says "cursor" on phones; the data-strip tip line below it covers touch
  ("on touch, tap and drag"). Minor copy nit, not fixed.
- **KineticText** was proven mid-morph in the spotlight frame; its full
  scroll cycle (start to end) was not captured frame-by-frame.

---

## Addendum: right-side hero animation (Round 3b, 20 Nov 2026, evening)

Amina approved the Round 3 build ("yes", 21:07 PKT) with ONE change: the
hero's right side needs animation. At rest the right ~40% of the desktop hero
was empty dark space (the lens only appears where the cursor is). This
addendum covers that change only. Local commit on top of `a310fa9`; nothing
pushed.

### What was built

A living composition in a fixed 340x400 box at the hero's right side
(`absolute right-6 top-[140px]`, lg+ only, `z-10`, see the hit-test note
below). Four layers, all inside the existing lens/flashlight engine (no
second engine built):

- **Starfield** (far layer, depth 4): 26 deterministic seeded dots, no images.
- **Orbit ring** (mid layer, depth 8): a dashed orbit path plus a slower
  counter-rotating inner ring, and a 60-second orbit carrying six nodes.
  Each node is one of the student's own detected skills with its real count
  (title mentions in stored postings, exactly like the Market Mirror; the
  alias matching is the shared `aliasesFor` helper). Labels counter-rotate
  so they stay upright. Slots with no skill, or no stored postings, stay
  hollow dashed dots: "not measured yet", never a fake count.
- **Hub** (depth 6): the market total at the ring's centre ("MARKET, LIVE",
  stored-posting count, pulsing dot).
- **Glass chips** (near layer, depth 14): three drifting chips (resume band,
  top gap, stored postings), each drifting on its own period and depth, with
  a soft glow where a node passes behind the frosted glass.
- **The lens** (its own instance, magnify 1.7) magnifies nodes and chips;
  **the flashlight** (`dimChildren={false}`, so the composition stays fully
  visible at rest) lights a detail layer: counts with denominators
  ("12/48"), the ATS score with its "format checks, not a hiring chance"
  disclaimer, the newest-saved date, and the "Counts are title mentions in
  stored postings" source line. Detail lines are laid out in both layers
  (hidden in the base) so base and lit align exactly.
- **Parallax** reuses the MarketLens pattern (pointer state over the whole
  hero section plus a CSS transition, no extra spring): stars 4, ring and
  nodes 8, hub 6, chips 14.
- **Mobile** (`<lg`): the composition is hidden; a compact signals strip
  (LIVE dot + Resume / Top gap / Market chips) sits below the headline and
  below the CTAs, so the CTAs stay above the fold at 390px. No overflow.
- **Reduced motion**: the component branches to a static full-detail scene
  (no Lens, no Flashlight, no orbit). The nodes layer rises above the chips
  there, because a frozen node resting behind a chip would stay unreadable
  forever; the orbit path stays behind the chips. CSS also kills the
  keyframes.

Data (`src/components/landing/hero-orbit-data.ts`, pure helpers plus the
`useHeroOrbitData` hook in `HeroOrbit.tsx`): stored postings via the shared
`getStoredJobsWithCoverage` server function (same TanStack Query key as the
Market Mirror, so the cache is shared), gated on a session so anonymous
visitors never hit the authed function; resume band and top gap via the
existing `useLatestResume` / `useLatestAnalysis` hooks. The hook is called
once in `HeroLens` and the data passed to both the desktop composition and
the mobile strip. Empty states are honest throughout: "Not analysed yet",
"Not measured yet", "None stored yet", hub "—". Loading states ("Reading
your resume…") show while the queries run. The composition keeps orbiting
and drifting in every state, including empty.

Files: `src/components/landing/HeroOrbit.tsx` (new),
`src/components/landing/hero-orbit-data.ts` (new),
`src/components/landing/hero-orbit-data.test.ts` (new, 9 tests),
`src/components/landing/hero-orbit.css` (new),
`src/components/landing/HeroLens.tsx` (wire-in: hero ref, data hook,
`<HeroOrbit>` + `<HeroSignalsStrip>`, plus a `dataOverride` prop used only
by the temporary proof routes, now deleted). Headline, lime slab, CTAs and
headline lens untouched.

### Engine fixes the composition needed (small, safe)

- **Height chain** (`lens.css`, `Flashlight.tsx`): `.cp-lens-base` and the
  Flashlight's inner wrapper had no height, so an `h-full` child collapsed
  inside a fixed-height Lens/Flashlight (first proof run: hub and chips
  piled at the top, ring misplaced). Both now carry `height: 100%`, which
  resolves to `auto` when the parent is auto-height, so the existing
  usages are unaffected. The zoom copy already had `height: 100%`.
- **`hideToggle` prop** (`Flashlight.tsx`): the flashlight inside a Lens
  must not render a toggle (Lens children must be static; the magnified
  copy would duplicate an interactive element). The lit detail stays
  supplementary provenance; touch users still get the light by tapping.
- **Hit test** (`HeroOrbit.tsx`): the composition box carries `z-10`.
  Without it the headline's full-width Lens box receives the pointer over
  the top of the composition, the composition's lens never activates, and
  the headline lens shows a black disc magnifying the empty right end of
  its row. The headline text ends well left of the box, so nothing the
  user reads is ever covered.

### Verification

- `npx tsc --noEmit`: 0 errors. `npm run build`: exit 0.
  `npm test`: 159/159 passing (150 baseline + 9 new
  `topSkillsByMentions` / `bandLabel` tests).
- Rendered proof (CDP driver, real mouse moves, real-time waits):
  `~/workspace/careerpilot-r3b-proof/` (driver `drive.mjs`).
  - `preview-t0.png`, `preview-t8.png`, `preview-t16.png`: the orbit
    advances (nodes in clearly different positions, labels upright),
    chips drifted, no overlap with the headline or eyebrow.
  - `preview-lens.png`: the disc magnifies the hub ("48 / stored
    postings" big and crisp); the light pool around it shows the detail
    layer (counts with denominators, ATS detail line).
  - `preview-flashlight-chip.png`: cursor over the postings chip; the
    disc magnifies the chip and the pool reveals the hub source line.
  - `preview-parallax-left.png`, `preview-parallax-right.png`: layers
    shift at different depths between the two cursor extremes (subtle by
    design, up to 14px for the chips).
  - `preview-1024.png`: narrowest lg, no headline overlap, everything
    readable.
  - `empty-t0.png`, `empty-t8.png`: settled empty state, hollow nodes
    still orbiting, honest copy, zero invented numbers.
  - `empty-lens.png`, `hero-lens-empty.png`: lens + flashlight work on
    the empty state.
  - `hero-t0.png`, `hero-t8.png`, `hero-settled.png`: the live landing
    page (real queries). In the offline proof browser the resume query
    takes ~70s to exhaust its retries, so the loading state lingers in
    `hero-t8`; `hero-settled` (60s later) shows the live path settling
    to the same honest empty state. In a real browser with internet the
    anonymous queries return in well under a second.
  - `preview-reduced.png`: static full-detail branch, all six node
    labels readable (nodes above chips), counts with denominators,
    all detail lines visible.
  - `hero-390.png`, `preview-390.png`: mobile strip, no overflow, CTAs
    above the fold (long gap values truncate with an ellipsis).
  - The proof used two temporary routes (`/preview-r3b` with labelled
    sample data, `/preview-r3b-empty` with the settled empty state).
    Both files are deleted; `routeTree.gen.ts` regenerated with zero
    trace (`grep preview-r3b src/` empty). The live hero never uses
    sample data.

### Caveats

- **Proof fonts are fallbacks** (same as the Round 3 proof): the offline
  browser cannot load Fontshare/Google Fonts.
- **Labels at the disc/pool boundary**: a node label sitting exactly on
  the lens disc's edge is partly covered by the disc's opaque backing
  while its magnified copy falls outside the disc, and a detail count
  straddling the light pool's edge clips mid-number (e.g. "14/4"). Both
  are inherent to the lens/flashlight engine (same on the R3 headline
  lens), momentary as the ring orbits, and the full text is readable at
  rest or with a small cursor move. Not fixed; fixing it would mean
  redesigning the engine's opaque backings.
- **Headline lens over empty space**: outside the composition box, the
  headline lens still magnifies the empty right end of its row (a black
  disc) when the cursor rests there. Pre-existing Round 3 behaviour,
  untouched per the brief; the composition's `z-10` keeps it from
  happening over the composition itself.
- **One extra query per landing load**: the hero now reads the session
  and (when signed in) the stored-jobs cache plus the resume hooks. The
  stored-jobs query shares its key with the Market Mirror, so it is
  cached, not duplicated.

---

## Addendum: Round 3c — every feature (20 Nov 2026, evening)

Amina approved the right-side hero animation ("ok done", 21:42 PKT) and
asked for the same treatment on every feature: "work on every feature
also". The R3 caveat (d) said the out-of-scope routes only inherited the
dark ground via remapped tokens and were NOT rebuilt to the full Round 3
language. This pass rebuilds all of them. Local only; nothing pushed,
nothing deployed, no `.env` reads. Five local commits on top of
`967d0dc` (plus this docs commit).

### Route inventory (22 routes, all covered now)

Already in the full Round 3 language from R3/R3b (8): landing `/`,
resume, market, jobmirror's Market Mirror parts, recruiter, roadmap,
dashboard, diagnosis. Rebuilt in this pass (13): flightplan, mentor,
onboarding, profile, company, events, future-tech, interview prep
(`/jobmirror`, see below), auth, login, register, pricing, privacy,
terms. Notes: login/register are 7-line redirect-only wrappers with no
UI of their own (auth.tsx is the real screen); privacy/terms got a light
restyle only (dark ground, lime rules, grotesk headings, text verbatim);
no settings route or component exists anywhere in the repo (verified by
grep), so there was nothing to rebuild for settings.

### What was rebuilt, per feature

**Flight plan + mentor** (`3b07356`, worker 1). Flight plan: lens (1.6x)
over the giant coverage fraction + flashlight over the evidence rows
behind the number; a second flashlight over the SkillMirror coverage
bars revealing what counts as proof per tier; lens over the Fit Verdict
headline; magnetic "Improve my CV"; travelling flight-path dot; the
stock illustration is removed. Mentor: flashlight over Suggested
Questions revealing the one-line evidence fact behind each suggestion
(from real data, honest "not set yet" fallbacks); magnetic send button
(form gap widened to 16px so the 14px lean never overlaps the input);
magnetic CTAs in Recommended Actions. Both route files slimmed to
containers; presentational bodies split into `FlightPlanView` /
`MentorView` (all hooks/logic kept, presentation only).

**Onboarding + profile** (`2c3c64c`, worker 2 + coordinator fixes).
Onboarding: kinetic step-title reveal (words rise in on every step
change), a real glass lens over the big `01/09` step counter, spotlight
step card, magnetic Continue (plain disabled button with the same look
while disabled/saving). Profile: flashlight over "What CareerPilot
knows" revealing the evidence behind each claim; lens over the name;
spotlight section cards; magnetic Save Changes; lime skill bars and
range sliders. Coordinator fix (see below): the profile lit lines are
centred and label-free.

**Company + events + future-tech** (`c60f150`, worker 3). Company:
flashlight over the company card revealing the researched hiring bar
(top must-have skills with real share-of-postings %, hiring areas,
source + research date); the not-researched state uses the same
flashlight and reveals "Not researched yet" with the honest explanation,
never invented data; lens (1.15x) over the alignment coverage %.
Events: every event card is a SpotlightCard with cursor-tracked border
glow, plus cursor parallax (date badge drifts with the pointer, prize
chip drifts against it). Future-tech: lens (1.4x) over the hero pulse
panel built from real pulse counts, lens (1.3x) over the 2030 radar
banner, flashlight inside each region card revealing the student
opportunity as a serif pull-quote, kinetic headings. The old hero's
fabricated figures ("+94% Demand", "LIVE TECH VELOCITY RADAR",
"Q3 2026") were deleted as invented data.

**Auth + pricing + legal + magnetic CTAs** (`9858320`, worker 4).
Auth: full rebuild, near-black ground, dot grid + slow-drifting lime
glow + a quiet Lens over the static left-panel headline ("BUILD YOUR
FUTURE / ON PURPOSE." with tilted lime slab); the form card is a
SpotlightCard (pointer-events-none, so it can never block typing);
magnetic submit via `requestSubmit()` (same native validation, same
`onSubmit`, Enter still submits natively; while loading, the original
disabled submit button with spinner renders). Pricing: full rebuild,
prices exact (Rs 0 and Rs 499/month, all plan copy and Safepay/checkout
logic untouched); magnetic primary CTAs. Privacy/Terms: light restyle,
text verbatim. Magnetic CTAs (R3 follow-up item e): 7 in recruiter
(Submit answer, Run Recruiter Audit, Add to Roadmap x2, Go to step 1,
Continue to Mock Interview, Continue to Verdict) and 7 in dashboard
(CardEmpty CTA, Try again, Run diagnosis, Explore Tech Events, See the
truth, Add projects now, Upload/Re-analyze Resume), via a shared
`MagneticCTA` helper that renders the original disabled shadcn Button
whenever `disabled` is true (MagneticButton has no disabled prop), so
disabled/pending behaviour is identical by construction. Deliberately
NOT swapped: the icon-only chat-send and mentor-send buttons (14px pull
would overlap the adjacent input at 8px gap) and all outline/text/back
buttons. Hero micro-label is now touch-aware ("Tap and drag to look
closer" on coarse pointers; R3 caveat fixed).

**Interview prep** (`961873d`, worker 5). Found by the coordinator after
the first four workers finished: the `/jobmirror` route renders
`InterviewPrepPage`, and `jobmirror.tsx` had ZERO lens-engine imports —
it was assumed done in R3 but was not (R3's Market Mirror work touched
`market.tsx`, not this page). Rebuilt: the "Under the light" flashlight
over the first unpracticed prompt in the current view, revealing what
it tests, the strong answer shape and the hiring signal, all from the
real question data (lit column deliberately narrow, 230px mobile /
260px desktop, so lines fit inside the pool); lens over the real
practiced count in the hero and over the MCQ score; spotlight cards
throughout; magnetic Mark practiced / Log practice / Try again / Ask AI
Mentor; kinetic question-bank heading. KineticText scoping is
deliberate: headings that mount already in view (hero, MCQ, Answer lab)
stay plain text, because KineticText measures on scroll and a heading
that mounts mid-view renders stuck mid-morph, dim and overlapping the
copy below (proven in frames). The invented readiness number stays
gone; the prep count is the real practiced count.

### Coordinator fixes (found in proof, fixed and re-proven)

1. **Profile flashlight clipped every line (worker 2's build).** The
   lit evidence lines sat after a 118px label column, so at the natural
   centre cursor position the light pool's left edge cut every line
   mid-word ("...rent role in onboarding"); on phones the stacked
   label-above-evidence rows ran taller than the base, so the lit layer
   misaligned with the claims entirely. Fixed in
   `ProfileEvidence.tsx`: the lit lines are now centred, label-free,
   single-line rows at the same pitch as the base (same `space-y-3`,
   `pb-3`, 13.5px, `leading-snug`, so heights match exactly on
   desktop). The label is not needed in the lit layer: on desktop each
   line aligns with its claim row, and the sentences are
   self-explanatory. The now-unused `.cp-profile-evidence` rule
   (line-height 1.5, which would have drifted the rows) is deleted.
   Re-proven with a fresh CDP driver
   (`~/workspace/careerpilot-r3c-proof/coordinator/`, port 3128):
   `profile-fix-flashlight-centre.png` shows all six lines reading
   fully inside the pool; `-top` shows lines 1-4 fully; mobile
   `profile-fix-390-flashlight.png` shows lines 2-6 fully, line 1
   readable by dragging the light up slightly (pool-boundary
   behaviour, same class as the R3 caveats). The temporary
   `/preview-r3c-profile-fix` route is deleted; `routeTree.gen.ts`
   regenerated with zero trace.
2. **Dead sample-data props stripped from live code.** The proof-only
   props (`dataOverride` in HeroLens, `preview` in onboarding and
   profile, plus the `OnboardingPreview` / `ProfilePreview` types and
   their now-unused type imports) are removed from the live components.
   They were inert (no live caller passed them), but a sample-data
   injection path should not ship in a live route. Verified by grep:
   zero traces. Future proof rounds can re-add temp props the same
   way; the R3b `dataOverride` precedent of keeping them is retired.

### Verification (coordinator, on the final tree)

- `npx tsc --noEmit`: **0 errors**
- `npm run build`: **exit 0**
- `npm test`: **159/159 passing, 10 files** (baseline held)
- Greps: zero `preview-r3c` traces in `src/` (all temp routes deleted,
  `routeTree.gen.ts` unmodified vs HEAD); zero `dataOverride` /
  `OnboardingPreview` / `ProfilePreview` traces; zero mascot/koi/loop/
  Baloo traces except the one pre-existing historical comment in
  `RoadmapHeader.tsx`; zero em dashes in user-facing copy in the
  rebuilt routes (the remaining hits are code comments, e.g. onboarding
  `// Step 0 — About You`).
- No commit history rewritten; commits go on top of `967d0dc`.
  Nothing pushed or deployed.

### Rendered proof (`~/workspace/careerpilot-r3c-proof/`, 119 frames)

CDP drivers with real mouse moves, real touch taps and real-time waits,
across the motion timeline — not just page load. Every worker read its
own frames; the coordinator read key frames from every group plus the
profile-fix re-proof.

- `w1-flightplan-mentor/` (33 frames): hero lens over "12", hero +
  skills flashlights, verdict lens + magnetic, mentor flashlight +
  sent state, mobile 390 (tap-pinned lens/light), reduced-motion
  frames, live-route auth redirects.
- `w2-onboarding-profile/` (21 frames): onboarding steps 0/4/8 (rest,
  lens, spotlight, magnetic, chip selection, review), profile rest /
  lens / flashlight / spotlight / editing / magnetic, reduced-motion
  and mobile frames for both. (The profile flashlight frame here shows
  the pre-fix clipping; the fixed frames are in `coordinator/`.)
- `w3-company-events-futuretech/` (22 frames): company rest /
  flashlight / lens / not-researched states, events rest / spotlight /
  parallax, future-tech rest / lens / region flashlight / kinetic,
  reduced-motion and mobile frames.
- `w4-auth-pricing-magnetic/` (18 frames): auth login/register/lens/
  spotlight/reduced/mobile, pricing rest/magnetic/bottom/mobile,
  privacy/terms, recruiter + dashboard magnetic previews (SAMPLE
  labelled), hero touch label on mobile.
- `w5-interview-prep/` (20 frames): rest, hero lens, flashlight at
  centre/top/bottom + toggle-revealed, spotlight card, question open,
  technical tab, MCQ states incl. complete (real 2/8) + score lens,
  Answer Lab, magnetic (lean measured at exactly -14.0px), reduced
  motion, mobile 390 incl. tap-pinned light.
- `coordinator/` (5 frames): profile flashlight fix re-proof (rest,
  centre, top, bottom, mobile) + driver `drive.mjs`.

Defects found in proof and fixed (workers' own): mentor suggestion rows
looked hollow (whys shortened to one-line evidence facts); magnetic
send overlapped the input at full lean (form gap widened to 16px); chat
card grew instead of scrolling internally (missing `min-h-0`); profile
evidence lit layer clipped rows in v1 (rebuilt row-aligned, then the
coordinator's centring fix above); kinetic headings overlapping
paragraphs (32px clearance added); flashlight lit layers clipping
mid-word (lit content narrowed to fit inside the pool: 340px company,
240px region, 260px interview); company lens proof coordinates;
onboarding preview search-param coercion; cold-dev hydration catching
SSR opacity-0 states (drivers poll for settled animations).

### Caveats and what could not be done as briefed

- **Proof fonts are fallbacks** (same as R3/R3b): the offline browser
  cannot load Fontshare/Google Fonts.
- **Pool-boundary clipping is inherent to the engine** (same class as
  the R3/R3b caveats): text straddling the light-pool or lens-disc edge
  clips momentarily while the cursor moves. Where it hit a whole panel
  at rest (profile) it is fixed; where it hits only at the circle's
  narrow top/bottom (interview flashlight blocks at centre cursor,
  auth lens highlight line, mentor suggestion evidence) the full text
  reads with a small cursor move or the toggle. Making all three
  interview blocks fit simultaneously would need a pool ~2x wider,
  which is engine-owned.
- **Lens ring overhang:** on the interview hero count and MCQ score
  lenses, the glass ring is wider than the lens content box, so the
  ring overhangs onto the surrounding panel (magnified content itself
  is correct and crisp). Same engine behaviour as the R3 headline
  lens.
- **SavedPostings is not rendered anywhere on the live flight-plan
  page** — restyled in place and proved via the preview route only;
  wiring it in would add a data query, which is out of scope for a
  presentation pass.
- **Magnetic Save touches Cancel at full lean** on profile (12px gap
  vs the engine's 14px clamp); it never overlaps.
- **KineticText mid-morph** words read dim/shifted in still frames —
  the designed scroll behaviour, not a defect. The kinetic title's
  mid-rise instant is not frozen in any frame (0.35s rise vs ~200ms
  CDP capture latency); the entrance is documented across frames
  instead.
- **Kept deliberately:** three inert `data-proof` attributes in live
  code (`coverage-number` in company.tsx, `event-card-0` in
  TechEventsSection, `region-opportunity-0` in FutureTechRadar) —
  harmless, useful for future proof runs.
- **Driver lessons worth keeping:** single-jump CDP mouse teleports
  proved unreliable for element-level listeners in this shell — use
  stepped pointer paths + a pre-shot active check. `scrollIntoView`
  consistently fails in this headless setup; absolute
  `window.scrollTo` works. `Emulation.setDeviceMetricsOverride
  (mobile:true)` alone does NOT make `(pointer: coarse)` match; enable
  touch emulation for the mobile pass.
- **Interview prep's mock interview** (the recruiter's mock-interview
  step) was already in the Round 3 language from R3; the standalone
  Interview Prep page is the one rebuilt here.

---

## Cursor-feel pass (R3d) — 20 Nov 2026, ~23:00-23:45 PKT

Amina's feedback, 22:51 PKT: "the cursor movement is good but not too
good". Then 22:58 PKT, on the lens: "its looking like a megnifing
glass". The second message changed the lens direction: the lens must
read as LIGHT and GLASS, never as a magnifier. Everything below is
presentation only (no data logic, no migrations, no billing, no new
dependencies).

### What changed

**Lens: soft light disc, no magnification.** The enlarged duplicate
underneath was what made it a magnifier, so it is gone: the disc now
reveals the light layer at scale exactly 1.0 (a 1.05x try ghosted
visibly in proof and was removed), and the `magnify` prop was removed
from all 14 call sites. No ring, no filter, no specular highlight.
Feathered mask (black 70% to transparent), warm backing `#16140a`,
wash 0.16, halo 0.22 at radius*2+200. Radius 26% of container, clamped
130-200px. The disc now reads as a pool of light falling on the page.

**Flashlight: primary cursor effect, brighter and wider.** Radius 30%
of container, clamped 170-280px, feathered mask black 85% to
transparent (raised from 72% after proof showed lit line starts fading
at the pool edge), brighter halo, dim 0.32. The reveal moment now
reads as light falling on hidden detail.

**Magnetic: stronger pull + 3D tilt.** Pull 0.55, field 150px, new
`maxPull` prop (default 14px; raised where space allows: footer CTA
26, MarketLens refresh 22, pricing Start free 20, onboarding /
flightplan error / future-tech 20; tight sites stay 14). Tilt toward
the cursor up to 7 degrees. Label travel lowered 1.0 to 0.6 after
proof showed the label clipping at 26px pull. Fixed a rest-rect bug:
the button's rest rect was captured mid-spring, leaving a 7.46px
path-dependent Y offset; it is now 0.16px.

**Spotlight cards tilt.** Cards lean up to 3 degrees toward the
cursor; glow 320px at 0.22, border glow 280px at 1.0. Tilt gate
changed from `(pointer: fine)` to NOT-`(pointer: coarse)` in
SpotlightCard and the BelowHero TiltCard: the headless shell reports
neither pointer type, so tilt never fired there; identical behaviour
in real browsers.

**Parallax: deeper.** Hero orbit: stars 8, ring/nodes 16, hub 12,
chips 26. MarketLens and TechEvents depths doubled.

**Ambient cursor glow (new).** `CursorGlow` in `src/components/lens/`,
mounted in `__root.tsx`: a soft lime glow, 0.14 alpha, 520px,
transform-only, following the cursor across page backgrounds so the
cursor feels present even over empty dark space.

**Springs, one instrument.** `useCursorSpring`: 420 stiffness /
26 damping / 0.55 mass. MagneticButton spring: 340 / 22 / 0.45.
Fast, smooth, slightly springy, never floaty or jittery.
requestAnimationFrame + transform/opacity only.

**Copy: light language, and honest under reduced motion.** The
user-facing "look closer" / "lens" hints were rewritten to light
language (HeroLens, FlightPlanHero, company, future-tech, CareerHero,
RecruiterHeroCard, OnboardingHeader). The hero eyebrow and strip tip
and the company / future-tech / recruiter hints now branch on
`prefers-reduced-motion` ("Everything visible", "The number is shown
in full") instead of instructing an effect that is off.

### Verification

- `npx tsc --noEmit`: 0 errors.
- `npm run build`: exit 0.
- `npm test`: 159/159 passing (baseline held).
- Rendered proof: 7 driver runs, final set 15 frames in
  `~/workspace/careerpilot-r3d-proof/` (driver `drive.mjs`, probes
  `probe.mjs` / `probe2.mjs` / `probe3.mjs`): hero light disc, light
  strip, orbit left/right, magnetic CTA at full lean (measured
  translate(14, 0.17) rotateY 7 degrees), flashlight pool, ambient
  glow, flight-plan light + flashlight (lit lines now read in full
  inside the pool), spotlight tilt, preview magnetic at full pull
  (measured translate(26, 0.03)), pricing spotlight, auth light,
  reduced motion, mobile 390px tap.
- Reduced motion: all effects off, every reveal fully visible and
  usable, hints honest. Touch: tap and drag lights the disc (390px
  frame).
- Temp proof route `src/routes/preview-r3d.tsx` deleted after the
  runs; `routeTree.gen.ts` regenerated; zero `preview-r3d` traces
  remain in `src/`.

### Caveats

- Proof screenshots show fallback fonts (headless shell has no web
  fonts); the live site renders the real type.
- Orbit flashlight detail fragments at the pool edge in stills; the
  pool is round and the rows are long, so the lowest row's first
  word sits in the feather. Moving the light down reads it in full.
  This is the flashlight's nature, not a defect.
- Parallax is a motion effect and reads subtly in still frames; the
  depths are measured in code (see above), not visible in any one
  frame.
- The hero flashlight's lit serif line is wider than the pool, so a
  centred still shows its middle bright and its ends dim; sweeping
  the light left/right reads the whole line.
- The pricing Pay button rises toward a cursor placed above it and
  closes to ~2px from the bullet above; it never overlaps.
- Run 2 briefly served a stale module (disc invisible in one frame);
  resolved by a dev-server restart and re-proven.
- Driver lesson: a fresh headless page scrolls unreliably in the
  first seconds after navigation (scroll reset to 0 mid-run); the
  full driver works because it scrolls after ~15s of settled
  interaction. Do not re-shoot single frames with a fresh page and
  an immediate scroll.
