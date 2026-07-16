"use client"

import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowRight, PlayCircle, TrendingUp, Target, Flame, Award, BookOpen, Zap, Users, BarChart3 } from "lucide-react"
import AppShell from "@/components/AppShell"
import { useAuth } from "@/context/AuthContext"
import { api } from "@/lib/apiClient"
import { useCountUp } from "@/lib/useCountUp"
import { toast } from "sonner"

// Premium UI Components
import { GlassCard, AnimatedGridBackground, MeshGradientBackground, NoiseOverlay, VignetteOverlay } from "@/components/ui/animated-background"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, StatCard, FeatureCard, ProgressRing } from "@/components/ui/premium-cards"
import { Button } from "@/components/ui/premium-button"
import { Input } from "@/components/ui/premium-form"

function Eyebrow({ children, className = "" }) {
  return (
    <div className={`font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] ${className}`}>
      {children}
    </div>
  )
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
  )
}

/* ===== CONTINUE CARD ===== */
function ContinueCard({ recent, onStart }) {
  const last = recent?.[0]
  if (!last) {
    return (
      <Card className="col-span-12 lg:col-span-8 min-h-[220px] flex items-center" hover="lift" border="accent" radius="xl">
        <div className="w-full text-center py-12">
          <Eyebrow>[ pick up where you left off ]</Eyebrow>
          <motion.div
            className="mt-4 font-display italic text-[44px] leading-[1] text-[#F2F2F2]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Start your first session.
          </motion.div>
          <motion.div
            className="mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Button size="lg" onClick={() => onStart("General")} data-magnetic>
              <PlayCircle className="w-4 h-4 mr-2" strokeWidth={1.5} />
              <span className="relative">
                [ Start →
                <span className="absolute left-0 -bottom-1 h-px w-full bg-[#8B5CF6] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500" />
              </span>
              <span>]</span>
            </Button>
          </motion.div>
        </div>
      </Card>
    )
  }

  const ended = last.ended_at ? new Date(last.ended_at) : null
  const hoursAgo = ended ? Math.max(0, Math.round((Date.now() - ended.getTime()) / 3600000)) : null

  return (
    <Card className="col-span-12 lg:col-span-8 min-h-[220px] flex flex-col justify-between" hover="lift" border="accent" radius="xl">
      <div className="flex items-start justify-between">
        <Eyebrow>[ last focus · {hoursAgo != null ? `${hoursAgo}h ago` : "recent"} ]</Eyebrow>
        <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6]">CONTINUE</span>
      </div>
      <div>
        <motion.h2
          className="font-display italic text-[48px] lg:text-[64px] leading-[0.95] text-[#F2F2F2]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {last.subject}<span className="text-[#8B5CF6]">.</span>
        </motion.h2>
        <motion.div
          className="mt-3 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B8B92]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          last · {Math.round((last.actual_duration_seconds || 0) / 60)} min
        </motion.div>
      </div>
      <motion.div
        className="mt-6 flex items-center gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Button size="lg" onClick={() => onStart(last.subject)} data-magnetic>
          <PlayCircle className="w-4 h-4 mr-2" strokeWidth={1.5} />
          <span className="relative">
            [ resume this →
            <span className="absolute left-0 -bottom-1 h-px w-full bg-[#8B5CF6] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500" />
          </span>
          <span>]</span>
        </Button>
      </motion.div>
    </Card>
  )
}

/* ===== STREAK CARD ===== */
function StreakCard({ current, best }) {
  const value = useCountUp(current || 0)
  return (
    <Card className="col-span-12 lg:col-span-4 lg:row-span-2 min-h-[220px] flex flex-col justify-between" hover="lift" border="accent" radius="xl">
      <div>
        <Eyebrow>[ streak · current ]</Eyebrow>
        <motion.div
          className="mt-4 flex items-baseline gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <span
            className="text-[64px] leading-none"
            style={{ filter: "drop-shadow(0 0 10px rgba(180,255,57,0.35))", animation: "flameflickerBig 1.6s ease-in-out infinite" }}
          >
            🔥
          </span>
          <motion.div
            className="font-display italic text-[128px] leading-[0.85] text-[#B4FF39] tabular-nums"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 200 }}
          >
            {value}
          </motion.div>
        </motion.div>
      </div>
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">
          BEST · <span className="text-[#F2F2F2]">{best || 0}</span>
        </div>
        <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">
          NEXT MILESTONE · {current < 3 ? "3-DAY" : current < 7 ? "7-DAY" : current < 30 ? "30-DAY" : current < 100 ? "100-DAY" : "GRAND"}
        </div>
      </motion.div>
      <style>{`@keyframes flameflickerBig { 0%,100% { opacity: 1; } 50% { opacity: 0.82; transform: scale(0.98); } }`}</style>
    </Card>
  )
}

