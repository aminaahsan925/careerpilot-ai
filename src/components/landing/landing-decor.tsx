/*
 * Direction 3 landing decorations: hand-written inline SVG doodles.
 * No AI-generated imagery anywhere: every shape below is drawn in code.
 * All decorative: call sites mark them aria-hidden.
 */

export function Squiggle({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 20"
      fill="none"
      aria-hidden="true"
      className={className}
      preserveAspectRatio="none"
    >
      <path
        d="M2 12 Q 12 2, 22 12 T 42 12 T 62 12 T 82 12 T 102 12 T 118 12"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StarBurst({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 0 Q 13.5 8.5, 22 12 Q 13.5 15.5, 12 24 Q 10.5 15.5, 2 12 Q 10.5 8.5, 12 0 Z" />
    </svg>
  );
}

export function DoodleCircle({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className={className}
      preserveAspectRatio="none"
    >
      <path
        d="M50 5 C 76 3, 95 22, 94 49 C 93 76, 74 95, 48 95 C 22 95, 5 77, 6 50 C 7 23, 24 7, 50 5 Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function KoiFish({
  className = "",
  body = "#f58220",
  flip = false,
  style,
}: {
  className?: string;
  body?: string;
  flip?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 120 60"
      aria-hidden="true"
      className={className}
      style={{ ...(flip ? { transform: "scaleX(-1)" } : undefined), ...style }}
    >
      {/* Tail fin */}
      <path d="M92 24 L 118 10 L 111 30 L 118 50 L 92 38 Z" fill={body} opacity="0.85" />
      {/* Body */}
      <path
        d="M8 30 C 20 12, 62 8, 90 24 C 98 29, 98 33, 90 38 C 62 52, 20 50, 8 30 Z"
        fill={body}
      />
      {/* White patch */}
      <ellipse cx="52" cy="26" rx="16" ry="9" fill="#fffdf6" opacity="0.9" />
      {/* Top fin */}
      <path d="M48 12 Q 58 2, 70 11 Q 58 14, 48 12 Z" fill={body} opacity="0.9" />
      {/* Eye */}
      <circle cx="26" cy="26" r="3.5" fill="#241407" />
      <circle cx="27.5" cy="24.5" r="1.2" fill="#fffdf6" />
      {/* Gill line */}
      <path
        d="M38 18 Q 33 30, 38 42"
        stroke="#241407"
        strokeWidth="2"
        fill="none"
        opacity="0.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

/*
 * A slim living-pond strip: teal water, ripples, three koi drifting across.
 * Pure decoration for the landing page; the in-product Market Mirror pond
 * is a separate screen. Each koi keeps a base `left` so it stays visible
 * under prefers-reduced-motion (see animate-d3-swim in styles.css).
 */
export function KoiStrip({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden rounded-[2rem] bg-d3-teal ${className}`}
    >
      {/* Ripples */}
      <div className="absolute left-[12%] top-[30%] h-10 w-24 rounded-full border-2 border-white/25" />
      <div className="absolute left-[55%] top-[55%] h-8 w-20 rounded-full border-2 border-white/20" />
      <div className="absolute left-[78%] top-[22%] h-12 w-28 rounded-full border-2 border-white/15" />
      <div className="absolute left-[38%] top-[64%] h-6 w-14 rounded-full border-2 border-white/20" />
      {/* Lily pads */}
      <div className="absolute bottom-[12%] left-[8%] h-5 w-10 rounded-full bg-d3-leaf/80" />
      <div className="absolute right-[10%] top-[62%] h-4 w-8 rounded-full bg-d3-lime/80" />

      <KoiFish
        className="animate-d3-swim absolute top-[16%] h-9 w-auto"
        body="#f58220"
        style={{ left: "18%", animationDuration: "24s" }}
      />
      <KoiFish
        className="animate-d3-swim absolute top-[52%] h-7 w-auto"
        body="#f2b705"
        style={{ left: "55%", animationDuration: "32s", animationDelay: "-9s" }}
      />
      <KoiFish
        className="animate-d3-swim absolute top-[36%] h-6 w-auto"
        body="#fffdf6"
        flip
        style={{ left: "78%", animationDuration: "28s", animationDelay: "-16s" }}
      />
    </div>
  );
}
