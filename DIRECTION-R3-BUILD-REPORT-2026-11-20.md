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
