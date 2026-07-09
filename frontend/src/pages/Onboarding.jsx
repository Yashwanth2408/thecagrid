import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Search,
  BookOpen,
  Briefcase,
  Trophy,
  GraduationCap,
  Compass,
  Check,
} from "lucide-react";
import Logo from "@/components/Logo";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

const LEVELS = [
  { key: "Aspiring", label: "Aspiring", desc: "Exploring whether CA is for you.", icon: Compass },
  { key: "Foundation", label: "Foundation", desc: "Level 1 — building the base.", icon: BookOpen },
  { key: "Intermediate", label: "Intermediate", desc: "Level 2 — the real grind starts.", icon: GraduationCap },
  { key: "Articleship", label: "Articleship", desc: "In the trenches, learning by doing.", icon: Briefcase },
  { key: "Final", label: "Final", desc: "The last mountain — CA Final.", icon: Search },
  { key: "Qualified", label: "Qualified CA", desc: "Practising or in industry.", icon: Trophy },
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
    q: "How do you feel about reading long legal/regulatory text?",
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
    q: "Motivation to become a CA?",
    options: [
      { t: "Strong intrinsic pull.", w: 10 },
      { t: "Career and stability driven.", w: 7 },
      { t: "Family expectation.", w: 5 },
      { t: "Just exploring.", w: 3 },
    ],
  },
];

