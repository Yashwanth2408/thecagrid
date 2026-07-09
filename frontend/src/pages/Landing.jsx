import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform, useScroll } from "framer-motion";
import { Link } from "react-router-dom";
import GridBackground from "@/components/GridBackground";
import Logo from "@/components/Logo";

/* ---------- helpers ---------- */
function Eyebrow({ children, className = "" }) {
  return (
    <div className={`font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] ${className}`}>
      {children}
    </div>
  );
}

function CountUp({ to, duration = 1600, decimals = 0, suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start;
    const startVal = 0;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(startVal + (to - startVal) * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, to, duration]);
  const display = decimals ? val.toFixed(decimals) : Math.floor(val).toLocaleString();
  return <span ref={ref}>{display}{suffix}</span>;
}

/* ---------- HERO ---------- */

const TICKER_SEED = [
  { lvl: "INT", subj: "Adv Accts", min: 42, city: "Mumbai" },
  { lvl: "FDN", subj: "Business Law", min: 17, city: "Pune" },
  { lvl: "FIN", subj: "DT & Int'l Tax", min: 128, city: "Delhi" },
  { lvl: "INT", subj: "Cost & Mgmt", min: 64, city: "Bengaluru" },
  { lvl: "FDN", subj: "Statistics", min: 22, city: "Hyderabad" },
  { lvl: "ART", subj: "Auditing", min: 51, city: "Kolkata" },
  { lvl: "FIN", subj: "Fin Reporting", min: 89, city: "Chennai" },
  { lvl: "INT", subj: "Taxation", min: 33, city: "Ahmedabad" },
  { lvl: "FDN", subj: "Economics", min: 46, city: "Indore" },
  { lvl: "FIN", subj: "IDT Laws", min: 74, city: "Jaipur" },
  { lvl: "INT", subj: "FM & SM", min: 29, city: "Lucknow" },
  { lvl: "ART", subj: "GST Advisory", min: 58, city: "Kochi" },
];

