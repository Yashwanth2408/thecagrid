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
function Card({ children, className = "", radius = 0, borderLeftAccent = false, testId, ...rest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className={`relative bg-[#0F0F12] border border-white/[0.06] ${borderLeftAccent ? "border-l-2 border-l-[#8B5CF6]" : ""} p-6 hover:border-[#8B5CF6]/30 transition-colors ${className}`}
      style={{ borderRadius: radius }}
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
  return (
    <Card className="col-span-12 lg:col-span-4 min-h-[220px] flex flex-col justify-between" testId="dashboard-next-up" radius={24}>
      <Eyebrow>[ up next ]</Eyebrow>
      <div>
        <div className="font-display italic text-[32px] leading-[1] text-[#F2F2F2]">AI Mentor.</div>
        <div className="mt-3 text-[14px] text-[#8B8B92] leading-[1.5]">
          Ask any concept at 2am. It cites the section. It doesn't judge.
        </div>
      </div>
      <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6]">
        COMING · PHASE 03
      </div>
    </Card>
  );
}

function RadarCard() {
  return (
    <Card className="col-span-12 lg:col-span-8 min-h-[220px] flex flex-col justify-between" testId="dashboard-radar">
      <div className="flex items-center justify-between">
        <Eyebrow>[ regulatory radar ]</Eyebrow>
        <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6]">COMING · PHASE 04</div>
      </div>
      <div className="font-display italic text-[36px] leading-[1] text-[#F2F2F2]">The moment ICAI posts, you'll know.</div>
      <div className="space-y-2 font-mono text-[11px] text-[#5A5A62]">
        {["Sch III amendment · draft", "TDS threshold revision · draft", "GSTN downtime · resolved"].map((t) => (
          <div key={t} className="flex gap-4 border-t border-white/[0.06] pt-2 uppercase tracking-[0.18em]">
            <span className="text-[#8B5CF6] tabular-nums">—:—</span>
            <span>{t}</span>
          </div>
        ))}
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

            <TopSubjectsCard subjects={data.top_subjects} />
            <NextUpCard />

            <RadarCard />
          </div>
        )}
      </div>
    </AppShell>
  );
}
