import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

const PATH_COLORS = ["#8B5CF6", "#B4FF39", "#F59E0B", "#10B981", "#EC4899", "#38BDF8", "#F97316", "#A78BFA"];

function PathSVG({ path, color, onNodeClick }) {
  const W = 900, H = 140;
  const nodes = path.nodes || [];
  const gap = W / Math.max(nodes.length, 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" data-testid={`career-path-svg-${path.key}`}>
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke={color} strokeOpacity="0.4" strokeWidth="1" strokeDasharray="4 4" />
      {nodes.map((n, i) => {
        const cx = gap * (i + 0.5);
        return (
          <g key={i} onClick={() => onNodeClick(n)} style={{ cursor: "pointer" }} data-testid={`career-node-${path.key}-${i}`}>
            <circle cx={cx} cy={H / 2} r={16} fill="#111114" stroke={color} strokeWidth="2" />
            <text x={cx} y={H / 2 + 4} textAnchor="middle" fill="#F2F2F2" style={{ font: "500 10px 'JetBrains Mono', monospace" }}>{n.years}y</text>
            <text x={cx} y={H / 2 - 26} textAnchor="middle" fill="#8B8B92" style={{ font: "italic 500 13px 'Instrument Serif', serif" }}>{n.name}</text>
            <text x={cx} y={H / 2 + 40} textAnchor="middle" fill="#5A5A62" style={{ font: "500 9.5px 'JetBrains Mono', monospace", letterSpacing: "0.14em" }}>₹{Math.round(n.salary_range[0] / 100000)}-{Math.round(n.salary_range[1] / 100000)}L</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Careers() {
  const [paths, setPaths] = useState([]);
  const [certs, setCerts] = useState([]);
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    Promise.all([api.get("/careers/paths"), api.get("/careers/compare-certs")])
      .then(([a, b]) => { setPaths(a.data.items); setCerts(b.data.items); })
      .catch(() => toast.error("Could not load careers"));
  }, []);
  return (
    <AppShell breadcrumb="APP / CAREERS">
      <GridBackground />
      <div className="relative max-w-[1200px] mx-auto px-6 lg:px-10 py-16" data-testid="careers-page">
        <header className="mb-14">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ CAREERS ]</div>
          <h1 className="font-display italic leading-[0.94] tracking-[-0.03em]" style={{ fontSize: "clamp(56px, 10vw, 128px)" }}>
            After the<br /><span style={{ color: "#8B5CF6" }}>letters.</span>
          </h1>
          <div className="mt-8 font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">
            {paths.length} CAREER PATHS · {certs.length} CERTIFICATIONS
          </div>
        </header>

        <div className="space-y-10 mb-16">
          {paths.map((p, i) => {
            const color = PATH_COLORS[i % PATH_COLORS.length];
            return (
              <motion.div key={p.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} data-testid={`career-path-${p.key}`} className="border-t border-white/[0.06] pt-8">
                <div className="flex items-baseline justify-between mb-4">
                  <div>
                    <span className="font-mono uppercase tracking-[0.22em] text-[10.5px]" style={{ color }}>[ PATH · {String(i + 1).padStart(2, "0")} ]</span>
                    <h2 className="mt-2 font-display italic text-[38px] leading-[1.05] text-white">{p.name}</h2>
                  </div>
                  <div className="hidden md:block font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">{p.nodes.length} STAGES</div>
                </div>
                <PathSVG path={p} color={color} onNodeClick={(n) => setSelected({ path: p, node: n })} />
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62] mb-1">NEXT CERTS</div>
                    <div className="font-body text-[13px] text-white/85">{(p.next_certs || []).join(" · ")}</div>
                  </div>
                  <div>
                    <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62] mb-1">EXIT PATHS</div>
                    <div className="font-body text-[13px] text-white/85">{(p.exit_paths || []).join(" · ")}</div>
                  </div>
                  <div>
                    <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62] mb-1">TYPICAL PROGRESSION</div>
                    <div className="font-body italic text-[13px] text-[#B0B0B8]">{p.typical_progression}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="border-t border-white/[0.06] pt-10">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-2">[ CERT COMPARISON ]</div>
              <h2 className="font-display italic text-[36px] text-white">CA vs the rest.</h2>
            </div>
            <Link to="/careers/certs" data-testid="careers-full-certs" className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#B4FF39] hover:text-white transition">FULL COMPARISON →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {certs.map((c) => (
              <div key={c.key} data-testid={`cert-${c.key}`} className="border border-white/[0.06] p-4">
                <div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#8B5CF6] mb-2">{c.name.split(" ")[0].toUpperCase()}</div>
                <div className="font-display italic text-[16px] text-white leading-tight mb-3">{c.name}</div>
                <div className="font-mono text-[10.5px] text-[#8B8B92]"><span className="text-[#5A5A62]">COST · </span>₹{(c.cost_inr / 100000).toFixed(1)}L</div>
                <div className="font-mono text-[10.5px] text-[#8B8B92]"><span className="text-[#5A5A62]">DURATION · </span>{c.duration_months}mo</div>
                <div className="font-mono text-[10.5px] text-[#8B8B92]"><span className="text-[#5A5A62]">PASS · </span>{c.pass_rate}</div>
                <div className="font-mono text-[10.5px] text-[#B4FF39]"><span className="text-[#5A5A62]">DIFFICULTY · </span>{c.difficulty_score}/10</div>
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <div className="fixed inset-0 z-40 bg-black/85 flex items-center justify-center p-6" onClick={() => setSelected(null)}>
            <div className="max-w-lg w-full border border-white/[0.08] bg-[#111114] p-8" onClick={(e) => e.stopPropagation()} data-testid="career-node-drawer">
              <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] mb-1">[ {selected.path.name.toUpperCase()} · YEAR {selected.node.years} ]</div>
              <h3 className="font-display italic text-[36px] text-white mb-3">{selected.node.name}</h3>
              <div className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#B4FF39] mb-4">SALARY · ₹{Math.round(selected.node.salary_range[0] / 100000)}-{Math.round(selected.node.salary_range[1] / 100000)}L{selected.node.extras ? " " + selected.node.extras : ""}</div>
              <div className="font-body text-[14px] text-[#B0B0B8]">
                <p><span className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">SKILLS · </span>{(selected.path.required_skills || []).join(" · ")}</p>
              </div>
              <button onClick={() => setSelected(null)} className="mt-6 font-mono uppercase tracking-[0.22em] text-[10.5px] text-white/60 hover:text-white transition">[ CLOSE ]</button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
