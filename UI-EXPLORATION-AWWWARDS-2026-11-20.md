# CareerPilot UI/UX exploration — Awwwards findings (2026-11-20)

Browser study, no sign-in. Browsed awwwards.com (home, nominees, text searches
for AI product, dashboard, education, career, SaaS, 11sight); opened the live
sites for 7 nominated/winning entries.
Source task: browser-task:dadb0d9c-31d0-5846-a165-816f068530d8 (ran 16:38-16:46 PKT).

## 3 visual directions for CareerPilot

A. **Dark, cinematic AI-agent** (Cyera, Imogen, 11Sight, Dream). Deep
   purple/violet or dark green/black, one glowing accent, a central WebGL
   character or world, scroll-driven camera, and a live calculator as the
   proof. Best for: the AI recruiter as a character, the job-market mirror as
   a world to explore, and a "your hireability" calculator. Risk: heavy, slow,
   hard to make scannable — keep it for the hero and one calculator, not the
   whole dashboard.
B. **Light, proof-led editorial** (CambriLearn). Pale background, deep navy +
   bright blue + one warm yellow, heavy rounded sans, a stats/proof bar,
   colour-coded pathway cards, a 4-step process, and a plain-English
   translator. Best for: the learning roadmap and trust with students and
   parents. Most directly usable for CareerPilot's dashboard; closest to, but
   fresher than, the current ink/terracotta editorial style. Keep the editorial
   warmth; replace terracotta with a brighter blue/yellow system and
   colour-code the four product areas.
