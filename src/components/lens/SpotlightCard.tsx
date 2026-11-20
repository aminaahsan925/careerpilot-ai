import { useEffect, useRef, useState, type ReactNode } from "react";
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
 * - The card also tilts toward the cursor (max 3 degrees, the BelowHero
 *   TiltCard pattern: the transform is written straight to the DOM so
 *   pointer moves never re-render, and it eases back to flat on leave).
 *   Fine pointers with full motion only; touch and reduced-motion users
 *   get a still card.
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

const MAX_TILT = 3;

export function SpotlightCard({ children, className }: SpotlightCardProps) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { x, y, active } = useCursorSpring(ref);
  const [focused, setFocused] = useState(false);
  const tiltEnabled = useRef(false);

  useEffect(() => {
    // Gated on NOT-coarse rather than on fine: real browsers always
    // report fine or coarse, so this is identical there, but
    // environments that report neither (headless shells) get the tilt
    // instead of silently losing it.
    tiltEnabled.current =
      !window.matchMedia("(pointer: coarse)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const glow = useMotionTemplate`radial-gradient(320px circle at ${x}px ${y}px, rgba(225, 241, 13, 0.22), transparent 70%)`;
  const borderGlow = useMotionTemplate`radial-gradient(280px circle at ${x}px ${y}px, rgba(225, 241, 13, 1), transparent 70%)`;

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
      style={{ position: "relative", transformStyle: "preserve-3d" }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPointerMove={(event) => {
        const el = ref.current;
        if (!el || !tiltEnabled.current) return;
        const rect = el.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        el.style.transition = "transform 0.08s linear";
        el.style.transform = `perspective(900px) rotateX(${(-py * MAX_TILT * 2).toFixed(2)}deg) rotateY(${(px * MAX_TILT * 2).toFixed(2)}deg)`;
      }}
      onPointerLeave={() => {
        const el = ref.current;
        if (!el || !tiltEnabled.current) return;
        el.style.transition = "transform 0.45s ease";
        el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
      }}
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
