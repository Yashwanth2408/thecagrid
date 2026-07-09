import React, { useEffect, useRef, useState } from "react";

/**
 * A dot-grid SVG background that reacts to cursor proximity.
 * - ~40px spacing
 * - dots within 180px of cursor scale up + shift to violet
 * - capped at ~500 dots visible
 * - disabled on touch/reduced-motion
 */
export default function GridBackground({ className = "", spacing = 42, radius = 170, dotSize = 1.6 }) {
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const dotsRef = useRef([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef(null);
  const reducedMotion = useRef(
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
  const isTouch = useRef(
    typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0)
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setDims({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cols = Math.floor(dims.w / spacing);
  const rows = Math.floor(dims.h / spacing);
  const total = cols * rows;

  useEffect(() => {
    if (reducedMotion.current || isTouch.current) return;
    const handleMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  useEffect(() => {
    if (reducedMotion.current || isTouch.current) return;
    const tick = () => {
      const { x: mx, y: my } = mouseRef.current;
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const relX = mx - containerRect.left;
      const relY = my - containerRect.top;
      const r2 = radius * radius;

      for (const dot of dotsRef.current) {
        if (!dot) continue;
        const dx = dot._cx - relX;
        const dy = dot._cy - relY;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const t = 1 - d2 / r2; // 0..1
          const scale = 1 + t * 2.6;
          dot.style.transform = `scale(${scale})`;
          const alpha = 0.06 + t * 0.9;
          dot.style.fill = `rgba(139,92,246,${alpha})`;
        } else {
          dot.style.transform = "scale(1)";
          dot.style.fill = "rgba(255,255,255,0.055)";
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [total, radius]);

  const capped = Math.min(total, 800);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <svg width="100%" height="100%" style={{ display: "block" }}>
        {Array.from({ length: capped }).map((_, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const cx = col * spacing + spacing / 2;
          const cy = row * spacing + spacing / 2;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={dotSize}
              ref={(el) => {
                if (el) {
                  el._cx = cx;
                  el._cy = cy;
                  dotsRef.current[i] = el;
                }
              }}
              style={{
                fill: "rgba(255,255,255,0.055)",
                transformOrigin: `${cx}px ${cy}px`,
                transition: "fill 200ms ease, transform 200ms ease",
                willChange: "transform, fill",
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}
