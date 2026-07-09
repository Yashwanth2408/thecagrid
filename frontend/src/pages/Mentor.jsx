import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import MentorChat from "@/components/MentorChat";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { Plus, ChevronRight } from "lucide-react";

function defaultMode(level) {
  return level === "Articleship" || level === "Qualified" ? "practice" : "exam";
}

function relativeTime(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function Mentor() {
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(sp.get("session") || null);
  const [mode, setMode] = useState(defaultMode(user?.journey_level));
  const [loading, setLoading] = useState(true);

  const reloadSessions = async () => {
    try {
      const r = await api.get("/mentor/sessions");
      setSessions(r.data);
      if (!activeId && r.data.length > 0) {
        setActiveId(r.data[0].session_id);
        setMode(r.data[0].mode);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { reloadSessions(); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    if (activeId) {
      setSp((cur) => { cur.set("session", activeId); return cur; }, { replace: true });
      const s = sessions.find((x) => x.session_id === activeId);
      if (s) setMode(s.mode);
    }
    // eslint-disable-next-line
  }, [activeId]);

  const newSession = async () => {
    try {
      const r = await api.post("/mentor/sessions", { mode });
      setActiveId(r.data.session_id);
      reloadSessions();
    } catch {}
  };

  const activeMeta = sessions.find((s) => s.session_id === activeId);

  return (
    <AppShell breadcrumb="DASHBOARD / MENTOR">
      <div className="max-w-[1440px] mx-auto flex" style={{ height: "calc(100vh - 4rem)" }}>
        {/* Sidebar */}
        <aside className="w-[280px] flex-none border-r border-white/[0.06] flex flex-col">
          <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">SESSIONS</div>
            <button
              onClick={newSession}
              data-testid="mentor-new-session"
              data-magnetic
              className="group inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] hover:text-[#F2F2F2] transition"
            >
              <Plus className="w-3 h-3" strokeWidth={2} /> NEW
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="p-5 font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">loading…</div>
            )}
            {!loading && sessions.length === 0 && (
              <div className="p-5 font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">
                No sessions yet. [ + NEW ]
              </div>
            )}
            {sessions.map((s) => {
              const active = s.session_id === activeId;
              return (
                <button
                  key={s.session_id}
                  onClick={() => setActiveId(s.session_id)}
                  className={`relative w-full text-left px-5 py-4 border-b border-white/[0.04] transition-colors ${
                    active ? "bg-[#8B5CF6]/5" : "hover:bg-white/[0.02]"
                  }`}
                  data-testid={`mentor-session-${s.session_id}`}
                >
                  {active && <span className="absolute left-0 top-3 bottom-3 w-[3px] bg-[#8B5CF6]" />}
                  <div className={`text-[13px] leading-snug truncate ${active ? "text-[#F2F2F2]" : "text-[#F2F2F2]/85"}`}>
                    {s.title}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 font-mono uppercase tracking-[0.22em] text-[9.5px]">
                    <span className={s.mode === "practice" ? "text-[#B4FF39]" : "text-[#8B5CF6]"}>
                      {s.mode}
                    </span>
                    <span className="text-[#5A5A62]">·</span>
                    <span className="text-[#5A5A62]">{relativeTime(s.updated_at)}</span>
                    <span className="text-[#5A5A62]">·</span>
                    <span className="text-[#5A5A62] tabular-nums">{s.message_count || 0} msg</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="p-5 border-t border-white/[0.06]">
            <Link
              to="/mentor/study-plan"
              className="group inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] hover:text-[#F2F2F2] transition"
              data-testid="mentor-study-plan-link"
            >
              STUDY PLAN <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
            </Link>
          </div>
        </aside>

        {/* Chat pane */}
        <section className="flex-1 min-w-0 flex flex-col">
          <div className="px-6 py-5 border-b border-white/[0.06] flex items-baseline justify-between">
            <h1 className="font-display italic text-[32px] lg:text-[40px] leading-[1] tracking-[-0.02em] truncate">
              {activeMeta?.title || "Start a conversation."}
            </h1>
            {activeId && (
              <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">
                {activeMeta?.mode || mode}
              </div>
            )}
          </div>
          <div className="flex-1 min-h-0">
            {activeId ? (
              <MentorChat
                sessionId={activeId}
                mode={mode}
                onModeChange={setMode}
                onSessionChanged={(id) => { setActiveId(id); reloadSessions(); }}
              />
            ) : (
              <MentorChat
                sessionId={null}
                mode={mode}
                onModeChange={setMode}
                onSessionChanged={(id) => { setActiveId(id); reloadSessions(); }}
              />
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
