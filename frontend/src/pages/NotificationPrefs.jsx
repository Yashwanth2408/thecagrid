import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

const TOGGLES = [
  { key: "email_streak_reminders", label: "Email streak reminders", sub: "Nightly nudge (20:00 IST) if today has no focus session and your streak is ≥ 3." },
  { key: "email_weekly_recap", label: "Email weekly recap", sub: "Every Monday, 08:00 IST — hours, sessions, streak this week." },
  { key: "email_exam_reminders", label: "Email exam reminders", sub: "One week before an exam registered in your study plan." },
];

export default function NotificationPrefs() {
  const [prefs, setPrefs] = useState(null);
  useEffect(() => { api.get("/notifications/preferences").then((r) => setPrefs(r.data)); }, []);
  const set = async (k, v) => {
    const nx = { ...prefs, [k]: v };
    setPrefs(nx);
    try { await api.put("/notifications/preferences", { [k]: v }); toast.success("Saved"); }
    catch { toast.error("Could not save"); }
  };
  if (!prefs) return <AppShell breadcrumb="APP / SETTINGS / NOTIFICATIONS"><div className="p-16 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div></AppShell>;
  return (
    <AppShell breadcrumb="APP / SETTINGS / NOTIFICATIONS">
      <GridBackground />
      <div className="relative max-w-[820px] mx-auto px-6 lg:px-10 py-16" data-testid="notif-prefs-page">
        <Link to="/notifications" className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62] hover:text-white transition">← BACK</Link>
        <header className="mt-6 mb-10">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ PREFERENCES ]</div>
          <h1 className="font-display italic leading-[0.98] tracking-[-0.02em]" style={{ fontSize: "clamp(48px, 8vw, 88px)" }}>Choose your signal.</h1>
        </header>
        <div className="divide-y divide-white/[0.06]">
          {TOGGLES.map((t) => (
            <div key={t.key} className="py-6 flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="font-display italic text-[20px] text-white">{t.label}</div>
                <div className="font-body text-[13px] text-[#8B8B92] mt-1">{t.sub}</div>
              </div>
              <button data-testid={`pref-${t.key}`} onClick={() => set(t.key, !prefs[t.key])} className="w-14 h-8 rounded-full transition relative" style={{ background: prefs[t.key] ? "#8B5CF6" : "rgba(255,255,255,0.08)" }}>
                <div className="w-6 h-6 rounded-full bg-white absolute top-1 transition-all" style={{ left: prefs[t.key] ? "28px" : "4px" }} />
              </button>
            </div>
          ))}
          <div className="py-6 flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="font-display italic text-[20px] text-white">Browser push notifications</div>
                <span className="font-mono uppercase tracking-[0.22em] text-[9px] text-[#F59E0B] border border-[#F59E0B]/40 px-1.5 py-0.5">MOCKED</span>
              </div>
              <div className="font-body text-[13px] text-[#8B8B92] mt-1">Push subscription flow saves a mock endpoint but does not actually send push messages.</div>
            </div>
            <button data-testid="pref-push_enabled" onClick={() => set("push_enabled", !prefs.push_enabled)} className="w-14 h-8 rounded-full transition relative" style={{ background: prefs.push_enabled ? "#8B5CF6" : "rgba(255,255,255,0.08)" }}>
              <div className="w-6 h-6 rounded-full bg-white absolute top-1 transition-all" style={{ left: prefs.push_enabled ? "28px" : "4px" }} />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
