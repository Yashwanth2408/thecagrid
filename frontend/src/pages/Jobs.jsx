import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

const TYPES = [
  { key: "", label: "ALL" },
  { key: "full_time", label: "FULL-TIME" },
  { key: "contract", label: "CONTRACT" },
  { key: "referral", label: "REFERRAL" },
];

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (q) params.set("q", q);
    if (location) params.set("location", location);
    Promise.all([
      api.get(`/jobs?${params}`),
      api.get("/jobs/saved").catch(() => ({ data: { items: [] } })),
    ]).then(([a, b]) => {
      setJobs(a.data.items || []);
      setSavedIds(new Set((b.data.items || []).map((j) => j.job_id)));
    }).catch(() => toast.error("Could not load jobs")).finally(() => setLoading(false));
  };
  useEffect(load, [type, q, location]);

  const toggleSave = async (id) => {
    try {
      const r = await api.post("/jobs/save", { job_id: id });
      const s = new Set(savedIds);
      r.data.saved ? s.add(id) : s.delete(id);
      setSavedIds(s);
      toast.success(r.data.saved ? "Saved" : "Unsaved");
    } catch { toast.error("Could not save"); }
  };

  return (
    <AppShell breadcrumb="APP / JOBS">
      <GridBackground />
      <div className="relative max-w-[1200px] mx-auto px-6 lg:px-10 py-16" data-testid="jobs-page">
        <header className="mb-12">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ JOBS ]</div>
          <h1 className="font-display italic leading-[0.94] tracking-[-0.03em]" style={{ fontSize: "clamp(56px, 10vw, 128px)" }}>
            Roles worth<br /><span style={{ color: "#8B5CF6" }}>reading.</span>
          </h1>
          <div className="mt-8 font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">
            {jobs.length} OPEN · {savedIds.size} SAVED
          </div>
        </header>

        <div className="flex flex-wrap gap-2 mb-4">
          {TYPES.map((t) => (
            <button key={t.key} data-testid={`jobs-type-${t.key || "all"}`} onClick={() => setType(t.key)} className="px-3 py-1.5 font-mono uppercase tracking-[0.22em] text-[10.5px] transition" style={{
              color: type === t.key ? "#0A0A0C" : "#8B8B92",
              background: type === t.key ? "#B4FF39" : "transparent",
              border: `1px solid ${type === t.key ? "#B4FF39" : "rgba(255,255,255,0.1)"}`,
            }}>{t.label}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="SEARCH JOBS…" data-testid="jobs-search" className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono uppercase tracking-[0.18em] text-[11px] text-white placeholder:text-[#5A5A62] focus:border-[#8B5CF6] outline-none" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="LOCATION (Mumbai, Delhi…)" data-testid="jobs-location" className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono uppercase tracking-[0.18em] text-[11px] text-white placeholder:text-[#5A5A62] focus:border-[#8B5CF6] outline-none" />
        </div>

        {loading && <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div>}
        <div className="divide-y divide-white/[0.06]">
          {jobs.map((j, i) => (
            <motion.div key={j.job_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="py-6 grid grid-cols-1 md:grid-cols-[1fr_140px] gap-6" data-testid={`job-${j.job_id}`}>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] border border-[#8B5CF6]/30 px-2 py-0.5">[ {j.type.toUpperCase().replace("_", " ")} ]</span>
                  {j.is_sponsored && <span className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#B4FF39] border border-[#B4FF39]/30 px-2 py-0.5">SPONSORED</span>}
                  <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">{j.location}</span>
                </div>
                <Link to={`/jobs/${j.job_id}`} className="font-display italic text-[26px] leading-tight text-white hover:text-[#8B5CF6] transition">{j.title}</Link>
                <div className="mt-1 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B8B92]">{j.company} · {j.experience_min}-{j.experience_max} YRS EXP</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(j.domain || []).map((d) => <span key={d} className="font-mono uppercase tracking-[0.14em] text-[9.5px] text-[#5A5A62] border border-white/[0.06] px-1.5 py-0.5">{d}</span>)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display italic text-[24px] text-white leading-tight">₹{Math.round(j.salary_min / 100000)}-{Math.round(j.salary_max / 100000)}L</div>
                <div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">PER ANNUM</div>
                <button onClick={() => toggleSave(j.job_id)} data-testid={`job-save-${j.job_id}`} className="mt-3 font-mono uppercase tracking-[0.22em] text-[10px] px-2 py-1" style={{
                  color: savedIds.has(j.job_id) ? "#0A0A0C" : "#B4FF39",
                  background: savedIds.has(j.job_id) ? "#B4FF39" : "transparent",
                  border: "1px solid #B4FF39",
                }}>{savedIds.has(j.job_id) ? "[ SAVED ✓ ]" : "[ SAVE ]"}</button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
