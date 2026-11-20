# CareerPilot UI direction — pick (2026-11-20)

Amina picked **Direction 2, Dark Analytics** (16:56 PKT, 20 Nov 2026), from the
three directions presented on the CareerPilot UI Directions page (artifact
`careerpilot-ui-directions`), synthesised from Dribbble, Figma Community,
Awwwards and Pinterest (28 references).

## The pick: Direction 2 — Dark Analytics / Cinematic AI

Near-black ground, glowing charts, one electric accent, game mechanics. The AI
has a presence, almost a character. Progress feels like a quest with stakes,
not a checklist.

- Palette: near-black #040405 / aubergine-black #1C0B34, one electric accent
  (lime green, or vivid violet #6D2D93 / #642BB4), white numerals, magenta/pink
  gradients for the character moments.
- Type: light, spacious grotesque sans with very large white numbers; grotesk
  headlines with an italic serif second line for the human counterpoint.
- Market mirror: dark analytics grid — KPI strip, bar chart with one
  highlighted bar, donut, weekday/hour heatmap, AI-insight card (Pulse).
- Roadmap: streaks, points, study-flow rings, week challenge, skill % rings
  (Mindzy) — computed from real user state, no invented progress.
- Recruiter: the AI as a character; screening as a quest — three worlds
  (resume, skills, job market), shield = hireability, missions = fixes (Cyera,
  Imogen). Keep the real screening funnel: banded verdicts, no fake
  probabilities.
- Landing: dark hero + a live "your hireability" calculator with sliders
  (skills, experience, target roles → match %, salary uplift) (Imogen, 11Sight).
  The calculator must compute from real user inputs and real researched data;
  nothing invented, "not researched yet" where unknown.
- References: Outcrowd (Dribbble), Mindzy (Dribbble), Promptly dark mode
  (Figma), Lithe + Pulse + Quantro (Pinterest), Cyera + Imogen + 11Sight +
  Dream with AI (Awwwards). Full notes in UI-EXPLORATION-SYNTHESIS-2026-11-20.md
  and the four per-source files.

Build rules: local only (no GitHub push, no deploy, no .env reads — Amina's
standing rule); no invented data anywhere; tsc 0 errors, build exit 0, tests
pass; visual proof (desktop + mobile screenshots of the key screens) before
calling it done. Deploy needs her word + GitHub permission in the moment.

## Outcome: REJECTED

Built + verified 20 Nov ~17:13 PKT (local commit 0b9bad2; proof at
~/workspace/careerpilot-d2-proof/). **Amina REJECTED it 20 Nov 17:17 PKT: "no
its not good". Reason given 17:19 PKT: it looks like AI-generated generic work
("what ai generated gig") and does not grab her attention.** Per the
explore-multiple-designs rule, do NOT tweak Direction 2 — explore a FRESH
direction instead. Fresh exploration started 17:19 PKT: Pinterest + Dribbble
again, brief = designs that stop the scroll, NOT generic SaaS dashboards
(dark-with-glow and light-indigo-cards are exactly what was rejected); real
designer work preferred, note anything AI-generated.

## Round 2 pick: Character-Led / Living World

Round 2 research (16 references) synthesised at
UI-EXPLORATION-R2-SYNTHESIS-2026-11-20.md; directions page rebuilt as round 2
(artifact careerpilot-ui-directions). **Amina picked Fresh Direction 3,
Character-Led / Living World, 20 Nov 17:33 PKT** (tapped the picker; she could
not open the designs page, so screenshots were being prepared when she picked).
Set aside: Fresh Direction 1 Poster Brutalism (loudest, furthest from the
rejected dashboard) and Fresh Direction 2 Editorial Magazine (safest strong
bet), plus the mix both researchers recommended (brutalism landing + mascot
recruiter + magazine jobs/roadmap). The mix is NOT to be built unless she asks.
Build brief: the AI Recruiter gets an ORIGINAL hand-drawn SVG mascot face
(Plopp/Loop pattern; NO AI-generated imagery — a generic generated mascot
repeats the exact rejection), roadmap as a friendly loop/streak with
encouraging copy, resume score as a face that changes expression, Market Mirror
as a living koi pond (original illustration/motion), home screen as a map of
destinations, tilted collage of cards, toy-bright palette (mustard, orange-red,
green, lime, navy, periwinkle, chocolate + cream + sky blue), chunky rounded
bold sans. Revert Direction 2 (commit 0b9bad2) first. Local only, no GitHub
push, no deploy, no .env reads. Honesty rules from the rebuild still apply: no
invented data, no fake probabilities, banded verdicts.

## Outcome: APPROVED

Built + verified 20 Nov ~17:51 PKT (local commit 4cda30d; Direction 2 reverted
via git revert f051bbe; proof at ~/workspace/careerpilot-d3-proof/).
**Amina APPROVED it 20 Nov 17:55 PKT: "YES ITS GOOD".** Next: migrations first
(MIGRATION-GUIDE-2026-11-20.md), then deploy, both on her word + GitHub
permission in the moment. Known polish items from Merlin's review (not yet
done): the koi pond looks empty in the middle (fish cluster at the top), and on
mobile Pilot sits below the fold in the hero.

