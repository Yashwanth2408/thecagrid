import React from "react";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { useAuth } from "@/context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "there";
  const goal = user?.daily_goal_minutes || 180;

  return (
    <AppShell>
      <div className="relative min-h-[calc(100vh-4rem)]">
        <GridBackground />
        <div className="relative max-w-[1440px] mx-auto px-8 lg:px-16 py-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">
              [ session · {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase()} ]
            </div>
            <h1
              className="mt-6 font-display italic text-[64px] sm:text-[92px] lg:text-[128px] leading-[0.92] tracking-[-0.02em] text-[#F2F2F2]"
              data-testid="dash-welcome-heading"
            >
              Welcome back,<br />{firstName}.
            </h1>
            <p className="mt-8 font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">
              level · <span className="text-[#F2F2F2]">{user?.journey_level || "—"}</span>
              <span className="mx-4 text-[#5A5A62]">/</span>
              daily · <span className="text-[#F2F2F2]">{Math.floor(goal / 60)}h {goal % 60 ? `${goal % 60}m` : ""}</span>
              <span className="mx-4 text-[#5A5A62]">/</span>
              streak · <span className="text-[#B4FF39]">00d</span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-20 grid grid-cols-12 gap-4 lg:gap-6"
          >
            <StatCard testId="dash-level-card" label="LEVEL" value={user?.journey_level || "—"} note="Change anytime in settings." className="col-span-12 lg:col-span-4" />
            <StatCard testId="dash-goal-card" label="GOAL" value={`${Math.floor(goal / 60)}h ${goal % 60 ? `${goal % 60}m` : ""}`} note="Timer wakes up in Phase 2." className="col-span-12 lg:col-span-4" />
            <StatCard testId="dash-streak-card" label="STREAK" value={<span className="text-[#B4FF39]">0d</span>} note="First focus session starts it." className="col-span-12 lg:col-span-4" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-6 border border-[#8B5CF6]/40 relative overflow-hidden p-10 lg:p-14"
            data-testid="dash-phase2-placeholder"
          >
            <div className="absolute inset-0 pointer-events-none"
                 style={{ background: "radial-gradient(circle at 80% 20%, rgba(139,92,246,0.18), transparent 50%)" }} />
            <div className="relative grid grid-cols-12 gap-8 items-end">
              <div className="col-span-12 lg:col-span-8">
                <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">[ phase 02 · queued ]</div>
                <h2 className="mt-4 font-display italic text-[44px] lg:text-[72px] leading-[0.95] tracking-[-0.02em] text-[#F2F2F2]">
                  The rest of the grid<br />opens next.
                </h2>
                <p className="mt-6 max-w-xl text-[15px] text-[#8B8B92] leading-[1.65]">
                  Focus timer with Pomodoro sprints, streak logic with a weekly grace, AI mentor with citations, syllabus tracker per paper, and a regulatory radar pushing ICAI updates the moment they drop.
                </p>
              </div>
              <div className="col-span-12 lg:col-span-4 space-y-3 lg:pl-8 lg:border-l lg:border-white/[0.06]">
                {["01 · Focus Timer", "02 · Streak Engine", "03 · AI Mentor", "04 · Syllabus", "05 · Regulatory Radar"].map((t) => (
                  <div key={t} className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92] flex items-center gap-3">
                    <span className="w-1.5 h-1.5 bg-[#8B5CF6]" />{t}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, note, testId, className = "" }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={`border-t border-white/[0.08] pt-6 pb-8 ${className}`}
      data-testid={testId}
      data-cursor-label="OPEN →"
    >
      <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">{label}</div>
      <div className="mt-3 font-display italic text-[56px] leading-[0.95] text-[#F2F2F2]">{value}</div>
      {note && <div className="mt-3 font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B8B92]">{note}</div>}
    </motion.div>
  );
}
