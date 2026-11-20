import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { motion, useMotionTemplate } from "motion/react";
import { useCursorSpring } from "./useCursorSpring";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import "./lens.css";

/**
 * A cursor-following glass lens that genuinely magnifies live content.
 *
 * How it works (not a flat CSS trick):
 * - The children render once as the base layer, then again as a live
 *   duplicate scaled by `magnify`, with its transform origin pinned to
 *   the spring-smoothed cursor. The point under the cursor stays fixed,
 *   so the duplicate reads as true magnification of what is beneath.
 * - The duplicate is clipped to a circle at the cursor (clip-path driven
 *   by motion values), so only the lens disc shows the zoomed copy.
 * - The rim carries the refraction feel: an SVG feTurbulence plus
 *   feDisplacementMap filter wobbles the glass ring, and the ring itself
 *   has backdrop blur/saturate, an inset highlight, and a chromatic
 *   edge (lime one way, ember the other).
 * - The lens radius tracks the container width (110 to 160px), so the
 *   disc stays usable on phones as well as desktops.
 *
 * Limits, stated honestly:
 * - Children are rendered twice (base plus magnified copy), so they must
 *   be static: no interactive elements, no ids, nothing with local
 *   state. The magnified copy is aria-hidden.
 * - With prefers-reduced-motion the lens layers are not rendered at all
 *   and the children show plainly. With no cursor the lens stays hidden
 *   until a tap or drag; the base content is always fully visible.
 */
interface LensProps {
  children: ReactNode;
  className?: string;
  /** Zoom factor of the magnified copy. Default 1.6. */
  magnify?: number;
}

export function Lens({ children, className, magnify = 1.6 }: LensProps) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { x, y, active } = useCursorSpring(ref);
  const [radius, setRadius] = useState(150);
  const filterId = useId();

  // Lens radius follows the container width: 22% of it, clamped.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      setRadius(Math.round(Math.min(160, Math.max(110, w * 0.22))));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clip = useMotionTemplate`circle(${radius}px at ${x}px ${y}px)`;
  const origin = useMotionTemplate`${x}px ${y}px`;

  if (reduced) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  const diameter = radius * 2;

  return (
    <div ref={ref} className={className} style={{ position: "relative" }}>
      <div className="cp-lens-base">{children}</div>

      {/* Live magnified duplicate, clipped to the lens disc. */}
      <motion.div
        aria-hidden="true"
        className="cp-lens-zoom-wrap"
        style={{ clipPath: clip }}
        animate={{ opacity: active ? 1 : 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <motion.div
          className="cp-lens-zoom"
          style={{ transformOrigin: origin, scale: magnify }}
        >
          {children}
        </motion.div>
      </motion.div>

      {/* Glass ring, centred on the spring-smoothed cursor. */}
      <motion.div
        aria-hidden="true"
        className="cp-lens-ring"
        style={{
          x,
          y,
          width: diameter,
          height: diameter,
          translate: "-50% -50%",
        }}
        animate={{ opacity: active ? 1 : 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {/* Glass band: blur/saturate and highlight, masked to the rim so
            the magnified interior stays sharp. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "9999px",
            border: "1px solid var(--cp-lime, #e1f10d)",
            opacity: 0.55,
            boxShadow:
              "inset 0 0 0 1px rgba(244, 241, 234, 0.18), inset 0 6px 18px rgba(244, 241, 234, 0.14), inset 0 -8px 20px rgba(0, 0, 0, 0.35), -1px 0 0 rgba(225, 241, 13, 0.35), 1px 0 0 rgba(255, 122, 69, 0.35)",
            backdropFilter: "blur(2px) saturate(1.6)",
            WebkitBackdropFilter: "blur(2px) saturate(1.6)",
            maskImage:
              "radial-gradient(closest-side, transparent calc(100% - 16px), black calc(100% - 13px))",
            WebkitMaskImage:
              "radial-gradient(closest-side, transparent calc(100% - 16px), black calc(100% - 13px))",
          }}
        />
        {/* Refraction rim: the same circle, wobbled by the displacement
            filter so the edge bends like liquid glass. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "9999px",
            border: "1.5px solid rgba(225, 241, 13, 0.4)",
            filter: `url(#${filterId})`,
            opacity: 0.85,
          }}
        />
        {/* Specular highlight arc at the top of the lens. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "9999px",
            background:
              "radial-gradient(ellipse 42% 24% at 30% 20%, rgba(244, 241, 234, 0.3), transparent 70%)",
            maskImage:
              "radial-gradient(closest-side, transparent calc(100% - 34px), black calc(100% - 30px))",
            WebkitMaskImage:
              "radial-gradient(closest-side, transparent calc(100% - 34px), black calc(100% - 30px))",
          }}
        />
      </motion.div>

      {/* Displacement filter for the refraction rim. Unique per instance. */}
      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.02"
              numOctaves="2"
              seed="7"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="14"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
