import { motion } from "motion/react";

interface CareerIllustrationProps {
  className?: string;
  badgeText?: string;
}

export function CareerIllustration({ className = "", badgeText = "your employability." }: CareerIllustrationProps) {
  return (
    <div className={`relative flex flex-col items-center justify-center p-4 ${className}`}>
      {/* Optional Top Tagline */}
      {badgeText && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 text-center font-display text-lg font-bold tracking-tight text-foreground/80 sm:text-xl"
        >
          {badgeText}
        </motion.p>
      )}

      {/* Vector Illustration Canvas */}
      <div className="relative w-full max-w-[420px] aspect-[4/3] flex items-center justify-center">
        {/* Floating Bar Chart Card (Left Background) */}
        <motion.div
          initial={{ opacity: 0, x: -20, y: 10 }}
          animate={{ opacity: 1, x: 0, y: [0, -6, 0] }}
          transition={{
            opacity: { duration: 0.6 },
            y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute left-2 top-8 z-0 flex items-end gap-1.5 rounded-2xl border border-cp-paper/10 bg-cp-panel/90 p-3 shadow-md backdrop-blur-xs sm:left-4"
        >
          <div className="h-6 w-2.5 rounded-xs bg-cp-ember/30" />
          <div className="h-10 w-2.5 rounded-xs bg-cp-ember/60" />
          <div className="h-14 w-2.5 rounded-xs bg-cp-ember" />
          <div className="h-12 w-2.5 rounded-xs bg-cp-lime2" />
        </motion.div>

        {/* Floating Donut Chart (Right Background) */}
        <motion.div
          initial={{ opacity: 0, x: 20, y: -10 }}
          animate={{ opacity: 1, x: 0, y: [0, 6, 0] }}
          transition={{
            opacity: { duration: 0.6, delay: 0.2 },
            y: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
          }}
          className="absolute right-4 top-4 z-0 h-16 w-16 sm:h-20 sm:w-20"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-sm">
            {/* Background Donut */}
            <circle cx="50" cy="50" r="38" fill="none" stroke="var(--cp-paper)" strokeOpacity="0.15" strokeWidth="18" />
            {/* Segment 1: Flame */}
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="var(--cp-ember)"
              strokeWidth="18"
              strokeDasharray="140 100"
              strokeDashoffset="20"
            />
            {/* Segment 2: Lime2 */}
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="var(--cp-lime2)"
              strokeWidth="18"
              strokeDasharray="70 170"
              strokeDashoffset="-120"
            />
          </svg>
        </motion.div>

        {/* Plant (Far Right) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="absolute right-2 bottom-6 z-0 flex flex-col items-center"
        >
          {/* Leaves */}
          <div className="flex gap-1 mb-[-4px]">
            <div className="h-10 w-4 rounded-full bg-cp-lime rotate-[-25deg] shadow-xs" />
            <div className="h-12 w-4 rounded-full bg-cp-lime2 rotate-[5deg] shadow-xs" />
            <div className="h-10 w-4 rounded-full bg-cp-lime rotate-[30deg] shadow-xs" />
          </div>
          {/* Pot */}
          <div className="h-9 w-8 rounded-b-lg bg-cp-ink shadow-md" />
        </motion.div>

        {/* Central Lens Motif (Round 3): an abstract glass lens over a
            score ring. No character, no face, no invented number: the
            ring is decorative geometry, not a score. */}
        <svg viewBox="0 0 340 260" className="relative z-10 w-full h-full" aria-hidden="true">
          {/* Baseline */}
          <line x1="20" y1="230" x2="320" y2="230" stroke="var(--cp-paper)" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />

          {/* Document under the lens: abstract resume lines. */}
          <g>
            <rect x="60" y="120" width="120" height="100" rx="8" fill="none" stroke="var(--cp-paper)" strokeOpacity="0.3" strokeWidth="1.5" />
            <line x1="76" y1="142" x2="164" y2="142" stroke="var(--cp-paper)" strokeOpacity="0.45" strokeWidth="5" strokeLinecap="round" />
            <line x1="76" y1="160" x2="148" y2="160" stroke="var(--cp-paper)" strokeOpacity="0.25" strokeWidth="5" strokeLinecap="round" />
            <line x1="76" y1="178" x2="156" y2="178" stroke="var(--cp-paper)" strokeOpacity="0.25" strokeWidth="5" strokeLinecap="round" />
            <line x1="76" y1="196" x2="132" y2="196" stroke="var(--cp-paper)" strokeOpacity="0.25" strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* Score ring, right of the document. */}
          <circle cx="232" cy="150" r="46" fill="none" stroke="var(--cp-paper)" strokeOpacity="0.15" strokeWidth="10" />
          <circle
            cx="232"
            cy="150"
            r="46"
            fill="none"
            stroke="var(--cp-lime2)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="289"
            strokeDashoffset="96"
            transform="rotate(-90 232 150)"
          />

          {/* Lens disc over the join: glass ring with a lime rim. */}
          <circle cx="183" cy="118" r="52" fill="var(--cp-lime)" fillOpacity="0.06" stroke="var(--cp-lime)" strokeWidth="2" />
          <circle cx="183" cy="118" r="44" fill="none" stroke="var(--cp-paper)" strokeOpacity="0.35" strokeWidth="1" />
          {/* Specular arc on the lens. */}
          <path d="M 152 88 A 52 52 0 0 1 196 70" fill="none" stroke="var(--cp-paper)" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" />
          {/* Ember counter-edge, like the lens chromatic rim. */}
          <path d="M 196 166 A 52 52 0 0 1 152 148" fill="none" stroke="var(--cp-ember)" strokeOpacity="0.8" strokeWidth="2" strokeLinecap="round" />

          {/* Four-point star, kept from the original emblem. */}
          <g transform="translate(232, 150)">
            <path
              d="M 0 -10 Q 0 0, 10 0 Q 0 0, 0 10 Q 0 0, -10 0 Q 0 0, 0 -10 Z"
              fill="var(--cp-paper)"
            />
          </g>
        </svg>

        {/* Ambient Glow behind the lens */}
        <div className="pointer-events-none absolute left-20 bottom-10 h-24 w-24 rounded-full bg-cp-lime/15 blur-xl" />
      </div>
    </div>
  );
}
