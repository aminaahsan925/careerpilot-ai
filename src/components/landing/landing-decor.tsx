/*
 * Round 3 landing decorations: quiet geometric marks in the Flashlight /
 * Lens language. Viewfinder corners, lens rings, crosshairs, a dot grid.
 * No mascots, no doodles, no toy shapes. All decorative: call sites mark
 * them aria-hidden.
 */

/* Viewfinder corner bracket. Rotate via className to place each corner. */
export function CornerMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M2 22 V 8 Q 2 2, 8 2 H 22" strokeLinecap="square" />
    </svg>
  );
}

/* Small crosshair plus, for section markers and grid intersections. */
export function PlusMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M8 1 V 15 M 1 8 H 15" strokeLinecap="square" />
    </svg>
  );
}

/* Concentric lens rings: the glass lens, drawn as hairlines. */
export function LensRing({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      className={className}
      stroke="currentColor"
      strokeWidth="1"
    >
      <circle cx="60" cy="60" r="58" />
      <circle cx="60" cy="60" r="42" opacity="0.6" />
      <circle cx="60" cy="60" r="26" opacity="0.4" />
      <circle cx="60" cy="60" r="4" fill="currentColor" stroke="none" opacity="0.8" />
    </svg>
  );
}

/* A hairline rule with a short lime segment, for section dividers. */
export function ScanLine({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`relative h-px bg-white/10 ${className}`}>
      <div className="absolute left-0 top-0 h-px w-16 bg-cp-lime" />
    </div>
  );
}

/* Subtle dot grid backdrop. Colour and size come from the call site. */
export function DotGrid({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        backgroundImage: "radial-gradient(rgb(244 241 234 / 0.14) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    />
  );
}
