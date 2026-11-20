/**
 * Pilot, the CareerPilot mascot (Direction 3: Character-Led / Living World).
 *
 * ORIGINAL ARTWORK: Pilot is drawn entirely as hand-written inline SVG in
 * this file. No image files, no generated imagery, no copied art. The design
 * is a lime-green blob with two enormous googly eyes (the Plopp pattern from
 * the round 2 research), a small navy pilot cap with a mustard badge, rosy
 * cheeks, and a mouth that changes shape with its mood. The blob outline is
 * deliberately lopsided and wobbly so it reads hand-made, not corporate-slick.
 *
 * MOOD CONVENTION
 * ---------------
 * The mascot's face is how the product talks about progress. Use these moods:
 *
 *   "happy"       default, friendly: big open smile, eyes forward.
 *   "thinking"    working something out: eyes looking up, small flat mouth.
 *                 Use while the AI is screening, researching, or loading.
 *   "cheering"    a win: wide open smile, tongue out, arms raised.
 *   "encouraging" warm and gentle: soft smile. Use when there is work to do
 *                 but it is doable; never scolding, never guilty.
 *   "neutral"     calm, quiet: small level mouth. Use for plain information.
 *   "sleeping"    closed eyes, soft little "o" mouth. Use for empty states
 *                 where nothing has happened yet (no audit run, no data).
 *
 * SUGGESTED SCORE-BAND MAPPING (for reuse across screens)
 * --------------------------------------------------------
 *   no score yet  -> "thinking"    (Pilot is waiting to see your work)
 *   strong        -> "cheering"    (Ready to apply)
 *   middling      -> "happy"       (on track, keep going)
 *   needs work    -> "encouraging" (One gap to close / Not yet)
 *
 * The pupils drift subtly toward the cursor (a Plopp touch). The drift is
 * capped to a few viewBox units, throttled with requestAnimationFrame, and
 * fully disabled when the user prefers reduced motion.
 *
 * Pilot is a screening coach, never a hiring manager: copy around the mascot
 * must never call it a hiring manager or Head of Talent.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PilotMood = "happy" | "thinking" | "cheering" | "encouraging" | "neutral" | "sleeping";

/** Direction 3 palette, read from the shared --d3-* tokens with fallbacks. */
const C = {
  lime: "var(--d3-lime, #a9d13b)",
  limeDark: "var(--d3-leaf, #528f38)",
  navy: "var(--d3-navy, #1e2a78)",
  mustard: "var(--d3-mustard, #e4b41c)",
  choco: "var(--d3-choco, #4a2c1a)",
  paper: "var(--d3-paper, #fffdf7)",
  ink: "var(--d3-ink, #241407)",
  flame: "var(--d3-flame, #d83b0f)",
} as const;

/** Base pupil offset per mood, in viewBox units (thinking looks up). */
const PUPIL_BASE: Record<PilotMood, { x: number; y: number }> = {
  happy: { x: 0, y: 0 },
  thinking: { x: -1, y: -5 },
  cheering: { x: 0, y: 0 },
  encouraging: { x: 0, y: 1 },
  neutral: { x: 0, y: 0 },
  sleeping: { x: 0, y: 0 },
};

/**
 * The Pilot mascot, drawn as hand-written inline SVG.
 *
 * @param mood - face expression; see the mood convention in the file header.
 * @param size - rendered width/height in px (the SVG scales from a 200x200 viewBox).
 */
