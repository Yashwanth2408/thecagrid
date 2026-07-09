import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import Heatmap from "@/components/Heatmap";
import BadgeIcon from "@/components/BadgeIcon";
import useCountUp from "@/lib/useCountUp";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, PlayCircle } from "lucide-react";

/* ---------- Card primitives ---------- */
function Card({ children, className = "", radius = 0, borderLeftAccent = false, testId, style, ...rest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className={`relative bg-[#0F0F12] border border-white/[0.06] ${borderLeftAccent ? "border-l-2 border-l-[#8B5CF6]" : ""} p-6 hover:border-[#8B5CF6]/30 transition-colors ${className}`}
      style={{ borderRadius: radius, ...(style || {}) }}
      data-testid={testId}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
function Eyebrow({ children }) {
  return <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">{children}</div>;
}
function Skeleton({ w = "100%", h = 14, delay = 0 }) {
  return (
    <div style={{ width: w, height: h }}
      className="rounded bg-white/[0.04] overflow-hidden relative">
      <div className="absolute inset-0"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)",
          animation: `shimmer 1.6s ease-in-out ${delay}ms infinite`,
        }}
      />
      <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
    </div>
  );
}

/* ---------- Cards ---------- */
function ContinueCard({ recent, onStart }) {
  const last = recent?.[0];
  if (!last) {
    return (
      <Card className="col-span-12 lg:col-span-8 min-h-[220px] flex items-center" testId="dashboard-continue">
        <div>
          <Eyebrow>[ pick up ]</Eyebrow>
          <div className="mt-3 font-display italic text-[44px] leading-[1] text-[#F2F2F2]">
            Start your first session.
          </div>
          <div className="mt-6">
            <Link to="/focus" className="font-mono uppercase tracking-[0.24em] text-[13px] text-[#8B5CF6] hover:text-[#F2F2F2]" data-magnetic data-testid="continue-start">
              [ start → ]
            </Link>
          </div>
        </div>
      </Card>
    );
  }
  const ended = last.ended_at ? new Date(last.ended_at) : null;
  const hoursAgo = ended ? Math.max(0, Math.round((Date.now() - ended.getTime()) / 3600000)) : null;
  return (
    <Card className="col-span-12 lg:col-span-8 min-h-[220px] flex flex-col justify-between" testId="dashboard-continue">
      <div className="flex items-start justify-between">
        <Eyebrow>[ last focus · {hoursAgo != null ? `${hoursAgo}h ago` : "recent"} ]</Eyebrow>
        <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6]">CONTINUE</span>
      </div>
      <div>
        <div className="mt-4 font-display italic text-[48px] lg:text-[64px] leading-[0.95] text-[#F2F2F2]">
          {last.subject}<span className="text-[#8B5CF6]">.</span>
        </div>
        <div className="mt-3 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B8B92]">
          last · {Math.round((last.actual_duration_seconds || 0) / 60)} min
        </div>
      </div>
      <div className="mt-6 flex items-center gap-6">
        <button
          onClick={() => onStart(last.subject)}
          data-magnetic
          className="group inline-flex items-center gap-3 font-mono uppercase tracking-[0.24em] text-[13px] text-[#8B5CF6]"
          data-testid="continue-start"
        >
          <PlayCircle className="w-4 h-4" strokeWidth={1.5} />
          <span className="relative">
            [ resume this →
            <span className="absolute left-0 -bottom-1 h-px w-full bg-[#8B5CF6] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500" />
          </span>
          <span>]</span>
        </button>
      </div>
    </Card>
  );
}

