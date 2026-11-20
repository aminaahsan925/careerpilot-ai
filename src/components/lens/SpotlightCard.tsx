import { useRef, useState, type ReactNode } from "react";
import { motion, useMotionTemplate } from "motion/react";
import { useCursorSpring } from "./useCursorSpring";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * A card whose border glow follows the cursor (Kiln-style spotlight
 * border): a radial glow behind the content plus a 1px border that lights
 * up only near the pointer, both driven by the spring-smoothed cursor.
 *
 * - The border glow uses the mask-composite ring trick, so the light
 *   sits on the border itself, not as a washed-out overlay.
 * - Keyboard focus inside the card shows the glow at its centre, so the
 *   effect is not cursor-only. Touch shows it at the tap point.
 * - With prefers-reduced-motion the card renders plainly with no glow
 *   tracking. The card surface and border come from the caller's
 *   className, so the card keeps its normal look either way.
 */
interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
}

export function SpotlightCard({ children, className }: SpotlightCardProps) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { x, y, active } = useCursorSpring(ref);
  const [focused, setFocused] = useState(false);

  const glow = useMotionTemplate`radial-gradient(240px circle at ${x}px ${y}px, rgba(225, 241, 13, 0.14), transparent 70%)`;
  const borderGlow = useMotionTemplate`radial-gradient(200px circle at ${x}px ${y}px, rgba(225, 241, 13, 0.85), transparent 70%)`;

  if (reduced) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  const lit = active || focused;

  return (
    <div
      ref={ref}
      className={className}
      style={{ position: "relative" }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {/* Soft glow behind the content. */}
      <motion.div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          background: glow,
          pointerEvents: "none",
        }}
        animate={{ opacity: lit ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
      {/* Border glow: a 1px ring lit only near the cursor. */}
      <motion.div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          padding: "1px",
          background: borderGlow,
          mask: "linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)",
          maskComposite: "exclude",
          WebkitMask: "linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)",
          WebkitMaskComposite: "xor",
          pointerEvents: "none",
        }}
        animate={{ opacity: lit ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}