/* ===== TODAY CARD ===== */
function TodayCard({ today, goal }) {
  const pct = Math.min(1, (today || 0) / Math.max(1, goal || 1))
  const R = 46
  const C = 2 * Math.PI * R

  return (
    <Card className="col-span-12 lg:col-span-4 min-h-[220px]" hover="lift" border="accent" radius="xl">
      <Eyebrow>[ today's focus ]</Eyebrow>
      <motion.div
        className="mt-4 flex items-center gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
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
            <motion.div
              className="font-mono tabular-nums text-[22px] text-[#F2F2F2] leading-none"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3, type: "spring", stiffness: 300 }}
            >
              {today}
            </motion.div>
            <motion.div
              className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#5A5A62]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              / {goal} MIN
            </motion.div>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">{Math.round(pct * 100)}%</div>
          <motion.div
            className="mt-2 font-display italic text-[24px] leading-[1] text-[#F2F2F2]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            {pct >= 1 ? "Goal cleared." : pct >= 0.5 ? "Halfway home." : pct > 0 ? "In motion." : "Yet to start."}
          </motion.div>
        </motion.div>
      </motion.div>
    </Card>
  )
}

/* ===== XP CARD ===== */
function XPCard({ stats }) {
  const level = stats?.level || 1
  const inLvl = stats?.xp_in_level || 0
  const perLvl = Math.max(1, stats?.xp_per_level || 100)
  const pct = Math.min(1, inLvl / perLvl)

  return (
    <Card className="col-span-12 lg:col-span-4 min-h-[220px]" hover="lift" border="accent" radius="xl">
      <Eyebrow>[ level ]</Eyebrow>
      <motion.div
        className="mt-2 flex items-baseline gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="font-display italic text-[96px] leading-[0.85] text-[#F2F2F2] tabular-nums"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {level}
        </motion.div>
        <motion.div
          className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] pb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {stats?.total_xp?.toLocaleString?.() || 0} XP
        </motion.div>
      </motion.div>
      <motion.div
        className="mt-4 h-px bg-white/[0.06]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: pct }}
          transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
          style={{ transformOrigin: "left" }}
          className="h-px bg-[#8B5CF6]"
        />
      </motion.div>
      <motion.div
        className="mt-3 font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        XP TO L{level + 1} · <span className="text-[#F2F2F2]">{stats?.xp_to_next_level ?? "—"}</span>
      </motion.div>
    </Card>
  )
}

/* ===== HEATMAP CARD ===== */
import Heatmap from "@/components/Heatmap"

function HeatmapCard({ data }) {
  return (
    <Card className="col-span-12 lg:col-span-8 min-h-[220px]" hover="lift" border="subtle" radius="xl">
      <div className="flex items-baseline justify-between">
        <div>
          <Eyebrow>[ 90 days ]</Eyebrow>
          <motion.h2
            className="mt-2 font-display italic text-[26px] leading-[1] text-[#F2F2F2]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            consistency compounds.
          </motion.h2>
        </div>
        <Link to="/analytics" className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] hover:text-white transition" data-testid="heatmap-see-analytics">
          full year →
        </Link>
      </div>
      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Heatmap data={data || []} showLegend cellSize={12} gap={3} />
      </motion.div>
    </Card>
  )
}

/* ===== BADGES CARD ===== */
import BadgeIcon from "@/components/BadgeIcon"

