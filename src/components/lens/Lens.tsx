import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useMotionTemplate } from "motion/react";
import { useCursorSpring } from "./useCursorSpring";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import "./lens.css";

/**
 * A cursor light disc (Round 3, Direction 2, Cursor as Flashlight /
 * Lens). It reads as LIGHT falling on the page, never as a magnifying
 * glass (Amina, 20 Nov 22:58 PKT: the old lens "looks like a
 * magnifying glass").
 *
 * How it works:
 * - The children render once as the base layer, then again as a live
 *   duplicate at exactly 1x, revealed through a feathered mask (fully
 *   lit to 70% of the radius, fading to nothing at the edge), so the
 *   disc melts into the page like a pool of light. There is no hard
 *   circular border, no glass ring, no bubble rim, no specular arc,
 *   and NO enlargement: the duplicate sits pixel-identical over the
 *   base, which is what keeps the feather blend seamless. An earlier
 *   1.05x version ghosted visibly in the feather zone (the copy's
 *   glyphs sat 5-10px off the base's), so the scale was removed.
 * - The disc reads as light through its lifted ground (the duplicate
 *   layer sits on a backing one step lighter than the page), a bright
 *   wash at its centre, and a soft halo around it. The disc also
 *   carries the colour reveal: elements marked
 *   `.cp-colour-under-lens` render monochrome in the base layer and
 *   in full colour inside the disc (used by the hero data strip).
 * - The light radius tracks the container width (130 to 200px), so the
 *   pool stays usable on phones as well as desktops.
 *
 * The flashlight is the primary cursor effect (light revealing a
 * genuinely different hidden layer); the lens is the same light over
 * the same content, brightening it and showing its colour. The two
 * share the spring, the feather and the halo, so they feel like one
 * instrument.
 *
 * Limits, stated honestly:
 * - Children are rendered twice (base plus light copy), so they must
 *   be static: no interactive elements, no ids, nothing with local
 *   state. The light copy is aria-hidden.
 * - With prefers-reduced-motion the light layers are not rendered at
 *   all and the children show plainly. With no cursor the disc stays
 *   hidden until a tap or drag; the base content is always visible.
 */
interface LensProps {
  children: ReactNode;
  className?: string;
}

export function Lens({ children, className }: LensProps) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { x, y, active } = useCursorSpring(ref);
  const [radius, setRadius] = useState(170);

  // Light radius follows the container width: 26% of it, clamped.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      setRadius(Math.round(Math.min(200, Math.max(130, w * 0.26))));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Feathered mask: fully lit out to 70% of the radius, fading to
  // nothing at the edge. No hard circle anywhere.
  const mask = useMotionTemplate`radial-gradient(circle ${radius}px at ${x}px ${y}px, black 70%, transparent 100%)`;
  // Bright wash inside the disc: strong enough to read as light in a
  // still frame, fading out with the feathered edge.
  const wash = useMotionTemplate`radial-gradient(circle ${radius}px at ${x}px ${y}px, rgba(225, 241, 13, 0.16), rgba(225, 241, 13, 0.05) 60%, transparent 80%)`;

  if (reduced) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div ref={ref} className={className} style={{ position: "relative" }}>
      <div className="cp-lens-base">{children}</div>

      {/* Live light copy, revealed through the feathered mask. The
          opaque backing keeps the base from doubling with the copy
          inside the disc; at the feathered edge it melts into the
          base, which is the light falloff. */}
      <motion.div
        aria-hidden="true"
        className="cp-lens-zoom-wrap"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
        animate={{ opacity: active ? 1 : 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className="cp-lens-zoom">
          {children}
        </div>
        {/* Bright wash at the disc's centre. Inside the masked layer,
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

      {/* Soft halo around the disc, so the edge reads as light. */}
      <motion.div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: radius * 2 + 200,
          height: radius * 2 + 200,
          borderRadius: "9999px",
          translate: "-50% -50%",
          pointerEvents: "none",
          background:
            "radial-gradient(closest-side, rgba(225, 241, 13, 0.22), rgba(225, 241, 13, 0.06) 55%, transparent 75%)",
          x,
          y,
        }}
        animate={{ opacity: active ? 1 : 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      />
    </div>
  );
}
