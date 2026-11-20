import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { motion, useMotionTemplate } from "motion/react";
import { useCursorSpring } from "./useCursorSpring";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import "./lens.css";

/**
 * A cursor flashlight: `children` render dimmed, and the `lit` layer (a
 * genuinely different layer, hidden detail, not a brightness change) is
 * revealed only inside a radial light following the spring-smoothed
 * cursor.
 *
 * - Mouse and pen: the light follows the pointer and fades on leave.
 * - Touch: a tap pins the light at that point; drag moves it. A
 *   "Reveal the hidden detail" toggle is always visible on touch devices
 *   and on keyboard focus, and shows the lit layer in full, so the
 *   content never depends on having a cursor.
 * - With prefers-reduced-motion there is no dimming and no clipping:
 *   both layers render in normal flow, fully visible.
 * - The lit layer is aria-hidden until it is revealed, and the toggle
 *   carries aria-expanded, so screen reader users get the toggle path
 *   instead of clipped content.
 * - `dimChildren={false}` keeps the base layer at full brightness and
 *   the light only adds the lit detail layer: for compositions that
 *   must stay alive and readable at rest (the hero orbit), where the
 *   light reveals provenance rather than the content itself.
 * - `hideToggle` renders no reveal toggle. Use it only when the
 *   flashlight sits inside a Lens, whose children must be static (no
 *   interactive elements, nothing duplicated by the magnified copy).
 *   Touch users still get the light by tapping; the lit detail must
 *   stay supplementary (provenance, never the only copy of a fact).
 */
interface FlashlightProps {
  children: ReactNode;
  /** The hidden detail, revealed only inside the light. */
  lit: ReactNode;
  className?: string;
  /** When false, children render at full brightness. Default true. */
  dimChildren?: boolean;
  /** When true, no reveal toggle is rendered. Default false. */
  hideToggle?: boolean;
}

export function Flashlight({ children, lit, className, dimChildren, hideToggle }: FlashlightProps) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { x, y, active } = useCursorSpring(ref);
  const [radius, setRadius] = useState(190);
  const [revealed, setRevealed] = useState(false);
  const litId = useId();

  // Light radius follows the container width: 26% of it, clamped.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      setRadius(Math.round(Math.min(200, Math.max(140, w * 0.26))));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clip = useMotionTemplate`circle(${radius}px at ${x}px ${y}px)`;

  if (reduced) {
    return (
      <div className={className}>
        <div>{children}</div>
        <div
          style={{
            marginTop: "1rem",
            border: "1px solid var(--cp-lime, #e1f10d)",
            borderRadius: "1.25rem",
            padding: "1.25rem 1.5rem",
          }}
        >
          {lit}
        </div>
      </div>
    );
  }

  const litVisible = active || revealed;
  const dim = dimChildren !== false;

  return (
    <div className={className}>
      {/* height: 100% on this wrapper and on the children wrapper below
          keeps the h-full chain intact when the Flashlight sits in a
          fixed-height box (the hero orbit). When the root is
          auto-height both resolve to auto and change nothing. */}
      <div ref={ref} style={{ position: "relative", height: "100%" }}>
        {/* Dimmed base layer (or full brightness when dimChildren is false). */}
        <div
          style={
            dim
              ? {
                  height: "100%",
                  filter: "brightness(0.38) saturate(0.55)",
                  transition: "filter 0.3s ease",
                }
              : { height: "100%" }
          }
        >
          {children}
        </div>

        {/* Lit layer: a different layer, revealed inside the light.
            Opaque backing so the dimmed base does not show through and
            double with the lit text. */}
        <motion.div
          id={hideToggle ? undefined : litId}
          aria-hidden={!litVisible}
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            background: "var(--cp-panel, #0e0e0c)",
            clipPath: revealed ? "inset(0 0 0 0)" : clip,
            pointerEvents: revealed ? "auto" : "none",
          }}
          animate={{ opacity: litVisible ? 1 : 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {lit}
        </motion.div>

        {/* Soft halo around the light, so the edge reads as a beam. */}
        <motion.div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: radius * 2 + 80,
            height: radius * 2 + 80,
            borderRadius: "9999px",
            translate: "-50% -50%",
            pointerEvents: "none",
            background:
              "radial-gradient(closest-side, rgba(225, 241, 13, 0.1), transparent 70%)",
            x,
            y,
          }}
          animate={{ opacity: active && !revealed ? 1 : 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        />
      </div>

      {/* No-cursor fallback: reveals the lit layer in full. Omitted when
          hideToggle is set (the flashlight sits inside a Lens, whose
          children must be static); touch users still get the light by
          tapping, and the lit detail stays supplementary. */}
      {hideToggle ? null : (
        <button
          type="button"
          className="cp-flashlight-toggle"
          aria-expanded={revealed}
          aria-controls={litId}
          onClick={() => setRevealed((v) => !v)}
          style={{
            marginTop: "0.75rem",
            fontFamily:
              "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
            fontSize: "11px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--cp-lime, #e1f10d)",
            background: "transparent",
            border: "none",
            padding: "0.25rem 0",
            cursor: "pointer",
          }}
        >
          {revealed ? "Hide the detail" : "Reveal the hidden detail"}
        </button>
      )}
    </div>
  );
}
