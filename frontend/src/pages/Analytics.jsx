import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import Heatmap from "@/components/Heatmap";
import { api } from "@/lib/apiClient";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";

function Eyebrow({ children }) {
  return <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">{children}</div>;
}
function CardShell({ children, className = "", testId }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`bg-[#0F0F12] border border-white/[0.06] p-8 ${className}`}
      data-testid={testId}
    >{children}</motion.div>
  );
}
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#0A0A0C] border border-[#8B5CF6]/50 px-3 py-2 font-mono uppercase tracking-[0.2em] text-[10.5px] text-[#F2F2F2]">
      <div>{label}</div>
      <div className="text-[#8B5CF6] mt-1 tabular-nums">{payload[0].value} MIN</div>
    </div>
  );
};

export default function Analytics() {
  const [heat, setHeat] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [subjects, setSubjects] = useState(null);
  const [hod, setHod] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/stats/heatmap?days=365"),
      api.get("/stats/weekly"),
      api.get("/stats/monthly"),
      api.get("/stats/subjects"),
      api.get("/stats/hour-of-day"),
      api.get("/stats/me"),
    ]).then(([h, w, m, s, hh, st]) => {
      setHeat(h.data); setWeekly(w.data); setMonthly(m.data); setSubjects(s.data); setHod(hh.data); setStats(st.data);
    }).catch(console.error);
  }, []);

  const totalHours = stats?.total_focus_minutes != null ? (stats.total_focus_minutes / 60).toFixed(1) : "—";
  const subjectTotal = (subjects || []).reduce((a, b) => a + b.minutes, 0) || 1;
  const peak = (hod || []).reduce((best, cur) => (cur.minutes > (best?.minutes || 0) ? cur : best), null);
  const longestSession = 90; // placeholder, could compute from history
  const violetShades = ["#8B5CF6", "#7C3AED", "#A78BFA", "#6D28D9", "#C4B5FD", "#4C1D95", "#5B21B6"];

  return (
    <AppShell breadcrumb="DASHBOARD / ANALYTICS">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-12 space-y-10">
        <div>
          <Eyebrow>[ analytics ]</Eyebrow>
          <h1 className="mt-4 font-display italic text-[64px] lg:text-[104px] leading-[0.9] tracking-[-0.02em]" data-testid="analytics-heading">
            Where the time<br />went.
          </h1>
          <div className="mt-6 font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">
            TOTAL FOCUS · <span className="text-[#F2F2F2] tabular-nums">{totalHours}h</span>
            <span className="mx-4 text-[#5A5A62]">/</span>
            SESSIONS · <span className="text-[#F2F2F2] tabular-nums">{stats?.sessions_completed ?? "—"}</span>
            <span className="mx-4 text-[#5A5A62]">/</span>
            STREAK · <span className="text-[#B4FF39] tabular-nums">{stats?.current_streak ?? 0}d</span>
          </div>
        </div>

        {/* Yearly heatmap */}
        <CardShell testId="analytics-heatmap-year">
          <div className="flex items-baseline justify-between">
            <Eyebrow>[ 365 days · contribution map ]</Eyebrow>
            <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">
              IST · {new Date().getFullYear()}
            </div>
          </div>
          <div className="mt-6 overflow-x-auto">
            {heat ? <Heatmap data={heat} cellSize={12} gap={3} /> : <div className="h-[110px] bg-white/[0.02]" />}
          </div>
        </CardShell>

        {/* Weekly area chart */}
        <div className="grid grid-cols-12 gap-5">
          <CardShell className="col-span-12 lg:col-span-7" testId="analytics-weekly">
            <Eyebrow>[ last 30 days · daily minutes ]</Eyebrow>
            <div className="mt-6 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="violetGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#5A5A62", fontSize: 10, fontFamily: "JetBrains Mono" }}
                         tickFormatter={(d) => new Date(d + "T00:00:00").getDate()}
                         axisLine={false} tickLine={false} interval={4}/>
                  <YAxis tick={{ fill: "#5A5A62", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="minutes" stroke="#8B5CF6" strokeWidth={1.6} fill="url(#violetGrad)" isAnimationActive={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardShell>

          {/* Records */}
          <CardShell className="col-span-12 lg:col-span-5 flex flex-col justify-between" testId="analytics-records">
            <Eyebrow>[ personal records ]</Eyebrow>
            <div className="mt-6 space-y-6">
              {[
                { k: "LONGEST STREAK", v: `${stats?.best_streak ?? 0}d` },
                { k: "LONGEST SESSION", v: `${longestSession} MIN` },
                { k: "TOTAL FOCUS", v: `${totalHours}h` },
              ].map((r) => (
                <div key={r.k} className="border-t border-white/[0.06] pt-4">
                  <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">{r.k}</div>
                  <div className="mt-2 font-display italic text-[44px] leading-[0.95] text-[#F2F2F2]">{r.v}</div>
                </div>
              ))}
            </div>
          </CardShell>
        </div>

        {/* Hour of day */}
        <CardShell testId="analytics-hourofday">
          <div className="flex items-baseline justify-between">
            <Eyebrow>[ best time of day ]</Eyebrow>
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">
              {peak && peak.minutes > 0 ? `PEAK · ${peak.hour}:00 · ${peak.minutes} MIN` : "—"}
            </div>
          </div>
          <div className="mt-6 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hod || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: "#5A5A62", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#5A5A62", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} width={30}/>
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="minutes" fill="#8B5CF6" radius={[0, 0, 0, 0]} isAnimationActive={false}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        {/* Subject allocation */}
        <CardShell testId="analytics-subjects">
          <Eyebrow>[ subject allocation ]</Eyebrow>
          <div className="mt-6">
            <div className="flex h-6 w-full overflow-hidden">
              {(subjects || []).map((s, i) => (
                <div
                  key={s.subject}
                  style={{ width: `${(s.minutes / subjectTotal) * 100}%`, background: violetShades[i % violetShades.length] }}
                  title={`${s.subject} · ${Math.round(s.minutes)} min`}
                />
              ))}
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            {(subjects || []).map((s, i) => (
              <div key={s.subject} className="flex items-center gap-3 border-t border-white/[0.06] pt-3">
                <span className="w-2 h-2" style={{ background: violetShades[i % violetShades.length] }} />
                <div className="min-w-0 flex-1">
                  <div className="font-mono uppercase tracking-[0.2em] text-[10.5px] text-[#F2F2F2] truncate">{s.subject}</div>
                  <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62] tabular-nums">
                    {Math.round(s.minutes)} MIN · {((s.minutes / subjectTotal) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardShell>
      </div>
    </AppShell>
  );
}
