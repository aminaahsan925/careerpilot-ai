import { Fragment, useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Scroll-linked kinetic headline text: each word rises and fades in as
 * the line scrolls into view, one word after another, driven by the
 * page scroll position (no timers, no autoplay).
 *
 * - Words are never hidden: the earliest state is 12% opacity, and the
 *   text is plain, fully visible copy with no JS and under
 *   prefers-reduced-motion.
 * - The motion is transform plus opacity only, so it never shifts
 *   layout while scrolling.
 */
interface KineticTextProps {
  text: string;
  className?: string;
}

function KineticWord({
  word,
  progress,
  range,
}: {
  word: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const y = useTransform(progress, range, [28, 0]);
  const opacity = useTransform(progress, range, [0.12, 1]);
  return (
    <motion.span
      style={{ y, opacity, display: "inline-block", willChange: "transform, opacity" }}
    >
      {word}
    </motion.span>
  );
}

export function KineticText({ text, className }: KineticTextProps) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.95", "start 0.45"],
  });

  if (reduced) {
    return (
      <span ref={ref} className={className}>
        {text}
      </span>
    );
  }

  const words = text.split(" ");
  const total = Math.max(words.length, 1);

  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <KineticWord
            word={word}
            progress={scrollYProgress}
            range={[i / total, (i + 1) / total]}
          />
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}
