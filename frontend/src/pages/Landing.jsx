import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Timer,
  Brain,
  Flame,
  Layers,
  Radar,
  Users,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Logo from "@/components/Logo";

const FEATURES = [
  {
    icon: Timer,
    title: "Focus Timer",
    copy: "Pomodoro sprints tuned for CA paper cycles. Deep work, receipts included.",
  },
  {
    icon: Brain,
    title: "AI Mentor",
    copy: "Ask any concept, get exam-grade answers with citations from ICAI material.",
  },
  {
    icon: Flame,
    title: "Streak Engine",
    copy: "Compound daily reps. Miss a day, keep your streak — one grace per week.",
  },
  {
    icon: Layers,
    title: "Syllabus Tracker",
    copy: "Every chapter, every paper. Progress bars that respect where you actually are.",
  },
  {
    icon: Radar,
    title: "Regulatory Radar",
    copy: "ICAI announcements, amendments, exam schedules — pushed the moment they drop.",
  },
  {
    icon: Users,
    title: "Community",
    copy: "Small rooms of aspirants at your level. Not another WhatsApp forward chain.",
  },
];

function BentoMock() {
  // A floating preview of "the grid" — non-interactive.
  return (
    <div className="relative w-full aspect-[5/6] max-w-[520px]" data-testid="landing-bento-mock">
      {/* violet radial glow behind */}
      <div className="absolute -inset-10 rounded-[40px] pointer-events-none"
           style={{ background: "radial-gradient(60% 60% at 60% 40%, rgba(124,58,237,0.35) 0%, rgba(124,58,237,0) 70%)" }} />
      <div className="relative grid grid-cols-6 grid-rows-6 gap-3 h-full">
        {/* Big streak card */}
        <motion.div
          className="col-span-4 row-span-3 rounded-[20px] border border-white/[0.06] bg-[#16161B] p-5 flex flex-col justify-between overflow-hidden"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-widest text-[#71717A]">Current streak</div>
            <Flame className="w-5 h-5 text-[#F59E0B]" strokeWidth={1.5} />
          </div>
          <div className="flex items-end gap-2">
            <div className="text-[68px] font-extrabold leading-none tracking-[-0.05em]">47</div>
            <div className="pb-3 text-sm text-[#A1A1AA]">days</div>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-6 rounded-md"
                style={{
                  background:
                    i < 11 ? "rgba(124,58,237,0.7)" : "rgba(255,255,255,0.05)",
                  boxShadow: i < 11 ? "0 0 10px rgba(124,58,237,0.4)" : "none",
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* XP */}
        <motion.div
          className="col-span-2 row-span-3 rounded-[20px] border border-white/[0.06] bg-[#111114] p-4 flex flex-col justify-between"
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        >
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#71717A]">Today</div>
            <div className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">2h 40m</div>
            <div className="text-xs text-[#A1A1AA] mt-1">of 3h goal</div>
          </div>
          <div className="w-full h-2 rounded-full bg-white/[0.05] overflow-hidden">
            <div className="h-full bg-[#7C3AED]" style={{ width: "88%" }} />
          </div>
        </motion.div>

        {/* Subject rings */}
        <motion.div
          className="col-span-3 row-span-3 rounded-[20px] border border-white/[0.06] bg-[#111114] p-4"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        >
          <div className="text-[10px] uppercase tracking-widest text-[#71717A] mb-3">Papers this week</div>
          <div className="space-y-2.5">
            {[
              { name: "Accounting", pct: 72 },
              { name: "Business Law", pct: 54 },
              { name: "Statistics", pct: 33 },
              { name: "Economics", pct: 18 },
            ].map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#F5F5F7]">{s.name}</span>
                  <span className="text-[#71717A]">{s.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                  <div className="h-full bg-[#7C3AED]" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* AI mentor */}
        <motion.div
          className="col-span-3 row-span-3 rounded-[20px] border border-[#7C3AED]/30 bg-gradient-to-br from-[#16161B] to-[#111114] p-4 flex flex-col justify-between"
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 6.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#7C3AED]" strokeWidth={1.6} />
            <div className="text-xs text-[#A1A1AA]">AI Mentor</div>
          </div>
          <div className="text-sm text-[#F5F5F7] leading-relaxed">
            "Depreciation as per Sch. II is <span className="text-[#7C3AED] font-semibold">useful-life based</span>, unlike the older Sch. XIV rates…"
          </div>
          <div className="flex gap-2">
            <div className="text-[10px] px-2 py-1 rounded-md bg-white/[0.05] text-[#A1A1AA]">Sch II</div>
            <div className="text-[10px] px-2 py-1 rounded-md bg-white/[0.05] text-[#A1A1AA]">Companies Act</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#F5F5F7] overflow-x-hidden">
      {/* nav */}
      <nav className="sticky top-0 z-30 backdrop-blur-xl bg-[#0A0A0B]/70 border-b border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-4 py-2 text-sm text-[#A1A1AA] hover:text-[#F5F5F7] transition"
              data-testid="nav-login-link"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 text-sm font-semibold bg-[#7C3AED] hover:bg-[#8B5CF6] rounded-xl transition-all shadow-[0_10px_30px_-10px_rgba(124,58,237,0.7)]"
              data-testid="nav-signup-link"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(50% 40% at 20% 30%, rgba(124,58,237,0.22) 0%, rgba(124,58,237,0) 65%), radial-gradient(40% 30% at 80% 20%, rgba(124,58,237,0.10) 0%, rgba(124,58,237,0) 60%)",
          }}
        />
        <div className="relative max-w-[1200px] mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-16 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/10 text-xs text-[#F5F5F7]/90 tracking-wide"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" strokeWidth={2} />
              Built for the 2026 CA cohort
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="mt-6 text-5xl sm:text-6xl lg:text-[72px] font-extrabold leading-[1.02] tracking-[-0.04em]"
              data-testid="landing-hero-heading"
            >
              Your CA journey,
              <br />
              <span className="bg-gradient-to-r from-[#F5F5F7] via-[#C4B5FD] to-[#7C3AED] bg-clip-text text-transparent">
                finally in one place.
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mt-6 text-[17px] text-[#A1A1AA] max-w-[540px] leading-relaxed"
            >
              Focus timer, AI mentor, streak engine, syllabus tracker and a regulatory radar — a single dark, quiet grid built by aspirants who were tired of eleven tabs.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22 }}
              className="mt-9 flex flex-wrap items-center gap-3"
            >
              <Link
                to="/signup"
                className="group inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] font-semibold text-[15px] transition-all shadow-[0_20px_50px_-15px_rgba(124,58,237,0.75)] hover:shadow-[0_25px_60px_-15px_rgba(124,58,237,0.9)]"
                data-testid="hero-primary-cta"
              >
                Start Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/[0.08] hover:border-white/[0.2] text-[15px] text-[#F5F5F7] transition"
                data-testid="hero-secondary-cta"
              >
                See how it works
              </a>
            </motion.div>
            <div className="mt-10 flex items-center gap-5 text-xs text-[#71717A]">
              <div className="flex -space-x-2">
                {["RS", "PN", "AK", "MV"].map((i, idx) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-[#0A0A0B] bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] text-[10px] font-bold flex items-center justify-center"
                    style={{ zIndex: 4 - idx }}
                  >
                    {i}
                  </div>
                ))}
              </div>
              Built for 800K+ Indian CA aspirants.
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
            className="flex justify-center lg:justify-end"
          >
            <BentoMock />
          </motion.div>
        </div>
      </section>

      {/* Feature bento */}
      <section id="features" className="relative py-24 border-t border-white/[0.06]" style={{ background: "linear-gradient(135deg, #0A0A0B 0%, #16161B 100%)" }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.2em] text-[#7C3AED] mb-4">The Grid</div>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-[-0.03em]">
              Six tools. One quiet screen.
            </h2>
            <p className="mt-4 text-[16px] text-[#A1A1AA] leading-relaxed">
              Everything a CA aspirant actually uses — designed to feel like a single instrument, not a folder of half-finished apps.
            </p>
          </div>
          <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  whileHover={{ y: -4 }}
                  className="group rounded-[20px] border border-white/[0.06] bg-[#111114] p-6 hover:border-[#7C3AED]/40 transition-all hover:shadow-[0_20px_50px_-25px_rgba(124,58,237,0.6)]"
                  data-testid={`feature-card-${f.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="w-11 h-11 rounded-xl bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center mb-5 group-hover:bg-[#7C3AED]/20 transition-colors">
                    <Icon className="w-5 h-5 text-[#7C3AED]" strokeWidth={1.6} />
                  </div>
                  <div className="text-lg font-semibold tracking-tight">{f.title}</div>
                  <div className="mt-2 text-sm text-[#A1A1AA] leading-relaxed">{f.copy}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-24 border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-xs uppercase tracking-[0.2em] text-[#7C3AED] mb-4">Trusted by future CAs</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] max-w-xl">
            The quiet corner of the CA internet.
          </h2>
          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {[
              {
                q: "Finally, a workspace that doesn't feel like a Discord notification storm. I focus, I close it.",
                n: "R.S.",
                d: "Foundation, Bengaluru",
              },
              {
                q: "The regulatory radar caught a Sch. III amendment before my coaching WhatsApp did. That's the bar now.",
                n: "P.N.",
                d: "Intermediate, Ahmedabad",
              },
              {
                q: "First app that made streaks feel earned, not gamified. My articleship self is grateful.",
                n: "A.K.",
                d: "Final, Delhi",
              },
            ].map((t, i) => (
              <motion.div
                key={t.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-[20px] border border-white/[0.06] bg-[#16161B] p-6"
                data-testid={`testimonial-${i}`}
              >
                <div className="text-[15px] text-[#F5F5F7] leading-relaxed">"{t.q}"</div>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] text-xs font-bold flex items-center justify-center">
                    {t.n}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.n}</div>
                    <div className="text-xs text-[#71717A]">{t.d}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 border-t border-white/[0.06] relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(40% 60% at 50% 50%, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0) 65%)" }}
        />
        <div className="relative max-w-[900px] mx-auto px-6 text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-[-0.03em]">
            Sit down. Open one tab. Ship the CA.
          </h2>
          <p className="mt-4 text-[#A1A1AA] max-w-lg mx-auto">
            Free while we build. No card. No spam. You leave when we stop being useful.
          </p>
          <Link
            to="/signup"
            className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] font-semibold text-[15px] transition-all shadow-[0_25px_60px_-15px_rgba(124,58,237,0.9)]"
            data-testid="final-cta"
          >
            Start Free <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] py-10">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-6 text-xs text-[#71717A]">
            <a href="#features" className="hover:text-[#F5F5F7] transition">Features</a>
            <Link to="/login" className="hover:text-[#F5F5F7] transition">Log in</Link>
            <Link to="/signup" className="hover:text-[#F5F5F7] transition">Start free</Link>
          </div>
          <div className="text-xs text-[#71717A]">© 2026 The CA Grid</div>
        </div>
      </footer>
    </div>
  );
}
