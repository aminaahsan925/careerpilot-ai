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
 *   (110px beyond the button). Tracking is window-level so the field
 *   works from any direction.
 * - Mouse and pen only. Touch (coarse pointer) and reduced motion get a
 *   plain, fully usable button with no tracking.
 * - `href` renders a router link for internal paths (SPA navigation) or
 *   a plain anchor for external URLs. Without `href` it renders a
 *   button; `onClick` works on either.
 * - The magnetic pull is clamped to 14px so the button leans visibly
 *   without ever overlapping its neighbours.
 */
interface MagneticButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

const PULL = 0.35;
const MAX_PULL = 14;
const FIELD = 110;

function clampPull(v: number): number {
  return Math.min(MAX_PULL, Math.max(-MAX_PULL, v));
}

export function MagneticButton({ children, href, onClick, className }: MagneticButtonProps) {
  const reduced = usePrefersReducedMotion();
  const [coarse, setCoarse] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const buttonX = useSpring(rawX, { stiffness: 200, damping: 18, mass: 0.5 });
  const buttonY = useSpring(rawY, { stiffness: 200, damping: 18, mass: 0.5 });
  // The label travels further than the button: its own offset on top.
  const labelX = useTransform(buttonX, (v) => v * 0.6);
  const labelY = useTransform(buttonY, (v) => v * 0.6);

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
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // Distance from the cursor to the button rect (0 when inside).
      const edgeDx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right);
      const edgeDy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom);
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
  }, [reduced, coarse, rawX, rawY]);

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
      style={{ x: buttonX, y: buttonY, display: "inline-block" }}
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
