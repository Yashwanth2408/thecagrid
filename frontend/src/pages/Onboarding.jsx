import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";
import confetti from "canvas-confetti";
import Logo from "@/components/Logo";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

const LEVELS = [
  { key: "Aspiring", label: "Aspiring", desc: "Exploring whether CA is for you." },
  { key: "Foundation", label: "Foundation", desc: "Level 01 — building the base." },
  { key: "Intermediate", label: "Intermediate", desc: "Level 02 — the real grind." },
  { key: "Articleship", label: "Articleship", desc: "In the trenches. Learning by doing." },
  { key: "Final", label: "Final", desc: "The last mountain — CA Final." },
  { key: "Qualified", label: "Qualified CA", desc: "Practising or in industry." },
];

const SUBJECTS_BY_LEVEL = {
  Aspiring: ["Accounting basics", "Business Math", "General Economics", "Career research"],
  Foundation: ["Accounting", "Business Laws", "Statistics", "Economics"],
  Intermediate: ["Adv. Accounting", "Corporate Law", "Cost & Mgmt", "Taxation", "Auditing", "FM & SM"],
  Articleship: ["Auditing", "Taxation", "Financial Reporting", "Client Mgmt"],
  Final: ["Financial Reporting", "AFM", "Adv. Auditing", "DT & Int'l Tax", "IDT", "IBS Case Study"],
  Qualified: ["CPD hours", "GST updates", "IFRS", "Practice notes"],
};

const QUIZ = [
  {
    q: "How do you feel about long-form problem solving (2+ hour paper sessions)?",
    options: [
      { t: "Love it — I get into flow.", w: 25 },
      { t: "Neutral — I can do it with breaks.", w: 15 },
      { t: "Tolerable — I push through.", w: 8 },
      { t: "Draining — I prefer short bursts.", w: 2 },
    ],
  },
  {
    q: "Comfort with numbers, ratios, and reconciliations?",
    options: [
      { t: "Very comfortable — I enjoy it.", w: 25 },
      { t: "Comfortable with practice.", w: 18 },
      { t: "Some anxiety, but manageable.", w: 10 },
      { t: "Avoid whenever I can.", w: 3 },
    ],
  },
  {
    q: "How do you feel about reading long legal or regulatory text?",
    options: [
      { t: "I find it interesting.", w: 20 },
      { t: "Fine if the topic is useful.", w: 14 },
      { t: "Boring but doable.", w: 8 },
      { t: "I switch off within minutes.", w: 2 },
    ],
  },
  {
    q: "Your ability to stick to a routine for 3-4 years?",
    options: [
      { t: "Very high — I run streaks.", w: 20 },
      { t: "Solid, with occasional dips.", w: 14 },
      { t: "Inconsistent, but I recover.", w: 8 },
      { t: "Low — I burn out.", w: 3 },
    ],
  },
  {
    q: "Your primary motivation to become a CA?",
    options: [
      { t: "Strong intrinsic pull.", w: 10 },
      { t: "Career and stability driven.", w: 7 },
      { t: "Family expectation.", w: 5 },
      { t: "Just exploring.", w: 3 },
    ],
  },
];

function computeFit(scores) {
  const total = scores.reduce((a, b) => a + b, 0);
  const band = total <= 40 ? "explore" : total <= 70 ? "potential" : "natural";
  const roadmaps = {
    explore: [
      "Do a 2-week 'taste test': 30 min/day of Foundation Accounting fundamentals.",
      "Shadow a CA aspirant or article for a day — see the real routine.",
      "Revisit motivation. If it still pulls, register for CPT / Foundation next cycle.",
    ],
    potential: [
      "Register for CA Foundation and commit to a 12-week focused block.",
      "Build a daily 90-min focus routine — non-negotiable, streak-first.",
      "Pick a mentor or study partner at your level within 2 weeks.",
    ],
    natural: [
      "You're wired for this. Register for Foundation and target the next attempt.",
      "Start with Accounting + Business Laws in parallel to build momentum.",
      "Set up a 4-hour daily deep-work block — protect it like a job.",
    ],
  };
  const labels = { explore: "Explore more", potential: "Strong potential", natural: "Natural fit" };
  return { total, band, label: labels[band], plan: roadmaps[band] };
}

