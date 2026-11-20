/**
 * CareerHero, Direction 3 (Character-Led / Living World).
 *
 * A bright illustrated scene, drawn entirely as hand-written inline
 * SVG: sun, hills, a winding path and a paper plane. No photography,
 * no generated imagery. The copy frames the student's personality as
 * the hireable part (Bold Personality pattern); the roadmap is how
 * that personality turns into proof.
 */
import { type Variants, motion } from "motion/react";
import { useNavigate } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

type CareerHeroProps = {
  className?: string;
  compact?: boolean;
};

const wordVariants: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      delay: 0.2 + i * 0.12,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

function HeroScene() {
  return (
    <svg
      viewBox="0 0 640 360"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      {/* Sun */}
      <circle cx="548" cy="62" r="52" fill="var(--d3-mustard)" opacity="0.3" />
      <circle cx="548" cy="62" r="34" fill="var(--d3-mustard)" />
      {/* Clouds */}
      <g fill="#ffffff" opacity="0.9">
        <ellipse cx="420" cy="48" rx="42" ry="14" />
        <ellipse cx="448" cy="38" rx="28" ry="12" />
        <ellipse cx="120" cy="36" rx="30" ry="10" />
      </g>
      {/* Back hills */}
      <path d="M0 300 Q 140 190 320 262 T 640 230 L640 360 L0 360 Z" fill="var(--d3-leaf)" />
      {/* Front hills */}
      <path d="M0 330 Q 180 258 360 316 T 640 300 L640 360 L0 360 Z" fill="var(--d3-lime)" />
      {/* Winding path */}
      <path
        d="M470 360 C 440 330 400 326 380 306 S 330 262 300 252"
        stroke="var(--d3-paper)"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="1 20"
      />
      {/* Trees */}
      <g>
        <rect x="86" y="272" width="10" height="38" rx="3" fill="var(--d3-choco)" />
        <circle cx="91" cy="262" r="26" fill="var(--d3-navy)" />
        <circle cx="72" cy="276" r="15" fill="var(--d3-navy)" />
        <rect x="560" y="282" width="10" height="38" rx="3" fill="var(--d3-choco)" />
        <circle cx="565" cy="272" r="24" fill="var(--d3-navy)" />
      </g>
      {/* Flowers */}
      <g fill="var(--d3-flame)">
        <circle cx="210" cy="330" r="7" />
        <circle cx="520" cy="338" r="7" />
      </g>
      <g fill="var(--d3-peri)">
        <circle cx="250" cy="342" r="6" />
        <circle cx="600" cy="326" r="6" />
      </g>
      {/* Paper plane */}
      <g transform="rotate(14 300 120)">
        <path d="M300 120 L360 132 L308 146 Z" fill="var(--d3-paper)" />
        <path d="M300 120 L308 146 L322 136 Z" fill="var(--d3-flame)" />
      </g>
      {/* Birds */}
      <g stroke="var(--d3-choco)" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M180 84 q9 -9 18 0 q9 -9 18 0" />
        <path d="M230 108 q7 -7 14 0 q7 -7 14 0" />
      </g>
    </svg>
  );
}

export function CareerHero({ className, compact }: CareerHeroProps) {
  const navigate = useNavigate();

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={cn(
        "d3-card relative overflow-hidden",
        compact ? "min-h-[300px]" : "min-h-[360px]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[var(--d3-sky)]">
        <HeroScene />
      </div>

      {/* Floating keywords */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="absolute right-5 top-5 z-20 hidden gap-2 sm:flex"
      >
        <span className="d3-chip bg-[var(--d3-paper)]/90 text-[var(--d3-choco)]">Focus</span>
        <span className="d3-chip bg-[var(--d3-paper)]/90 text-[var(--d3-choco)]">Learn</span>
        <span className="d3-chip bg-[var(--d3-paper)]/90 text-[var(--d3-choco)]">Grow</span>
      </motion.div>

      <div className="relative z-20 max-w-full px-7 py-8 sm:max-w-[64%] sm:px-10 sm:py-10">
        <h2 className="d3-display text-[clamp(2.1rem,5.4vw,4rem)] leading-[0.95] text-[var(--d3-choco)]">
          <motion.span
            custom={0}
            initial="hidden"
            animate="visible"
            variants={wordVariants}
            className="block"
          >
            Build
          </motion.span>
          <motion.span
            custom={1}
            initial="hidden"
            animate="visible"
            variants={wordVariants}
            className="block"
          >
            Your
          </motion.span>
          <motion.span
            custom={2}
            initial="hidden"
            animate="visible"
            variants={wordVariants}
            className="relative inline-block text-[var(--d3-flame)]"
          >
            Future
            <motion.span
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.7, type: "spring", stiffness: 400, damping: 15 }}
              className="absolute -right-4 top-1 text-base text-[var(--d3-flame)]"
              aria-hidden
            >
              ✳
            </motion.span>
          </motion.span>
        </h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5, ease: "easeOut" }}
          className="mt-5 max-w-[280px] text-[13.5px] font-medium leading-relaxed text-[var(--d3-choco)]"
        >
          Your personality is the hireable part. The roadmap turns it into proof recruiters
          can see.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5, ease: "easeOut" }}
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => navigate({ to: "/roadmap" })}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--d3-choco)] px-5 py-3 text-[13px] font-bold text-[var(--d3-cream)]"
        >
          Start Roadmap <span aria-hidden>→</span>
        </motion.button>
      </div>
    </motion.section>
  );
}
