import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, Maximize2 } from "lucide-react";
import { Link } from "react-router-dom";
import MentorChat from "@/components/MentorChat";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/apiClient";

export default function MentorDrawer() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [mode, setMode] = useState("exam");

  // Restore state
  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem("cagrid.drawer");
    if (stored) {
      try {
        const s = JSON.parse(stored);
        setOpen(!!s.open);
        setSessionId(s.sessionId || null);
        setMode(s.mode || "exam");
      } catch {}
    } else {
      setMode(user.journey_level === "Articleship" || user.journey_level === "Qualified" ? "practice" : "exam");
    }
  }, [user]);

  // Persist
  useEffect(() => {
    if (!user) return;
    localStorage.setItem("cagrid.drawer", JSON.stringify({ open, sessionId, mode }));
  }, [open, sessionId, mode, user]);

  const openWith = async () => {
    if (!sessionId) {
      // Create a fresh session on first open
      try {
        const r = await api.post("/mentor/sessions", { mode });
        setSessionId(r.data.session_id);
      } catch {}
    }
    setOpen(true);
  };

  if (!user) return null;

  return (
    <>
      {!open && (
        <motion.button
          onClick={openWith}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          data-magnetic
          data-cursor-label="ASK MENTOR"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#17171B] border border-[#8B5CF6]/50 flex items-center justify-center transition-shadow"
          style={{ boxShadow: "0 10px 30px -10px rgba(139,92,246,0.6)" }}
          data-testid="mentor-drawer-toggle"
        >
          <Sparkles className="w-5 h-5 text-[#8B5CF6]" strokeWidth={1.6} />
          <span className="absolute inset-0 rounded-full animate-ping opacity-30 border border-[#8B5CF6]" />
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: 460, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 460, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-6 top-6 bottom-6 z-40 w-[420px] max-w-[calc(100vw-48px)] rounded-2xl border border-[#8B5CF6]/40 bg-[#0A0A0C]/95 backdrop-blur-xl flex flex-col overflow-hidden"
            style={{ boxShadow: "0 40px 100px -30px rgba(139,92,246,0.45)" }}
            data-testid="mentor-drawer"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-[#8B5CF6]" strokeWidth={1.6} />
                <span className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#F2F2F2] truncate">MENTOR</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={sessionId ? `/mentor?session=${sessionId}` : "/mentor"}
                  onClick={() => setOpen(false)}
                  className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B8B92] hover:text-[#F2F2F2] transition"
                  data-testid="mentor-drawer-expand"
                >
                  <Maximize2 className="w-3.5 h-3.5" strokeWidth={1.6} />
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B8B92] hover:text-[#F2F2F2] transition"
                  data-testid="mentor-drawer-close"
                >
                  <X className="w-4 h-4" strokeWidth={1.6} />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <MentorChat
                sessionId={sessionId}
                mode={mode}
                onModeChange={setMode}
                onSessionChanged={(id) => setSessionId(id)}
                compact
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
