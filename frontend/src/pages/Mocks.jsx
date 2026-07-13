import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

function DiffDots({ profile }) {
  const level = profile === "hard" ? 5 : profile === "balanced" ? 3 : profile === "easy" ? 2 : 4;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i <= level ? "#8B5CF6" : "rgba(255,255,255,0.12)" }} />
      ))}
    </div>
  );
}

const LEVEL_CHIPS = [
  { key: "all", label: "ALL", papers: null },
  { key: "F", label: "FOUNDATION", papers: ["F1", "F2", "F3", "F4"] },
  { key: "I", label: "INTERMEDIATE", papers: ["I1", "I2", "I3", "I4", "I5", "I6"] },
  { key: "P", label: "FINAL", papers: ["P1", "P2", "P3", "P4", "P5", "P6"] },
];

export default function Mocks() {
  const { user } = useAuth();
  const [mocks, setMocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [myLevelOnly, setMyLevelOnly] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get("/mocks").then((r) => setMocks(r.data.items || [])).catch(() => toast.error("Could not load mocks")).finally(() => setLoading(false));
  }, []);

  const filtered = mocks.filter((m) => {
    if (myLevelOnly && user?.journey_level) {
      const level = user.journey_level;
      const map = { Foundation: "F", Intermediate: "I", Final: "P" };
      if (!m.paper_code.startsWith(map[level] || "")) return false;
    }
    if (filter === "all") return true;
    const chip = LEVEL_CHIPS.find((c) => c.key === filter);
    return chip?.papers ? chip.papers.some((p) => m.paper_code.startsWith(p)) : true;
  });

  return (
    <AppShell breadcrumb="APP / MOCKS">
      <GridBackground />
      <div className="relative max-w-[1080px] mx-auto px-6 lg:px-10 py-16" data-testid="mocks-page">
        <header className="mb-14">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ MOCK TESTS ]</div>
          <h1 className="font-display italic leading-[0.96] tracking-[-0.03em]" style={{ fontSize: "clamp(56px, 10vw, 128px)" }}>
            Mock. Grade.<br /><span style={{ color: "#8B5CF6" }}>Repeat.</span>
          </h1>
          <div className="mt-8 font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">
            LEVEL · {(user?.journey_level || "ALL").toUpperCase()} · {mocks.length} MOCKS AVAILABLE
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 mb-10">
          {LEVEL_CHIPS.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              data-testid={`mocks-filter-${c.key}`}
              className="px-3 py-1.5 font-mono uppercase tracking-[0.22em] text-[10.5px] transition"
              style={{
                color: filter === c.key ? "#0A0A0C" : "#8B8B92",
                background: filter === c.key ? "#B4FF39" : "transparent",
                border: `1px solid ${filter === c.key ? "#B4FF39" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              {c.label}
            </button>
          ))}
          <button
            onClick={() => setMyLevelOnly((s) => !s)}
            data-testid="mocks-mylevel-toggle"
            className="ml-2 px-3 py-1.5 font-mono uppercase tracking-[0.22em] text-[10.5px] transition"
            style={{
              color: myLevelOnly ? "#0A0A0C" : "#5A5A62",
              background: myLevelOnly ? "#8B5CF6" : "transparent",
              border: `1px solid ${myLevelOnly ? "#8B5CF6" : "rgba(255,255,255,0.06)"}`,
            }}
          >
            MY LEVEL ONLY
          </button>
        </div>

        {loading && <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="py-24 text-center font-display italic text-[40px] text-white/50" data-testid="mocks-empty">
            no mocks match this filter.
          </div>
        )}
        <div className="divide-y divide-white/[0.06]">
          {filtered.map((m) => (
            <motion.div
              key={m.mock_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              data-testid={`mock-card-${m.mock_id}`}
              className="py-6 grid grid-cols-[80px_1fr_auto] gap-6 items-center group hover:bg-white/[0.02] transition"
            >
              <div>
                <div className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B5CF6]">[ {m.paper_code} ]</div>
                <div className="mt-2"><DiffDots profile={m.difficulty_profile} /></div>
              </div>
              <div className="min-w-0">
                <h2 className="font-display italic text-[24px] md:text-[28px] leading-[1.1] text-white/95">{m.title}</h2>
                <div className="mt-2 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">
                  {m.question_count} Q · {m.duration_minutes} MIN · {m.total_marks} MARKS · {m.difficulty_profile.toUpperCase()}
                </div>
              </div>
              <div className="text-right">
                {m.best_score !== null && m.best_score !== undefined ? (
                  <>
                    <div className="font-display italic text-[36px] text-white leading-tight">{Math.round(m.best_score)}<span className="text-[14px] text-white/50">%</span></div>
                    <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">{m.attempts_count} ATTEMPT{m.attempts_count === 1 ? "" : "S"}</div>
                    <Link to={`/mocks/${m.mock_id}/attempt`} data-testid={`mock-start-${m.mock_id}`} className="mt-2 inline-block font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#B4FF39] hover:text-white transition">
                      RETAKE →
                    </Link>
                  </>
                ) : (
                  <Link to={`/mocks/${m.mock_id}/attempt`} data-testid={`mock-start-${m.mock_id}`} className="font-mono uppercase tracking-[0.22em] text-[10.5px] px-3 py-1.5 border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition">
                    [ START → ]
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