## Follow-up: too childish — grown-up refinement

20 Nov 20:06 PKT Amina: "its like too for kids". She delegated the fix ("idk
what to change"). Refinement pass (local only, do NOT push without her
permission in the moment): keep Pilot, the koi pond and the loop — keep the
direction, mature the execution. Sleeker Pilot (less blob, more composed, less
googly; smaller hero presence), calmer palette (cream + chocolate base, one
strong accent, drop the toy-bright rainbow), less bubbly display type (a
geometric sans with character, still friendly), less tilt/collage chaos (more
structure, keep a little play). Also fold in the two known polish items: more
life in the pond middle, Pilot visible above the fold on mobile.

## Set aside

- Direction 1, Soft Indigo AI SaaS: set aside — proven and friendly, but the
  most common look in SaaS and Amina chose the bolder dark direction.
- Direction 3, Warm Editorial, Colour-Led: set aside — the most distinctive and
  the closest evolution of the current ink/terracotta style, but Amina chose
  the dark direction; its colour-wayfinding idea may still be borrowed later
  for the roadmap if she asks.
- The hybrid (one direction per screen, recommended by all four researchers):
  set aside — Amina picked a single direction, so the build is Direction 2
  throughout; do not mix in Direction 1 or 3 surfaces unless she asks.

## Round 3: Direction 3 FULLY REJECTED, Flashlight / Lens picked

20 Nov 20:22 PKT (voice call) Amina FULLY REJECTED Direction 3, both the
original and the matured version: "the people who are rejected will use my
kids app who will learn ABC from here". The mascot direction is DEAD — do not
revive Pilot, the koi pond, the loop, or the toy-bright style in any form.
The grown-up refinement stash was dropped; HEAD stays 4cda30d (pushed).

Her bar (20:24 PKT): "screenshot-worthy" — modern, aesthetic, impressive
enough that people screenshot it and stop and say wow; must NOT look generic
and must NOT look AI-generated. Motion-first: things move when the cursor
moves (parallax, tilt, magnetic elements).

Round 3 exploration (UI-EXPLORATION-R3-*-2026-11-20.md, Pinterest + Dribbble,
motion-first, screenshot-bar filtered): 3 fresh directions — Living Orb,
Flashlight / Lens, Scroll as a Journey — plus the researchers' Mix. Note:
her Pinterest @ahsystemsss showed 0 saved pins, so the research is
search-based, not from her saves.

ROUND 3 PICK 20 Nov 20:36 PKT: Direction 2, Cursor as Flashlight / Lens.
Near-black #040403, neon lime #E1F10D / #9BF80D (ember #FF7A45 alternate),
warm stone #C6C5BF. Oversized grotesk capitals; elegant serif for reveal
moments. The cursor is a tool: a glass lens magnifies and refracts what sits
under it, a flashlight lights hidden detail, spotlight borders follow the
cursor across cards, kinetic text morphs on scroll, magnetic primary CTA.
Product fit: reveal is what CareerPilot does — lens over a resume reveals
the AI score and what is missing, over the Market Mirror it reveals
in-demand skills, over a recruiter verdict it reveals why a candidate passed
or failed a real hiring bar. Keep lens/flashlight to hero + key reveals,
body text untouched (readability risk). The lens needs real engineering
(WebGL/canvas + GSAP); a flat CSS imitation fails the screenshot test.

Set aside (round 3): Living Orb, Scroll as a Journey, and the Mix. Do not
build the Mix unless she asks.
