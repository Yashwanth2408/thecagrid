import React, { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

const STEPS = [
  { title: "Your streak.", body: "Every day you focus, this ticks. Miss a day and it resets.", target: '[data-testid="dash-streak-card"]' },
  { title: "One button, one hour.", body: "Focus mode: pick a subject, hit start, disappear.", target: '[data-testid="dash-focus-cta"]' },
  { title: "Your AI mentor.", body: "Stuck on a concept? The mentor's a drawer away — click the sparkles.", target: '[data-testid="mentor-drawer-toggle"]' },
  { title: "Regulatory radar.", body: "New notifications, ICAI amendments, deadlines. All in one thread.", target: '[data-testid="dash-radar-card"]' },
];

function locate(sel) {
  try { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height }; }
  catch { return null; }
}

export default function OnboardingTour() {
  const { user, refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [box, setBox] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.has_seen_tour) return;
    // Delay so dashboard renders
    const t = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(t);
  }, [user]);

  useEffect(() => {
    if (!visible) return;
    const b = locate(STEPS[step].target);
    setBox(b);
    if (b) window.scrollTo({ top: Math.max(0, b.top - 100), behavior: "smooth" });
  }, [step, visible]);

  const finish = async (skipped = false) => {
    setVisible(false);
    try { await api.post("/users/me/tour", { has_seen_tour: true }); refresh?.(); } catch {}
  };

  if (!visible) return null;
  const s = STEPS[step];

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none" data-testid="onboarding-tour">
      {/* dim overlay */}
      <div className="absolute inset-0 bg-black/70 pointer-events-auto" />
      {/* highlight cutout */}
      {box && (
        <div className="absolute border-2 border-[#B4FF39] shadow-[0_0_60px_rgba(180,255,57,0.5)] pointer-events-none" style={{ top: box.top - 8, left: box.left - 8, width: box.width + 16, height: box.height + 16 }} />
      )}
      {/* card */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[380px] max-w-[90vw] border border-white/[0.1] bg-[#111114] p-5 pointer-events-auto" data-testid="tour-card">
        <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#B4FF39] mb-2">[ TOUR · {step + 1}/{STEPS.length} ]</div>
        <div className="font-display italic text-[24px] text-white leading-tight">{s.title}</div>
        <div className="font-body text-[14px] text-[#B0B0B8] mt-2">{s.body}</div>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={() => finish(true)} data-testid="tour-skip" className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62] hover:text-white transition">[ SKIP ]</button>
          <div className="flex items-center gap-2">
            {step > 0 && <button onClick={() => setStep(step - 1)} className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-white/70 hover:text-white transition">[ ← ]</button>}
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(step + 1)} data-testid="tour-next" className="font-mono uppercase tracking-[0.22em] text-[10.5px] px-3 py-1.5 border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition">[ NEXT → ]</button>
            ) : (
              <button onClick={() => finish(false)} data-testid="tour-finish" className="font-mono uppercase tracking-[0.22em] text-[10.5px] px-3 py-1.5 border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition">[ DONE ]</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
