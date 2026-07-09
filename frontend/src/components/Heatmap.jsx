import React, { useMemo, useState } from "react";

/**
 * GitHub-style contribution heatmap.
 * Props:
 *  - data: array of {date:"YYYY-MM-DD", minutes:number, sessions:number}
 *  - weeks: number (default computed from data length)
 *  - showLegend: bool
 */
export default function Heatmap({ data = [], weeks, showLegend = true, cellSize = 12, gap = 3, testId }) {
  const [tooltip, setTooltip] = useState(null); // {left, top, text}

  // Pad to start on Sunday
  const grid = useMemo(() => {
    if (!data.length) return { cells: [], cols: 0 };
    const firstDate = new Date(data[0].date + "T00:00:00");
    const firstDow = firstDate.getUTCDay(); // 0=Sun
    const padded = Array(firstDow).fill(null).concat(data);
    const cols = Math.ceil(padded.length / 7);
    return { cells: padded, cols };
  }, [data]);

  const level = (m) => {
    if (!m) return 0;
    if (m < 15) return 1;
    if (m < 45) return 2;
    if (m < 90) return 3;
    if (m < 180) return 4;
    return 5;
  };
  const color = (lv) => {
    if (lv === 0) return "rgba(255,255,255,0.04)";
    if (lv === 1) return "rgba(139,92,246,0.20)";
    if (lv === 2) return "rgba(139,92,246,0.40)";
    if (lv === 3) return "rgba(139,92,246,0.65)";
    if (lv === 4) return "rgba(139,92,246,0.85)";
    return "#B4FF39";
  };

  const rows = 7;
  const cols = grid.cols || Math.max(1, Math.ceil(data.length / 7));
  const totalW = cols * (cellSize + gap);
  const totalH = rows * (cellSize + gap);

  return (
    <div className="relative" data-testid={testId}>
      <svg
        width="100%"
        viewBox={`0 0 ${totalW} ${totalH}`}
        preserveAspectRatio="xMinYMid meet"
        style={{ display: "block" }}
      >
        {grid.cells.map((cell, i) => {
          const col = Math.floor(i / 7);
          const row = i % 7;
          const x = col * (cellSize + gap);
          const y = row * (cellSize + gap);
          if (!cell) return <rect key={i} x={x} y={y} width={cellSize} height={cellSize} fill="transparent" />;
          const lv = level(cell.minutes);
          const staggerDelay = Math.min(600, i * 3);
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={cellSize}
              height={cellSize}
              rx={2}
              fill={color(lv)}
              data-testid="heatmap-cell"
              style={{
                animation: `fadeIn 260ms ease ${staggerDelay}ms both`,
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({
                  left: rect.left + rect.width + 8,
                  top: rect.top - 8,
                  text: `${new Date(cell.date + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" })} · ${cell.minutes} MIN · ${cell.sessions} SESSION${cell.sessions === 1 ? "" : "S"}`,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}
      </svg>

      {showLegend && (
        <div className="mt-4 flex items-center gap-2 font-mono uppercase tracking-[0.2em] text-[10px] text-[#5A5A62]">
          <span>less</span>
          {[0, 1, 2, 3, 4, 5].map((lv) => (
            <span key={lv} style={{ width: cellSize, height: cellSize, background: color(lv), borderRadius: 2, display: "inline-block" }} />
          ))}
          <span>more</span>
        </div>
      )}

      {tooltip && (
        <div
          className="fixed z-[10001] pointer-events-none font-mono uppercase tracking-[0.18em] text-[10px] text-[#F2F2F2] bg-[#0A0A0C] border border-[#8B5CF6]/50 px-2.5 py-1.5 whitespace-nowrap"
          style={{ left: tooltip.left, top: tooltip.top }}
        >
          {tooltip.text}
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}
