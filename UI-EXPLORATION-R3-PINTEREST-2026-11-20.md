# CareerPilot — UI Exploration R3: Pinterest Motion-First Research
**Date:** 2026-11-20 · **Researcher:** Muse (browser) · **Account:** @ahsystemsss (Amina)
**Product:** CareerPilot — AI resume analysis, learning roadmap, job-market mirror, AI recruiter screening against real hiring bars. Audience: university students. Target feel: modern, grown-up, serious AI product (Linear / Vercel / Arc / Raycast / Perplexity), never childish, no mascot, no kids-app, no generic SaaS dashboard screenshot.

## 1. What her saved pins say about her taste
**Finding: there was nothing to read.** The profile `pinterest.com/ahsystemsss/_saved/` (checked 20:23 PKT, 20 Nov 2026, signed in as @ahsystemsss, "amina systems") shows **0 saved pins, 0 boards, 0 followers, 0 following** — the "Your saved ideas" page reads "Save what inspires you" and is empty. So there is no direct taste signal from saves; the brief's premise that she had just saved reference pins is not reflected in the account. All findings below are therefore search-based, and the quality bar was applied strictly instead: every pick below had to be screenshot-worthy — modern, aesthetic, impressive enough that someone would screenshot it and say "wow, this is so good" — and not generic, not AI-generated-looking. Four opened pins were dropped for failing that bar (see §4).

## 2. The 8 best pins (all pass the screenshot test)
Palette hex codes are read from the pin images (approximate where the pin gives no swatches). "AI modified" flags are noted; none of the 8 carries the label.

### 1. Image Trail — GSAP cursor-trail component
- **Link:** https://www.pinterest.com/pin/1142929211707228779/ · **By:** Annnimate — GSAP motion components
- **What it shows:** A light-grey hero with huge black grotesk type "Move fast. Leave a mark." surrounded by a scattered trail of small tilted photo cards.
- **Palette:** light grey `#E8E8E8`, black `#111111`, white.
- **Type:** heavy black grotesk, tight leading, sentence-case statement headline.
- **Motion — cursor:** images spawn and trail behind the cursor as the mouse moves; each trailing image fades and shrinks as it ages and old trail elements are auto-cleaned up (GSAP). **Scroll:** none shown. **Hover:** the trail itself is the hover/mouse interaction.
- **Why it passes the screenshot test:** the trail of tilted photo cards orbiting a blunt one-line manifesto is a single unrepeatable image — you could never mistake it for a stock landing page.
- **CareerPilot use:** hero trail of the four product moments (resume, roadmap, market, recruiter) following the cursor; the trail literally says "leave a mark".

### 2. Insanely smooth 3D scroll animation — Alethia
- **Link:** https://www.pinterest.com/pin/1107181889671199339/ · **By:** Details.so · **Site:** Alethia
- **What it shows:** A real product site on a deep green-black field: giant white headline "Where Ecosystem Science and Enterprise Strategy Meet" with photoreal moss-covered rocks floating in 3D space.
- **Palette:** deep forest green/black `#0C1F16`, moss green `#6A8F5A`, stone `#B9A98A`, white.
- **Type:** bold white grotesk, large, left-aligned, with small caps microcopy.
- **Motion — cursor:** the 3D rocks drift/parallax subtly with the pointer. **Scroll:** the signature — scrolling flies the camera through the rocks, which rotate, scale and separate smoothly in both directions (the pin stresses it stays smooth scrolling back up). **Hover:** gentle lift on the floating objects.
- **Why it passes the screenshot test:** a photoreal mossy boulder floating in dark green nothingness next to a two-line manifesto is cinematic, not a template.
- **CareerPilot use:** the scroll-driven camera flight is the model for the "job market mirror" — fly from a globe of live jobs down to one student's roadmap.

### 3. 3D Animations and Interactions — Noomo Labs
- **Link:** https://www.pinterest.com/pin/914019686865063560/ · **By:** Noomo agency
- **What it shows:** The Noomo Labs site: a translucent purple 3D jellyfish drifting through the letters of a gigantic black condensed wordmark "NOOMO LABS" on a pale lavender-grey field.
- **Palette:** lavender-grey `#D8D5E0`, black `#0A0A0A`, jellyfish violet `#B06FC8`, pale pink.
- **Type:** ultra-bold condensed display caps, stretched edge-to-edge; tiny mono microcopy at the foot.
- **Motion — cursor:** the jellyfish follows/parallaxes with the pointer and drifts through the type. **Scroll:** the jellyfish's path is scroll-choreographed (the pin's description discusses tuning its movement while scrolling, including scrolling back). **Hover:** the creature reacts to the pointer's position.
- **Why it passes the screenshot test:** a glowing jellyfish swimming through a wordmark the width of the screen is the kind of frame people screenshot mid-scroll.
- **CareerPilot use:** one signature 3D object (a compass, a resume card, a hiring-bar gauge) drifting through giant type "GET HIRED." — proof that a serious product can have one surreal, beautiful object.