function BadgesCard({ latest, progress }) {
  return (
    <Card className="col-span-12 lg:col-span-4 min-h-[220px] flex flex-col" hover="lift" border="accent" radius="xl" borderLeftAccent>
      <div className="flex items-start justify-between">
        <div>
          <Eyebrow>[ badges ]</Eyebrow>
          <motion.h3
            className="mt-2 font-display italic text-[26px] leading-[1] text-[#F2F2F2]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.span className="tabular-nums">{progress?.unlocked ?? 0}</motion.span> <span className="text-[#5A5A62]">/ {progress?.total ?? 20}</span>
          </motion.h3>
        </div>
        <Link to="/profile" className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] hover:text-white transition" data-testid="badges-see-all">
          see all →
        </Link>
      </div>
      <motion.div
        className="mt-5 flex-1 flex flex-col gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {(latest || []).slice(0, 3).map((b) => (
          <motion.div
            key={b.badge_id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <div className="flex items-center gap-3 border-t border-white/[0.06] pt-3">
              <div className="w-9 h-9 rounded-none border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 flex items-center justify-center">
                <BadgeIcon name={b.icon} className="text-[#8B5CF6]" size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-sm text-[#F2F2F2] truncate">{b.name}</div>
                <div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">{b.rarity}</div>
              </div>
            </div>
          </motion.div>
        ))}
        {(!latest || latest.length === 0) && (
          <motion.div
            className="text-[13px] text-[#8B8B92]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            No unlocks yet — complete your first session.
          </motion.div>
        )}
      </motion.div>
    </Card>
  )
}

/* ===== RADAR CARD ===== */
function RadarCard() {
  const [data, setData] = useState(null)
  useEffect(() => {
    api.get("/radar/summary").then((r) => setData(r.data)).catch(() => setData({ unread_count: 0, critical_count_7d: 0, latest_3_alerts: [] }))
  }, [])
  const critical = (data?.critical_count_7d || 0) > 0
  return (
    <Card
      className="col-span-12 lg:col-span-8 min-h-[220px] flex flex-col justify-between"
      hover="lift"
      border="subtle"
      style={critical ? { boxShadow: "0 0 0 1px rgba(180,255,57,0.35), 0 0 32px rgba(139,92,246,0.18)" } : undefined}
    >
      <div className="flex items-center justify-between">
        <Eyebrow>[ regulatory radar · {data?.unread_count ?? 0} new ]</Eyebrow>
        <Link to="/radar" className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] hover:text-white transition" data-testid="dashboard-radar-open">
          OPEN →
        </Link>
      </div>
      <motion.div
        className="space-y-3 font-mono text-[11px] text-[#8B8B92]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {(data?.latest_3_alerts || []).map((a) => {
          const impactColor = a.impact_level === "critical" ? "#FF6B6B" : a.impact_level === "moderate" ? "#8B5CF6" : "#5A5A62"
          const d = new Date(a.published_at)
          const day = String(d.getUTCDate()).padStart(2, "0")
          const mon = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase()
          return (
            <Link
              key={a.alert_id}
              to="/radar"
              className="grid grid-cols-[60px_12px_1fr_auto] gap-4 border-t border-white/[0.06] pt-2 items-center hover:text-white/80 transition"
              data-testid={`dashboard-radar-alert-${a.alert_id}`}
            >
              <span className="text-[#8B5CF6] tabular-nums uppercase tracking-[0.18em]">{day} {mon}</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: impactColor }} />
              <span className="font-display text-[13px] text-white/85 truncate normal-case tracking-normal">
                <em className="italic">{a.title}</em>
              </span>
              <span className="uppercase tracking-[0.2em] text-[9.5px]" style={{ color: impactColor }}>{a.impact_level}</span>
            </Link>
          )
        })}
        {(!data?.latest_3_alerts || data.latest_3_alerts.length === 0) && (
          <motion.div className="text-white/50 font-display text-[18px] not-italic" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            nothing new. keep grinding.
          </motion.div>
        )}
      </motion.div>
    </Card>
  )
}

/* ===== SYLLABUS CARD ===== */
function SyllabusCard() {
  const [rows, setRows] = useState([])
  useEffect(() => {
    api.get("/syllabus/progress").then((r) => setRows(r.data || [])).catch(() => setRows([]))
  }, [])
  const top3 = [...rows].sort((a, b) => (b.completion_pct - a.completion_pct)).slice(0, 3)
  const totalMastered = rows.reduce((s, r) => s + (r.chapters_mastered || 0), 0)
  const totalChap = rows.reduce((s, r) => s + (r.chapters_total || 0), 0)
  return (
    <Card className="col-span-12 lg:col-span-4 min-h-[220px] flex flex-col justify-between" hover="lift" border="accent" radius="xl">
      <div className="flex items-center justify-between">
        <Eyebrow>[ syllabus · {totalMastered}/{totalChap} ]</Eyebrow>
        <Link to="/syllabus" className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] hover:text-white transition" data-testid="dashboard-syllabus-open">
          OPEN →
        </Link>
      </div>
      <motion.div
        className="space-y-2.5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
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
          <motion.div className="font-mono uppercase tracking-[0.2em] text-[10px] text-[#5A5A62]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            complete onboarding →
          </motion.div>
        )}
      </motion.div>
    </Card>
  )
}