C. **Light technical blueprint** (Heron). Off-white paper, hairline grid,
   near-black linework, one orange-red accent (#F15534), condensed all-caps
   headlines plus monospace coordinates/labels, and coded, severity-tagged
   findings. Best for: AI resume analysis itself — each gap shown as a coded
   "violation" (code, severity, status, fix), with a drag-to-reveal
   before/after resume and an Observe → Advise → Act → Learn sequence. The most
   distinctive and most product-true direction for the core resume feature.

## The 6 best sites

### 1. CYERA AI GUARDIAN — SOTD 11 Nov 2026, 7.52/10 (Active Theory)
Live: https://secure-the-unknown.cyera.com/ — Entry: https://www.awwwards.com/sites/cyera-ai-guardian
Note: the live microsite would not run in the study browser ("browser not
supported"), so visuals are from the Awwwards entry + landing copy.
- Layout: a single full-screen WebGL game, not a scrolling page. The user
  pilots a vessel through three AI security planets, completing missions.
- Palette: only two colours, deep aubergine purple #441363 and vivid violet
  #6D2D93, pale lilac panel inside a black frame.
- Data/progress: a 5-day countdown, shield health and a score throughout;
  correct answers earn points, wrong ones cost shield. Progress is a quest, not
  a dashboard.
- Why award-level: turns a dry security product into a playable mission with
  stakes (health, time, score).
- For CareerPilot: the model for a gamified roadmap — three worlds/planets =
  resume, skills, job market; shield = hireability score; missions = fixes.
  Direction A.

### 2. HERON AI — SOTD 12 Oct 2026, 7.7/10 (Bearplus)
Live: https://heronaiapp.com/ — Entry: https://www.awwwards.com/sites/heron-ai
An AI agent that works inside design tools and checks work against building
codes — the closest analogue to CareerPilot's AI recruiter screening a resume
against real job postings.
- Layout: full-bleed, grid-ruled sections on off-white paper. Numbered
  preloader (001–010, "INITIALIZE THE AGENT", "VALIDATE MODEL"), then a huge
  architectural sketch with a "Drag to see violations" hero, then problem,
  solution, how-it-works, use-case sections. Fixed left dock: "Your dashboard"
  and "Ask Heron".
- Palette: off-white paper, near-black #282828 linework and text, one vivid
  orange-red #F15534 used only for the crosshair, violations and key words.
- Type: bold condensed grotesk, all-caps headlines ("DESIGNED TO CATCH WHAT
  HUMANS MISS"), paired with monospace for coordinates and labels (live
  "X:951PX Y:491PX" cursor readout, "SCROLL 71%").
- Data/progress: violations as cards with a code ("IBC 1011.5.2"), severity tag
  (CRITICAL / HIGH), status ("1 Unresolved"); the agent's method is a 4-step
  sequence OBSERVE → ADVISE → ACT → LEARN.
- Motion: scroll-driven storytelling, drag-to-reveal before/after in the hero,
  a red crosshair following the cursor with live coordinates, clickable
  violation cards that expand, chat widget.
- Why award-level: the AI is demonstrated, not described — you drag, you see a
  violation, its code and severity. Restraint (one accent, one grid, monospace
  metadata) makes the product feel precise and trustworthy.
- For CareerPilot: the strongest direct model for resume analysis — show each
  resume gap as a coded, severity-tagged "violation" with a fix. Direction C.

### 3. CAMBRILEARN — Nominee 19 Nov 2026, community votes 9–10
Live: https://cambrilearn.com/ — Entry: https://www.awwwards.com/sites/cambrilearn
Online school, ages 4–19. Voting still open at study time.
- Layout: calm, conventional marketing page done exceptionally well. Deep-navy
  top bar, pale blue-grey hero ("The school built for how your child thinks"),
  white rounded stats card overlapping the hero, dark-navy "Powered by
  CambriOS" section, 6-card curriculum grid, numbers section, graduate
  destinations, 4-step process, student stories carousel, FAQs, and a "School
  reports, in plain English" translator tool.
- Palette: deep navy, bright sky blue (second line of headlines, "Book a call"
  button), pale blue-grey page background, white cards, yellow warm accent.
  The four CambriOS modules each get their own thin top rule: cyan,
  lilac/pink, coral red, yellow.
- Type: heavy rounded geometric sans, tight sentence-case headlines with the
  key word in blue, small-caps eyebrow labels.
- Data/progress: proof is the design system — stats bar (98% university
  acceptance, $25M+ scholarships, 80,000+ students, 20+ years), parent ratings
  4.8–5.0, university logos (Oxford, Cambridge, Harvard, Stanford), and the
  "WHAT THE REPORT SAYS / WHAT IT MEANS" translator.
- Motion: restrained — hover states, horizontal carousel, accordion FAQs. The
  colour-coded cards do the work.
- Why award-level: makes a complex, multi-pathway product instantly legible
  and credible without any WebGL.
- For CareerPilot: the model for the learning roadmap — colour-code each
  pathway stage, lead with a stats/proof bar, add a "resume jargon, in plain
  English" translator. Direction B.

### 4. IMOGEN: AGENTIC AI — Honorable Mention 19 Oct 2026 (Vendredi Society)
Live: https://vsproject-imogen.vendredi-society.com/ — Entry: https://www.awwwards.com/sites/imogen-agentic-ai
Tagline: "Smarter Marketing. Embedded AI."
- Layout: a single scroll-driven WebGL story around one central 3D character —
  a magenta octopus-like creature, Imogen. Frosted-glass pill nav top-centre,
  fixed left pill nav listing sections (Intro, Live Data, Governance, Security,
  Adapt, Capabilities, ROI Calculator), text panels slide in at the right as
  the camera orbits the creature.
- Palette: deep aubergine-black #1C0B34, vivid violet #642BB4, magenta/pink
  gradients, white text, soft binary 0/1 texture background.
- Type: clean grotesk headlines ("Smarter Marketing.") with an italic serif for
  the second line ("Embedded AI") — the serif italic is the human, warm
  counterpoint to the machine.
- Data/progress: the finale is an ROI Calculator — six sliders feeding a
  solid-violet Results card that updates live (at defaults: 18,000 hrs saved/yr,
  45 additional campaigns, $11,812,500 additional revenue, 300% ROI), with
  EUR/USD/GBP switching. Imogen's work summarised as 8 numbered skills: Access,
  Understand, Strategize, Secure, Optimize, Personalize, Activate, Automate.
- Motion: entry gate ("ENTER WITH SOUND / WITHOUT SOUND"), 48–100% loading
  counter, scroll-driven camera movement, section-jump navigation, live
  calculator.
- Why award-level: one memorable character carries the whole AI story, and the
  calculator turns the pitch into the visitor's own numbers.
- For CareerPilot: the model for the job-market mirror and the AI recruiter —
  give the AI a character/presence, and end the landing page with a live "your
  hireability" calculator (sliders for skills, experience, target roles →
  hours saved, match %, salary uplift). Direction A.

### 5. DREAM WITH AI — Nominee 4 Nov 2026 (Hello Monday / DEPT Labs)
Live: https://dream-with-ai.com/ — Entry: https://www.awwwards.com/sites/dream-with-ai
An art experiment, not a product: "Every night I dream up a new world."
- Layout: a single black, full-screen ritual. Centred serif headline, short
  italic invitation, terminal-style data lines, one action: "START WEBCAM" or
  "No webcam? Hold space to close your eyes".
- Palette: black, white and grey only — monochrome, faint architectural 3D
  world behind the text.
- Type: high-contrast italic serif display ("Dream with AI") against monospace
  terminal type ("DREAM №000 — LEARNING TO DREAM", "SEED 0xc30dbea3",
  "> NIGHTS DREAMT 054").
- Data/progress: data as a dream log — numbered dream, seed, timestamp, count
  of nights dreamt. Progress is ritual and accumulation, not a bar chart.
- Why award-level: total commitment to one idea and one interaction.
- For CareerPilot: mood reference for a "dream job" moment — a quiet,
  cinematic, serif-and-monospace ritual — but only as a single moment, not the
  product's main layout, because it carries no dashboard or proof. Direction A
  (mood only).

### 6. 11SIGHT — Honorable Mention 7 Jul 2022 (Lazarev); live site is a later redesign
Live: https://www.11sight.com/ — Entry: https://www.awwwards.com/sites/11sight-video-call-platform
Cautions: the Awwwards "Visit Site" link is dead (1download.io DNS error), and
the live site today is a different, later redesign for "AI Agent for
Automotive" — the 2022 award design and the current site are separate.
- Current live site: dark green/black hero with dotted texture, bright-green
  announcement pill, centred headline "Add our 24/7 AI Agents to your team
  today", two CTAs, scrolling logo strip (BMW, Ford, Honda, Hyundai, Kia,
  Nissan, Mazda, Chrysler), tabbed agent types (Service, Frontdesk, Sales,
  Outbound), "Discover our AI voices", Dealer Value Calculator, testimonials,
  contact form.
