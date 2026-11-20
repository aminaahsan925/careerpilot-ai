import { useEffect, useState } from "react";

/**
 * True when the OS asks for reduced motion.
 *
 * SSR-safe: false on the first render, then synced from matchMedia on
 * mount. Every lens component checks this hook and renders its content
 * fully visible with no motion when it is true.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}
