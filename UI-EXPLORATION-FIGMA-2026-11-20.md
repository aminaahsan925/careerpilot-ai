# CareerPilot UI/UX exploration — Figma Community findings (2026-11-20)

Browser study, no sign-in. 6 searches all worked without sign-in (career
dashboard UI kit 13 files; job board UI 15; recruitment dashboard 18; student
learning platform UI 14; AI SaaS dashboard template 12; roadmap tracker UI 7).
10 files opened; notes are from public cover/preview images + authors' own
descriptions (several embedded live previews showed a Figma login wall, so full
in-file inspection was not possible). No account created, nothing bought.
Source task: browser-task:0350e697-504a-5c72-a538-649b854a1f16 (ran 16:37-16:42 PKT).

## 3 visual directions across the files

A. **Polished data SaaS** (CareerHub, Dashboard HR Management, Online Learning
   Platform): white cards on a pale ground, dark sidebar (or icon rail), one
   saturated accent (indigo/violet-blue/sky blue), 4 KPI cards, one bar chart
   with a single highlighted bar, one donut, one status table. Modern through
   restraint, spacing, consistent chart language; risks feeling generic because
   every dashboard in the set uses the same skeleton.
B. **Warm, human, token-driven** (ATS UI Kit): paper/beige ground, ink text,
   terracotta/rust accent, Figtree type, kanban pipeline, WCAG AA measured,
   150+ primitive/semantic tokens so a rebrand is a ramp swap. The evolution of
   CareerPilot's current ink/terracotta editorial style — warmer and more
   systematic, not a break from it.
C. **Editorial / colour-led, AI-first** (Open Call, Promptly): colour does the
   wayfinding — Open Call's eight craft hues and posted-notice job cards on hot
   pink and paper, Promptly's lime-green ChatGPT-style composer with suggestion
   chips and a dark mode. Modern through a strong point of view, oversized
   condensed type, colour-as-meaning; risks being harder to scale across dense
   data views than Direction A.

## The best 6 files

### 1. Open Call | a job board UI kit — Michele Dal Santo
https://www.figma.com/community/file/1677684572894072550/open-call-a-job-board-ui-kit
Free, CC BY 4.0, 30 users, updated 3 months ago. 12 desktop screens at 1440px +
same 12 at 390px mobile; 13 components, 46 variants, 39 variables, 9 text styles.
- Most original file found. Hot magenta-pink cover, huge condensed black
  "OPEN CALL" type on paper/off-white ground; flat, borderless surfaces, no
  shadows anywhere.
- Colour is navigation, not decoration: eight crafts each own a hue
  (lavender-purple Design, teal Engineering, lime Product, amber Data &
  Research, pink/red Marketing, yellow Operations, sky blue Finance & Legal),
  and that hue follows a role from its chip to the section header, notice,
  apply button and confirmation stub — so the primary action deliberately has
  no single brand colour.
- A role is not a card but a "posted notice" with a printed byline and a
  perforated edge whose tear-off tab is the apply control.
- Type: proprietary face (cannot be reused); headlines at or below 56px; corner
  radius varies by role rather than one cloned value.
- Accessibility measured, not claimed: all 38 text/surface pairs checked
  against WCAG 2.x, black on paper 18.99:1, every craft ink clears 4.5:1.
  Focus, hover, disabled, error, empty and loading states built in.
- For CareerPilot: the strongest fresh direction — steal the "colour =
  category" system for resume/roadmap/job-match status, and the
  notice/tear-off pattern for job cards, rather than another generic card grid.
  Direction C.

### 2. ATS UI Kit — Free applicant tracking system — Fede Mondino
https://www.figma.com/community/file/1682163670753779611/ats-ui-kit-free-applicant-tracking-system
Free, CC BY 4.0, 48 users, 5 likes, updated 2 months ago. 15 components;
150+ design tokens in two layers (primitives = raw ramps, semantics = meaning);
WCAG AA contrast checked with Stark; light mode only; Figtree (Google Fonts);
Feather icons (MIT).
- Warm, paper-toned, deliberately close to CareerPilot's current
  ink/terracotta direction but more systematic. Warm off-white/beige ground,
  near-black ink, terracotta/rust-brown accent (rebranding is one job: replace
  the values in the terracotta ramp and every component follows).
- Hero screen: four-column kanban pipeline — Applied, Screening, Interview,
  Offer — with small count badges; candidate cards with name, role, star
  ratings, match percentages; search, Filter, tabs, "Add candidate" button.
  One screen in four documented states: rejected column collapsed/expanded,
  drag and drop, bulk actions.
- Type: Figtree — geometric-humanist, clean and friendly rather than editorial.
- For CareerPilot: the direct model for the AI recruiter — a student is a
  candidate card moving Applied → Screening → Interview → Offer against real
  postings, with a match score on each card — and the token-layer idea lets
  CareerPilot reskin from terracotta to any accent without hunting through
  screens. Direction B.

### 3. Dashboard HR Management — Avi Yansah
https://www.figma.com/community/file/1133962379531706067/dashboard-hr-management
Free, CC BY 4.0, 258 likes, 23.1k users, updated 4 years ago — the most-used
dashboard in the set.
- The classic polished SaaS dashboard. Pale mint/aqua page background, white
  cards, thin grey dividers, small-caps grey labels, dark navy/black numbers.
  Left sidebar with profile block + violet-blue active state.
- 4 KPI cards with small green/red delta pills (Total Employees 856 +10.0%, Job
  View 3,342 +22.0%, Job Applied 77 +12.0%, Resigned 17 -7.0%). "Job
  Statistics" bar chart in vivid violet-blue with pale lavender second series,
  peak highlighted with a "77" tooltip; "Employee Status" table; "Employee
  Composition" donut in violet-blue and teal-green.
