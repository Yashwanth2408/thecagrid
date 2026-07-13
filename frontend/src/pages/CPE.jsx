import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

const STATUS_COLORS = { compliant: "#10B981", at_risk: "#F59E0B", non_compliant: "#FF6B6B" };

function Ring({ percent = 0, label, subtitle, color = "#8B5CF6" }) {
  const size = 220, stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(100, Math.max(0, percent)) / 100);
  return (
    <svg width={size} height={size} className="block">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 1s ease" }} />
      <text x="50%" y="46%" textAnchor="middle" fill="#F2F2F2" style={{ font: "italic 700 46px 'Instrument Serif', serif" }}>{Math.round(percent)}<tspan style={{ font: "500 14px 'JetBrains Mono', monospace", fill: "#8B8B92" }}>%</tspan></text>
      <text x="50%" y="60%" textAnchor="middle" fill="#5A5A62" style={{ font: "500 10px 'JetBrains Mono', monospace", letterSpacing: "0.22em" }}>{(label || "").toUpperCase()}</text>
      {subtitle && <text x="50%" y="70%" textAnchor="middle" fill="#8B8B92" style={{ font: "500 10.5px 'JetBrains Mono', monospace" }}>{subtitle}</text>}
    </svg>
  );
}

export default function CPE() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ title: "", hours: 1, category: "structured", source: "ICAI webinar", date_completed: new Date().toISOString().slice(0, 10) });
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/cpe/records").then((r) => setData(r.data)).catch(() => toast.error("Could not load"));
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (form.title.trim().length < 3) return toast.error("Title too short");
    setBusy(true);
    try {
      await api.post("/cpe/records", { ...form, hours: Number(form.hours) });
      toast.success("Record added");
      setForm({ ...form, title: "", hours: 1 });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Could not add"); } finally { setBusy(false); }
  };
  const del = async (rid) => {
    try { await api.delete(`/cpe/records/${rid}`); toast.success("Deleted"); load(); }
    catch { toast.error("Could not delete"); }
  };
  const exportJson = async () => {
    try {
      const r = await api.get("/cpe/export");
      const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `cpe_export_${new Date().getFullYear()}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Could not export"); }
  };

  if (!data) return <AppShell breadcrumb="APP / CPE"><div className="p-16 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div></AppShell>;
  const s = data.summary;
  const pct = Math.min(100, (s.total_hours_ytd / Math.max(1, s.requirement_ytd)) * 100);

  return (
    <AppShell breadcrumb="APP / CPE">
      <GridBackground />
      <div className="relative max-w-[1100px] mx-auto px-6 lg:px-10 py-16" data-testid="cpe-page">
        <header className="mb-12">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ CPE TRACKER ]</div>
          <h1 className="font-display italic leading-[0.94] tracking-[-0.03em]" style={{ fontSize: "clamp(56px, 10vw, 128px)" }}>
            Hours logged.<br /><span style={{ color: "#8B5CF6" }}>Compliance clean.</span>
          </h1>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 items-center mb-12">
          <Ring percent={pct} label={s.compliance_status.toUpperCase()} subtitle={`${s.total_hours_ytd} / ${s.requirement_ytd} HRS`} color={STATUS_COLORS[s.compliance_status]} />
          <div>
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px]" style={{ color: STATUS_COLORS[s.compliance_status] }}>[ {s.compliance_status.replace("_", " ").toUpperCase()} ]</div>
            <div className="mt-2 font-display italic text-[42px] text-white leading-tight">{s.total_hours_ytd}<span className="text-[16px] text-white/50"> / {s.requirement_ytd} hrs YTD</span></div>
            <div className="mt-4 grid grid-cols-2 gap-6">
              <div><div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">STRUCTURED</div><div className="font-display italic text-[26px] text-white">{s.structured_hours}h</div></div>
              <div><div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">UNSTRUCTURED</div><div className="font-display italic text-[26px] text-white">{s.unstructured_hours}h</div></div>
            </div>
            <button onClick={exportJson} data-testid="cpe-export" className="mt-6 px-4 py-2 font-mono uppercase tracking-[0.22em] text-[10.5px] border border-white/[0.1] text-white/70 hover:border-[#8B5CF6] hover:text-[#8B5CF6] transition">[ EXPORT JSON ]</button>
          </div>
        </div>

        <div className="border border-white/[0.06] p-5 mb-10" data-testid="cpe-add-form">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-3">[ ADD CPE RECORD ]</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title (e.g. IFRS 16 Webinar)" data-testid="cpe-title" className="bg-transparent border border-white/[0.08] px-3 py-2 font-body text-[14px] text-white focus:border-[#8B5CF6] outline-none" />
            <input type="number" step="0.25" min="0.25" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} data-testid="cpe-hours" placeholder="HOURS" className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[13px] text-white focus:border-[#8B5CF6] outline-none" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} data-testid="cpe-category" className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono uppercase tracking-[0.18em] text-[11px] text-white focus:border-[#8B5CF6] outline-none">
              <option value="structured">STRUCTURED</option><option value="unstructured">UNSTRUCTURED</option>
            </select>
            <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Source" data-testid="cpe-source" className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[12px] text-white focus:border-[#8B5CF6] outline-none" />
            <input type="date" value={form.date_completed} onChange={(e) => setForm({ ...form, date_completed: e.target.value })} data-testid="cpe-date" className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[13px] text-white focus:border-[#8B5CF6] outline-none" />
          </div>
          <button disabled={busy} onClick={add} data-testid="cpe-add" className="mt-4 px-5 py-2 font-mono uppercase tracking-[0.22em] text-[10.5px] border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition disabled:opacity-50">
            {busy ? "[ ADDING… ]" : "[ ADD RECORD → ]"}
          </button>
        </div>

        <div>
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ RECORDS · {data.items.length} ]</div>
          <div className="divide-y divide-white/[0.06]" data-testid="cpe-records-list">
            {data.items.length === 0 && <div className="py-6 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">no records logged yet.</div>}
            {data.items.map((r) => (
              <motion.div key={r.record_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-5 grid grid-cols-[100px_1fr_100px_60px] gap-4 items-center" data-testid={`cpe-record-${r.record_id}`}>
                <div className="font-mono tabular-nums text-[12px] text-white/80">{r.date_completed}</div>
                <div>
                  <div className="font-display italic text-[18px] text-white leading-tight">{r.title}</div>
                  <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62] mt-1">{r.category.toUpperCase()} · {r.source}</div>
                </div>
                <div className="font-display italic text-[24px] text-[#B4FF39]">{r.hours}h</div>
                <button onClick={() => del(r.record_id)} data-testid={`cpe-delete-${r.record_id}`} className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62] hover:text-[#FF6B6B] transition">DELETE</button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
