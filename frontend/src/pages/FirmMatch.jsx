import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

const GOALS = [
  { key: "big4", label: "BIG 4 · BRAND + EXIT OPS" },
  { key: "midtier", label: "MID-TIER · RAPID GROWTH" },
  { key: "boutique", label: "BOUTIQUE · DEEP LEARNING" },
  { key: "industry", label: "INDUSTRY · CORPORATE ROTATION" },
];

const AREAS = ["taxation", "audit", "advisory", "risk", "transfer_pricing", "IFRS", "forensic", "GST", "ma"];

export default function FirmMatch() {
  const [goal, setGoal] = useState("midtier");
  const [city, setCity] = useState("");
  const [minStipend, setMinStipend] = useState(10000);
  const [wlbMin, setWlbMin] = useState(6);
  const [learningMin, setLearningMin] = useState(7);
  const [areas, setAreas] = useState(new Set(["audit"]));
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggle = (a) => {
    const nx = new Set(areas);
    if (nx.has(a)) nx.delete(a); else nx.add(a);
    setAreas(nx);
  };

  const run = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("goal", goal);
      if (city) params.set("city", city);
      if (minStipend) params.set("min_stipend", String(minStipend));
      if (wlbMin) params.set("wlb_min", String(wlbMin));
      if (learningMin) params.set("learning_min", String(learningMin));
      if (areas.size) params.set("practice_areas", Array.from(areas).join(","));
      const r = await api.get(`/articleship/firm-match?${params}`);
      setResults(r.data.items || []);
      if ((r.data.items || []).length === 0) toast.info("No matches. Try broadening your criteria.");
    } catch (e) {
      toast.error("Could not run match");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell breadcrumb="APP / FIRM MATCH">
      <GridBackground />
      <div className="relative max-w-[1200px] mx-auto px-6 lg:px-10 py-16" data-testid="firm-match-page">
        <header className="mb-12">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ FIRM MATCH ]</div>
          <h1 className="font-display italic leading-[0.96] tracking-[-0.03em]" style={{ fontSize: "clamp(56px, 10vw, 128px)" }}>
            Tell me what<br /><span style={{ color: "#8B5CF6" }}>you want.</span>
          </h1>
        </header>

        <div className="border border-white/[0.06] p-6 mb-10" data-testid="match-form">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-3">[ YOUR GOAL ]</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {GOALS.map((g) => (
              <button
                key={g.key}
                data-testid={`match-goal-${g.key}`}
                onClick={() => setGoal(g.key)}
                className="text-left px-4 py-3 font-mono uppercase tracking-[0.22em] text-[10.5px] transition"
                style={{
                  color: goal === g.key ? "#0A0A0C" : "#F2F2F2",
                  background: goal === g.key ? "#B4FF39" : "transparent",
                  border: `1px solid ${goal === g.key ? "#B4FF39" : "rgba(255,255,255,0.08)"}`,
                }}
              >{g.label}</button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
            <div>
              <label className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">CITY</label>
              <input type="text" data-testid="match-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai" className="mt-1 w-full bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[13px] text-white focus:border-[#8B5CF6] outline-none" />
            </div>
            <div>
              <label className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">MIN STIPEND ₹</label>
              <input type="number" data-testid="match-stipend" value={minStipend} onChange={(e) => setMinStipend(Number(e.target.value))} className="mt-1 w-full bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[13px] text-white focus:border-[#8B5CF6] outline-none" />
            </div>
            <div>
              <label className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">MIN WLB (0-10)</label>
              <input type="number" step="0.5" min="0" max="10" data-testid="match-wlb" value={wlbMin} onChange={(e) => setWlbMin(Number(e.target.value))} className="mt-1 w-full bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[13px] text-white focus:border-[#8B5CF6] outline-none" />
            </div>
            <div>
              <label className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">MIN LEARNING</label>
              <input type="number" step="0.5" min="0" max="10" data-testid="match-learning" value={learningMin} onChange={(e) => setLearningMin(Number(e.target.value))} className="mt-1 w-full bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[13px] text-white focus:border-[#8B5CF6] outline-none" />
            </div>
          </div>

          <div className="mb-4">
            <div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62] mb-2">PRACTICE AREAS</div>
            <div className="flex flex-wrap gap-2" data-testid="match-areas">
              {AREAS.map((a) => (
                <button
                  key={a}
                  data-testid={`match-area-${a}`}
                  onClick={() => toggle(a)}
                  className="px-3 py-1 font-mono uppercase tracking-[0.22em] text-[10px] transition"
                  style={{
                    color: areas.has(a) ? "#0A0A0C" : "#8B8B92",
                    background: areas.has(a) ? "#8B5CF6" : "transparent",
                    border: `1px solid ${areas.has(a) ? "#8B5CF6" : "rgba(255,255,255,0.06)"}`,
                  }}
                >{a}</button>
              ))}
            </div>
          </div>

          <button disabled={loading} onClick={run} data-testid="match-run" className="px-6 py-2.5 font-mono uppercase tracking-[0.22em] text-[11px] border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition disabled:opacity-50">
            {loading ? "[ MATCHING… ]" : "[ FIND MY FIRMS → ]"}
          </button>
        </div>

        {results.length > 0 && (
          <div>
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ TOP MATCHES ]</div>
            <div className="divide-y divide-white/[0.06]" data-testid="match-results">
              {results.map((r, i) => (
                <motion.div key={r.firm.slug} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="py-6 grid grid-cols-[64px_1fr_auto] gap-6 items-center">
                  <div className="font-display italic text-[42px] text-[#8B5CF6] leading-none">#{i + 1}</div>
                  <div>
                    <Link to={`/firms/${r.firm.slug}`} className="font-display italic text-[24px] text-white hover:text-[#8B5CF6] transition" data-testid={`match-firm-${r.firm.slug}`}>{r.firm.name}</Link>
                    <div className="mt-2 font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">{r.firm.tier.toUpperCase()} · {(r.firm.cities || []).slice(0, 3).join(" · ")}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.breakdown.map(([tag, pts]) => (
                        <span key={tag} className="font-mono uppercase tracking-[0.14em] text-[9px] text-[#B4FF39] border border-[#B4FF39]/30 px-1.5 py-0.5">+{pts} · {tag.replace(/_/g, " ")}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display italic text-[36px] text-white leading-tight">{r.match_score}<span className="text-[12px] text-white/50">/100</span></div>
                    <div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62] mt-1">MATCH</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
