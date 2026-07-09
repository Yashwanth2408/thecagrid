import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";

/**
 * Grid-wipe route transition: a violet-tinted diagonal grid overlay
 * sweeps across the viewport for ~500ms.
 * Wrap the <Routes> in this so we get a Framer AnimatePresence.
 */
export function PageTransition({ children }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * A dedicated wipe overlay component you can trigger manually on nav.
 * (Simple version — AnimatePresence pattern above covers most needs.)
 */
export function GridWipe() {
  return (
    <motion.div
      className="fixed inset-0 z-[9998] pointer-events-none"
      initial={{ clipPath: "polygon(0 0, 0 0, 0 100%, 0 100%)" }}
      animate={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }}
      exit={{ clipPath: "polygon(100% 0, 100% 0, 100% 100%, 100% 100%)" }}
      transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
      style={{
        background:
          "linear-gradient(120deg, rgba(139,92,246,0.15), rgba(139,92,246,0.02))",
      }}
    >
      <svg width="100%" height="100%" opacity="0.35">
        <defs>
          <pattern id="wipeGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="1.5" fill="rgba(139,92,246,0.8)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wipeGrid)" />
      </svg>
    </motion.div>
  );
}
