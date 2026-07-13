import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

export default function Mentors() {
  const [items, setItems] = useState([]);
  const [spec, setSpec] = useState("");
  const [max, setMax] = useState("");
  useEffect(() => {
    const p = new URLSearchParams();
    if (spec) p.set("specialization", spec);
    if (max) p.set("max_rate", max);
    api.get(`/mentors?${p}`).then((r) => setItems(r.data.items)).catch(() => toast.error("Could not load mentors"));
  }, [spec, max]);
  const allSpecs = Array.from(new Set(items.flatMap((i) => i.specializations || [])));
  return (
    <AppShell breadcrumb="APP / MENTORS">
      <GridBackground />
      <div className="relative max-w-[1200px] mx-auto px-6 lg:px-10 py-16" data-testid="mentors-page">
        <header className="mb-12">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ MENTORS ]</div>
          <h1 className="font-display italic leading-[0.94] tracking-[-0.03em]" style={{ fontSize: "clamp(56px, 10vw, 128px)" }}>
            Book time with<br /><span style={{ color: "#8B5CF6" }}>people who did it.</span>
          </h1>
          <div className="mt-8 font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">{items.length} VERIFIED CAs · 1:1 SESSIONS</div>
        </header>
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <select value={spec} onChange={(e) => setSpec(e.target.value)} data-testid="mentors-spec-filter" className="bg-transparent border border-white/[0.08] px-3 py-1.5 font-mono uppercase tracking-[0.18em] text-[11px] text-white focus:border-[#8B5CF6] outline-none">
            <option value="">ALL SPECIALIZATIONS</option>
            {allSpecs.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={max} onChange={(e) => setMax(e.target.value)} type="number" placeholder="MAX ₹/HR" data-testid="mentors-max-rate" className="bg-transparent border border-white/[0.08] px-3 py-1.5 font-mono text-[12px] text-white placeholder:text-[#5A5A62] focus:border-[#8B5CF6] outline-none w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((m, i) => (
            <motion.div key={m.listing_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} data-testid={`mentor-card-${m.listing_id}`}>
              <Link to={`/mentors/${m.listing_id}`} className="block border border-white/[0.06] hover:border-[#8B5CF6] transition p-6 group">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#4C1D95] flex items-center justify-center font-bold text-[16px] shrink-0">{m.mentor_initials || "?"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-display italic text-[22px] text-white group-hover:text-[#8B5CF6] transition">{m.mentor_name}</span>
                      {m.is_verified_ca && <span className="font-mono uppercase tracking-[0.22em] text-[9px] text-[#B4FF39]">✓ CA</span>}
                    </div>
                    <div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62] mb-3">{m.mentor_city} · {m.total_bookings || 0} SESSIONS · ★ {m.avg_rating ?? "—"}</div>
                    <div className="font-body text-[13px] text-[#B0B0B8] leading-relaxed line-clamp-3">{m.bio_markdown}</div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(m.specializations || []).slice(0, 4).map((s) => <span key={s} className="font-mono uppercase tracking-[0.14em] text-[9.5px] text-[#5A5A62] border border-white/[0.06] px-1.5 py-0.5">{s}</span>)}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="font-display italic text-[22px] text-white">₹{m.hourly_rate_inr}<span className="text-[11px] text-white/50">/hr</span></div>
                      <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#B4FF39]">BOOK →</div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
