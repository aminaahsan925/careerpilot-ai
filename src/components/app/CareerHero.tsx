import { type Variants, motion } from "motion/react";
import { useNavigate } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

type CareerHeroProps = {
  personImage?: string;
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

export function CareerHero({ personImage, className, compact }: CareerHeroProps) {
  const navigate = useNavigate();

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-ink text-white",
        compact ? "min-h-[300px]" : "min-h-[360px]",
        className,
      )}
    >
      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_20%_0%,rgba(255,255,255,0.08),transparent_60%)]" />

      {/* Floating nav keywords */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="absolute right-5 top-5 z-20 hidden gap-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60 sm:flex"
      >
        <span>Focus</span>
        <span>Learn</span>
        <span>Grow</span>
      </motion.div>

      {/* Terracotta circle with parallax-like float */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-0 right-[6%] aspect-square w-[46%] max-w-[380px] translate-y-[30%] rounded-full bg-terracotta"
      />

      {personImage ? (
        <motion.img
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          src={personImage}
          alt="Career hero"
          className="absolute bottom-0 right-[4%] z-10 hidden h-[86%] w-auto object-contain object-bottom grayscale contrast-110 drop-shadow-[0_30px_40px_rgba(0,0,0,0.45)] sm:block"
        />
      ) : null}

      <div className="relative z-20 max-w-full px-7 py-8 sm:max-w-[62%] sm:px-10 sm:py-10">
        <h2 className="editorial-title text-[clamp(2.1rem,5.4vw,4rem)]">
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
            className="relative inline-block text-terracotta"
          >
            Future
            <motion.span
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.7, type: "spring", stiffness: 400, damping: 15 }}
              className="absolute -right-4 top-1 text-base text-terracotta"
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
          className="mt-5 max-w-[240px] text-[13px] leading-relaxed text-white/70"
        >
          Your career is a journey. We&apos;re here to guide you every step of the way.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5, ease: "easeOut" }}
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => navigate({ to: "/roadmap" })}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-terracotta px-5 py-3 text-[13px] font-semibold text-primary-foreground"
        >
          Start Roadmap <span aria-hidden>→</span>
        </motion.button>
      </div>
    </motion.section>
  );
}
