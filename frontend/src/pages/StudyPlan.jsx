import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/apiClient";
import { streamSSE } from "@/lib/streamSSE";
import { useAuth } from "@/context/AuthContext";

export default function StudyPlan() {
  const { user } = useAuth();
  const defaultSubjects = user?.subjects?.length ? user.subjects : ["Advanced Accounts", "Costing"];
  const [existing, setExisting] = useState(null);
  const [examDate, setExamDate] = useState(() => new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10));
  const [dailyHours, setDailyHours] = useState(4);
  const [weakAreas, setWeakAreas] = useState(defaultSubjects.slice(0, 2));
  const [customWeak, setCustomWeak] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    api.get("/study-plan/active").then((r) => {
      setExisting(r.data);
      setShowForm(!r.data);
    }).catch(() => setShowForm(true));
  }, []);

  const generate = async () => {
    setBusy(true);
    setError("");
    setStatus("opening…");
    try {
      let plan = null;
      for await (const ev of streamSSE("/study-plan/generate", {
        exam_date: examDate,
        daily_hours: dailyHours,
        weak_areas: weakAreas,
      })) {
        if (ev.type === "start") setStatus("drafting…");
        else if (ev.type === "progress") setStatus(ev.message || "working…");
        else if (ev.type === "done") plan = ev.plan;
        else if (ev.type === "error") { setError(ev.error || "Generation failed"); break; }
      }
      if (plan) {
        setExisting(plan);
        setShowForm(false);
      } else if (!error) {
        setError("No plan returned");
      }
    } catch (e) {
      setError(e?.message || "Generation failed");
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  const archive = async () => {
    if (!existing?.plan_id) return;
    await api.post(`/study-plan/${existing.plan_id}/archive`).catch(() => {});
    setExisting(null);
    setShowForm(true);
  };

  const toggleWeak = (s) => {
    setWeakAreas((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  };
  const addCustom = () => {
    const s = customWeak.trim();
    if (s && !weakAreas.includes(s)) setWeakAreas((cur) => [...cur, s]);
    setCustomWeak("");
  };

  return (
    <AppShell breadcrumb="DASHBOARD / MENTOR / STUDY PLAN">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-12">
        <div className="mb-10">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">[ study plan ]</div>
          <h1 className="mt-3 font-display italic text-[64px] lg:text-[104px] leading-[0.92] tracking-[-0.02em]">
            Build a plan.
          </h1>
          <p className="mt-4 max-w-lg text-[15px] text-[#8B8B92]">
            Give the mentor your exam date, daily hours, and weak areas. It'll return a day-by-day plan.
          </p>
        </div>

        {showForm ? (
          <div className="max-w-2xl">
            <div className="space-y-8">
              <label className="block">
                <span className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">EXAM DATE</span>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="mt-2 w-full bg-transparent border-0 border-b border-white/[0.15] focus:border-[#8B5CF6] focus:outline-none px-0 py-2 text-[17px] text-[#F2F2F2] font-mono"
                  data-testid="sp-exam-date"
                />
              </label>

              <div>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">HOURS PER DAY</span>
                  <span className="font-mono tabular-nums text-[13px] text-[#F2F2F2]">{dailyHours}h</span>
                </div>
                <input
                  type="range" min="1" max="12" step="0.5"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(parseFloat(e.target.value))}
                  className="w-full mt-3"
                  data-testid="sp-hours"
                />
              </div>

              <div>
                <span className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">WEAK AREAS</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[...new Set([...defaultSubjects, ...weakAreas])].map((s) => {
                    const on = weakAreas.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleWeak(s)}
                        className={`font-mono uppercase tracking-[0.22em] text-[11px] px-3 py-2 border transition ${
                          on ? "border-[#8B5CF6] text-[#8B5CF6] bg-[#8B5CF6]/10" : "border-white/[0.1] text-[#8B8B92] hover:text-[#F2F2F2]"
                        }`}
                        data-testid={`sp-weak-${s.replace(/\s+/g, "-").toLowerCase()}`}
                      >
                        {on ? `[ ${s} ]` : s}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={customWeak}
                    onChange={(e) => setCustomWeak(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustom()}
                    placeholder="add another…"
                    className="flex-1 bg-transparent border-0 border-b border-white/[0.15] focus:border-[#8B5CF6] focus:outline-none px-0 py-2 text-[13px] text-[#F2F2F2] placeholder:text-[#5A5A62]"
                  />
                  <button onClick={addCustom} className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">
                    [ + ]
                  </button>
                </div>
              </div>

              {error && <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#FF6B6B]">[ error · {error} ]</div>}

              <div className="pt-4">
                <button
                  onClick={generate}
                  disabled={busy}
                  data-magnetic
                  className="group inline-flex items-center gap-3 font-mono uppercase tracking-[0.24em] text-[13px] text-[#8B5CF6] disabled:opacity-50"
                  data-testid="study-plan-generate"
                >
                  <span className="relative">
                    [ {busy ? (status || "generating") : "generate plan"} →
                    <span className="absolute left-0 -bottom-1 h-px w-full bg-[#8B5CF6] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500" />
                  </span>
                  <span>]</span>
                  {busy && <PulsingDots />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <PlanView plan={existing} onArchive={archive} onRegenerate={() => { setShowForm(true); }} />
        )}
      </div>
    </AppShell>
  );
}

function PulsingDots() {
  return (
    <span className="inline-flex items-center gap-1 ml-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full"
          style={{ animation: `pulseDot 1.2s ease-in-out ${i * 0.15}s infinite` }}
        />
      ))}
      <style>{`@keyframes pulseDot { 0%,80%,100% { opacity: 0.2; } 40% { opacity: 1; } }`}</style>
    </span>
  );
}

function PlanView({ plan, onArchive, onRegenerate }) {
  const weeks = plan?.plan_json?.weeks || [];
  const summary = plan?.plan_json?.summary;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B8B92]">
          exam · <span className="text-[#F2F2F2]">{plan?.exam_date}</span>
          <span className="mx-3 text-[#5A5A62]">/</span>
          hours · <span className="text-[#F2F2F2] tabular-nums">{plan?.daily_hours}h/day</span>
          <span className="mx-3 text-[#5A5A62]">/</span>
          weeks · <span className="text-[#F2F2F2] tabular-nums">{weeks.length}</span>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={onRegenerate}
            className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92] hover:text-[#F2F2F2] transition"
            data-testid="sp-regenerate"
          >
            [ start over ]
          </button>
          <button
            onClick={onArchive}
            className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B5CF6] hover:text-[#F2F2F2] transition"
            data-testid="sp-archive"
          >
            [ archive → ]
          </button>
        </div>
      </div>

      {summary && (
        <div className="mb-10 border-l-2 border-[#8B5CF6] pl-4">
          <div className="font-display italic text-[22px] leading-[1.3] text-[#F2F2F2]">
            {summary}
          </div>
        </div>
      )}

      <div className="space-y-10">
        {weeks.map((w) => (
          <div key={w.week}>
            <div className="font-mono uppercase tracking-[0.24em] text-[10.5px] text-[#5A5A62] mb-4">
              WEEK {String(w.week).padStart(2, "0")}
            </div>
            <div className="grid gap-3">
              {(w.days || []).map((d) => (
                <motion.div
                  key={d.date}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-[110px_1fr_60px] gap-6 items-start border-t border-white/[0.06] pt-3"
                >
                  <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] tabular-nums">
                    {d.date}
                  </div>
                  <div>
                    <div className="font-display italic text-[22px] leading-[1] text-[#F2F2F2]">{d.subject}.</div>
                    <ul className="mt-2 space-y-1">
                      {(d.tasks || []).map((t, i) => (
                        <li key={i} className="text-[13px] text-[#8B8B92] leading-[1.55]">
                          <span className="text-[#5A5A62] mr-2">·</span>{t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#F2F2F2] text-right tabular-nums">
                    {d.hours}h
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
