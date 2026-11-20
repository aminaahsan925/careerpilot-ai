import { Link } from "@tanstack/react-router";
import { Lens } from "@/components/lens/Lens";
import { Flashlight } from "@/components/lens/Flashlight";
import { MagneticButton } from "@/components/lens/MagneticButton";
import { KineticText } from "@/components/lens/KineticText";

/**
 * Round 3 hero (Direction 2, Cursor as Flashlight / Lens).
 *
 * Near-black ground, giant grotesk capitals, a tilted lime slab, and the
 * lens refracting the headline as the screenshot moment. Below it, a
 * flashlight reveal (the audit detail is a genuinely different layer)
 * and a greyscale data strip that gains colour under the lens.
 *
 * Copy rules: no invented claims, no fake scores or percentages, no
 * photography (there is none in this product). Every fact in the data
 * strip names a real CareerPilot capability. No em dashes in copy.
 *
 * Colours and fonts come from the Round 3 tokens in styles.css
 * (worker 2); the fallbacks match the token contract exactly, so the
 * hero renders correctly even before those tokens land.
 */

const DISPLAY_FONT =
  "var(--font-display, 'Archivo', 'Plus Jakarta Sans', system-ui, sans-serif)";
const SERIF_FONT = "var(--font-serif, Georgia, 'Times New Roman', serif)";
const MONO_FONT =
  "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)";

/* Real feature facts: what CareerPilot actually checks. */
const DATA_STRIP = [
  { label: "Resume: line by line screen", color: "var(--cp-lime, #e1f10d)" },
  { label: "Roadmap: one day, one focus", color: "var(--cp-ember, #ff7a45)" },
  { label: "Market: live ATS postings", color: "var(--cp-lime2, #9bf80d)" },
  { label: "Recruiter: banded verdicts", color: "var(--cp-paper, #f4f1ea)" },
  {
    label: "Mentor: advice from your own profile",
    color: "var(--cp-stone, #c6c5bf)",
  },
];