function StreakCard({ current, best }) {
  const value = useCountUp(current || 0);
  return (
    <Card className="col-span-12 lg:col-span-4 lg:row-span-2 min-h-[220px] flex flex-col justify-between" testId="dashboard-streak">
      <div>
        <Eyebrow>[ streak · current ]</Eyebrow>
        <div className="mt-4 flex items-baseline gap-4">
          <span
            className="text-[64px] leading-none"
            style={{ filter: "drop-shadow(0 0 10px rgba(180,255,57,0.35))", animation: "flameflickerBig 1.6s ease-in-out infinite" }}
          >🔥</span>
          <div className="font-display italic text-[128px] leading-[0.85] text-[#B4FF39] tabular-nums">
            {value}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">
          BEST · <span className="text-[#F2F2F2]">{best || 0}</span>
        </div>
        <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">
          NEXT MILESTONE · {current < 3 ? "3-DAY" : current < 7 ? "7-DAY" : current < 30 ? "30-DAY" : current < 100 ? "100-DAY" : "GRAND"}
        </div>
      </div>
      <style>{`@keyframes flameflickerBig { 0%,100% { opacity: 1; } 50% { opacity: 0.82; transform: scale(0.98); } }`}</style>
    </Card>
  );
}

function TodayCard({ today, goal }) {
  const pct = Math.min(1, (today || 0) / Math.max(1, goal || 1));
  const R = 46;
  const C = 2 * Math.PI * R;
  return (
    <Card className="col-span-12 lg:col-span-4 min-h-[220px]" testId="dashboard-today">
      <Eyebrow>[ today's focus ]</Eyebrow>
      <div className="mt-4 flex items-center gap-6">
        <div className="relative w-32 h-32 flex-none">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r={R} stroke="rgba(255,255,255,0.06)" strokeWidth="2" fill="none" />
            <motion.circle
              cx="50" cy="50" r={R}
              stroke="#8B5CF6" strokeWidth="2" fill="none"
              strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C * (1 - pct) }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-mono tabular-nums text-[22px] text-[#F2F2F2] leading-none">{today}</div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#5A5A62] mt-1">/ {goal} MIN</div>
          </div>
        </div>
        <div>
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">{Math.round(pct * 100)}%</div>
          <div className="mt-2 font-display italic text-[24px] leading-[1] text-[#F2F2F2]">
            {pct >= 1 ? "Goal cleared." : pct >= 0.5 ? "Halfway home." : pct > 0 ? "In motion." : "Yet to start."}
          </div>
        </div>
      </div>
    </Card>
  );
}

function XPCard({ stats }) {
  const level = stats?.level || 1;
  const inLvl = stats?.xp_in_level || 0;
  const perLvl = Math.max(1, stats?.xp_per_level || 100);
  const pct = Math.min(1, inLvl / perLvl);
  return (
    <Card className="col-span-12 lg:col-span-4 min-h-[220px]" testId="dashboard-xp">
      <Eyebrow>[ level ]</Eyebrow>
      <div className="mt-2 flex items-baseline gap-3">
        <div className="font-display italic text-[96px] leading-[0.85] text-[#F2F2F2] tabular-nums">{level}</div>
        <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] pb-2">
          {stats?.total_xp?.toLocaleString?.() || 0} XP
        </div>
      </div>
      <div className="mt-4 h-px bg-white/[0.06]">
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: pct }} transition={{ duration: 1.2, ease: "easeOut" }} style={{ transformOrigin: "left" }} className="h-px bg-[#8B5CF6]" />
      </div>
      <div className="mt-3 font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">
        XP TO L{level + 1} · <span className="text-[#F2F2F2]">{stats?.xp_to_next_level ?? "—"}</span>
      </div>
    </Card>
  );
}

function HeatmapCard({ data }) {
  return (
    <Card className="col-span-12 lg:col-span-8 min-h-[220px]" testId="dashboard-heatmap">
      <div className="flex items-baseline justify-between">
        <div>
          <Eyebrow>[ 90 days ]</Eyebrow>
          <div className="mt-2 font-display italic text-[26px] leading-[1] text-[#F2F2F2]">consistency compounds.</div>
        </div>
        <Link to="/analytics" className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] hover:text-[#F2F2F2]" data-testid="heatmap-see-analytics">
          full year →
        </Link>
      </div>
      <div className="mt-6"><Heatmap data={data || []} showLegend cellSize={12} gap={3} /></div>
    </Card>
  );
}

