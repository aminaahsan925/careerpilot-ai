import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * A magnetic CTA: the button leans toward the cursor, the label travels
 * further than the button, and the springs release it back on leave.
 *
 * - The button has an invisible force field: it starts leaning before the
 *   cursor touches it, with the pull fading to zero at the field edge
 *   (150px beyond the button). Tracking is window-level so the field
 *   works from any direction.
 * - The button also tilts toward the cursor (up to 7 degrees, 3D), so
 *   the page feels like it leans toward your hand.
 * - Mouse and pen only. Touch (coarse pointer) and reduced motion get a
 *   plain, fully usable button with no tracking.
 * - `href` renders a router link for internal paths (SPA navigation) or
 *   a plain anchor for external URLs. Without `href` it renders a
 *   button; `onClick` works on either.
 * - The magnetic pull is clamped (default 14px) so the button leans
 *   visibly without ever overlapping its neighbours. `maxPull` raises
 *   the clamp where the layout has room (isolated CTAs); keep it at the
 *   default in tight rows (gap under 20px).
 */
interface MagneticButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  /** Max lean in pixels. Default 14; raise only where neighbours have room. */
  maxPull?: number;
}

const PULL = 0.55;
const DEFAULT_MAX_PULL = 14;
const FIELD = 150;
const MAX_TILT = 7;

export function MagneticButton({ children, href, onClick, className, maxPull = DEFAULT_MAX_PULL }: MagneticButtonProps) {
  const reduced = usePrefersReducedMotion();
  const [coarse, setCoarse] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const clampPull = (v: number): number =>
    Math.min(maxPull, Math.max(-maxPull, v));

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const buttonX = useSpring(rawX, { stiffness: 340, damping: 22, mass: 0.45 });
  const buttonY = useSpring(rawY, { stiffness: 340, damping: 22, mass: 0.45 });
  // The label travels further than the button: its own offset on top.
  // 0.6x keeps the label inside the pill even at the 26px max pull
  // (1.0x clipped the label against the pill's edge in proof).
  const labelX = useTransform(buttonX, (v) => v * 0.6);
  const labelY = useTransform(buttonY, (v) => v * 0.6);
  // 3D tilt toward the cursor, proportional to the lean.
  const rotateY = useTransform(buttonX, (v) => (v / maxPull) * MAX_TILT);
  const rotateX = useTransform(buttonY, (v) => (-v / maxPull) * MAX_TILT);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Force-field tracking: window-level, so the button leans toward the
  // cursor before it is touched. The pull fades to zero at the field edge
  // and the springs release the button when the cursor leaves the field.
  useEffect(() => {
    if (reduced || coarse) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // The rect moves with the button as it leans. Un-displace it, so
      // the pull is always computed against the button's rest position:
      // without this the settled lean depends on the approach path
      // (proved in the R3d probe: a diagonal approach left a 7.5px
      // vertical offset at rest).
      const leanX = buttonX.get();
      const leanY = buttonY.get();
      const left = rect.left - leanX;
      const right = rect.right - leanX;
      const top = rect.top - leanY;
      const bottom = rect.bottom - leanY;
      const cx = (left + right) / 2;
      const cy = (top + bottom) / 2;
      // Distance from the cursor to the button rect (0 when inside).
      const edgeDx = Math.max(left - e.clientX, 0, e.clientX - right);
      const edgeDy = Math.max(top - e.clientY, 0, e.clientY - bottom);
      const edgeDist = Math.hypot(edgeDx, edgeDy);
      if (edgeDist > FIELD) {
        rawX.set(0);
        rawY.set(0);
        return;
      }
      const strength = 1 - edgeDist / FIELD;
      rawX.set(clampPull((e.clientX - cx) * PULL * strength));
      rawY.set(clampPull((e.clientY - cy) * PULL * strength));
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced, coarse, rawX, rawY, maxPull, buttonX, buttonY]);

  const isExternal = href !== undefined && /^https?:\/\//.test(href);

  // Plain button: reduced motion, touch, or no JS-driven motion at all.
  if (reduced || coarse) {
    if (href !== undefined && isExternal) {
      return (
        <a href={href} onClick={onClick} className={className} target="_blank" rel="noreferrer">
          {children}
        </a>
      );
    }
    if (href !== undefined) {
      return (
        // The cast keeps the router's literal path type happy; the runtime
        // value is the href passed in.
        <Link to={href as "/"} onClick={onClick} className={className}>
          {children}
        </Link>
      );
    }
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    );
  }

  const label = (
    <motion.span
      style={{ x: labelX, y: labelY, display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
    >
      {children}
    </motion.span>
  );

  return (
    <motion.div
      ref={ref}
      style={{
        x: buttonX,
        y: buttonY,
        rotateX,
        rotateY,
        transformPerspective: 700,
        display: "inline-block",
      }}
    >
      {href !== undefined && isExternal ? (
        <a href={href} onClick={onClick} className={className} target="_blank" rel="noreferrer">
          {label}
        </a>
      ) : href !== undefined ? (
        <Link to={href as "/"} onClick={onClick} className={className}>
          {label}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={className}>
          {label}
        </button>
      )}
    </motion.div>
  );
}