/* ---------- shell ---------- */
function StepHeader({ eyebrow, title, sub }) {
  return (
    <div>
      <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">{eyebrow}</div>
      <h1 className="mt-4 font-display italic text-[56px] lg:text-[92px] leading-[0.95] tracking-[-0.02em]" data-testid="onb-step-title">{title}</h1>
      {sub && <p className="mt-6 max-w-xl text-[16px] text-[#8B8B92] leading-[1.6]">{sub}</p>}
    </div>
  );
}

function NavBar({ current, total }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md bg-[#0A0A0C]/70 border-b border-white/[0.06]">
      <div className="max-w-[1440px] mx-auto px-8 lg:px-16 h-16 flex items-center justify-between">
        <Logo />
        <div className="font-mono uppercase tracking-[0.24em] text-[11px] text-[#8B8B92]">
          <span className="text-[#8B5CF6]">{String(current).padStart(2, "0")}</span>
          <span className="mx-2 text-[#5A5A62]">/</span>
          <span>{String(total).padStart(2, "0")}</span>
        </div>
      </div>
    </div>
  );
}

function Advance({ label = "continue", onClick, disabled, testId }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-magnetic
      className="group inline-flex items-center gap-3 font-mono uppercase tracking-[0.24em] text-[13px] text-[#8B5CF6] disabled:opacity-40 disabled:cursor-not-allowed"
      data-testid={testId}
    >
      <span className="relative">
        [ {label} →
        <span className="absolute left-0 -bottom-1 h-px w-full bg-[#8B5CF6] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500" />
      </span>
      <span>]</span>
    </button>
  );
}

function BackLink({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="font-mono uppercase tracking-[0.24em] text-[11px] text-[#8B8B92] hover:text-[#F2F2F2] transition"
      data-testid="onb-back"
    >
      ← back
    </button>
  );
}