function BadgesCard({ latest, progress }) {
  return (
    <Card className="col-span-12 lg:col-span-4 min-h-[220px] flex flex-col" testId="dashboard-badges" borderLeftAccent>
      <div className="flex items-start justify-between">
        <div>
          <Eyebrow>[ badges ]</Eyebrow>
          <div className="mt-2 font-display italic text-[26px] leading-[1] text-[#F2F2F2]">
            <span className="tabular-nums">{progress?.unlocked ?? 0}</span> <span className="text-[#5A5A62]">/ {progress?.total ?? 20}</span>
          </div>
        </div>
        <Link to="/profile" className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] hover:text-[#F2F2F2]" data-testid="badges-see-all">
          see all →
        </Link>
      </div>
      <div className="mt-5 flex-1 flex flex-col gap-3">
        {(latest || []).slice(0, 3).map((b) => (
          <div key={b.badge_id} className="flex items-center gap-3 border-t border-white/[0.06] pt-3">
            <div className="w-9 h-9 rounded-none border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 flex items-center justify-center">
              <BadgeIcon name={b.icon} className="text-[#8B5CF6]" size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-[#F2F2F2] truncate">{b.name}</div>
              <div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">{b.rarity}</div>
            </div>
          </div>
        ))}
        {(!latest || latest.length === 0) && (
          <div className="text-[13px] text-[#8B8B92]">No unlocks yet — complete your first session.</div>
        )}
      </div>
    </Card>
  );
}

function TopSubjectsCard({ subjects }) {
  const max = Math.max(...(subjects || []).map((s) => s.minutes), 1);
  return (
    <Card className="col-span-12 lg:col-span-4 min-h-[220px]" testId="dashboard-top-subjects">
      <Eyebrow>[ top subjects ]</Eyebrow>
      <div className="mt-5 space-y-4">
        {(subjects || []).length === 0 && (
          <div className="text-[13px] text-[#8B8B92]">Log a session to see subject breakdowns.</div>
        )}
        {(subjects || []).map((s) => (
          <div key={s.subject}>
            <div className="flex justify-between font-mono uppercase tracking-[0.2em] text-[10.5px] text-[#F2F2F2]">
              <span className="truncate">{s.subject}</span>
              <span className="text-[#8B8B92] tabular-nums">{Math.round(s.minutes / 60)}h</span>
            </div>
            <div className="mt-1.5 h-px bg-white/[0.06]">
              <div className="h-px bg-[#8B5CF6]" style={{ width: `${(s.minutes / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function NextUpCard() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const send = async () => {
    const text = q.trim();
    if (!text) return;
    try {
      const r = await api.post("/mentor/sessions", { mode: "exam", initial_message: text });
      navigate(`/mentor?session=${r.data.session_id}&auto=${encodeURIComponent(text)}`);
    } catch {}
  };
  return (
    <Card className="col-span-12 lg:col-span-4 min-h-[220px] flex flex-col justify-between" testId="dashboard-next-up" radius={24}>
      <div className="flex items-center gap-2">
        <span className="relative flex w-2 h-2">
          <span className="absolute inset-0 rounded-full bg-[#B4FF39] animate-ping opacity-70" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-[#B4FF39]" />
        </span>
        <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#F2F2F2]">MENTOR · READY</span>
      </div>
      <div>
        <div className="font-display italic text-[32px] leading-[1] text-[#F2F2F2]">Ask the grid mentor.</div>
        <div className="mt-3 text-[13px] text-[#8B8B92] leading-[1.5]">
          Claude Sonnet 4.5. Sources cited. No panic.
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-white/[0.06] pt-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="ask…"
          className="flex-1 bg-transparent border-0 focus:outline-none px-0 py-1 text-[13px] text-[#F2F2F2] placeholder:text-[#5A5A62] font-mono uppercase tracking-[0.22em]"
          data-testid="dashboard-mentor-input"
        />
        <button
          onClick={send}
          className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B5CF6] hover:text-[#F2F2F2] transition"
          data-testid="dashboard-mentor-send"
        >
          [ →  ]
        </button>
      </div>
    </Card>
  );
}

function RadarCard() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/radar/summary").then((r) => setData(r.data)).catch(() => setData({ unread_count: 0, critical_count_7d: 0, latest_3_alerts: [] }));
  }, []);
  const critical = (data?.critical_count_7d || 0) > 0;
  return (
    <Card
      className="col-span-12 lg:col-span-8 min-h-[220px] flex flex-col justify-between"
      testId="dashboard-radar"
      style={critical ? { boxShadow: "0 0 0 1px rgba(180,255,57,0.35), 0 0 32px rgba(139,92,246,0.18)" } : undefined}
    >
      <div className="flex items-center justify-between">
        <Eyebrow>[ regulatory radar · {data?.unread_count ?? 0} new ]</Eyebrow>
        <Link to="/radar" className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] hover:text-[#F2F2F2]" data-testid="dashboard-radar-open">
          OPEN →
        </Link>
      </div>
      <div className="space-y-3 font-mono text-[11px] text-[#5A5A62]">
        {(data?.latest_3_alerts || []).map((a) => {
          const impactColor = a.impact_level === "critical" ? "#FF6B6B" : a.impact_level === "moderate" ? "#8B5CF6" : "#5A5A62";
          const d = new Date(a.published_at);
          const day = String(d.getUTCDate()).padStart(2, "0");
          const mon = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
          return (
            <Link
              key={a.alert_id}
              to="/radar"
              className="grid grid-cols-[60px_12px_1fr_auto] gap-4 border-t border-white/[0.06] pt-3 items-center hover:text-white/80 transition"
              data-testid={`dashboard-radar-alert-${a.alert_id}`}
            >
              <span className="text-[#8B5CF6] tabular-nums uppercase tracking-[0.18em]">{day} {mon}</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: impactColor }} />
              <span className="font-display italic not-italic text-[13px] text-white/85 truncate normal-case tracking-normal">
                <em className="italic">{a.title}</em>
              </span>
              <span className="uppercase tracking-[0.2em] text-[9.5px]" style={{ color: impactColor }}>{a.impact_level}</span>
            </Link>
          );
        })}
        {(!data?.latest_3_alerts || data.latest_3_alerts.length === 0) && (
          <div className="text-white/50 font-display italic text-[18px] not-italic">nothing new. keep grinding.</div>
        )}
      </div>
    </Card>
  );
}

function SyllabusCard() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api.get("/syllabus/progress").then((r) => setRows(r.data || [])).catch(() => setRows([]));
  }, []);
  const top3 = [...rows].sort((a, b) => (b.completion_pct - a.completion_pct)).slice(0, 3);
  const totalMastered = rows.reduce((s, r) => s + (r.chapters_mastered || 0), 0);
  const totalChap = rows.reduce((s, r) => s + (r.chapters_total || 0), 0);
  return (
    <Card className="col-span-12 lg:col-span-4 min-h-[220px] flex flex-col justify-between" testId="dashboard-syllabus">
      <div className="flex items-center justify-between">
        <Eyebrow>[ syllabus · {totalMastered}/{totalChap} ]</Eyebrow>
        <Link to="/syllabus" className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] hover:text-[#F2F2F2]" data-testid="dashboard-syllabus-open">
          OPEN →
        </Link>
      </div>
      <div className="space-y-2.5">
        {top3.map((p) => (
          <Link
            key={p.paper_code}
            to={`/syllabus?paper=${p.paper_code}`}
            className="flex items-center gap-3 border-t border-white/[0.06] pt-2.5 hover:opacity-90 transition"
            data-testid={`dashboard-syllabus-${p.paper_code}`}
          >
            <svg width="28" height="28" className="flex-shrink-0">
              <circle cx="14" cy="14" r="12" stroke="rgba(255,255,255,0.08)" strokeWidth="2" fill="none" />
              <circle
                cx="14" cy="14" r="12" stroke="#8B5CF6" strokeWidth="2" fill="none"
                strokeDasharray={`${(p.completion_pct / 100) * (2 * Math.PI * 12)} ${2 * Math.PI * 12}`}
                strokeLinecap="round" transform="rotate(-90 14 14)"
              />
            </svg>
            <div className="min-w-0 flex-1">
              <div className="font-mono uppercase tracking-[0.2em] text-[10px] text-[#8B5CF6]">[ {p.paper_code} ]</div>
              <div className="font-display italic text-[15px] text-white/85 truncate">{p.paper_name}</div>
            </div>
            <div className="font-mono tabular-nums text-[11px] text-white/70">{p.chapters_mastered}/{p.chapters_total}</div>
          </Link>
        ))}
        {top3.length === 0 && (
          <div className="font-mono uppercase tracking-[0.2em] text-[10px] text-[#5A5A62]">complete onboarding →</div>
        )}
      </div>
    </Card>
  );
}

function HubCard() {
  const [pick, setPick] = useState(null);
  useEffect(() => {
    api.get("/content/digest").then((r) => setPick(r.data?.today_pick || null)).catch(() => {});
  }, []);
  if (!pick) {
    return (
      <Card className="col-span-12 lg:col-span-4 min-h-[220px] flex flex-col justify-between" testId="dashboard-hub">
        <Eyebrow>[ hub · today's pick ]</Eyebrow>
        <div className="font-mono uppercase tracking-[0.2em] text-[10px] text-[#5A5A62]">no picks today.</div>
      </Card>
    );
  }
  const [a, b, c] = pick.hero_gradient || ["#7C3AED", "#0A0A0C", "#8B5CF6"];
  return (
    <Card className="col-span-12 lg:col-span-4 min-h-[220px] flex flex-col justify-between overflow-hidden" testId="dashboard-hub">
      <div className="flex items-center justify-between">
        <Eyebrow>[ hub · today's pick ]</Eyebrow>
        <Link to="/hub" className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] hover:text-[#F2F2F2]" data-testid="dashboard-hub-open">
          OPEN →
        </Link>
      </div>
      <Link to={`/hub/${pick.slug}`} className="block group" data-testid={`dashboard-hub-post-${pick.slug}`}>
        <div className="w-full h-16 mb-3" style={{ background: `radial-gradient(120% 100% at 20% 10%, ${a}, ${b} 60%, ${c})` }} />
        <div className="font-mono uppercase tracking-[0.2em] text-[10px] text-[#8B5CF6] mb-1">
          [ {pick.tags?.[0]?.toUpperCase() || "READ"} ]
        </div>
        <div className="font-display italic text-[18px] leading-[1.15] text-white/95 group-hover:text-white transition">
          {pick.title}
        </div>
        <div className="mt-2 font-mono uppercase tracking-[0.2em] text-[10px] text-[#5A5A62]">
          {pick.author_name} · {pick.read_minutes}M
        </div>
      </Link>
    </Card>
  );
}

function RecapCard() {
  const [rec, setRec] = useState(null);
  useEffect(() => {
    api.get("/recap/weekly").then((r) => setRec(r.data)).catch(() => {});
  }, []);
  if (!rec) {
    return (
      <Card className="col-span-12 lg:col-span-4 min-h-[220px] flex flex-col justify-between" testId="dashboard-recap">
        <Eyebrow>[ weekly recap ]</Eyebrow>
        <div className="font-mono uppercase tracking-[0.2em] text-[10px] text-[#5A5A62]">no data this week.</div>
      </Card>
    );
  }
  const deltaSign = rec.focus_minutes_delta_pct >= 0 ? "+" : "";
  const hours = Math.floor(rec.focus_minutes / 60);
  const mins = rec.focus_minutes % 60;
  return (
    <Card className="col-span-12 lg:col-span-4 min-h-[220px] flex flex-col justify-between" testId="dashboard-recap">
      <div className="flex items-center justify-between">
        <Eyebrow>[ weekly recap ]</Eyebrow>
        <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">7D</span>
      </div>
      <div className="grid grid-cols-2 gap-3 items-end">
        <div>
          <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">FOCUS</div>
          <div className="font-display italic text-[36px] text-white leading-[0.95] mt-1">
            {hours}<span className="text-[18px] text-white/60">h</span> {mins}<span className="text-[14px] text-white/60">m</span>
          </div>
          <div className="font-mono uppercase tracking-[0.2em] text-[10px]" style={{ color: rec.focus_minutes_delta_pct >= 0 ? "#B4FF39" : "#F59E0B" }}>
            {deltaSign}{rec.focus_minutes_delta_pct}% VS PREV
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">TOP</div>
          <div className="font-display italic text-[15px] text-white/90 leading-tight mt-1 truncate">{rec.top_subject || "—"}</div>
          <div className="mt-3 font-mono uppercase tracking-[0.2em] text-[10px] text-[#5A5A62]">CH DONE</div>
          <div className="font-mono tabular-nums text-[20px] text-[#B4FF39]">{rec.chapters_completed}</div>
        </div>
      </div>
      <div className="border-t border-white/[0.06] pt-3 font-mono uppercase tracking-[0.2em] text-[10px] text-[#5A5A62]">
        SESSIONS <span className="text-white/80 tabular-nums">{rec.sessions_completed}</span> · MENTOR <span className="text-white/80 tabular-nums">{rec.mentor_asks}</span> · CRIT <span className="text-[#FF6B6B] tabular-nums">{rec.regulatory_critical_unread}</span>
      </div>
    </Card>
  );
}

/* ---------- Page ---------- */
export default function Dashboard() {
  const { user, setStats } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    api.get("/dashboard").then((r) => {
      if (!cancel) {
        setData(r.data);
        if (r.data?.stats) setStats(r.data.stats);
        setLoading(false);
      }
    }).catch(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
    // eslint-disable-next-line
  }, []);

  const startWithSubject = (subject) => {
    navigate(`/focus?subject=${encodeURIComponent(subject)}`);
  };

  const firstName = user?.name?.split(" ")[0] || "there";
  const stats = data?.stats;

  return (
    <AppShell breadcrumb="DASHBOARD / OVERVIEW">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-12">
        <div className="mb-10">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">
            [ session · {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase()} ]
          </div>
          <h1
            className="mt-4 font-display italic text-[56px] lg:text-[88px] leading-[0.9] tracking-[-0.02em] text-[#F2F2F2]"
            data-testid="dash-welcome-heading"
          >
            Welcome back,<br />{firstName}.
          </h1>
        </div>

        {loading || !data ? (
          <div className="grid grid-cols-12 gap-4 lg:gap-5">
            {[220, 220, 220, 220, 220, 220].map((h, i) => (
              <div key={i} className={`bg-[#0F0F12] border border-white/[0.06] p-6 col-span-12 lg:col-span-${i === 0 ? 8 : 4}`}
                   style={{ minHeight: h }}>
                <Skeleton w="30%" h={10} />
                <div className="mt-4"><Skeleton w="60%" h={40} delay={i * 60} /></div>
                <div className="mt-3"><Skeleton w="40%" h={10} delay={i * 60} /></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4 lg:gap-5 auto-rows-min">
            <ContinueCard recent={data.recent_sessions} onStart={startWithSubject} />
            <StreakCard current={stats?.current_streak} best={stats?.best_streak} />

            <TodayCard today={stats?.today_minutes || 0} goal={data.user?.daily_goal_minutes || 180} />
            <XPCard stats={stats} />

            <HeatmapCard data={data.heatmap_90} />
            <BadgesCard latest={data.latest_badges} progress={data.badge_progress} />

            <SyllabusCard />
            <RadarCard />

            <HubCard />
            <RecapCard />

            <TopSubjectsCard subjects={data.top_subjects} />
            <NextUpCard />
          </div>
        )}
      </div>
    </AppShell>
  );
}