### 4. Magnetic button: a hover effect that pulls toward your cursor
- **Link:** https://www.pinterest.com/pin/1112881757954938895/ · **By:** Sundry Mill
- **What it shows:** A minimal demo on warm cream: the headline "A button that pulls you in", a dotted circle marking the button's magnetic field, and a black pill "Get started" button inside it.
- **Palette:** warm cream/beige `#EDE6DA`, black `#111111`, orange-red accent `#FF4D00`.
- **Type:** large black grotesk headline, small mono labels ("Magnetic field", "Magnetic button").
- **Motion — cursor:** the button has an invisible force field — it leans/pulls toward the cursor before being touched, and its label travels further than the button itself; it releases with spring physics. Works with mouse or touch. **Scroll:** none. **Hover:** the pull, the label offset and the spring return are the whole interaction.
- **Why it passes the screenshot test:** the dotted circle that makes an invisible force visible turns a button into a physics demo you can feel in a still image.
- **CareerPilot use:** the primary CTA ("Analyse my resume", "Start your roadmap") should be magnetic; the dotted field can be reused as a diagram for the AI recruiter's "attraction" to a strong profile.

### 5. Perfect Scroll Animation Lighting effect — RedSun (Over Sight Webflow)
- **Link:** https://www.pinterest.com/pin/926052742129752155/ · **By:** Over Sight Webflow · 574 saves
- **What it shows:** A dark AI-product page, "Intelligent Solutions Powered by AI.", with a glowing orange horizon arc rising behind a dashboard preview.
- **Palette:** near-black `#0A0A0A`, orange horizon `#FF6B1A` / `#FF8A3D`, white, muted grey text.
- **Type:** clean white grotesk headline centred over the arc; small pill "Book a Demo" CTA in orange.
- **Motion — cursor:** subtle glow follows the pointer over the dark field. **Scroll:** the signature — scrolling brightens and lifts the orange horizon arc like a sunrise while the dashboard preview scales into view. **Hover:** buttons lift and glow.
- **Why it passes the screenshot test:** a single burning-orange horizon line rising out of total black is the most memorable frame in the whole set — a sunrise you control with the scroll wheel.
- **CareerPilot use:** the four features as a sunrise sequence — scroll and the "horizon" of the job market lights up, then the resume score, roadmap and recruiter verdict emerge from it.

### 6. Scroll experience from Pyramids of Meroë — Kushite Kingdom (Pexelflow)
- **Link:** https://www.pinterest.com/pin/1067493917902220938/ · **By:** Pexelflow
- **What it shows:** A cinematic scroll film: Earth from space, the camera diving through the atmosphere to the pyramids of Meroë in the Sudanese desert, with the title "KUSHITE KINGDOM".
- **Palette:** black space `#000000`, Earth blue `#2E5E8C`, desert sand `#C8A06A`, white type.
- **Type:** wide-tracked white caps for the title; minimal captions.
- **Motion — cursor:** minimal; the camera is scroll-driven. **Scroll:** the whole piece — a continuous, smooth camera zoom from orbit to ground, terrain and pyramids resolving as you scroll. **Hover:** none; this is pure scroll cinema.
- **Why it passes the screenshot test:** the opening frame — Earth alone in black space — is a poster; the scroll turns it into a descent you feel.
- **CareerPilot use:** the "job market mirror" as an orbital zoom: world → country → city → your university → your profile, all in one scroll.

### 7. Step Into The Playscape — Stunning Hero Sections for Creative Websites
- **Link:** https://www.pinterest.com/pin/1126955506795265511/
- **What it shows:** A cinematic hero: an italic serif headline "Step Into The Playscape" above a curved panoramic strip of glowing neon 3D portrait panels on black, with a nav of small pill buttons.
- **Palette:** black `#050505`, neon pink `#FF4D8D`, electric blue `#4D7CFF`, acid green `#B8FF5C`, white.
- **Type:** large italic serif headline mixed with small clean grotesk UI labels.
- **Motion — cursor:** the curved panorama shifts/parallaxes with the pointer; panels tilt toward the cursor. **Scroll:** the panorama is a 3D hero — panels recede and advance as you scroll. **Hover:** panels lift and brighten on hover.
- **Why it passes the screenshot test:** a curved wall of glowing faces under an italic-serif headline looks like a film still, not a website template.
- **CareerPilot use:** the hero as a curved panorama of four live "hiring bars" (resume, roadmap, market, recruiter) that shift with the mouse — the product's four features as a place you step into.

### 8. Interactive 3D Globe in Framer
- **Link:** https://www.pinterest.com/pin/4604508526123998784/ · **Source:** framer.university
- **What it shows:** A pure-black field with a dotted wireframe globe and the words "Interactive 3D Globe" in bold white, a grab-hand cursor over the sphere.
- **Palette:** black `#000000`, white `#FFFFFF`, grey dots `#9A9A9A`.
- **Type:** bold white grotesk, centred, minimal.
- **Motion — cursor:** drag the globe to spin it; it has inertia and eases to a stop. **Scroll:** none. **Hover:** the cursor becomes a grab hand over the sphere; the globe keeps a slow ambient rotation when idle.
- **Why it passes the screenshot test:** a dotted globe on pure black with a grab hand is an icon, not a screenshot — instantly readable, instantly interactive, and it is exactly the job-market mirror.
- **CareerPilot use:** the job-market mirror itself — a spinnable dotted globe where live roles cluster as glowing points; dragging it is the first thing a student does.

