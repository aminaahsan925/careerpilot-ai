/**
 * CareerHero, Round 3 (Cursor as Flashlight / Lens).
 *
 * A stark dark hero: giant grotesk type, a serif reveal line, a slow
 * lime beam sweeping the background. No illustration, no characters.
 * The copy frames the product as a lens: the audit shows what is
 * missing, the roadmap closes it.
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

export function CareerHero({ className, compact }: CareerHeroProps) {
  const navigate = useNavigate();

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={cn(
        "card-surface relative overflow-hidden bg-cp-ink",
        compact ? "min-h-[300px]" : "min-h-[360px]",
        className,
      )}
    >
      {/* Faint dot grid + lime glow + a slow sweeping beam. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(244,241,234,0.08) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-cp-lime/10 blur-3xl" />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -top-1/2 left-1/4 h-[200%] w-24 rotate-[18deg] bg-gradient-to-b from-transparent via-cp-lime/10 to-transparent blur-md"
        animate={{ x: ["-120%", "520%"] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", repeatDelay: 4 }}
      />

      {/* Mono keywords */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="absolute top-5 right-5 z-20 hidden gap-2 sm:flex"
      >
        <span className="cp-chip bg-cp-paper/5 text-cp-stone">Focus</span>
        <span className="cp-chip bg-cp-paper/5 text-cp-stone">Learn</span>
        <span className="cp-chip bg-cp-paper/5 text-cp-stone">Grow</span>
      </motion.div>

      <div className="relative z-20 max-w-full px-7 py-8 sm:max-w-[72%] sm:px-10 sm:py-10">
        <p className="cp-eyebrow">Your career, under the light</p>
        <h2 className="font-display editorial-title mt-3 text-[clamp(2.6rem,6vw,4.6rem)] text-cp-paper">
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
            className="relative inline-block text-cp-lime"
          >
            Future
            <motion.span
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.7, type: "spring", stiffness: 400, damping: 15 }}
              className="absolute -right-4 top-1 text-base text-cp-lime"
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
          className="mt-5 max-w-[320px] font-serif text-[15px] leading-relaxed text-cp-paper/75 italic"
        >
          The audit shows what is missing. The roadmap closes it. Your resume,
          your market, your next role, in focus.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5, ease: "easeOut" }}
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => navigate({ to: "/roadmap" })}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cp-lime px-5 py-3 text-[13px] font-bold text-cp-ink"
        >
          Start Roadmap <span aria-hidden>→</span>
        </motion.button>
      </div>
    </motion.section>
  );
}