- Palette (current): near-black green, dark teal-green, bright green accent,
  white text.
- Data/progress: "They handle 76% of calls, the remaining 24% gets
  transferred"; "1,400+ dealerships since 2001"; value calculator; AI voices
  personified and graded by tone (Callirrhoe — Deep, Soft, Neutral; Laomedeia —
  Bright, Crisp, Cheerful; Aoede — Level, Crisp, Calm).
- Why useful: the most direct SaaS-agent parallel to CareerPilot's AI recruiter
  — an agent that takes the first contact, handles a stated share of the work,
  hands the rest to a human, and proves it with a calculator and named,
  characterful voices. Lesson and warning: copy the pattern (tabs + calculator
  + stated automation %), not the old screenshots. Direction A.

## Also checked, not in the top 6

- **Incentro Careers** (https://careers.incentro.com/, Nominee 17 Feb 2020):
  the 2020 award design has been replaced by a generic Teamtailor template, so
  it is not a useful visual reference now.
- **Nike Career Site Experience** and **GFI: Career Pathways** (both Honorable
  Mention): seen in Awwwards career search results, not opened live in depth;
  GFI's colourful illustrated "Career Pathways" thumbnail is noted as a playful
  pathway reference.

## Recommendation from the evidence

Do not pick one direction for everything. Use C (blueprint) inside the product
for resume analysis and screening, B (light editorial, colour-coded) for the
roadmap and marketing proof, and A (dark cinematic) for a single hero/calculator
moment that makes the AI recruiter feel alive.
