import type { ReactNode } from "react";
import { MagneticButton } from "@/components/lens/MagneticButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "./magnetic-cta.css";

/**
 * A magnetic primary CTA that keeps disabled behaviour identical.
 *
 * MagneticButton itself has no `disabled` prop (the lens engine is
 * shared and off-limits), so this wrapper renders the original shadcn
 * Button, disabled, whenever `disabled` is true, and the magnetic
 * button otherwise. A disabled button is not clickable anyway, so the
 * magnetic lean only ever applies to a live button.
 *
 * - `href` renders a router link (same as MagneticButton); links have
 *   no disabled state, so `disabled` is ignored for them.
 * - `type` only affects the disabled branch (the magnetic branch always
 *   renders type="button"; callers that need a form submit pass an
 *   onClick that calls requestSubmit, which runs native validation).
 * - `title` only affects the disabled branch; every call site sets it
 *   only while disabled (e.g. the recruiter audit's featured-company
 *   hint), so nothing is lost when enabled.
 * - `fullWidth` wraps the button so a w-full CTA keeps its full width:
 *   MagneticButton's motion.div is inline-block, which would shrink a
 *   w-full button to its content. The CSS in magnetic-cta.css forces
 *   that div to block + full width. With reduced motion or touch the
 *   button renders directly and fills the wrapper on its own.
 * - `wrapperClassName` adds flex behaviour (e.g. shrink-0) to the outer
 *   wrapper when the CTA sits in a flex row, since the wrapper, not the
 *   button, becomes the flex item.
 */
interface MagneticCTAProps {
  children: ReactNode;
  onClick?: (() => void) | undefined;
  href?: string | undefined;
  className?: string | undefined;
  disabled?: boolean | undefined;
  title?: string | undefined;
  type?: "button" | "submit" | undefined;
  fullWidth?: boolean | undefined;
  wrapperClassName?: string | undefined;
}

export function MagneticCTA({
  children,
  onClick,
  href,
  className,
  disabled,
  title,
  type = "button",
  fullWidth,
  wrapperClassName,
}: MagneticCTAProps) {
  // Disabled: the exact original button, disabled. No magnetism, no
  // behaviour change; the label (spinner or text) comes from the caller
  // exactly as before.
  if (disabled && !href) {
    return (
      <Button type={type} onClick={onClick} disabled={disabled} title={title} className={className}>
        {children}
      </Button>
    );
  }

  // Enabled: magnetic. The base layout classes replace the shadcn Button
  // base (inline-flex, centred, no wrap); the caller's className carries
  // the colour, padding and radius exactly as before. The conditional
  // spreads keep exactOptionalPropertyTypes happy: MagneticButton's
  // optional props must not receive an explicit undefined.
  const magnetic = (
    <MagneticButton
      {...(href !== undefined ? { href } : {})}
      {...(onClick !== undefined ? { onClick } : {})}
      className={cn("inline-flex items-center justify-center whitespace-nowrap", className)}
    >
      {children}
    </MagneticButton>
  );

  if (fullWidth || wrapperClassName) {
    return (
      <div className={cn(fullWidth && "cp-magnetic-full w-full", wrapperClassName)}>
        {magnetic}
      </div>
    );
  }
  return magnetic;
}