export function PilotMascot({
  mood = "happy",
  size = 120,
  className,
}: {
  mood?: PilotMood;
  size?: number;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });

  // Pupils drift a few units toward the cursor. Disabled entirely under
  // prefers-reduced-motion; sleeping has no pupils to move.
  useEffect(() => {
    if (mood === "sleeping") return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = svgRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0) return;
        const dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
        const dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height;
        const clamp = (v: number) => Math.max(-1, Math.min(1, v));
        setGaze({ x: clamp(dx) * 4, y: clamp(dy) * 3.5 });
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [mood]);

  const base = PUPIL_BASE[mood];
  const pupilDx = base.x + gaze.x;
  const pupilDy = base.y + gaze.y;
  const sleeping = mood === "sleeping";

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`Pilot the mascot, feeling ${mood}`}
      style={{ overflow: "visible" }}
    >
      {/* Raised arms (cheering only), drawn behind the body. A thick choco
          stroke under a lime stroke gives the arms a hand-drawn outline. */}
      {mood === "cheering" && (
        <g fill="none" strokeLinecap="round">
          <path d="M 40 122 Q 22 102 26 78" stroke={C.choco} strokeWidth="17" />
          <path d="M 40 122 Q 22 102 26 78" stroke={C.lime} strokeWidth="10" />
          <path d="M 160 118 Q 178 98 174 74" stroke={C.choco} strokeWidth="17" />
          <path d="M 160 118 Q 178 98 174 74" stroke={C.lime} strokeWidth="10" />
          <circle cx="26" cy="72" r="10" fill={C.lime} stroke={C.choco} strokeWidth="3.5" />
          <circle cx="174" cy="68" r="10" fill={C.lime} stroke={C.choco} strokeWidth="3.5" />
        </g>
      )}

      {/* Little side nubs for the calmer moods. */}
      {!sleeping && mood !== "cheering" && (
        <g fill={C.lime} stroke={C.choco} strokeWidth="3.5">
          <ellipse cx="33" cy="130" rx="7" ry="12" transform="rotate(18 33 130)" />
          <ellipse cx="167" cy="126" rx="7" ry="12" transform="rotate(-18 167 126)" />
        </g>
      )}

      {/* Feet nubs. */}
      <g fill={C.lime} stroke={C.choco} strokeWidth="3.5">
        <ellipse cx="70" cy="176" rx="15" ry="9" />
        <ellipse cx="130" cy="176" rx="15" ry="9" />
      </g>

      {/* The blob body: deliberately lopsided, wobbly outline. */}
      <path
        d="M 98 30
           C 126 22, 156 36, 168 64
           C 179 90, 176 124, 160 150
           C 148 169, 128 180, 106 178
           C 94 177, 84 181, 70 173
           C 48 161, 31 134, 31 104
           C 31 72, 62 38, 98 30
           Z"
        fill={C.lime}
        stroke={C.choco}
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* A couple of faint speckles, like a hand-inked blob. */}
      <circle cx="52" cy="82" r="4" fill={C.limeDark} opacity="0.35" />
      <circle cx="152" cy="152" r="3" fill={C.limeDark} opacity="0.35" />
      <circle cx="146" cy="60" r="2.5" fill={C.limeDark} opacity="0.3" />

      {/* Navy pilot cap, tilted, with a mustard sparkle badge. */}
      <g transform="rotate(-10 100 38)">
        <path
          d="M 62 52 Q 64 24 100 22 Q 136 24 138 52 Q 100 40 62 52 Z"
          fill={C.navy}
          stroke={C.choco}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <ellipse cx="100" cy="54" rx="40" ry="8" fill={C.navy} stroke={C.choco} strokeWidth="3.5" />
        <circle cx="100" cy="24" r="3.5" fill={C.mustard} stroke={C.choco} strokeWidth="2" />
        <circle cx="100" cy="37" r="9" fill={C.mustard} stroke={C.choco} strokeWidth="2.5" />
        <path
          d="M 100 31 L 101.8 35.2 L 106 37 L 101.8 38.8 L 100 43 L 98.2 38.8 L 94 37 L 98.2 35.2 Z"
          fill={C.paper}
        />
      </g>

      {/* Rosy cheeks. */}
      <g fill={C.flame} opacity="0.28">
        <ellipse cx="52" cy="128" rx="11" ry="7" />
        <ellipse cx="150" cy="124" rx="10" ry="6" />
      </g>

      {/* Eyes: two enormous googly eyes, slightly uneven on purpose. */}
      {sleeping ? (
        <g fill="none" stroke={C.choco} strokeWidth="4" strokeLinecap="round">
          <path d="M 58 96 Q 76 106 94 96" />
          <path d="M 112 92 Q 128 102 144 92" />
        </g>
      ) : (
        <g>
          <ellipse cx="76" cy="96" rx="21" ry="25" fill={C.paper} stroke={C.choco} strokeWidth="3.5" />
          <ellipse cx="128" cy="92" rx="19" ry="23" fill={C.paper} stroke={C.choco} strokeWidth="3.5" />
          <g transform={`translate(${pupilDx} ${pupilDy})`}>
            <circle cx="78" cy="99" r="9" fill={C.ink} />
            <circle cx="126" cy="95" r="8" fill={C.ink} />
            <circle cx="75" cy="96" r="3" fill={C.paper} />
            <circle cx="123.5" cy="92" r="2.6" fill={C.paper} />
          </g>
        </g>
      )}

      {/* Mouth, shaped by mood. */}
      {mood === "happy" && (
        <path d="M 74 130 Q 100 158 126 130 Q 100 144 74 130 Z" fill={C.choco} />
      )}
      {mood === "cheering" && (
        <g>
          <path d="M 72 126 Q 100 172 128 126 Q 100 138 72 126 Z" fill={C.choco} />
          <ellipse cx="100" cy="146" rx="11" ry="5" fill="#f27d7d" />
        </g>
      )}
      {mood === "thinking" && (
        <path d="M 90 139 Q 100 141.5 110 139" fill="none" stroke={C.choco} strokeWidth="5" strokeLinecap="round" />
      )}
      {mood === "encouraging" && (
        <path d="M 84 134 Q 100 146 116 134" fill="none" stroke={C.choco} strokeWidth="5" strokeLinecap="round" />
      )}
      {mood === "neutral" && (
        <path d="M 88 138 Q 100 142 112 138" fill="none" stroke={C.choco} strokeWidth="5" strokeLinecap="round" />
      )}
      {sleeping && (
        <circle cx="100" cy="140" r="4.5" fill="none" stroke={C.choco} strokeWidth="4" />
      )}

      {/* A tiny "Z" floating off a sleeping Pilot. */}
      {sleeping && (
        <text x="158" y="46" fontSize="18" fontWeight="800" fill={C.navy} fontFamily="inherit">
          z
        </text>
      )}
    </svg>
  );
}