/* ---------- fit-score counter ---------- */
function FitScore({ total, band, label, plan }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf, start;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1400, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.floor(total * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [total]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="mt-16 max-w-3xl"
      data-testid="fit-score-card"
    >
      <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-6">
        [ your CA fit score ]
      </div>
      <div className="flex items-end gap-8">
        <div className="font-mono tabular-nums text-[140px] lg:text-[200px] leading-[0.85] text-[#F2F2F2]">
          {display}
        </div>
        <div className="pb-6">
          <div className="font-mono text-[13px] text-[#5A5A62] tabular-nums">/ 100</div>
          <div className="mt-2 font-display italic text-[36px] leading-[1] text-[#8B5CF6]">
            {label}.
          </div>
        </div>
      </div>
      <div className="mt-10 h-px bg-white/[0.06]">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: total / 100 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: "left" }}
          className="h-px bg-[#8B5CF6]"
        />
      </div>
      <div className="mt-10 space-y-4">
        {plan.map((p, i) => (
          <div key={i} className="grid grid-cols-[40px_1fr] gap-4 items-baseline">
            <span className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B5CF6]">0{i + 1}</span>
            <p className="text-[15px] text-[#F2F2F2] leading-[1.6]">{p}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ---------- page ---------- */
export default function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [level, setLevel] = useState(null);
  const [quizIdx, setQuizIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [goal, setGoal] = useState(180);
  const [subjects, setSubjects] = useState([]);
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);

  const isAspiring = level === "Aspiring";
  const stepsTotal = isAspiring ? 5 : 4;
  const displayStep = useMemo(() => {
    if (step === 1) return 1;
    if (step === 2) return 2;
    if (step === 3) return isAspiring ? 3 : null;
    if (step === 4) return isAspiring ? 4 : 3;
    if (step === 5) return isAspiring ? 5 : 4;
    return step;
  }, [step, isAspiring]);

  const answered = QUIZ.every((_, i) => answers[i] != null);
  const scores = QUIZ.map((_, i) => answers[i] || 0);
  const fit = isAspiring && answered ? computeFit(scores) : null;

  const goNext = () => {
    if (step === 2 && !isAspiring) setStep(4);
    else setStep((s) => s + 1);
  };
  const goBack = () => {
    if (step === 4 && !isAspiring) setStep(2);
    else setStep((s) => Math.max(1, s - 1));
  };

  const answerCurrent = (weight) => {
    setAnswers((a) => ({ ...a, [quizIdx]: weight }));
    if (quizIdx < QUIZ.length - 1) {
      setTimeout(() => setQuizIdx((i) => i + 1), 320);
    }
  };

  // keyboard shortcut for quiz options A/B/C/D
  useEffect(() => {
    if (step !== 3 || !isAspiring) return;
    const onKey = (e) => {
      const map = { a: 0, b: 1, c: 2, d: 3, "1": 0, "2": 1, "3": 2, "4": 3 };
      const idx = map[e.key.toLowerCase()];
      if (idx == null) return;
      const q = QUIZ[quizIdx];
      if (!q) return;
      const opt = q.options[idx];
      if (opt) answerCurrent(opt.w);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const finish = async () => {
    setBusy(true);
    try {
      const body = {
        journey_level: level,
        daily_goal_minutes: goal,
        subjects,
        fit_score: fit ? fit.total : null,
        onboarded: true,
        city: city.trim() || null,
      };
      const r = await api.post("/onboarding", body);
      setUser(r.data);
      confetti({
        particleCount: 140,
        spread: 90,
        origin: { y: 0.55 },
        colors: ["#8B5CF6", "#B4FF39", "#F2F2F2"],
      });
      setTimeout(() => navigate("/dashboard", { replace: true }), 950);
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F2F2F2] relative overflow-hidden">
      <GridBackground />
      <NavBar current={displayStep || 1} total={stepsTotal} />

      <main className="relative pt-32 pb-24 max-w-[1440px] mx-auto px-8 lg:px-16">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <StepWrap key="s1">
              <StepHeader
                eyebrow={`[ 01 / hello, ${user?.name?.split(" ")[0]?.toLowerCase() || "there"} ]`}
                title="Let's tune the grid."
                sub="Sixty seconds. Then you close every other tab you have open."
              />
              <div className="mt-16 grid grid-cols-12 gap-6 items-center">
                <div className="col-span-12 lg:col-span-6 grid grid-cols-8 gap-2 max-w-[520px]">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.012, duration: 0.3 }}
                      className="aspect-square"
                      style={{
                        background: [4, 11, 18, 27, 33, 41].includes(i) ? "#8B5CF6" : "rgba(255,255,255,0.05)",
                        boxShadow: [4, 11, 18, 27, 33, 41].includes(i) ? "0 0 12px rgba(139,92,246,0.5)" : "none",
                      }}
                    />
                  ))}
                </div>
                <div className="col-span-12 lg:col-span-6 lg:pl-12">
                  <p className="font-display italic text-[36px] leading-[1.1] text-[#F2F2F2]">
                    "You didn't come here to be motivated. You came here to sit down."
                  </p>
                  <div className="mt-4 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">— the manifesto</div>
                </div>
              </div>
              <div className="mt-20 flex items-center justify-between">
                <span />
                <Advance label="let's go" onClick={goNext} testId="onb-welcome-next" />
              </div>
            </StepWrap>
          )}

          {step === 2 && (
            <StepWrap key="s2">
              <StepHeader eyebrow="[ 02 / level ]" title="Where are you in this?" sub="This tunes everything — streaks, syllabus, radar." />
              <ul className="mt-16 divide-y divide-white/[0.06] border-t border-b border-white/[0.06]" data-testid="onb-level-list">
                {LEVELS.map((l, i) => {
                  const active = level === l.key;
                  return (
                    <li key={l.key}>
                      <button
                        onClick={() => setLevel(l.key)}
                        className={`group w-full text-left grid grid-cols-[54px_1.6fr_1fr_60px] items-center gap-6 py-6 transition-all duration-300 ${
                          active ? "pl-6" : "hover:pl-4"
                        }`}
                        data-testid={`onb-level-${l.key.toLowerCase()}`}
                      >
                        <span className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#5A5A62]">0{i + 1}</span>
                        <span className={`font-display italic text-[40px] lg:text-[56px] leading-[0.95] transition-colors ${active ? "text-[#8B5CF6]" : "text-[#F2F2F2] group-hover:text-[#8B5CF6]"}`}>
                          {l.label}.
                        </span>
                        <span className="font-mono uppercase tracking-[0.2em] text-[10.5px] text-[#8B8B92] hidden lg:block">{l.desc}</span>
                        <span className={`justify-self-end font-mono text-[11px] uppercase tracking-[0.22em] whitespace-nowrap ${active ? "text-[#8B5CF6]" : "text-[#5A5A62] group-hover:text-[#F2F2F2]"}`}>
                          {active ? "[ selected ]" : "select →"}
                        </span>
                        {active && (
                          <motion.div
                            layoutId="level-bar"
                            className="absolute left-0 w-1 h-16 bg-[#8B5CF6]"
                            style={{ marginLeft: -24 }}
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-16 flex items-center justify-between">
                <BackLink onClick={goBack} />
                <Advance label="continue" onClick={goNext} disabled={!level} testId="onb-level-next" />
              </div>
            </StepWrap>
          )}

          {step === 3 && isAspiring && (
            <StepWrap key="s3">
              <StepHeader
                eyebrow="[ 03 / am i CA material? ]"
                title="Five reads. Zero judgement."
                sub="Deterministic scoring. Press A · B · C · D or click."
              />
              <div className="mt-12">
                {!answered ? (
                  <div className="max-w-3xl">
                    <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">
                      question {String(quizIdx + 1).padStart(2, "0")} / {String(QUIZ.length).padStart(2, "0")}
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={quizIdx}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.4 }}
                        data-testid={`quiz-q-${quizIdx}`}
                      >
                        <div className="mt-6 font-display italic text-[40px] lg:text-[60px] leading-[1] tracking-[-0.02em] text-[#F2F2F2]">
                          {QUIZ[quizIdx].q}
                        </div>
                        <ul className="mt-12 space-y-4">
                          {QUIZ[quizIdx].options.map((op, oi) => {
                            const letter = String.fromCharCode(65 + oi);
                            const selected = answers[quizIdx] === op.w;
                            return (
                              <li key={oi}>
                                <button
                                  onClick={() => answerCurrent(op.w)}
                                  className={`w-full text-left grid grid-cols-[54px_1fr] gap-6 items-baseline py-4 border-t border-white/[0.06] group ${selected ? "text-[#8B5CF6]" : "text-[#F2F2F2] hover:text-[#8B5CF6]"} transition-colors`}
                                  data-testid={`quiz-q${quizIdx}-opt${oi}`}
                                >
                        <span className="font-mono uppercase tracking-[0.22em] text-[13px] text-[#8B5CF6] whitespace-nowrap">[ {letter} ]</span>
                                  <span className="text-[18px] leading-[1.55] transition-transform group-hover:translate-x-2 duration-500">{op.t}</span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </motion.div>
                    </AnimatePresence>
                    <div className="mt-12 flex items-center gap-2">
                      {QUIZ.map((_, i) => (
                        <div key={i} className={`h-px flex-1 ${i <= quizIdx ? "bg-[#8B5CF6]" : "bg-white/[0.06]"}`} />
                      ))}
                    </div>
                    {quizIdx > 0 && (
                      <div className="mt-8">
                        <button
                          onClick={() => setQuizIdx((i) => Math.max(0, i - 1))}
                          className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92] hover:text-[#F2F2F2] transition"
                        >
                          ← previous question
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <FitScore {...fit} />
                )}
              </div>
              <div className="mt-16 flex items-center justify-between">
                <BackLink onClick={goBack} />
                <Advance label="continue" onClick={goNext} disabled={!answered} testId="onb-quiz-next" />
              </div>
            </StepWrap>
          )}

          {step === 4 && (
            <StepWrap key="s4">
              <StepHeader
                eyebrow={`[ ${isAspiring ? "04" : "03"} / tune ]`}
                title="Goal & subjects."
                sub="Change these anytime. Nothing here is locked."
              />
              <div className="mt-16 grid grid-cols-12 gap-8 border-t border-white/[0.06] pt-12">
                <div className="col-span-12 lg:col-span-6">
                  <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">daily study goal</div>
                  <div className="mt-4 font-mono tabular-nums text-[100px] leading-none text-[#F2F2F2]">
                    {Math.floor(goal / 60)}
                    <span className="text-[#5A5A62] text-[40px] mx-2">h</span>
                    {goal % 60 ? <>
                      {String(goal % 60).padStart(2, "0")}
                      <span className="text-[#5A5A62] text-[40px] ml-2">m</span>
                    </> : null}
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={600}
                    step={30}
                    value={goal}
                    onChange={(e) => setGoal(parseInt(e.target.value, 10))}
                    className="w-full mt-8"
                    data-testid="onb-goal-slider"
                  />
                  <div className="mt-3 font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62] flex justify-between">
                    <span>1h</span><span>recommended · 3h</span><span>10h</span>
                  </div>
                </div>
                <div className="col-span-12 lg:col-span-6 lg:pl-12 lg:border-l lg:border-white/[0.06]">
                  <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62] mb-6">subjects on the grid</div>
                  <div className="flex flex-wrap gap-2">
                    {(SUBJECTS_BY_LEVEL[level] || []).map((s) => {
                      const active = subjects.includes(s);
                      return (
                        <button
                          key={s}
                          onClick={() =>
                            setSubjects((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))
                          }
                          className={`font-mono uppercase tracking-[0.22em] text-[11px] px-3 py-2 border transition-all ${
                            active
                              ? "border-[#8B5CF6] text-[#8B5CF6] bg-[#8B5CF6]/10"
                              : "border-white/[0.1] text-[#8B8B92] hover:text-[#F2F2F2] hover:border-white/[0.25]"
                          }`}
                          data-testid={`onb-subject-${s.replace(/\s+/g, "-").toLowerCase()}`}
                        >
                          {active ? `[ ${s} ]` : s}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-10">
                    <label className="block">
                      <span className="font-mono uppercase tracking-[0.24em] text-[10.5px] text-[#5A5A62]">
                        WHERE ARE YOU BASED? (OPTIONAL)
                      </span>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Mumbai, Delhi, Pune…"
                        className="mt-2 w-full bg-transparent border-0 border-b border-white/[0.15] focus:border-[#8B5CF6] focus:outline-none focus:ring-0 px-0 py-2 text-[17px] text-[#F2F2F2] placeholder:text-[#5A5A62]"
                        data-testid="onb-city"
                      />
                    </label>
                    <div className="mt-2 font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">
                      helps us show your session on the live grid.
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-16 flex items-center justify-between">
                <BackLink onClick={goBack} />
                <Advance label="continue" onClick={goNext} testId="onb-goal-next" />
              </div>
            </StepWrap>
          )}

          {step === 5 && (
            <StepWrap key="s5">
              <StepHeader
                eyebrow={`[ ${isAspiring ? "05" : "04"} / you're in ]`}
                title="Welcome to the grid."
                sub="Take a breath. Then open your first focus session."
              />
              <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-6 border-t border-white/[0.06] pt-12">
                <Chip k="LEVEL" v={level} />
                <Chip k="DAILY GOAL" v={`${Math.floor(goal / 60)}h ${goal % 60 ? `${goal % 60}m` : ""}`} />
                {fit && <Chip k="FIT SCORE" v={`${fit.total}/100`} accent />}
                <Chip k="SUBJECTS" v={subjects.length ? `${subjects.length} on grid` : "—"} />
              </div>
              <div className="mt-16 flex items-center justify-end">
                <Advance label={busy ? "opening" : "enter the grid"} onClick={finish} disabled={busy} testId="onb-finish" />
              </div>
            </StepWrap>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function StepWrap({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Chip({ k, v, accent }) {
  return (
    <div className="border-t border-white/[0.06] pt-4">
      <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">{k}</div>
      <div className={`mt-2 font-display italic text-[28px] leading-[1] ${accent ? "text-[#8B5CF6]" : "text-[#F2F2F2]"}`}>{v}</div>
    </div>
  );
}