/* ===== HUB CARD ===== */
function HubCard() {
  const [pick, setPick] = useState(null)
  useEffect(() => {
    api.get("/content/digest").then((r) => setPick(r.data?.today_pick || null)).catch(() => {})
  }, [])
  if (!pick) {
    return (
      <Card className="col-span-12 lg:col-span-4 min-h-[220px] flex flex-col justify-between" hover="lift" border="subtle" radius="xl">
        <Eyebrow>[ hub · today's pick ]</Eyebrow>
        <motion.div className="font-mono uppercase tracking-[0.2em] text-[10px] text-[#5A5A62]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          no picks today.
        </motion.div>
      </Card>
    )
  }
  const [a, b, c] = pick.hero_gradient || ["#7C3AED", "#0A0A0C", "#8B5CF6"]
  return (
    <Card className="col-span-12 lg:col-span-4 min-h-[220px] flex flex-col justify-between overflow-hidden" hover="lift" border="subtle" radius="xl">
      <div className="flex items-center justify-between">
        <Eyebrow>[ hub · today's pick ]</Eyebrow>
        <Link to="/hub" className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] hover:text-white transition" data-testid="dashboard-hub-open">
          OPEN →
        </Link>
      </div>
      <Link to={`/hub/${pick.slug}`} className="block group" data-testid={`dashboard-hub-post-${pick.slug}`}>
        <motion.div
          className="w-full h-16 mb-3"
          style={{ background: `radial-gradient(120% 100% at 20% 10%, ${a} 0%, ${b} 60%, ${c} 100%)` }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        />
        <motion.div
          className="font-mono uppercase tracking-[0.2em] text-[10px] text-[#8B5CF6] mb-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          [ {pick.tags?.[0]?.toUpperCase() || "READ"} ]
        </motion.div>
        <motion.div
          className="font-display italic text-[18px] leading-[1.15] text-white/95 group-hover:text-white transition"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {pick.title}
        </motion.div>
        <motion.div
          className="mt-2 font-mono uppercase tracking-[0.2em] text-[10px] text-[#5A5A62]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {pick.author_name} · {pick.read_minutes}M
        </motion.div>
      </Link>
    </Card>
  )
}

/* ===== RECAP CARD ===== */
function RecapCard() {
  const [rec, setRec] = useState(null)
  useEffect(() => {
    api.get("/recap/weekly").then((r) => setRec(r.data)).catch(() => {})
  }, [])
  if (!rec) {
    return (
      <Card className="col-span-12 lg:col-span-4 min-h-[220px] flex flex-col justify-between" hover="lift" border="subtle" radius="xl">
        <Eyebrow>[ weekly recap ]</Eyebrow>
        <motion.div className="font-mono uppercase tracking-[0.2em] text-[10px] text-[#5A5A62]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          no data this week.
        </motion.div>
      </Card>
    )
  }
  const deltaSign = rec.focus_minutes_delta_pct >= 0 ? "+" : ""
  const hours = Math.floor(rec.focus_minutes / 60)
  const mins = rec.focus_minutes % 60
  return (
    <Card className="col-span-12 lg:col-span-4 min-h-[220px] flex flex-col justify-between" hover="lift" border="subtle" radius="xl">
      <div className="flex items-center justify-between">
        <Eyebrow>[ weekly recap ]</Eyebrow>
        <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">7D</span>
      </div>
      <motion.div
        className="grid grid-cols-2 gap-3 items-end"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div>
          <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">FOCUS</div>
          <motion.div
            className="font-display italic text-[36px] text-white leading-[0.95] mt-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {hours}<span className="text-[18px] text-white/60">h</span> {mins}<span className="text-[14px] text-white/60">m</span>
          </motion.div>
          <motion.div
            className="font-mono uppercase tracking-[0.2em] text-[10px]"
            style={{ color: rec.focus_minutes_delta_pct >= 0 ? "#B4FF39" : "#F59E0B" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            {deltaSign}{rec.focus_minutes_delta_pct}% VS PREV
          </motion.div>
        </div>
        <motion.div
          className="text-right"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">TOP</div>
          <motion.div
            className="font-display italic text-[15px] text-white/90 leading-tight mt-1 truncate"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            {rec.top_subject || "—"}
          </motion.div>
          <div className="mt-3 font-mono uppercase tracking-[0.2em] text-[10px] text-[#5A5A62]">CH DONE</div>
          <motion.div
            className="font-mono tabular-nums text-[20px] text-[#B4FF39]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4, type: "spring" }}
          >
            {rec.chapters_completed}
          </motion.div>
        </motion.div>
      </motion.div>
      <motion.div
        className="border-t border-white/[0.06] pt-3 font-mono uppercase tracking-[0.2em] text-[10px] text-[#5A5A62]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        SESSIONS <span className="text-white/80 tabular-nums">{rec.sessions_completed}</span> · MENTOR <span className="text-white/80 tabular-nums">{rec.mentor_asks}</span> · CRIT <span className="text-[#FF6B6B] tabular-nums">{rec.regulatory_critical_unread}</span>
      </motion.div>
    </Card>
  )
}

/* ===== MOCKS CARD ===== */
function MocksCard() {
  const [history, setHistory] = useState([])
  useEffect(() => {
    api.get("/mocks/attempts/history?limit=20").then((r) => setHistory(r.data.items || [])).catch(() => {})
  }, [])
  const best = history.length > 0 ? Math.max(...history.map((a) => a.score || 0)) : null
  return (
    <Card className="col-span-12 lg:col-span-4 min-h-[200px] flex flex-col justify-between" hover="lift" border="subtle" radius="xl">
      <div className="flex items-center justify-between">
        <Eyebrow>[ mocks · {history.length} attempted ]</Eyebrow>
        <Link to="/mocks" className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] hover:text-white transition" data-testid="dashboard-mocks-open">
          OPEN →
        </Link>
      </div>
      {best !== null ? (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">BEST SCORE</div>
            <motion.div
              className="font-display italic text-[52px] leading-[0.95] text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {Math.round(best)}<span className="text-[20px] text-white/50">%</span>
            </motion.div>
          </motion.div>
          <Link to="/mocks" className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#B4FF39] hover:text-white transition">
            [ START ANOTHER → ]
          </Link>
        </>
      ) : (
        <>
          <motion.div
            className="font-display italic text-[24px] text-white/75 leading-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Grade yourself before ICAI does.
          </motion.div>
          <Link to="/mocks" className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#B4FF39] hover:text-white transition">
            [ TAKE YOUR FIRST → ]
          </Link>
        </>
      )}
    </Card>
  )
}

/* ===== FLASHCARDS CARD ===== */
function FlashcardsCard() {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    api.get("/flashcards/stats").then((r) => setStats(r.data)).catch(() => {})
  }, [])
  const due = stats?.due_today ?? 0
  return (
    <Card className="col-span-12 lg:col-span-4 min-h-[200px] flex flex-col justify-between" hover="lift" border="subtle" radius="xl">
      <div className="flex items-center justify-between">
        <Eyebrow>[ flashcards · {due} due ]</Eyebrow>
        <Link to="/flashcards" className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] hover:text-white transition" data-testid="dashboard-flashcards-open">
          OPEN →
        </Link>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">DUE TODAY</div>
        <motion.div
          className="font-display italic text-[64px] leading-[0.95]"
          style={{ color: due > 0 ? "#B4FF39" : "#F2F2F2" }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 300 }}
        >
          {due}
        </motion.div>
      </motion.div>
      <Link to="/flashcards" className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#B4FF39] hover:text-white transition">
        {due > 0 ? "[ REVIEW NOW → ]" : "[ BROWSE DECKS → ]"}
      </Link>
    </Card>
  )
}

