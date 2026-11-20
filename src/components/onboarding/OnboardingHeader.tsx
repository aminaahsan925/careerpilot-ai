import { motion } from "motion/react";

import { Lens } from "@/components/lens/Lens";
import { usePrefersReducedMotion } from "@/components/lens/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

/**
 * Onboarding header, Round 3 (Cursor as Flashlight / Lens).
 *
 * Two signature moments, both presentation only:
 * - Kinetic step reveal: the step title's words rise in one after another
 *   on every step change (the h1 remounts per step via its key). Under
 *   reduced motion the title renders plainly, fully visible.
 * - Lens over the progress moment: the big step counter sits under a
 *   light disc, so moving the cursor over it lights the numerals.
 *   The counter is static text, which is all a Lens may duplicate.
 * The progress segments below glow lime on the current step.
 */
export function OnboardingHeader({
  step,
  total,
  label,
  hint,
}: {
  step: number;
  total: number;
  label: string;
  hint: string;
}) {
  const reduced = usePrefersReducedMotion();
  const words = label.split(" ");
  const stepLabel = String(step + 1).padStart(2, "0");
  const totalLabel = String(total).padStart(2, "0");

  return (
    <header>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
        <div className="min-w-0">
          <p className="cp-eyebrow">
            Know Me <span className="text-cp-lime">/ Step {stepLabel} of {totalLabel}</span>
          </p>
          <h1
            key={label}
            className="mt-3 font-display text-[clamp(2.1rem,5vw,3.4rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.02em] text-cp-paper"
          >
            {reduced
              ? label
              : words.map((word, i) => (
                  <motion.span
                    key={`${word}-${i}`}
                    className="inline-block"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.06 * i, ease: "easeOut" }}
                  >
                    {word}
                    {i < words.length - 1 ? "\u00A0" : ""}
                  </motion.span>
                ))}
          </h1>
          <p className="mt-3 max-w-[52ch] text-[13.5px] leading-relaxed text-cp-stone">{hint}</p>
        </div>

        <Lens className="shrink-0">
          <div className="min-w-[190px] text-right">
            <p className="font-display text-[clamp(2.6rem,6vw,4rem)] font-extrabold leading-none text-cp-paper">
              {stepLabel}
              <span className="text-cp-lime">/{totalLabel}</span>
            </p>
            <p className="cp-eyebrow mt-2">Under the light</p>
          </div>
        </Lens>
      </div>

      <div
        className="mt-8 flex gap-2"
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label="Onboarding progress"
      >
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "cp-onb-seg",
              i < step && "cp-onb-seg-done",
              i === step && "cp-onb-seg-now",
            )}
          />
        ))}
      </div>
    </header>
  );
}
