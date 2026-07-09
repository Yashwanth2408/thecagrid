import { useEffect, useRef, useState } from "react";

/**
 * Count-up hook that eases from `from` -> `to` over `duration`ms.
 * Won't re-count if `to` didn't change materially. Kicks off on mount
 * or when `to` changes (starts from previous displayed value).
 */
export default function useCountUp(to, { duration = 1200, decimals = 0 } = {}) {
  const [display, setDisplay] = useState(to || 0);
  const prevRef = useRef(display);
  useEffect(() => {
    const from = prevRef.current;
    if (from === to) return;
    let raf;
    let start;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = from + (to - from) * eased;
      setDisplay(val);
      if (p < 1) raf = requestAnimationFrame(step);
      else prevRef.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return decimals
    ? Number(display).toFixed(decimals)
    : Math.floor(display).toLocaleString();
}
