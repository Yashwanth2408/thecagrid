import React, { useEffect, useRef, useState } from "react";

/**
 * Custom cursor with:
 *  - small solid dot (fast follow)
 *  - trailing ring (spring lag)
 *  - scales + violet-fills on hover of interactive elements
 *  - magnetic pull toward [data-magnetic] elements when within 80px
 *  - shows mono label from [data-cursor-label]
 *  - disabled on touch / reduced-motion
 */
export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const labelRef = useRef(null);
  const posRef = useRef({ x: -100, y: -100 });
  const ringPosRef = useRef({ x: -100, y: -100 });
  const targetRef = useRef({ x: -100, y: -100 });
  const stateRef = useRef({ hovering: false, label: "" });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (reducedMotion || isTouch) return;
    setEnabled(true);
    document.body.classList.add("cursor-active");
    return () => document.body.classList.remove("cursor-active");
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const findMagnetic = (x, y) => {
      const els = document.querySelectorAll("[data-magnetic]");
      let best = null;
      let bestD2 = 80 * 80;
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = cx - x;
        const dy = cy - y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          best = { cx, cy, d2 };
          bestD2 = d2;
        }
      });
      return best;
    };

    const onMove = (e) => {
      let x = e.clientX;
      let y = e.clientY;
      const mag = findMagnetic(x, y);
      if (mag) {
        // ease toward magnetic center by 0.3
        x += (mag.cx - x) * 0.35;
        y += (mag.cy - y) * 0.35;
      }
      targetRef.current.x = x;
      targetRef.current.y = y;

      const el = e.target;
      const interactive = el?.closest?.(
        'a, button, [role="button"], [data-cursor-hover], input, label'
      );
      const labelEl = el?.closest?.("[data-cursor-label]");
      stateRef.current.hovering = !!interactive || !!labelEl;
      stateRef.current.label = labelEl?.getAttribute("data-cursor-label") || "";
    };

    const onDown = () => {
      if (ringRef.current) ringRef.current.style.transform += " scale(0.85)";
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);

    let raf;
    const tick = () => {
      // dot: fast follow
      posRef.current.x += (targetRef.current.x - posRef.current.x) * 0.55;
      posRef.current.y += (targetRef.current.y - posRef.current.y) * 0.55;
      // ring: spring lag
      ringPosRef.current.x += (targetRef.current.x - ringPosRef.current.x) * 0.16;
      ringPosRef.current.y += (targetRef.current.y - ringPosRef.current.y) * 0.16;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${posRef.current.x - 3}px, ${posRef.current.y - 3}px, 0)`;
      }
      if (ringRef.current) {
        const hovering = stateRef.current.hovering;
        const scale = hovering ? 2.4 : 1;
        ringRef.current.style.transform = `translate3d(${ringPosRef.current.x - 14}px, ${ringPosRef.current.y - 14}px, 0) scale(${scale})`;
        ringRef.current.style.borderColor = hovering ? "rgba(139,92,246,0.9)" : "rgba(242,242,242,0.35)";
        ringRef.current.style.background = hovering ? "rgba(139,92,246,0.14)" : "transparent";
      }
      if (labelRef.current) {
        const label = stateRef.current.label;
        if (label) {
          labelRef.current.textContent = label;
          labelRef.current.style.opacity = "1";
          labelRef.current.style.transform = `translate3d(${targetRef.current.x + 20}px, ${targetRef.current.y + 20}px, 0)`;
        } else {
          labelRef.current.style.opacity = "0";
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={dotRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 6,
          height: 6,
          background: "#F2F2F2",
          borderRadius: 999,
          pointerEvents: "none",
          zIndex: 10000,
          mixBlendMode: "difference",
        }}
      />
      <div
        ref={ringRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 28,
          height: 28,
          border: "1px solid rgba(242,242,242,0.35)",
          borderRadius: 999,
          pointerEvents: "none",
          zIndex: 10000,
          transition: "border-color 180ms ease, background 180ms ease",
          willChange: "transform",
        }}
      />
      <div
        ref={labelRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#8B5CF6",
          background: "rgba(10,10,12,0.85)",
          padding: "4px 8px",
          border: "1px solid rgba(139,92,246,0.4)",
          pointerEvents: "none",
          zIndex: 10000,
          opacity: 0,
          transition: "opacity 200ms ease",
          willChange: "transform, opacity",
        }}
      />
    </>
  );
}
