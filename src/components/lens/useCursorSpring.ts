import { useEffect, useMemo, useState, type RefObject } from "react";
import { useMotionValue, useSpring, type MotionValue } from "motion/react";

/**
 * Spring-smoothed cursor position inside a container element, shared by
 * the lens components (Lens, Flashlight, SpotlightCard).
 *
 * - `x` / `y` are MotionValues in pixels, relative to the container's
 *   top-left corner. They start far offscreen (-9999) so clipped layers
 *   stay out of view until the pointer arrives.
 * - `active` is true once the pointer has entered or touched the
 *   container. Mouse and pen deactivate on pointerleave; touch stays
 *   pinned at the last tap point, so a tap is a usable fallback for the
 *   lens and the flashlight with no cursor at all.
 * - Pointer events cover mouse, pen, and touch drag with one listener
 *   set. Nothing here calls preventDefault, so touch scrolling still
 *   works; the lens follows a drag and stays where the finger lifts.
 * - Spring (cursor-feel pass, 20 Nov 2026): stiffness 420, damping 26,
 *   mass 0.55. Fast with a lively snap and a hint of overshoot, not a
 *   lazy lag. This is the shared cursor instrument: Lens, Flashlight
 *   and SpotlightCard all move on the same spring, so the page feels
 *   like one thing following your hand.
 */
export interface CursorSpring {
  x: MotionValue<number>;
  y: MotionValue<number>;
  active: boolean;
}

export function useCursorSpring(
  ref: RefObject<HTMLElement | null>,
  options?: { stiffness?: number; damping?: number; mass?: number },
): CursorSpring {
  const stiffness = options?.stiffness ?? 420;
  const damping = options?.damping ?? 26;
  const mass = options?.mass ?? 0.55;
  const springConfig = useMemo(
    () => ({ stiffness, damping, mass }),
    [stiffness, damping, mass],
  );

  const rawX = useMotionValue(-9999);
  const rawY = useMotionValue(-9999);
  const x = useSpring(rawX, springConfig);
  const y = useSpring(rawY, springConfig);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      rawX.set(clientX - rect.left);
      rawY.set(clientY - rect.top);
    };

    const onMove = (e: PointerEvent) => {
      update(e.clientX, e.clientY);
      setActive(true);
    };
    const onDown = (e: PointerEvent) => {
      update(e.clientX, e.clientY);
      setActive(true);
    };
    const onLeave = (e: PointerEvent) => {
      // Touch has no leave: the lens stays pinned at the last tap.
      if (e.pointerType === "mouse" || e.pointerType === "pen") {
        setActive(false);
      }
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [ref, rawX, rawY]);

  return { x, y, active };
}
