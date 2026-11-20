import { useEffect, useState } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Ambient cursor glow (cursor-feel pass, 20 Nov 2026): a soft lime
 * aura that follows the cursor across every page, so the cursor always
 * feels present even over empty dark space.
 *
 * - One fixed full-viewport layer, pointer-events none, screen blend,
 *   very low opacity. It only brightens dark ground; light text is
 *   untouched by the blend. Transform/background only: no layout, no
 *   React re-renders on pointer move (the gradient position is a
 *   motion template fed by spring-smoothed motion values).
 * - The spring trails the cursor slightly (stiffness 260, damping 28,
 *   mass 0.8), so the glow feels like it follows your hand rather
 *   than sitting exactly under the pointer.
 * - Mounted once in the root route. Renders nothing under
 *   prefers-reduced-motion or on coarse pointers (touch has no
 *   cursor to follow). Fades out when the pointer leaves the window.
 */
export function CursorGlow() {
  const reduced = usePrefersReducedMotion();
  const [coarse, setCoarse] = useState(false);
  const [active, setActive] = useState(false);

  const rawX = useMotionValue(-9999);
  const rawY = useMotionValue(-9999);
  const x = useSpring(rawX, { stiffness: 260, damping: 28, mass: 0.8 });
  const y = useSpring(rawY, { stiffness: 260, damping: 28, mass: 0.8 });

  const glow = useMotionTemplate`radial-gradient(520px circle at ${x}px ${y}px, rgba(225, 241, 13, 0.14), transparent 65%)`;

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reduced || coarse) return;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      rawX.set(event.clientX);
      rawY.set(event.clientY);
      setActive(true);
    };
    const onLeave = () => setActive(false);
    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, [reduced, coarse, rawX, rawY]);

  if (reduced || coarse) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2,
        pointerEvents: "none",
        background: glow,
        mixBlendMode: "screen",
      }}
      animate={{ opacity: active ? 1 : 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    />
  );
}