## 3. Three design directions distilled from the 8
### Direction A — "The Living Hero" (cursor-first)
- **Sources:** Pins 1, 4, 8 (Image Trail · Magnetic button · 3D Globe).
- **Palette:** near-black `#0B0B0C` hero with warm off-white `#F4F1EA` sections; one electric accent — orange `#FF4D00`.
- **Type:** huge grotesk (Inter / Neue Haas style), tight tracking, one blunt statement headline; small mono labels for the four features.
- **Motion pattern to copy:** everything in the hero reacts to the cursor before any click — a trail of the four product cards follows the mouse and fades as it ages; the primary CTA is magnetic (leans toward the cursor, label travels further, spring release); the job-market globe drags with inertia. Scroll is secondary; the hero is the demo.
- **Best for:** the landing hero and the "try it" moment — the student feels the product is alive in the first 3 seconds.

### Direction B — "Scroll as a Journey" (scroll-cinema)
- **Sources:** Pins 2, 5, 6 (Alethia · RedSun · Kushite Kingdom).
- **Palette:** deep ink/forest `#0C1F16` → black `#050505`, with a single warm horizon accent, orange `#FF6B1A`.
- **Type:** big editorial grotesk headlines, left-aligned, with quiet small-caps microcopy; one italic serif line for the human payoff ("You, hired.").
- **Motion pattern to copy:** one continuous scroll-scrubbed camera move — orbit (job market globe) → descent (your roadmap) → horizon sunrise (your resume score lighting up) → arrival (the AI recruiter's verdict). Floating 3D objects drift at different depths; scrolling back must stay smooth. Nothing moves on a timer; the scroll wheel is the director.
- **Best for:** the product story page — market → resume → roadmap → recruiter as one descent, not four disconnected sections.

### Direction C — "Dark Stage, One Spotlight" (giant type + one object)
- **Sources:** Pins 3, 7 (Noomo Labs · Playscape), supported by the cursor-glow effect in §4.
- **Palette:** black stage `#050505`, pale lavender-grey `#D8D5E0` for light sections, one neon accent (violet `#B06FC8` or pink `#FF4D8D`).
- **Type:** oversized condensed display caps for the statement ("GET HIRED."), italic serif for the human line, tiny mono microcopy for the AI details (scores, bars, match %).
- **Motion pattern to copy:** a soft light/glow follows the cursor and illuminates whatever it passes; one signature 3D object (a compass, a resume card, a hiring-bar gauge) drifts through the giant type on scroll; a curved panorama strip of the four hiring bars shifts with the mouse. Restraint everywhere else — the stage is dark so the one moving thing is unmissable.
- **Best for:** brand and the hero statement — the "wow" screenshot, and the frame that gets shared.

**Recommendation:** build Direction A for the hero (it is the most interactive and the most CareerPilot-specific), use Direction B for the page's scroll story, and keep Direction C's giant type + one object as the single brand frame. Do not mix all three motion systems on one screen.

## 4. Opened but dropped (failed the screenshot-worthy bar)
- **Parallax Scrolling Website** — https://www.pinterest.com/pin/1034913189391219760/ — generic lorem-ipsum demo over purple mountains; the very definition of a template.
- **Animated AI SaaS Website | Futuristic Dark Motion UI | CIPHERSLAB** — https://www.pinterest.com/pin/1044694444827230839/ — dark + blue silk waves + "A new way to think and create with computers" is exactly the every-AI-SaaS landing page the bar excludes.
- **Nova AI — Next-Gen AI Platform Landing Page** — https://www.pinterest.com/pin/1116470563912101355/ — **flagged "AI modified"**; glowing glass orb + "AI that turns ideas into action" is a generic AI-generated concept. Mood reference only.
- **Spline portfolio "Hi I'm Ayush"** — https://www.pinterest.com/pin/997547386230444603/ — **flagged "AI modified"**; playful pastel 3D portfolio, off-brief (childish, not a serious AI product).
- **Honourable mention (not top 8):** orange cursor-glow demo — https://www.pinterest.com/pin/1088111959986134023/ — a glowing ring follows the cursor over a dark UI (211 saves), but the pin has a spammy title and no description, so the evidence is too thin to rank it; the glow-follows-cursor pattern is folded into Direction C.

## 5. Method note
- Profile checked first at `pinterest.com/ahsystemsss/_saved/` and `_pins/`: 0 pins, 0 boards.
- Searches used: "interactive website design cursor parallax motion", "magnetic button hover effect website design", "modern AI product website design dark minimal landing page", "awwwards website design interactive hero 3D scroll", "interactive 3D globe website design cursor rotate". 13 pins opened in total; 8 selected.
