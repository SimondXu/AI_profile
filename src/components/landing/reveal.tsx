"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  /** Stagger delay in ms, capped by callers at ~200ms per item. */
  delay?: number;
  children: ReactNode;
  className?: string;
}

/**
 * Tiny entrance wrapper: fades in and rises 8px once on mount. Honours
 * `prefers-reduced-motion` by dropping to an opacity-only transition.
 */
export function Reveal({ delay = 0, children, className }: RevealProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reducedMotion ? 0.2 : 0.36,
        delay: delay / 1000,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}