/* ===== TOP SUBJECTS CARD ===== */
function TopSubjectsCard({ subjects }) {
  const max = Math.max(...(subjects || []).map((s) => s.minutes), 1)
  return (
    <Card className="col-span-12 lg:col-span-4 min-h-[220px]" hover="lift" border="subtle" radius="xl">
      <Eyebrow>[ top subjects ]</Eyebrow>
      <motion.div
        className="mt-5 space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {(subjects || []).length === 0 && (
          <motion.div className="text-[13px] text-[#8B8B92]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Log a session to see subject breakdowns.
          </motion.div>
        )}
        {(subjects || []).map((s) => (
          <motion.div
            key={s.subject}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="flex justify-between font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#8B8B92]">
              <span className="text-white/85 truncate">{s.subject}</span>
              <span className="text-[#8B8B92] tabular-nums">{Math.round(s.minutes / 60)}h</span>
            </div>
            <div className="mt-1.5 h-px bg-white/[0.06]">
              <motion.div
                className="h-px bg-[#8B5CF6]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: s.minutes / max }}
                transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                style={{ transformOrigin: "left" }}
              />
            </div>
          </motion.div>
        ))}
      </motion.div>
    </Card>
  )
}

/* ===== NEXT UP CARD ===== */
function NextUpCard() {
  const [q, setQ] = useState("")
  const nav = useNavigate()
  const send = async () => {
    const text = q.trim()
    if (!text) return
    try {
      const r = await api.post("/mentor/sessions", { mode: "exam", initial_message: text })
      nav(`/mentor?session=${r.data.session_id}&auto=${encodeURIComponent(text)}`)
    } catch {}
  }
  return (
    <Card className="col-span-12 lg:col-span-4 min-h-[220px] flex flex-col justify-between" hover="lift" border="subtle" radius="xl">
      <div className="flex items-center gap-2">
        <div className="relative flex w-2 h-2">
          <span className="absolute inset-0 rounded-full bg-[#B4FF39] animate-ping opacity-70" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-[#B4FF39]" />
        </div>
        <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#F2F2F2]">MENTOR · READY</span>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h3
          className="font-display italic text-[32px] leading-[1] text-[#F2F2F2]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Ask the grid mentor.
        </motion.h3>
        <motion.p
          className="mt-3 text-[13px] text-[#8B8B92] leading-[1.5]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Groq-powered. Sources cited. No panic.
        </motion.p>
      </motion.div>
      <motion.div
        className="flex items-center gap-3 border-t border-white/[0.06] pt-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="ask…"
          className="flex-1 bg-transparent border-0 focus:outline-none px-0 py-1 text-[13px] text-[#F2F2F2] placeholder:text-[#5A5A62] font-mono uppercase tracking-[0.22em]"
          data-testid="dashboard-mentor-input"
        />
        <motion.button
          onClick={send}
          className="font-mono uppercase tracking-[0.22em] text-[13px] text-[#8B5CF6] hover:text-white transition"
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          data-testid="dashboard-mentor-send"
        >
          [ →  ]
        </motion.button>
      </motion.div>
    </Card>
  )
}

/* ===== PHASE 6/7 SHORTCUTS ===== */
function PhaseShortcutsCard() {
  const items = [
    { to: "/firms", label: "FIRMS", desc: "40+ reviewed CA firms", color: "#8B5CF6", icon: <Building2 className="w-5 h-5" strokeWidth={1.5} /> },
    { to: "/articleship", label: "ARTICLESHIP", desc: "Track days, leaves, stipend", color: "#B4FF39", icon: <Briefcase className="w-5 h-5" strokeWidth={1.5} /> },
    { to: "/community", label: "COMMUNITY", desc: "Level-segmented forums", color: "#F59E0B", icon: <MessageSquare className="w-5 h-5" strokeWidth={1.5} /> },
    { to: "/study-groups", label: "STUDY GROUPS", desc: "Grind less alone", color: "#8B5CF6", icon: <Users2 className="w-5 h-5" strokeWidth={1.5} /> },
  ]
  return (
    <div className="col-span-12 border border-white/[0.06] p-6" data-testid="dashboard-phase6">
      <div className="flex items-center justify-between mb-5">
        <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">[ ARTICLESHIP + COMMUNITY ]</div>
        <div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">FIRMS · REVIEWS · FORUMS · GROUPS</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {items.map((it) => (
          <Link key={it.to} to={it.to} data-testid={`dashboard-phase6-${it.label.toLowerCase().replace(/\s/g, "-")}`} className="border border-white/[0.06] hover:border-[#8B5CF6] transition p-4 group">
            <div className="flex items-center gap-2 mb-2" style={{ color: it.color }}>
              {it.icon}
              <div className="font-mono uppercase tracking-[0.22em] text-[10px]">{it.label}</div>
            </div>
            <motion.div
              className="font-display italic text-[20px] leading-[1] text-white group-hover:text-[#8B5CF6] transition"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {it.desc}
            </motion.div>
            <motion.div
              className="mt-3 font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              OPEN →
            </motion.div>
          </Link>
        ))}
      </div>
      {/* Phase 7 shortcuts */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { to: "/careers", label: "CAREERS", desc: "Post-CA path map", color: "#B4FF39", icon: <Compass className="w-5 h-5" strokeWidth={1.5} /> },
          { to: "/mentors", label: "MENTORS", desc: "Book verified CAs", color: "#8B5CF6", icon: <GraduationCap className="w-5 h-5" strokeWidth={1.5} /> },
          { to: "/rooms", label: "STUDY ROOMS", desc: "Focus, together", color: "#F59E0B", icon: <Users2 className="w-5 h-5" strokeWidth={1.5} /> },
          { to: "/invite", label: "INVITE", desc: "+200 XP per referral", color: "#B4FF39", icon: <Send className="w-5 h-5" strokeWidth={1.5} /> },
        ].map((it) => (
          <Link key={it.to} to={it.to} data-testid={`dashboard-phase7-${it.label.toLowerCase().replace(/\s/g, "-")}`} className="border border-white/[0.06] hover:border-[#8B5CF6] transition p-4 group">
            <div className="flex items-center gap-2 mb-2" style={{ color: it.color }}>
              {it.icon}
              <div className="font-mono uppercase tracking-[0.22em] text-[10px]">{it.label}</div>
            </div>
            <motion.div className="font-display italic text-[20px] leading-[1] text-white group-hover:text-[#8B5CF6] transition" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              {it.desc}
            </motion.div>
            <motion.div className="mt-3 font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              OPEN →
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ===== MAIN DASHBOARD ===== */
export default function Dashboard() {
  const { user, setStats } = useAuth()
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancel = false
    api.get("/dashboard").then((r) => {
      if (!cancel) {
        setData(r.data)
        if (r.data?.stats) setStats(r.data.stats)
        setLoading(false)
      }
    }).catch(() => { if (!cancel) setLoading(false); })
    return () => { cancel = true; }
  }, [])

  const startWithSubject = (subject) => {
    nav(`/focus?subject=${encodeURIComponent(subject)}`)
  }

  const firstName = user?.name?.split(" ")[0] || "there"
  const stats = data?.stats

  return (
    <AppShell breadcrumb="DASHBOARD / OVERVIEW">
      <AnimatedGridBackground color="violet" intensity={0.4} showOrbs={false} dotCount={200} />
      <MeshGradientBackground color="violet" intensity={0.5} animated />
      <NoiseOverlay opacity={0.03} />
      <VignetteOverlay intensity={0.3} />
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-12">
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">
            [ session · {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase()} ]
          </div>
          <h1
            className="mt-4 font-display italic text-[56px] lg:text-[88px] leading-[0.9] tracking-[-0.02em] text-[#F2F2F2]"
            data-testid="dash-welcome-heading"
          >
            Welcome back,<br />{firstName}.
          </h1>
        </motion.div>

        {loading || !data ? (
          <motion.div
            className="grid grid-cols-12 gap-4 lg:gap-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[220, 220, 220, 220, 220, 220].map((h, i) => (
              <motion.div
                key={i}
                className={`bg-[#0F0F12] border border-white/[0.06] p-6 col-span-12 lg:col-span-${i === 0 ? 8 : 4}`}
                style={{ minHeight: h }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              >
                <Skeleton w="30%" h={10} />
                <div className="mt-4"><Skeleton w="60%" h={40} delay={i * 60} /></div>
                <div className="mt-3"><Skeleton w="40%" h={10} delay={i * 60} /></div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-12 gap-4 lg:gap-5 auto-rows-min"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
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

            <MocksCard />
            <FlashcardsCard />

            <TopSubjectsCard subjects={data.top_subjects} />
            <NextUpCard />
            <PhaseShortcutsCard />
          </motion.div>
        )}
      </div>
    </AppShell>
  )
}

import { useNavigate } from "react-router-dom"
import { Building2, Briefcase, MessageSquare, Users2, Compass, GraduationCap, Send } from "lucide-react"