function LiveTicker() {
  const [rows, setRows] = useState(TICKER_SEED.slice(0, 8));
  useEffect(() => {
    const t = setInterval(() => {
      setRows((cur) => {
        const nextIdx = Math.floor(Math.random() * TICKER_SEED.length);
        const inserted = TICKER_SEED[nextIdx];
        const jitter = { ...inserted, min: inserted.min + Math.floor(Math.random() * 20 - 10) };
        return [jitter, ...cur].slice(0, 8);
      });
    }, 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative border-l border-[#8B5CF6]/60 bg-[#0F0F12]/80 backdrop-blur-sm" data-testid="hero-live-ticker">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-[#B4FF39] animate-ping opacity-70" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-[#B4FF39]" />
          </span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-[#F2F2F2]">Now on the grid</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5A5A62]">1132 online</span>
      </div>
      <div className="px-5 py-3 max-h-[300px] overflow-hidden">
        <div className="grid grid-cols-[38px_1fr_58px_1fr] gap-3 pb-2 font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#5A5A62]">
          <span>LVL</span><span>SUBJECT</span><span className="text-right">MIN</span><span>CITY</span>
        </div>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <motion.div
              key={`${r.subj}-${i}`}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: i === 0 ? 1 : Math.max(0.3, 1 - i * 0.11), y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-[38px_1fr_58px_1fr] gap-3 font-mono text-[11px] text-[#F2F2F2]"
            >
              <span className={`${r.lvl === "FIN" ? "text-[#8B5CF6]" : r.lvl === "INT" ? "text-[#F2F2F2]" : "text-[#8B8B92]"}`}>{r.lvl}</span>
              <span className="truncate">{r.subj}</span>
              <span className="text-right tabular-nums text-[#F2F2F2]">{r.min}m</span>
              <span className="truncate text-[#8B8B92]">{r.city}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* subtle radial punctuation */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(circle at 22% 62%, rgba(139,92,246,0.14), transparent 55%), radial-gradient(circle at 82% 18%, rgba(139,92,246,0.08), transparent 45%)",
      }} />
      <div className="relative w-full max-w-[1440px] mx-auto px-8 lg:px-16 pt-32 pb-24 grid grid-cols-12 gap-8 items-end">
        <div className="col-span-12 lg:col-span-7 -ml-2 lg:-ml-6">
          <Eyebrow className="mb-8">[ 001 / THE CA GRID / v0.1 ]</Eyebrow>
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
            className="font-display leading-[0.9] tracking-[-0.02em] text-[64px] sm:text-[92px] lg:text-[128px] xl:text-[138px] text-[#F2F2F2]"
            data-testid="landing-hero-heading"
          >
            <motion.span
              variants={{ hidden: { opacity: 0, y: 40, clipPath: "inset(0 0 100% 0)" }, visible: { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" } }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="block italic"
            >
              CA is not a
            </motion.span>
            <motion.span
              variants={{ hidden: { opacity: 0, y: 40, clipPath: "inset(0 0 100% 0)" }, visible: { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" } }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="block italic pl-[10%] lg:pl-[18%]"
            >
              personality trait.
            </motion.span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-10 max-w-[540px] text-[17px] leading-[1.55] text-[#8B8B92]"
          >
            But it can be an operating system. Focus, streaks, an AI that cites Ind AS at 2am, and the quiet screen you were owed.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="mt-12 flex items-center gap-10"
          >
            <Link
              to="/signup"
              data-magnetic
              data-cursor-label="Enter →"
              className="group inline-flex items-center gap-3 font-mono uppercase tracking-[0.24em] text-[13px] text-[#8B5CF6]"
              data-testid="hero-primary-cta"
            >
              <span className="relative">
                [ Start →
                <span className="absolute left-0 -bottom-1 h-px w-full bg-[#8B5CF6] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500" />
              </span>
              <span className="tracking-[0.24em]">]</span>
            </Link>
            <a
              href="#grid-state"
              className="font-mono text-[11.5px] uppercase tracking-[0.24em] text-[#8B8B92] hover:text-[#F2F2F2] transition-colors"
              data-testid="hero-secondary-cta"
            >
              see how it works ↓
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="col-span-12 lg:col-span-4 lg:col-start-9 self-end lg:mb-6"
        >
          <LiveTicker />
          <div className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#5A5A62]">
            [ 41.28°N / 74.00°W · SIM · BETA ]
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- THE GRID STATE ---------- */

function GridVisualization() {
  const cols = 40;
  const rows = 20;
  const [pulses, setPulses] = useState(() => new Set());
  useEffect(() => {
    const tick = () => {
      const next = new Set();
      const count = 60 + Math.floor(Math.random() * 40);
      for (let i = 0; i < count; i++) {
        next.add(Math.floor(Math.random() * cols * rows));
      }
      setPulses(next);
    };
    tick();
    const t = setInterval(tick, 2000);
    return () => clearInterval(t);
  }, []);
  const dots = [];
  for (let i = 0; i < cols * rows; i++) {
    const isActive = pulses.has(i);
    dots.push(
      <div
        key={i}
        style={{
          background: isActive ? "#8B5CF6" : "rgba(255,255,255,0.06)",
          boxShadow: isActive ? "0 0 8px rgba(139,92,246,0.9)" : "none",
          transition: "background 700ms ease, box-shadow 700ms ease, transform 700ms ease",
          transform: isActive ? "scale(1.4)" : "scale(1)",
        }}
        className="w-[6px] h-[6px] rounded-full"
      />
    );
  }
  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
      {dots}
    </div>
  );
}

function GridState() {
  return (
    <section id="grid-state" className="relative py-32 border-t border-white/[0.06]">
      <div className="max-w-[1440px] mx-auto px-8 lg:px-16">
        <div className="grid grid-cols-12 gap-8 items-center">
          <div className="col-span-12 lg:col-span-6">
            <Eyebrow className="mb-6">[ 002 / STATE ]</Eyebrow>
            <h2 className="font-display italic text-[56px] lg:text-[88px] leading-[0.95] tracking-[-0.02em] text-[#F2F2F2]">
              Right now,<br />on the grid.
            </h2>
            <p className="mt-6 max-w-md text-[15px] text-[#8B8B92]">
              A live view of what happens when the ninety of you who read this decide to sit down.
            </p>
            <div className="mt-8 font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#5A5A62]">
              [ simulated during beta ]
            </div>
          </div>
          <div className="col-span-12 lg:col-span-6 lg:pl-12" data-cursor-label="LIVE">
            <div className="mb-10">
              <GridVisualization />
            </div>
            <div className="grid gap-6">
              {[
                { n: 4281, label: "minutes logged · last hour", accent: false },
                { n: 1132, label: "aspirants focused · right now", accent: true },
                { n: 187, label: "streaks at risk · next 60 min", accent: false },
              ].map((s) => (
                <div key={s.label} className="border-t border-white/[0.08] pt-4 flex items-baseline justify-between gap-6">
                  <div className={`font-mono tabular-nums text-[44px] lg:text-[60px] font-medium leading-none ${s.accent ? "text-[#8B5CF6]" : "text-[#F2F2F2]"}`}>
                    <CountUp to={s.n} />
                  </div>
                  <div className="font-mono uppercase tracking-[0.2em] text-[10.5px] text-[#8B8B92] text-right max-w-[220px]">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- HOW IT WORKS (sticky-pin) ---------- */

const STAGES = [
  { n: "01", name: "FOCUS.", body: "25-minute deep-work sessions with a timer that doesn't apologize. No tabs. No Instagram. Move on.", tag: "SEC 03 / STAGE 01" },
  { n: "02", name: "STREAK.", body: "Every day you show up compounds. Miss one, streak-freeze burns. Miss two, restart. It's a system, not a mood.", tag: "SEC 03 / STAGE 02" },
  { n: "03", name: "MENTOR.", body: "Ask the mentor at 2am. It cites the section. It doesn't judge you for panicking two weeks before attempt.", tag: "SEC 03 / STAGE 03" },
  { n: "04", name: "SHIP.", body: "Mock tests, weak-topic radar, exam-day playbook. Pass. Move on. The next attempt won't come for six months.", tag: "SEC 03 / STAGE 04" },
];

function HowItWorks() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  const [active, setActive] = useState(0);
  useEffect(() => {
    const unsub = scrollYProgress.on("change", (v) => {
      const idx = Math.min(STAGES.length - 1, Math.floor(v * STAGES.length * 0.999));
      setActive(idx);
    });
    return () => unsub();
  }, [scrollYProgress]);

  return (
    <section ref={containerRef} className="relative border-t border-white/[0.06]" style={{ height: `${STAGES.length * 100}vh` }}>
      <div className="sticky top-0 h-screen w-full flex items-center overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-8 lg:px-16 w-full grid grid-cols-12 gap-8 items-center">
          <div className="col-span-4 lg:col-span-3">
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-6">
              [ 003 / METHOD ]
            </div>
            <div className="relative font-mono text-[180px] lg:text-[260px] leading-none text-[#F2F2F2] tabular-nums">
              <span className="text-[#F2F2F2]/10 absolute inset-0">04</span>
              <span className="relative">{STAGES[active].n}</span>
            </div>
            <div className="mt-6 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">
              {STAGES[active].tag}
            </div>
          </div>
          <div className="col-span-8 lg:col-span-9 relative min-h-[300px]">
            {STAGES.map((s, i) => (
              <motion.div
                key={s.n}
                initial={false}
                animate={{
                  opacity: i === active ? 1 : 0,
                  clipPath: i === active ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
                }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                <div className="font-display italic text-[80px] lg:text-[140px] leading-[0.9] tracking-[-0.02em] text-[#F2F2F2]">
                  {s.name}
                </div>
                <p className="mt-8 max-w-xl text-[17px] text-[#8B8B92] leading-[1.6]">
                  {s.body}
                </p>
              </motion.div>
            ))}
            {/* progress rail */}
            <div className="mt-16 lg:mt-24 flex items-center gap-3">
              {STAGES.map((_, i) => (
                <div
                  key={i}
                  className="h-px flex-1"
                  style={{ background: i <= active ? "#8B5CF6" : "rgba(255,255,255,0.08)", transition: "background 500ms ease" }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- BROKEN BENTO ---------- */

function TimerRing() {
  return (
    <div className="relative w-40 h-40">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="46" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="none" />
        <motion.circle
          cx="50" cy="50" r="46"
          stroke="#8B5CF6" strokeWidth="1.5" fill="none"
          strokeDasharray={2 * Math.PI * 46}
          initial={{ strokeDashoffset: 2 * Math.PI * 46 }}
          whileInView={{ strokeDashoffset: 2 * Math.PI * 46 * 0.35 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 1.8, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-mono tabular-nums text-[42px] text-[#F2F2F2] leading-none">24:12</div>
        <div className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#8B5CF6]">FDN · Accounting</div>
      </div>
    </div>
  );
}

function BentoLanding() {
  return (
    <section className="relative py-32 border-t border-white/[0.06]">
      <div className="max-w-[1440px] mx-auto px-8 lg:px-16">
        <div className="flex items-end justify-between mb-16">
          <div>
            <Eyebrow className="mb-4">[ 004 / MODULES ]</Eyebrow>
            <h2 className="font-display italic text-[56px] lg:text-[88px] leading-[0.95] tracking-[-0.02em] text-[#F2F2F2] max-w-2xl">
              What's on <span className="text-[#8B5CF6]">the</span> grid.
            </h2>
          </div>
          <div className="hidden lg:block font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62] max-w-[240px] text-right">
            [ 06 tools · one screen · zero opinions about how long you should study today ]
          </div>
        </div>

        {/* asymmetric bento */}
        <div className="grid grid-cols-6 gap-3 lg:gap-4" data-testid="landing-bento-mock">
          {/* A: big focus timer */}
          <div
            className="col-span-6 lg:col-span-4 row-span-2 relative overflow-hidden bg-[#0F0F12] border border-white/[0.08] p-8 lg:p-10 min-h-[360px]"
            data-cursor-label="Open →"
            style={{ borderRadius: 4 }}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-[#5A5A62]">module / 01</div>
                <div className="mt-3 font-display italic text-[44px] lg:text-[56px] leading-[0.95] text-[#F2F2F2]">Focus Timer.</div>
              </div>
              <div className="hidden lg:block font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#8B5CF6]">LIVE</div>
            </div>
            <div className="mt-10 flex items-center gap-10">
              <TimerRing />
              <div className="max-w-xs">
                <p className="text-[15px] text-[#8B8B92] leading-[1.6]">
                  Pomodoro sprints tuned to CA paper cycles. Deep work, receipts included, and one command to close every other tab you have open right now.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {["25 min", "5 min break", "no notifs"].map((t) => (
                    <span key={t} className="font-mono text-[10px] uppercase tracking-[0.22em] px-2.5 py-1 border border-white/[0.08]">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* B: AI Mentor — quote card */}
          <div
            className="col-span-6 lg:col-span-2 row-span-2 relative bg-[#0A0A0C] border-l-2 border-[#8B5CF6] p-8 min-h-[360px] flex flex-col justify-between"
            data-cursor-label="Ask →"
          >
            <div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-[#5A5A62]">module / 02 · Mentor</div>
              <div className="mt-6 font-display italic text-[24px] lg:text-[28px] leading-[1.15] text-[#F2F2F2]">
                "Explain Ind AS 115 like I'm 12."
              </div>
            </div>
            <div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#8B5CF6] mb-3">RESPONSE ↴</div>
              <div className="font-mono text-[11px] text-[#8B8B92] leading-[1.55]">
                Ind AS 115 says: recognise revenue when the promise is done — not when the money hits your account. Five steps. I'll cite the para.
              </div>
            </div>
          </div>

          {/* C: streak — tall */}
          <div className="col-span-3 lg:col-span-2 row-span-2 relative bg-[#0F0F12] p-8 min-h-[300px]" style={{ borderRadius: 24 }}>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-[#5A5A62]">module / 03</div>
            <div className="mt-3 font-display italic text-[36px] leading-[1] text-[#F2F2F2]">Streak.</div>
            <div className="mt-6 font-mono tabular-nums text-[64px] text-[#B4FF39] leading-none">47<span className="text-[16px] text-[#8B8B92] ml-2">d</span></div>
            {/* mini heatmap */}
            <div className="mt-8 grid grid-cols-7 gap-1.5">
              {Array.from({ length: 49 }).map((_, i) => {
                const alpha = Math.random() > 0.3 ? 0.3 + Math.random() * 0.6 : 0.05;
                const isPeak = alpha > 0.7;
                return (
                  <div
                    key={i}
                    className="aspect-square"
                    style={{
                      background: isPeak ? "rgba(180,255,57,0.85)" : `rgba(139,92,246,${alpha})`,
                      boxShadow: isPeak ? "0 0 6px rgba(180,255,57,0.6)" : "none",
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* D: syllabus square */}
          <div className="col-span-3 lg:col-span-2 relative bg-[#0F0F12] border border-white/[0.08] p-8 min-h-[240px]" style={{ borderRadius: 0 }}>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-[#5A5A62]">module / 04</div>
            <div className="mt-3 font-display italic text-[36px] leading-[1] text-[#F2F2F2]">Syllabus.</div>
            <div className="mt-6 space-y-3">
              {[
                { p: "P1 · Accounting", v: 72 },
                { p: "P2 · Business Law", v: 51 },
                { p: "P3 · Statistics", v: 33 },
              ].map((r) => (
                <div key={r.p}>
                  <div className="flex justify-between font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#8B8B92]">
                    <span>{r.p}</span><span className="text-[#F2F2F2] tabular-nums">{r.v}%</span>
                  </div>
                  <div className="mt-1.5 h-px bg-white/[0.06]">
                    <div className="h-px bg-[#8B5CF6]" style={{ width: `${r.v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* E: radar wide */}
          <div className="col-span-6 lg:col-span-3 relative bg-[#0F0F12] p-8 min-h-[220px]" style={{ borderRadius: 24 }}>
            <div className="flex items-center justify-between">
              <div className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-[#5A5A62]">module / 05 · radar</div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B4FF39] animate-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#B4FF39]">Live</span>
              </div>
            </div>
            <div className="mt-3 font-display italic text-[36px] leading-[1] text-[#F2F2F2]">Regulatory Radar.</div>
            <div className="mt-6 space-y-2 font-mono text-[11px] text-[#8B8B92]">
              <div className="flex gap-4 border-t border-white/[0.06] pt-2">
                <span className="text-[#8B5CF6] tabular-nums">18:04</span>
                <span className="uppercase tracking-[0.18em]">ICAI · Sch III amendment · effective Apr 2026</span>
              </div>
              <div className="flex gap-4 border-t border-white/[0.06] pt-2">
                <span className="text-[#8B5CF6] tabular-nums">14:22</span>
                <span className="uppercase tracking-[0.18em]">CBDT · TDS threshold revision · draft</span>
              </div>
              <div className="flex gap-4 border-t border-white/[0.06] pt-2">
                <span className="text-[#8B5CF6] tabular-nums">09:11</span>
                <span className="uppercase tracking-[0.18em]">GSTN · portal downtime · resolved</span>
              </div>
            </div>
          </div>

          {/* F: community small */}
          <div className="col-span-6 lg:col-span-1 relative bg-[#111114] p-6 border border-white/[0.08] min-h-[220px] flex flex-col justify-between" style={{ borderRadius: 24 }}>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-[#5A5A62]">module / 06</div>
            <div>
              <div className="font-display italic text-[28px] leading-[1] text-[#F2F2F2]">Rooms.</div>
              <div className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#8B8B92]">Small. Level-matched. Not WhatsApp.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- COST OF NOT SHIPPING ---------- */

function CostSection() {
  const stats = [
    { n: "43%", cap: "of Foundation students fail their first attempt" },
    { n: "2.1×", cap: "retry rate for Intermediate without structured revision" },
    { n: "4.7h", cap: "average daily study time of AIR top 50" },
  ];
  return (
    <section className="relative py-32 border-t border-white/[0.06]">
      <div className="max-w-[1440px] mx-auto px-8 lg:px-16">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-7">
            <Eyebrow className="mb-6">[ 005 / STAKES ]</Eyebrow>
            <h2 className="font-display italic text-[56px] lg:text-[100px] leading-[0.93] tracking-[-0.02em] text-[#F2F2F2]">
              The average CA aspirant<br />takes <span className="text-[#8B5CF6]">5.2 years</span>.
            </h2>
            <p className="mt-8 max-w-lg text-[16px] text-[#8B8B92] leading-[1.55]">
              Not because CA is hard. Because they don't have a system — they have a coaching batch, a Telegram group, and three notebooks that never sync.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-5 space-y-10 lg:pt-6">
            {stats.map((s) => (
              <div key={s.n}>
                <div className="h-px w-full bg-[#8B5CF6] mb-4" />
                <div className="flex items-baseline gap-6">
                  <div className="font-mono tabular-nums text-[64px] lg:text-[80px] leading-none text-[#F2F2F2]">{s.n}</div>
                  <div className="font-mono uppercase tracking-[0.2em] text-[10.5px] text-[#8B8B92] max-w-[220px]">{s.cap}</div>
                </div>
              </div>
            ))}
            <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">
              [ source: ICAI aggregate 2019 – 2024 ]
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- FOOTER ---------- */

function Footer() {
  return (
    <footer className="relative pt-32 pb-10 border-t border-white/[0.06] overflow-hidden">
      <div className="pointer-events-none select-none">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="font-display italic text-[#F2F2F2] whitespace-nowrap leading-[0.9]"
            style={{
              fontSize: "clamp(80px, 14vw, 220px)",
              transform: `translateX(${-8 - i * 6}%)`,
              opacity: 1 - i * 0.32,
            }}
          >
            The CA Grid. The CA Grid. The CA Grid.
          </div>
        ))}
      </div>
      <div className="mt-20 max-w-[1440px] mx-auto px-8 lg:px-16 flex flex-wrap items-end justify-between gap-6">
        <div className="flex items-center gap-6 font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">
          <Link to="/" className="hover:text-[#F2F2F2]">Manifesto</Link>
          <Link to="/login" className="hover:text-[#F2F2F2]" data-testid="nav-login-link">Log in</Link>
          <Link to="/signup" className="hover:text-[#F2F2F2]" data-testid="nav-signup-link">Sign up</Link>
        </div>
        <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">
          [ built in India · 2026 · v0.1 ]
        </div>
      </div>
    </footer>
  );
}

/* ---------- TOP NAV (minimal) ---------- */
function TopNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md bg-[#0A0A0C]/60 border-b border-white/[0.06]">
      <div className="max-w-[1440px] mx-auto px-8 lg:px-16 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3"><Logo /></Link>
        <div className="flex items-center gap-8">
          <Link to="/login" className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92] hover:text-[#F2F2F2] transition">
            Log in
          </Link>
          <Link
            to="/signup"
            data-magnetic
            className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B5CF6] hover:text-[#F2F2F2] transition"
          >
            [ Start → ]
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ---------- PAGE ---------- */

export default function Landing() {
  return (
    <div className="relative min-h-screen bg-[#0A0A0C] text-[#F2F2F2]">
      <GridBackground />
      <TopNav />
      <div className="relative">
        <Hero />
        <GridState />
        <HowItWorks />
        <BentoLanding />
        <CostSection />
        <Footer />
      </div>
    </div>
  );
}
