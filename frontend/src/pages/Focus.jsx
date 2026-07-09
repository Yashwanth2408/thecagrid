import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import AppShell from "@/components/AppShell";
import BadgeIcon from "@/components/BadgeIcon";
import { api, API } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/MicroToast";
import { Volume2, VolumeX } from "lucide-react";

const AMBIENT = {
  none: null,
  rain: "https://cdn.pixabay.com/audio/2022/03/15/audio_1a5cae5b1d.mp3",
  lofi: "https://cdn.pixabay.com/audio/2022/03/09/audio_c3b7fddb9d.mp3",
  cafe: "https://cdn.pixabay.com/audio/2022/10/25/audio_c6ccf3f8bc.mp3",
};

const DURATION_CHIPS = [15, 25, 45, 60, 90];

function pad(n) { return String(n).padStart(2, "0"); }
function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${pad(m)}:${pad(s)}`;
}

export default function Focus() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { user, refreshStats } = useAuth();
  const toast = useToast();
  const subjects = useMemo(
    () => (user?.subjects?.length ? user.subjects : ["General"]),
    [user]
  );
  const [subject, setSubject] = useState(sp.get("subject") || subjects[0] || "General");
  const [durationMin, setDurationMin] = useState(25);
  const [ambient, setAmbient] = useState("none");
  const [active, setActive] = useState(null); // {session_id, planned_seconds, started_at ISO, subject}
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cancelPrompt, setCancelPrompt] = useState(false);
  const [complete, setComplete] = useState(null); // completion result
  const audioRef = useRef(null);
  const rafRef = useRef(null);

  // Reconcile with backend on mount
  useEffect(() => {
    api.get("/focus/active").then((r) => {
      const a = r.data;
      if (a) {
        setActive({
          session_id: a.session_id,
          planned_seconds: a.planned_seconds,
          started_at: a.started_at,
          subject: a.subject,
        });
        setAmbient(a.ambient_track || "none");
      }
    }).catch(() => {});
  }, []);

  // Elapsed tick
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const startMs = new Date(active.started_at).getTime();
      const s = (Date.now() - startMs) / 1000;
      setElapsed(s);
      if (s >= active.planned_seconds + 0.5) {
        // Auto-complete
        cancelAnimationFrame(rafRef.current);
        doComplete();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [active]);

  // Ambient audio
  useEffect(() => {
    const src = AMBIENT[ambient];
    if (!active || !src || muted) {
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch {}
      }
      return;
    }
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(src);
        audioRef.current.loop = true;
        audioRef.current.volume = 0.4;
      } else if (audioRef.current.src !== src) {
        audioRef.current.src = src;
        audioRef.current.loop = true;
        audioRef.current.volume = 0.4;
      }
      audioRef.current.play().catch(() => {});
    } catch {}
    return () => {
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch {}
      }
    };
  }, [ambient, active, muted]);

  useEffect(() => () => { // cleanup on unmount
    try { audioRef.current?.pause(); } catch {}
  }, []);

  const startSession = async () => {
    const body = { subject, planned_minutes: durationMin, ambient_track: ambient === "none" ? null : ambient };
    const r = await api.post("/focus/start", body);
    setActive({
      session_id: r.data.session_id,
      planned_seconds: r.data.planned_seconds,
      started_at: r.data.started_at,
      subject: r.data.subject,
    });
    setElapsed(0);
  };

  const doComplete = async () => {
    if (!active) return;
    try {
      const r = await api.post("/focus/complete", { session_id: active.session_id });
      setComplete(r.data);
      setActive(null);
      try { audioRef.current?.pause(); } catch {}
      // chime
      try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.frequency.value = 660; o.type = "sine";
        g.gain.setValueAtTime(0, ac.currentTime);
        g.gain.linearRampToValueAtTime(0.18, ac.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.8);
        o.connect(g); g.connect(ac.destination);
        o.start(); o.stop(ac.currentTime + 0.85);
      } catch {}
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.55 },
                 colors: ["#8B5CF6", "#B4FF39", "#F2F2F2"] });
      if (r.data.new_badges?.length) {
        for (const _ of r.data.new_badges) {
          setTimeout(() => confetti({
            particleCount: 60, spread: 70, origin: { y: 0.6 },
            colors: ["#8B5CF6", "#B4FF39"],
          }), 300);
        }
      }
      refreshStats();
      // Micro-toast: pull fresh live pulse for active_now count
      setTimeout(async () => {
        try {
          const r = await fetch(`${API}/live/pulse`, { credentials: "include" });
          const p = await r.json();
          toast.push({
            title: "You're on the grid.",
            subtitle: `NOW FOCUSED · ${p.active_now?.toLocaleString?.() || p.active_now || "1,132"} ASPIRANTS`,
            duration: 4500,
          });
        } catch {
          toast.push({ title: "You're on the grid.", subtitle: "NOW FOCUSED · 1,132 ASPIRANTS", duration: 4500 });
        }
      }, 500);
    } catch (e) {
      console.error(e);
    }
  };

  const doCancel = async () => {
    if (!active) return;
    try {
      await api.post("/focus/cancel", { session_id: active.session_id });
    } catch {}
    setActive(null);
    setCancelPrompt(false);
    try { audioRef.current?.pause(); } catch {}
    refreshStats();
  };

  const percent = active ? Math.min(1, elapsed / active.planned_seconds) : 0;
  const remaining = active ? Math.max(0, active.planned_seconds - elapsed) : 0;

  // FULLSCREEN ACTIVE STATE
  if (active) {
    const R = 44;
    const C = 2 * Math.PI * R;
    return (
      <div className="fixed inset-0 z-50 bg-[#0A0A0C] text-[#F2F2F2] overflow-hidden">
        {/* faint grid distant */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="fg" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1" fill="rgba(255,255,255,0.08)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#fg)" />
          </svg>
        </div>

        <div className="absolute top-6 right-8 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">
          SESSION · <span className="text-[#F2F2F2]">{active.subject}</span>
        </div>

        {ambient !== "none" && (
          <button
            onClick={() => setMuted((m) => !m)}
            className="absolute bottom-8 left-8 flex items-center gap-2 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B8B92] hover:text-[#F2F2F2] transition"
            data-testid="focus-mute-toggle"
          >
            {muted ? <VolumeX className="w-4 h-4" strokeWidth={1.5} /> : <Volume2 className="w-4 h-4" strokeWidth={1.5} />}
            {ambient}
          </button>
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="relative w-[560px] h-[560px] max-w-[85vw] max-h-[85vw]">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle cx="50" cy="50" r={R} stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" fill="none" />
              <motion.circle
                cx="50" cy="50" r={R}
                stroke="#8B5CF6" strokeWidth="0.4" fill="none"
                strokeLinecap="round"
                strokeDasharray={C}
                animate={{ strokeDashoffset: C * (1 - percent) }}
                transition={{ type: "spring", stiffness: 40, damping: 20 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div
                className="font-display italic tabular-nums text-[#F2F2F2] leading-none"
                style={{ fontSize: "clamp(120px, 18vw, 220px)", letterSpacing: "-0.03em" }}
                data-testid="focus-timer-display"
              >
                {fmtTime(remaining)}
              </div>
              <div className="mt-6 font-mono uppercase tracking-[0.32em] text-[13px] text-[#8B5CF6]">
                {active.subject}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-10">
          <button
            onClick={() => setCancelPrompt(true)}
            className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92] hover:text-[#F2F2F2] transition"
            data-testid="focus-cancel"
          >
            [ cancel ]
          </button>
          <button
            onClick={doComplete}
            data-magnetic
            className="font-mono uppercase tracking-[0.22em] text-[13px] text-[#8B5CF6] hover:text-[#F2F2F2] transition"
            data-testid="focus-complete"
          >
            [ complete → ]
          </button>
        </div>

        <AnimatePresence>
          {cancelPrompt && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0A0A0C]/85 backdrop-blur flex items-center justify-center z-10"
            >
              <div className="max-w-md w-full mx-auto px-8 py-10 border border-[#8B5CF6]/40 bg-[#0F0F12]">
                <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">[ confirm ]</div>
                <div className="mt-4 font-display italic text-[36px] leading-[1] text-[#F2F2F2]">Cancel this session?</div>
                <div className="mt-3 text-[14px] text-[#8B8B92]">No XP is awarded. The session logs as cancelled.</div>
                <div className="mt-8 flex items-center justify-between">
                  <button onClick={() => setCancelPrompt(false)}
                          className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92] hover:text-[#F2F2F2] transition"
                          data-testid="focus-cancel-keep">
                    [ keep going ]
                  </button>
                  <button onClick={doCancel}
                          className="font-mono uppercase tracking-[0.22em] text-[13px] text-[#8B5CF6] hover:text-[#F2F2F2] transition"
                          data-testid="focus-cancel-confirm">
                    [ cancel session → ]
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // COMPLETION MODAL (rendered atop idle)
  const showComplete = !!complete;

  // IDLE STATE
  return (
    <AppShell breadcrumb="DASHBOARD / FOCUS">
      <div className="max-w-[1200px] mx-auto px-8 lg:px-16 py-16 grid grid-cols-12 gap-10">
        <div className="col-span-12 lg:col-span-7">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">[ configure ]</div>
          <h1 className="mt-4 font-display italic text-[64px] lg:text-[96px] leading-[0.92] tracking-[-0.02em]">
            Configure focus.
          </h1>

          <div className="mt-12">
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">DURATION</div>
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              {DURATION_CHIPS.map((m) => (
                <button
                  key={m}
                  onClick={() => setDurationMin(m)}
                  data-testid={`focus-chip-${m}`}
                  className={`font-mono uppercase tracking-[0.22em] text-[11px] px-3.5 py-2 border transition ${
                    durationMin === m
                      ? "border-[#8B5CF6] text-[#8B5CF6] bg-[#8B5CF6]/10"
                      : "border-white/[0.08] text-[#8B8B92] hover:text-[#F2F2F2]"
                  }`}
                >
                  {m} MIN
                </button>
              ))}
              <input
                type="number" min="1" max="180" value={durationMin}
                onChange={(e) => setDurationMin(Math.max(1, Math.min(180, parseInt(e.target.value || "1", 10))))}
                className="w-24 bg-transparent border-b border-white/[0.15] focus:border-[#8B5CF6] font-mono uppercase tracking-[0.22em] text-[11px] px-2 py-2 text-[#F2F2F2] focus:outline-none"
                data-testid="focus-custom-min"
              />
              <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">CUSTOM</span>
            </div>
          </div>

          <div className="mt-10">
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">SUBJECT</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[...subjects, "General"].filter((v, i, a) => a.indexOf(v) === i).map((s) => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  data-testid={`focus-subject-${s.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`font-mono uppercase tracking-[0.22em] text-[11px] px-3.5 py-2 border transition ${
                    subject === s
                      ? "border-[#8B5CF6] text-[#8B5CF6] bg-[#8B5CF6]/10"
                      : "border-white/[0.08] text-[#8B8B92] hover:text-[#F2F2F2]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10">
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">AMBIENT</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {["none", "rain", "lofi", "cafe"].map((a) => (
                <button
                  key={a}
                  onClick={() => setAmbient(a)}
                  data-testid={`focus-ambient-${a}`}
                  className={`font-mono uppercase tracking-[0.22em] text-[11px] px-3.5 py-2 border transition ${
                    ambient === a
                      ? "border-[#8B5CF6] text-[#8B5CF6] bg-[#8B5CF6]/10"
                      : "border-white/[0.08] text-[#8B8B92] hover:text-[#F2F2F2]"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-14">
            <button
              onClick={startSession}
              data-magnetic
              className="group inline-flex items-center gap-3 font-mono uppercase tracking-[0.24em] text-[15px] text-[#8B5CF6]"
              data-testid="focus-start"
            >
              <span className="relative">
                [ START · {durationMin} MIN →
                <span className="absolute left-0 -bottom-1 h-px w-full bg-[#8B5CF6] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500" />
              </span>
              <span>]</span>
            </button>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 lg:pl-8 lg:border-l lg:border-white/[0.06]">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">TODAY</div>
          <div className="mt-4 font-display italic text-[56px] leading-[0.95]">
            {user?.name?.split(" ")[0] || "You"}.
          </div>
          <div className="mt-6 space-y-3 font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">
            <div>SUBJECTS · <span className="text-[#F2F2F2]">{subjects.length}</span></div>
            <div>GOAL · <span className="text-[#F2F2F2]">{user?.daily_goal_minutes || 180} MIN</span></div>
          </div>
          <div className="mt-8 border-t border-white/[0.06] pt-6 font-mono uppercase tracking-[0.2em] text-[10px] text-[#5A5A62] leading-[1.8]">
            [ HOW IT WORKS ]<br />
            → START — timer takes over the screen.<br />
            → COMPLETE — XP + streak update.<br />
            → CANCEL — no XP, session logged as cancelled.<br />
            → PERSISTS across refresh.
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showComplete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0A0A0C]/85 backdrop-blur flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
              className="w-full max-w-lg border border-[#8B5CF6]/40 bg-[#0F0F12] p-10"
              data-testid="focus-complete-modal"
            >
              <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">[ session · complete ]</div>
              <div className="mt-4 font-display italic text-[64px] leading-[0.95]">Locked in.</div>

              <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/[0.06] pt-6">
                <Stat k="XP" v={`+${complete.xp_awarded}`} accent />
                <Stat k="STREAK" v={`${complete.current_streak}d`} />
                <Stat k="LEVEL" v={`L${complete.level}`} accent={complete.level_up} />
              </div>

              {complete.new_badges?.length > 0 && (
                <div className="mt-8">
                  <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">[ new unlocks ]</div>
                  <div className="mt-4 space-y-3">
                    {complete.new_badges.map((b) => (
                      <motion.div
                        key={b.badge_id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 border-t border-white/[0.06] pt-3"
                      >
                        <div className="w-10 h-10 border border-[#8B5CF6]/50 bg-[#8B5CF6]/10 flex items-center justify-center"
                             style={{ boxShadow: "0 0 24px rgba(139,92,246,0.4)" }}>
                          <BadgeIcon name={b.icon} className="text-[#8B5CF6]" size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm text-[#F2F2F2]">{b.name}</div>
                          <div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">{b.rarity}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-10 flex items-center justify-between">
                <button
                  onClick={() => { setComplete(null); navigate("/dashboard"); }}
                  className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92] hover:text-[#F2F2F2] transition"
                  data-testid="complete-to-dashboard"
                >
                  [ back to dashboard ]
                </button>
                <button
                  onClick={() => setComplete(null)}
                  data-magnetic
                  className="font-mono uppercase tracking-[0.22em] text-[13px] text-[#8B5CF6] hover:text-[#F2F2F2] transition"
                  data-testid="complete-start-another"
                >
                  [ start another → ]
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function Stat({ k, v, accent }) {
  return (
    <div>
      <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">{k}</div>
      <div className={`mt-2 font-display italic text-[32px] leading-[1] ${accent ? "text-[#8B5CF6]" : "text-[#F2F2F2]"}`}>{v}</div>
    </div>
  );
}
