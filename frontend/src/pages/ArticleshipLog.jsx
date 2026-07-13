import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

const PAPER_HINTS = ["F1", "F2", "F3", "F4", "I1", "I2", "I3", "I4", "I5", "I6", "P1", "P2", "P3", "P4", "P5", "P6"];

export default function ArticleshipLog() {
  const [logs, setLogs] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [totalHours, setTotalHours] = useState(0);
  const [correlation, setCorrelation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    log_date: new Date().toISOString().slice(0, 10),
    hours: 6,
    paper_code: "I5",
    topic_tags: "",
    description: "",
  });

  const load = () => {
    Promise.all([api.get("/articleship/practical-log"), api.get("/articleship/practical-to-syllabus")]).then(([a, b]) => {
      setLogs(a.data.items || []);
      setWeekly(a.data.weekly || []);
      setTotalHours(a.data.total_hours || 0);
      setCorrelation(b.data);
    }).catch(() => toast.error("Could not load logs"));
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (form.description.trim().length < 5) return toast.error("Describe your work (5+ chars)");
    setBusy(true);
    try {
      await api.post("/articleship/practical-log", {
        log_date: form.log_date,
        hours: Number(form.hours),
        paper_code: form.paper_code || null,
        topic_tags: form.topic_tags.split(",").map((t) => t.trim()).filter(Boolean),
        description: form.description,
      });
      toast.success("Log added");
      setForm({ ...form, description: "", topic_tags: "" });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not add");
    } finally {
      setBusy(false);
    }
  };

  const maxW = Math.max(1, ...weekly.map((w) => w.hours));

  return (
    <AppShell breadcrumb="APP / ARTICLESHIP / LOG">
      <GridBackground />
      <div className="relative max-w-[1200px] mx-auto px-6 lg:px-10 py-16" data-testid="articleship-log-page">
        <Link to="/articleship" className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62] hover:text-white transition" data-testid="log-back">← BACK TO ARTICLESHIP</Link>
        <header className="mt-6 mb-12">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ PRACTICAL LOG ]</div>
          <h1 className="font-display italic leading-[0.96] tracking-[-0.03em]" style={{ fontSize: "clamp(48px, 8vw, 108px)" }}>
            Log the work.<br /><span style={{ color: "#8B5CF6" }}>See the pattern.</span>
          </h1>
          <div className="mt-8 font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">
            TOTAL · {totalHours.toFixed(1)} HRS LOGGED · {logs.length} ENTRIES
          </div>
        </header>

        <div className="border border-white/[0.06] p-6 mb-10" data-testid="log-form">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-3">[ NEW ENTRY ]</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input type="date" data-testid="log-date" value={form.log_date} onChange={(e) => setForm({ ...form, log_date: e.target.value })} className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[13px] text-white focus:border-[#8B5CF6] outline-none" />
            <input type="number" step="0.25" min="0.25" max="16" data-testid="log-hours" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[13px] text-white focus:border-[#8B5CF6] outline-none" placeholder="HOURS" />
            <select data-testid="log-paper" value={form.paper_code} onChange={(e) => setForm({ ...form, paper_code: e.target.value })} className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono uppercase tracking-[0.18em] text-[11px] text-white focus:border-[#8B5CF6] outline-none">
              <option value="">— PAPER —</option>
              {PAPER_HINTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="text" data-testid="log-tags" value={form.topic_tags} onChange={(e) => setForm({ ...form, topic_tags: e.target.value })} placeholder="TAGS (comma sep.)" className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono uppercase tracking-[0.14em] text-[11px] text-white placeholder:text-[#5A5A62] focus:border-[#8B5CF6] outline-none" />
          </div>
          <textarea rows={3} data-testid="log-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What did you actually do today?" className="mt-3 w-full bg-transparent border border-white/[0.08] px-3 py-2 font-body text-[14px] text-white focus:border-[#8B5CF6] outline-none" />
          <button disabled={busy} onClick={submit} data-testid="log-submit" className="mt-4 px-5 py-2 font-mono uppercase tracking-[0.22em] text-[10.5px] border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition disabled:opacity-50">
            {busy ? "[ ADDING… ]" : "[ ADD LOG → ]"}
          </button>
        </div>

        {weekly.length > 0 && (
          <div className="mb-12">
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ WEEKLY HOURS ]</div>
            <div className="flex gap-2 items-end h-[140px] border-b border-white/[0.06]" data-testid="log-weekly-chart">
              {weekly.slice(-16).map((w) => (
                <div key={w.week_start} className="flex-1 flex flex-col items-center gap-1" title={`${w.week_start}: ${w.hours}h`}>
                  <div className="w-full bg-[#8B5CF6]/40 border-t border-[#8B5CF6]" style={{ height: `${(w.hours / maxW) * 100}%`, minHeight: "3px" }} />
                  <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#5A5A62]">{w.week_start.slice(5)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {correlation?.correlations?.length > 0 && (
          <div className="mb-12" data-testid="log-correlation">
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ PRACTICAL → SYLLABUS MATCHES ]</div>
            <div className="divide-y divide-white/[0.06]">
              {correlation.correlations.slice(0, 12).map((c) => (
                <div key={c.tag} className="py-4 grid grid-cols-1 md:grid-cols-[200px_120px_1fr] gap-4 items-center">
                  <div className="font-mono uppercase tracking-[0.22em] text-[11.5px] text-white">{c.tag}</div>
                  <div className="font-mono tabular-nums text-[12px] text-[#B4FF39]">{c.hours}h · {c.log_count} logs</div>
                  <div className="font-mono uppercase tracking-[0.18em] text-[10px] text-[#8B8B92]">
                    {(c.syllabus_matches || []).slice(0, 3).map((m) => `${m.paper_code} · ${m.chapter_title}`).join(" ; ") || "no direct match"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ LOG HISTORY ]</div>
          <div className="divide-y divide-white/[0.06]" data-testid="log-history">
            {logs.length === 0 && <div className="py-6 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">no logs yet.</div>}
            {logs.map((l) => (
              <motion.div key={l.log_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-5 grid grid-cols-[110px_80px_1fr] gap-4">
                <div className="font-mono tabular-nums text-[12px] text-white/80">{l.log_date}</div>
                <div className="font-mono tabular-nums text-[12px] text-[#B4FF39]">{l.hours}h</div>
                <div>
                  {l.paper_code && <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] mr-2">[ {l.paper_code} ]</span>}
                  <span className="font-body text-[14px] text-white/90">{l.description}</span>
                  {(l.topic_tags || []).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {l.topic_tags.map((t) => <span key={t} className="font-mono uppercase tracking-[0.18em] text-[9px] text-[#5A5A62] border border-white/[0.06] px-1.5 py-0.5">{t}</span>)}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
