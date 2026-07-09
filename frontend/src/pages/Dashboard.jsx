import React from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import { Flame, Target, Sparkles, BookOpen } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "there";
  const goal = user?.daily_goal_minutes || 180;

  return (
    <AppShell>
      <div className="max-w-[1200px] mx-auto px-8 py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="text-xs uppercase tracking-[0.2em] text-[#7C3AED]">
            Welcome back
          </div>
          <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-[-0.03em]" data-testid="dash-welcome-heading">
            Hey {firstName}. Ready to sit down?
          </h1>
          <p className="mt-3 text-[#A1A1AA] max-w-xl">
            Your dashboard unlocks fully in Phase 2 — focus timer, streaks, AI mentor and syllabus tracking. For now, here's the shape of the Grid.
          </p>
        </motion.div>

        <div className="mt-10 grid md:grid-cols-3 gap-4">
          <BentoCard
            testId="dash-level-card"
            icon={<BookOpen className="w-4 h-4 text-[#7C3AED]" strokeWidth={1.6} />}
            label="Your level"
            value={user?.journey_level || "—"}
            note="Change anytime in Settings."
          />
          <BentoCard
            testId="dash-goal-card"
            icon={<Target className="w-4 h-4 text-[#7C3AED]" strokeWidth={1.6} />}
            label="Daily goal"
            value={`${Math.floor(goal / 60)}h ${goal % 60 ? `${goal % 60}m` : ""}`}
            note="Streak logic wakes up in Phase 2."
          />
          <BentoCard
            testId="dash-streak-card"
            icon={<Flame className="w-4 h-4 text-[#F59E0B]" strokeWidth={1.6} />}
            label="Streak"
            value="0 days"
            note="Complete your first focus session to start."
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="mt-6 rounded-[24px] border border-[#7C3AED]/30 bg-gradient-to-br from-[#16161B] to-[#111114] p-8 relative overflow-hidden"
          data-testid="dash-phase2-placeholder"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(40% 60% at 80% 20%, rgba(124,58,237,0.20) 0%, rgba(124,58,237,0) 65%)",
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#7C3AED]">
              <Sparkles className="w-3.5 h-3.5" /> Coming in Phase 2
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-[-0.03em]">
              Your full dashboard is next.
            </div>
            <p className="mt-3 text-[#A1A1AA] max-w-xl">
              Focus timer with Pomodoro sprints, streak logic with a weekly grace, AI mentor with citations, syllabus tracker per paper, and a regulatory radar pushing ICAI updates the moment they drop.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Focus Timer", "Streak Engine", "AI Mentor", "Syllabus Tracker", "Regulatory Radar"].map((t) => (
                <span key={t} className="text-xs px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] text-[#A1A1AA]">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}

function BentoCard({ icon, label, value, note, testId }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="rounded-[20px] border border-white/[0.06] bg-[#111114] p-6 transition-all hover:border-[#7C3AED]/40 hover:shadow-[0_20px_50px_-25px_rgba(124,58,237,0.6)]"
      data-testid={testId}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#71717A]">
        {icon} {label}
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-[-0.03em]">{value}</div>
      {note && <div className="mt-2 text-xs text-[#A1A1AA]">{note}</div>}
    </motion.div>
  );
}
