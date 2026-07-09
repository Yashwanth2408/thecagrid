import React from "react";
import { motion } from "framer-motion";

/**
 * The CA Grid wordmark:
 * A 3x3 dot glyph with one glowing violet dot, next to "The CA Grid" in tight Inter.
 */
export default function Logo({ size = 22, showWord = true, glow = true }) {
  const dot = size * 0.22;
  const gap = size * 0.12;
  const active = 4; // index of glowing dot (center-right)
  return (
    <div className="flex items-center gap-2.5 select-none" data-testid="brand-logo">
      <div
        className="grid grid-cols-3"
        style={{ gap, width: size, height: size }}
      >
        {Array.from({ length: 9 }).map((_, i) => {
          const isActive = i === active;
          return (
            <motion.span
              key={i}
              initial={false}
              animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
              transition={isActive ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : {}}
              style={{
                width: dot,
                height: dot,
                borderRadius: 999,
                background: isActive ? "#7C3AED" : "rgba(255,255,255,0.35)",
                boxShadow: isActive && glow ? "0 0 12px rgba(124,58,237,0.9)" : "none",
              }}
            />
          );
        })}
      </div>
      {showWord && (
        <span
          className="text-[15px] font-extrabold tracking-[-0.03em] text-[#F5F5F7]"
          style={{ letterSpacing: "-0.03em" }}
        >
          The CA Grid
        </span>
      )}
    </div>
  );
}