export function HeroLens() {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--cp-ink, #040403)",
        color: "var(--cp-paper, #f4f1ea)",
      }}
    >
      {/* Faint lime glow, top right. Decorative only. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "60%",
          aspectRatio: "1",
          borderRadius: "9999px",
          background:
            "radial-gradient(closest-side, rgba(225, 241, 13, 0.09), transparent)",
          pointerEvents: "none",
        }}
      />

      <div
        className="relative mx-auto max-w-6xl px-6 pb-20 pt-14 md:pt-20"
        style={{ fontFamily: "var(--font-body, 'Plus Jakarta Sans', system-ui, sans-serif)" }}
      >
        {/* Mono micro-labels. */}
        <div
          className="flex items-center justify-between gap-4"
          style={{
            fontFamily: MONO_FONT,
            fontSize: "11px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--cp-stone, #c6c5bf)",
          }}
        >
          <span>CareerPilot AI</span>
          <span className="hidden md:inline">Resume / Roadmap / Market / Recruiter</span>
          <span style={{ color: "var(--cp-lime, #e1f10d)" }}>
            Move your cursor to look closer
          </span>
        </div>

        {/* Headline under the lens: the screenshot moment. */}
        <Lens magnify={1.7} className="mt-12 md:mt-16">
          <h1
            style={{
              fontFamily: DISPLAY_FONT,
              fontSize: "clamp(3rem, 9vw, 6.75rem)",
              fontWeight: 800,
              lineHeight: 0.92,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
            }}
          >
            <span className="block">Get hired</span>
            <span className="block">on evidence</span>
            <span
              className="mt-4 inline-block -rotate-2 px-4 py-1 md:mt-5"
              style={{
                background: "var(--cp-lime, #e1f10d)",
                color: "var(--cp-ink, #040403)",
                fontSize: "0.42em",
                letterSpacing: "0.01em",
              }}
            >
              Less guesswork
            </span>
          </h1>
          <p
            className="mt-8 max-w-xl text-[15px] leading-relaxed"
            style={{ color: "var(--cp-stone, #c6c5bf)" }}
          >
            CareerPilot reads your resume the way a recruiter would, checks it against live
            job postings, and turns the gaps into a day-by-day plan. Banded verdicts, real
            sources, nothing invented.
          </p>
        </Lens>

        {/* CTAs sit outside the lens: interactive elements must never be
            duplicated by the magnified copy. Destinations are the existing
            ones: dashboard for the roadmap, resume for the analysis. */}
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <MagneticButton
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--cp-lime,#e1f10d)] px-7 py-3.5 text-[14px] font-bold text-[var(--cp-ink,#040403)]"
          >
            Start your roadmap <span aria-hidden="true">-&gt;</span>
          </MagneticButton>
          <Link
            to="/resume"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[13.5px] font-bold transition hover:border-[rgba(244,241,234,0.5)]"
            style={{
              border: "1px solid rgba(198, 197, 191, 0.35)",
              color: "var(--cp-paper, #f4f1ea)",
            }}
          >
            Analyse my resume
          </Link>
        </div>
        <p
          className="mt-6"
          style={{
            fontFamily: MONO_FONT,
            fontSize: "11px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--cp-stone, #c6c5bf)",
          }}
        >
          Resume, roadmap, market, recruiter. One workspace.
        </p>

        {/* Flashlight reveal: the audit detail is a different layer. */}
        <div
          className="mt-20 pt-14 md:mt-24"
          style={{ borderTop: "1px solid rgba(198, 197, 191, 0.16)" }}
        >
          <p
            style={{
              fontFamily: MONO_FONT,
              fontSize: "11px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--cp-lime, #e1f10d)",
            }}
          >
            02 / The reveal
          </p>
          <h2
            className="mt-4"
            style={{
              fontFamily: SERIF_FONT,
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "clamp(1.8rem, 4vw, 2.75rem)",
              lineHeight: 1.1,
            }}
          >
            <KineticText text="Shine a light on your resume" />
          </h2>

          <Flashlight
            className="mt-8"
            lit={
              <div className="py-10">
                <p
                  style={{
                    fontFamily: SERIF_FONT,
                    fontStyle: "italic",
                    fontSize: "clamp(1.4rem, 3vw, 2rem)",
                    lineHeight: 1.15,
                  }}
                >
                  Three gaps. One proof task. Nothing invented.
                </p>
                <ul
                  className="mt-6 space-y-2.5"
                  style={{
                    fontFamily: MONO_FONT,
                    fontSize: "12px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--cp-stone, #c6c5bf)",
                  }}
                >
                  <li>
                    <span style={{ color: "var(--cp-lime, #e1f10d)" }}>01</span>
                    {"  "}Resume screen: line by line checks, with the line numbers
                  </li>
                  <li>
                    <span style={{ color: "var(--cp-lime, #e1f10d)" }}>02</span>
                    {"  "}Market check: live postings from real hiring boards
                  </li>
                  <li>
                    <span style={{ color: "var(--cp-lime, #e1f10d)" }}>03</span>
                    {"  "}Verdict: a band, with the reason attached, never a fake percentage
                  </li>
                </ul>
              </div>
            }
          >
            <div className="py-10">
              <p className="text-[19px] font-bold leading-snug md:text-[22px]">
                Under the light: what a recruiter actually sees.
              </p>
              <p
                className="mt-3 max-w-lg text-[14px] leading-relaxed"
                style={{ color: "var(--cp-stone, #c6c5bf)" }}
              >
                The dimmed lines are the guesswork. Move the light across this panel to see
                what the audit finds, or use the reveal toggle below it.
              </p>
            </div>
          </Flashlight>
        </div>

        {/* Greyscale data strip: colour appears only under the lens. */}
        <div
          className="mt-20 pt-14 md:mt-24"
          style={{ borderTop: "1px solid rgba(198, 197, 191, 0.16)" }}
        >
          <p
            style={{
              fontFamily: MONO_FONT,
              fontSize: "11px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--cp-lime, #e1f10d)",
            }}
          >
            03 / What it checks
          </p>
          <Lens magnify={1.8} className="mt-6">
            <div className="flex flex-wrap gap-3">
              {DATA_STRIP.map((fact) => (
                <span
                  key={fact.label}
                  className="cp-colour-under-lens rounded-full px-3.5 py-2"
                  style={{
                    fontFamily: MONO_FONT,
                    fontSize: "11px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    border: `1px solid ${fact.color}`,
                    color: fact.color,
                  }}
                >
                  {fact.label}
                </span>
              ))}
            </div>
          </Lens>
          <p
            className="mt-6"
            style={{
              fontFamily: MONO_FONT,
              fontSize: "11px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--cp-stone, #c6c5bf)",
            }}
          >
            Tip: drag the lens across the strip. On touch, tap and drag.
          </p>
        </div>
      </div>
    </section>
  );
}