- For CareerPilot: copy this skeleton wholesale for the home view — 4 KPIs
  (resume score, roadmap %, jobs matched, applications), one bar chart, one
  donut (skill coverage), one status table (applications). Proven and instantly
  legible, but also the most generic look in the set. Direction A.

### 4. Online Learning Platform — Mohammad Nahin Islam
https://www.figma.com/community/file/1158122940880652521/online-learning-platform
Free, CC BY 4.0, 124 likes, 6.4k users, updated 3 years ago. Dashboard, Course
List, Course Details, Prototyping, Discussions, Live Events.
- Best progress/roadmap pattern found. Very narrow dark navy/black icon-only
  left rail (bright blue active tile) against a white content area; bright
  sky-blue primary accent.
- KPI row: Courses in progress 3, Active Prototypes 7, Time spent 3h 15m,
  Community score 240. "Study Statistics" blue bar chart Sat–Fri with
  week/month toggle; "Progress" donut at 45% split Courses vs Prototypes; right
  rail with Live Events + Activity timeline.
- "My Courses": pastel course cards (lavender/purple, light blue, pale cyan),
  each with a small pie-chart progress indicator at the foot of the card.
- For CareerPilot: the direct model for the learning roadmap — pastel
  per-track cards each carrying its own progress pie/donut, a weekly study bar
  chart, one 45%-style overall progress ring. Friendlier and more student-like
  than the HR dashboard's tables. Direction A (student variant).

### 5. CareerHub — Job Portal Web App Dashboard UI Kit — YDN x Designers
https://www.figma.com/community/file/1672657372043194654/careerhub-job-portal-web-app-dashboard-ui-kit
Paid, $32, 19 users, updated 3 months ago. 70 screens, 50+ components, light
mode, desktop + mobile, Figma variables, design guidelines. Covers Dashboard,
User Management, Recruiter, Post a Job, Job Seeker, Search, My Application,
Saved Jobs, Explore Job, Job Detail, Application Form, Settings, Payment.
- Deep indigo/royal-violet cover; inside, white dashboard with left sidebar,
  "Welcome back, Sabrina!" header, search + violet "Post a Job" button, matching
  phone layout.
- KPI cards 12,480 / 3,250 / 840 / 9,540 with green deltas. "Job Applications
  Overview" grey bar chart with a single indigo highlighted bar (April, 1,450);
  "Jobs by Category" indigo donut (Development 55%, Design 25%, Marketing 20%,
  Product 15%, Others 10%); "Recent Jobs" table with Active/Pending pills.
- For CareerPilot: the most complete reference for the job-market mirror — KPI
  + bar + donut + jobs table — and the only file covering both the student side
  and the recruiter side in one kit. Direction A.

### 6. Promptly — AI Prompt SaaS UI Kit — Saasify
https://www.figma.com/community/file/1623712681080213241/promptly-ai-prompt-saas-ui-kit-chatgpt-style-dashboard-prompt-builder-preview
Free preview (full kit external/paid), CC BY 4.0, 11 likes, 463 users, updated 7
months ago. 60+ designs, light + dark mode, responsive, prompt builder + AI
workflow screens.
- Pale lime-green cover; the product is a ChatGPT-style conversational UI shown
  in both dark (near-black) and light (white) modes side by side, lime/neon-green
  logo + "New Chat" pill.
- Layout: left chat-history sidebar, centred "How can I help you today?"
  heading with a composer underneath, suggestion cards.
- For CareerPilot: the model for the AI recruiter as a conversation, not a
  form — centred greeting, prompt composer, suggestion chips ("Analyse my
  resume", "Find jobs matching my skills", "Build my roadmap") — and the only
  file in the set that ships a true dark mode, useful if CareerPilot wants a
  distinct AI surface. Direction C.

## Also opened (not in the best 6)

- **Jobhuntly — Job Board & Portal UI Kit** (Illiyin Studio), 249 likes, 22.2k
  users — https://www.figma.com/community/file/1159498580274796865/free-jobhuntly-job-board-portal-web-and-mobile-ui-kit
  White/light-grey, electric indigo-blue accent, dark navy headings, "Discover
  more than 5000+ Jobs" hero, category tiles. Comments complain the "FREE"
  label is misleading.
- **NextKarir — Job Finding App UI Kit** (Mada Okty Pratama), 496 users —
  https://www.figma.com/community/file/1528606333869766940/nextkarir-job-finding-app-ui-kit
  Mobile-only iOS, pale blue-grey, dark navy, "Matches with your skills" job
  recommendations, bottom navigation. Useful for skill-matching, phone-only.
- **Student Career & Major Finder Dashboard** (Ly Tran), 4 users —
  https://www.figma.com/community/file/1650895821875952388/student-career-major-finder-dashboard
  Lime-to-mint gradient cover, Vietnamese content, cover-only preview; too thin
  to rank.
- **AI Chat Dashboard** (Lazarev.), 1.2k users —
  https://www.figma.com/community/file/1414971418949278554/ai-chat-dashboard
  Cover is a red marketing image with a VR headset; shows no dashboard UI.
- The "roadmap tracker UI" search itself was weak (7 files, mostly landing
  pages); the roadmap pattern in this study comes from Online Learning
  Platform's progress cards/donut and ATS's kanban, not a dedicated roadmap file.

## Recommendation from the evidence

Prototype CareerPilot as Direction B's warm token system (ATS) for the core
product, borrow Direction A's dashboard skeleton (HR Management / CareerHub)
for the home and job-market views, and test Direction C (Open Call's craft-hue
system) as the one bold alternative for job matching and the AI recruiter surface.