/**
 * Pilot next to a speech bubble, for encouraging copy. The bubble holds any
 * short text; keep it to one or two sentences so it stays readable at 390px.
 * Pass showMascot={false} when a larger Pilot is already on screen and only
 * the bubble is needed.
 */
export function PilotSays({
  mood = "happy",
  size = 96,
  showMascot = true,
  children,
  className,
}: {
  mood?: PilotMood;
  size?: number;
  showMascot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      {showMascot && <PilotMascot mood={mood} size={size} className="shrink-0" />}
      <div className="relative mt-2 min-w-0 flex-1 rounded-2xl border-2 border-d3-choco bg-d3-paper px-4 py-3 shadow-[3px_3px_0_var(--d3-choco)]">
        {/* Bubble tail: a choco triangle with a paper triangle over it. */}
        <span
          aria-hidden
          className="absolute -left-[10px] top-7 h-0 w-0 border-y-[8px] border-r-[10px] border-y-transparent border-r-d3-choco"
        />
        <span
          aria-hidden
          className="absolute -left-[6px] top-[30px] h-0 w-0 border-y-[6px] border-r-[8px] border-y-transparent border-r-d3-paper"
        />
        <div className="text-sm font-semibold leading-relaxed text-d3-ink">
          {children}
        </div>
      </div>
    </div>
  );
}