function computeFit(scores) {
  const total = scores.reduce((a, b) => a + b, 0); // max ~ 100
  const band =
    total <= 40 ? "explore" : total <= 70 ? "potential" : "natural";
  const roadmaps = {
    explore: [
      "Do a 2-week ‘taste test’: 30 min/day of Foundation Accounting fundamentals.",
      "Shadow a CA aspirant or article for a day — see the real routine.",
      "Revisit motivation. If it still pulls, register for CPT/Foundation next cycle.",
    ],
    potential: [
      "Register for CA Foundation and commit to a 12-week focused block.",
      "Build a daily 90-min focus routine — non-negotiable, streak-first.",
      "Pick a mentor or study partner at your level within 2 weeks.",
    ],
    natural: [
      "You’re wired for this. Register for Foundation and target the next attempt.",
      "Start with Accounting + Business Laws in parallel to build momentum.",
      "Set up a 4-hour daily deep-work block — protect it like a job.",
    ],
  };
  const labels = {
    explore: "Explore more",
    potential: "Strong potential",
    natural: "Natural fit",
  };
  return { total, band, label: labels[band], plan: roadmaps[band] };
}

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [level, setLevel] = useState(null);
  const [answers, setAnswers] = useState({}); // qIdx -> weight
  const [goal, setGoal] = useState(180); // minutes
  const [subjects, setSubjects] = useState([]);
  const [busy, setBusy] = useState(false);

  const isAspiring = level === "Aspiring";
  const stepsTotal = isAspiring ? 5 : 4; // welcome, level, [quiz], subjects+goal, done
  const displayStep = useMemo(() => {
    if (step === 1) return 1;
    if (step === 2) return 2;
    if (step === 3) return isAspiring ? 3 : null; // skip if not aspiring
    if (step === 4) return isAspiring ? 4 : 3;
    if (step === 5) return isAspiring ? 5 : 4;
    return step;
  }, [step, isAspiring]);

  const answered = QUIZ.every((_, i) => answers[i] != null);
  const scores = QUIZ.map((_, i) => answers[i] || 0);
  const fit = isAspiring && answered ? computeFit(scores) : null;

  const goNext = () => {
    if (step === 2 && !isAspiring) {
      setStep(4); // skip quiz
    } else {
      setStep((s) => s + 1);
    }
  };
  const goBack = () => {
    if (step === 4 && !isAspiring) setStep(2);
    else setStep((s) => Math.max(1, s - 1));
  };

  const finish = async () => {
    setBusy(true);
    try {
      const body = {
        journey_level: level,
        daily_goal_minutes: goal,
        subjects,
        fit_score: fit ? fit.total : null,
        onboarded: true,
      };
      const r = await api.post("/onboarding", body);
      setUser(r.data);
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#7C3AED", "#8B5CF6", "#F59E0B", "#F5F5F7"],
      });
      setTimeout(() => navigate("/dashboard", { replace: true }), 900);
    } catch (e) {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#F5F5F7] relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(50% 40% at 30% 20%, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0) 60%), radial-gradient(40% 40% at 80% 80%, rgba(124,58,237,0.10) 0%, rgba(124,58,237,0) 60%)",
        }}
      />
      <div className="relative">
        <div className="max-w-[1200px] mx-auto px-6 py-6 flex items-center justify-between">
          <Logo />
          <div className="text-xs text-[#71717A] tabular-nums">
            Step <span className="text-[#F5F5F7] font-semibold">{displayStep}</span> / {stepsTotal}
          </div>
        </div>

        <div className="max-w-[880px] mx-auto px-6 pb-20">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <StepWrap key="s1">
                <StepHeader
                  eyebrow="Welcome"
                  title={`Hey ${user?.name?.split(" ")[0] || "there"} — let's personalise your grid.`}
                  subtitle="A minute of setup. Then you close every other tab."
                />
                <div className="mt-10 grid grid-cols-6 gap-2 max-w-[440px]">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.02, duration: 0.3 }}
                      className="aspect-square rounded-md"
                      style={{
                        background:
                          i % 7 === 0
                            ? "rgba(124,58,237,0.7)"
                            : "rgba(255,255,255,0.04)",
                        boxShadow: i % 7 === 0 ? "0 0 12px rgba(124,58,237,0.5)" : "none",
                      }}
                    />
                  ))}
                </div>
                <FooterBar
                  onNext={goNext}
                  nextLabel="Let's go"
                  nextTestId="onb-welcome-next"
                />
              </StepWrap>
            )}

            {step === 2 && (
              <StepWrap key="s2">
                <StepHeader
                  eyebrow="Your level"
                  title="Where are you in the CA journey?"
                  subtitle="This tunes every feature — from streaks to syllabus."
                />
                <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {LEVELS.map((l) => {
                    const Icon = l.icon;
                    const active = level === l.key;
                    return (
                      <motion.button
                        key={l.key}
                        whileHover={{ y: -4 }}
                        onClick={() => setLevel(l.key)}
                        className={`text-left rounded-[20px] p-5 border transition-all backdrop-blur-xl ${
                          active
                            ? "border-[#7C3AED] bg-[#7C3AED]/10 shadow-[0_20px_50px_-20px_rgba(124,58,237,0.7)]"
                            : "border-white/[0.06] bg-[#111114] hover:border-white/[0.15]"
                        }`}
                        data-testid={`onb-level-${l.key.toLowerCase()}`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${active ? "bg-[#7C3AED]/25" : "bg-white/[0.05]"}`}>
                          <Icon className={`w-5 h-5 ${active ? "text-[#F5F5F7]" : "text-[#7C3AED]"}`} strokeWidth={1.5} />
                        </div>
                        <div className="text-[17px] font-semibold tracking-tight">{l.label}</div>
                        <div className="text-sm text-[#A1A1AA] mt-1">{l.desc}</div>
                      </motion.button>
                    );
                  })}
                </div>
                <FooterBar
                  onBack={goBack}
                  onNext={goNext}
                  nextDisabled={!level}
                  nextTestId="onb-level-next"
                />
              </StepWrap>
            )}

            {step === 3 && isAspiring && (
              <StepWrap key="s3">
                <StepHeader
                  eyebrow="Am I CA material?"
                  title="Five quick reads. Zero judgement."
                  subtitle="Deterministic scoring — no AI, no fluff."
                />
                <div className="mt-8 space-y-5">
                  {QUIZ.map((q, qi) => (
                    <div
                      key={qi}
                      className="rounded-[20px] border border-white/[0.06] bg-[#111114] p-5"
                      data-testid={`quiz-q-${qi}`}
                    >
                      <div className="text-[15px] font-medium">{qi + 1}. {q.q}</div>
                      <div className="mt-4 grid sm:grid-cols-2 gap-2.5">
                        {q.options.map((op, oi) => {
                          const selected = answers[qi] === op.w;
                          return (
                            <button
                              key={oi}
                              onClick={() => setAnswers((a) => ({ ...a, [qi]: op.w }))}
                              className={`text-left text-sm px-4 py-2.5 rounded-xl border transition ${
                                selected
                                  ? "border-[#7C3AED] bg-[#7C3AED]/15 text-[#F5F5F7]"
                                  : "border-white/[0.06] bg-white/[0.02] text-[#A1A1AA] hover:text-[#F5F5F7] hover:border-white/[0.15]"
                              }`}
                              data-testid={`quiz-q${qi}-opt${oi}`}
                            >
                              {op.t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {fit && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 rounded-[24px] border border-[#7C3AED]/40 bg-gradient-to-br from-[#16161B] to-[#111114] p-6 shadow-[0_30px_80px_-30px_rgba(124,58,237,0.6)]"
                    data-testid="fit-score-card"
                  >
                    <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#7C3AED]">
                      <Sparkles className="w-3.5 h-3.5" /> Your CA Fit Score
                    </div>
                    <div className="mt-3 flex items-end gap-4">
                      <div className="text-6xl font-extrabold tracking-[-0.04em]">{fit.total}</div>
                      <div className="pb-2 text-[#A1A1AA] text-sm">/ 100 · <span className="text-[#F5F5F7] font-semibold">{fit.label}</span></div>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${fit.total}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-[#7C3AED] to-[#F59E0B]"
                      />
                    </div>
                    <ul className="mt-5 space-y-2.5">
                      {fit.plan.map((p, i) => (
                        <li key={i} className="flex gap-3 text-sm text-[#F5F5F7]">
                          <div className="flex-none w-5 h-5 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center mt-0.5">
                            <Check className="w-3 h-3 text-[#7C3AED]" strokeWidth={2.5} />
                          </div>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
                <FooterBar
                  onBack={goBack}
                  onNext={goNext}
                  nextDisabled={!answered}
                  nextTestId="onb-quiz-next"
                />
              </StepWrap>
            )}

            {step === 4 && (
              <StepWrap key="s4">
                <StepHeader
                  eyebrow="Almost there"
                  title="Daily goal & subjects (optional)"
                  subtitle="You can change these anytime."
                />
                <div className="mt-8 rounded-[20px] border border-white/[0.06] bg-[#111114] p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-[#A1A1AA]">Daily study goal</div>
                      <div className="text-3xl font-extrabold tracking-[-0.03em] mt-1">
                        {Math.floor(goal / 60)}h {goal % 60 ? `${goal % 60}m` : ""}
                      </div>
                    </div>
                    <div className="text-xs text-[#71717A]">Recommended: 3h</div>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={600}
                    step={30}
                    value={goal}
                    onChange={(e) => setGoal(parseInt(e.target.value, 10))}
                    className="w-full mt-5 accent-[#7C3AED]"
                    data-testid="onb-goal-slider"
                  />
                </div>

                <div className="mt-6 rounded-[20px] border border-white/[0.06] bg-[#111114] p-6">
                  <div className="text-sm text-[#A1A1AA] mb-3">Subjects to focus on</div>
                  <div className="flex flex-wrap gap-2">
                    {(SUBJECTS_BY_LEVEL[level] || []).map((s) => {
                      const active = subjects.includes(s);
                      return (
                        <button
                          key={s}
                          onClick={() =>
                            setSubjects((cur) =>
                              cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
                            )
                          }
                          className={`px-3.5 py-2 rounded-full text-sm border transition ${
                            active
                              ? "border-[#7C3AED] bg-[#7C3AED]/15 text-[#F5F5F7]"
                              : "border-white/[0.06] bg-white/[0.02] text-[#A1A1AA] hover:text-[#F5F5F7]"
                          }`}
                          data-testid={`onb-subject-${s.replace(/\s+/g, "-").toLowerCase()}`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <FooterBar
                  onBack={goBack}
                  onNext={goNext}
                  nextTestId="onb-goal-next"
                />
              </StepWrap>
            )}

            {step === 5 && (
              <StepWrap key="s5">
                <StepHeader
                  eyebrow="You're in"
                  title="Welcome to the Grid."
                  subtitle="Take a breath. Then open your first focus session."
                />
                <div className="mt-10 rounded-[24px] border border-[#7C3AED]/30 bg-gradient-to-br from-[#16161B] to-[#111114] p-8">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <Pill label="Level" value={level} />
                    <Pill label="Daily goal" value={`${Math.floor(goal / 60)}h ${goal % 60 ? `${goal % 60}m` : ""}`} />
                    {fit && <Pill label="Fit score" value={`${fit.total}/100`} />}
                    <Pill label="Subjects" value={subjects.length ? `${subjects.length} selected` : "—"} />
                  </div>
                </div>
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={finish}
                    disabled={busy}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] font-semibold text-[15px] transition-all shadow-[0_20px_50px_-15px_rgba(124,58,237,0.75)] disabled:opacity-60"
                    data-testid="onb-finish"
                  >
                    {busy ? "Setting up…" : "Enter the Grid"} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </StepWrap>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StepWrap({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28 }}
    >
      {children}
    </motion.div>
  );
}

function StepHeader({ eyebrow, title, subtitle }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.2em] text-[#7C3AED]">{eyebrow}</div>
      <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05]" data-testid="onb-step-title">{title}</h1>
      {subtitle && <p className="mt-3 text-[16px] text-[#A1A1AA]">{subtitle}</p>}
    </div>
  );
}

function FooterBar({ onBack, onNext, nextLabel = "Continue", nextDisabled = false, nextTestId }) {
  return (
    <div className="mt-10 flex items-center justify-between">
      {onBack ? (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-[#A1A1AA] hover:text-[#F5F5F7] transition"
          data-testid="onb-back"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      ) : <span />}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-[15px] transition-all shadow-[0_20px_50px_-15px_rgba(124,58,237,0.6)]"
        data-testid={nextTestId}
      >
        {nextLabel} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function Pill({ label, value }) {
  return (
    <div className="px-4 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03]">
      <div className="text-[10px] uppercase tracking-widest text-[#71717A]">{label}</div>
      <div className="text-sm text-[#F5F5F7] font-semibold mt-0.5">{value}</div>
    </div>
  );
}
