import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

const TIERS = [
  { key: "all", label: "ALL" },
  { key: "big4", label: "BIG 4" },
  { key: "midtier", label: "MID-TIER" },
  { key: "boutique", label: "BOUTIQUE" },
  { key: "industry", label: "INDUSTRY" },
];

const SORTS = [
  { key: "wlb_desc", label: "WLB" },
  { key: "learning_desc", label: "LEARNING" },
  { key: "exit_desc", label: "EXIT OPS" },
  { key: "stipend_desc", label: "STIPEND" },
];

function Bar({ label, value }) {
  const pct = Math.max(0, Math.min(100, (Number(value || 0) / 10) * 100));
  return (
    <div className="min-w-[110px]">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#5A5A62] mb-1">{label}</div>
      <div className="h-[3px] bg-white/[0.06]">
        <div className="h-full bg-[#8B5CF6]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Firms() {
  const [firms, setFirms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState("all");
  const [sort, setSort] = useState("wlb_desc");
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tier !== "all") params.set("tier", tier);
    params.set("sort", sort);
    if (q) params.set("q", q);
    if (city) params.set("city", city);
    api.get(`/firms?${params}`)
      .then((r) => setFirms(r.data.items || []))
      .catch(() => toast.error("Could not load firms"))
      .finally(() => setLoading(false));
  }, [tier, sort, q, city]);

  const cities = useMemo(() => {
    const s = new Set();
    firms.forEach((f) => (f.cities || []).forEach((c) => s.add(c)));
    return Array.from(s).sort();
  }, [firms]);

  return (
    <AppShell breadcrumb="APP / FIRMS">
      <GridBackground />
      <div className="relative max-w-[1200px] mx-auto px-6 lg:px-10 py-16" data-testid="firms-page">
        <header className="mb-12">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ FIRM REVIEWS ]</div>
          <h1 className="font-display italic leading-[0.94] tracking-[-0.03em]" style={{ fontSize: "clamp(56px, 10vw, 128px)" }}>
            Where you<br /><span style={{ color: "#8B5CF6" }}>work matters.</span>
          </h1>
          <div className="mt-8 font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">
            {firms.length} FIRMS · CROWD-VERIFIED REVIEWS · WLB · LEARNING · EXIT OPS
          </div>
        </header>

        <div className="flex flex-wrap gap-2 mb-6" data-testid="firms-tier-filters">
          {TIERS.map((t) => (
            <button
              key={t.key}
              data-testid={`firms-tier-${t.key}`}
              onClick={() => setTier(t.key)}
              className="px-3 py-1.5 font-mono uppercase tracking-[0.22em] text-[10.5px] transition"
              style={{
                color: tier === t.key ? "#0A0A0C" : "#8B8B92",
                background: tier === t.key ? "#B4FF39" : "transparent",
                border: `1px solid ${tier === t.key ? "#B4FF39" : "rgba(255,255,255,0.1)"}`,
              }}
            >{t.label}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
          <input
            data-testid="firms-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="SEARCH FIRM…"
            className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono uppercase tracking-[0.18em] text-[11px] text-[#F2F2F2] placeholder:text-[#5A5A62] focus:border-[#8B5CF6] outline-none"
          />
          <select
            data-testid="firms-city-filter"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono uppercase tracking-[0.18em] text-[11px] text-[#F2F2F2] focus:border-[#8B5CF6] outline-none"
          >
            <option value="">ALL CITIES</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            data-testid="firms-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono uppercase tracking-[0.18em] text-[11px] text-[#F2F2F2] focus:border-[#8B5CF6] outline-none"
          >
            {SORTS.map((s) => <option key={s.key} value={s.key}>SORT · {s.label}</option>)}
          </select>
        </div>

        {loading && <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div>}
        {!loading && firms.length === 0 && <div className="py-24 text-center font-display italic text-[40px] text-white/50" data-testid="firms-empty">no firms match this filter.</div>}
        <div className="divide-y divide-white/[0.06]">
          {firms.map((f) => (
            <motion.div
              key={f.slug}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              data-testid={`firm-card-${f.slug}`}
              className="py-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center hover:bg-white/[0.02] transition"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] border border-[#8B5CF6]/30 px-2 py-0.5">[ {f.tier.toUpperCase()} ]</span>
                  <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">{(f.cities || []).slice(0, 3).join(" · ")}{(f.cities || []).length > 3 ? ` +${f.cities.length - 3}` : ""}</span>
                </div>
                <Link to={`/firms/${f.slug}`} className="block">
                  <h2 className="font-display italic text-[24px] md:text-[28px] leading-[1.1] text-white/95 hover:text-[#8B5CF6] transition">{f.name}</h2>
                </Link>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Bar label="WLB" value={f.wlb_score} />
                  <Bar label="LEARNING" value={f.learning_score} />
                  <Bar label="EXIT OPS" value={f.exit_ops_score} />
                  <div>
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#5A5A62] mb-1">STIPEND (Y1)</div>
                    <div className="font-mono tabular-nums text-[13px] text-white/90">₹{Math.round((f.stipend_first_year_min || 0) / 1000)}-{Math.round((f.stipend_first_year_max || 0) / 1000)}k</div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">{f.review_summary?.reviews || 0} REVIEW{(f.review_summary?.reviews || 0) === 1 ? "" : "S"}</div>
                <div className="font-display italic text-[36px] text-white leading-tight">{f.review_summary?.avg_overall ?? "—"}<span className="text-[14px] text-white/50">/10</span></div>
                <Link to={`/firms/${f.slug}`} data-testid={`firm-view-${f.slug}`} className="mt-2 inline-block font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#B4FF39] hover:text-white transition">
                  VIEW REVIEWS →
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
