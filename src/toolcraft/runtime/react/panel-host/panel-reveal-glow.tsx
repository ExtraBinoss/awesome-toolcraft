"use client";

import { LazyMotion, m, useReducedMotion } from "motion/react";

const loadPanelMotionFeatures = () =>
  import("./panel-motion-features").then((module) => module.default);

export function PanelRevealGlow(): React.JSX.Element | null {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return null;
  }

  return (
    <LazyMotion features={loadPanelMotionFeatures} strict>
      <m.span
        animate={{ opacity: [0, 0.72, 0] }}
        aria-hidden="true"
        className="toolcraft-panel-reveal-glow"
        initial={{ opacity: 0 }}
        transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1], times: [0, 0.35, 1] }}
      />
    </LazyMotion>
  );
}
