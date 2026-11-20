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
 * - The light's edge is feathered, not a hard circle: the lit layer is
 *   masked with a radial gradient that fades over the outer ~28% of the
 *   pool, so text near the edge fades out instead of clipping mid-word,
 *   and the pool reads as light falling on the page. A bright wash
 *   inside the pool's centre and a stronger halo sell the beam.
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
 *   interactive elements, nothing duplicated by the light copy).
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
  const [radius, setRadius] = useState(240);
  const [revealed, setRevealed] = useState(false);
  const litId = useId();

  // Light radius follows the container width: 30% of it, clamped.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      setRadius(Math.round(Math.min(280, Math.max(170, w * 0.3))));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Feathered mask: fully lit to 85% of the radius, fading to nothing
  // at the edge, so text fades instead of clipping mid-word and the
  // pool blends into the dimmed base the way a real beam falls off.
  // The feather is narrower than the lens's (70%) because the lit
  // layer carries different text: a wide blend zone lets the two
  // layers cross and read as a jumble at the pool's edge.
  const mask = useMotionTemplate`radial-gradient(circle ${radius}px at ${x}px ${y}px, black 85%, transparent 100%)`;
  // Fully-lit mask for the toggle-revealed state. Kept as a motion
  // template (not the string "none") so maskImage is always a
  // MotionValue and motion's style handling stays consistent.
  const maskFull = useMotionTemplate`linear-gradient(black, black)`;
  // Bright wash at the pool's centre, so the light feels like it is
  // falling on the page rather than just un-dimming it.
  const wash = useMotionTemplate`radial-gradient(circle ${Math.round(radius * 0.62)}px at ${x}px ${y}px, rgba(225, 241, 13, 0.08), transparent 70%)`;

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
                  filter: "brightness(0.32) saturate(0.5)",
                  transition: "filter 0.3s ease",
                }
              : { height: "100%" }
          }
        >
          {children}
        </div>

        {/* Lit layer: a different layer, revealed inside the light.
            Opaque backing so the dimmed base does not show through and
            double with the lit text. The feathered mask (not a hard
            clip-path) fades the layer out toward the pool's edge, so
            text never cuts mid-word. */}
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
            maskImage: revealed ? maskFull : mask,
            WebkitMaskImage: revealed ? maskFull : mask,
            pointerEvents: revealed ? "auto" : "none",
          }}
          animate={{ opacity: litVisible ? 1 : 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {lit}
          {/* Bright wash at the pool's centre. Inside the masked layer,
              so it stays within the light. */}
          <motion.div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background: wash,
              pointerEvents: "none",
            }}
          />
        </motion.div>

        {/* Soft halo around the light, so the edge reads as a beam. */}
        <motion.div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: radius * 2 + 160,
            height: radius * 2 + 160,
            borderRadius: "9999px",
            translate: "-50% -50%",
            pointerEvents: "none",
            background:
              "radial-gradient(closest-side, rgba(225, 241, 13, 0.22), rgba(225, 241, 13, 0.07) 55%, transparent 75%)",
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
