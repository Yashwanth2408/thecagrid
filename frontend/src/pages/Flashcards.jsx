import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

const GRADE_META = [
  { key: 0, label: "AGAIN", color: "#FF6B6B", shortcut: "1" },
  { key: 1, label: "HARD", color: "#F59E0B", shortcut: "2" },
  { key: 2, label: "GOOD", color: "#8B5CF6", shortcut: "3" },
  { key: 3, label: "EASY", color: "#B4FF39", shortcut: "4" },
];

function ReviewMode({ deckId, onExit }) {
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [xp, setXp] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [startTs, setStartTs] = useState(Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/flashcards/decks/${deckId}/queue?limit=20`);
      setQueue(r.data.items || []);
      if (!r.data.items?.length) setDone(true);
    } catch (e) {
      toast.error("Could not load cards");
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => { load(); }, [load]);

  const card = queue[idx];

  const handleGrade = async (grade) => {
    if (!card) return;
    const spent = Math.floor((Date.now() - startTs) / 1000);
    try {
      const r = await api.post("/flashcards/review", {
        card_id: card.card_id, grade, time_spent_seconds: spent,
      });
      setXp((x) => x + (r.data.xp_awarded || 0));
      setReviewed((n) => n + 1);
    } catch (e) {}
    setFlipped(false);
    if (idx + 1 >= queue.length) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setStartTs(Date.now());
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === " ") { e.preventDefault(); setFlipped((f) => !f); }
      if (e.key === "Escape") onExit();
      if (flipped) {
        if (e.key === "1") handleGrade(0);
        if (e.key === "2") handleGrade(1);
        if (e.key === "3") handleGrade(2);
        if (e.key === "4") handleGrade(3);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, [flipped, idx, queue]);

  if (loading) return <div className="p-16 text-center font-mono text-white/50">loading…</div>;

  if (done) {
    return (
      <div className="max-w-lg mx-auto py-24 text-center" data-testid="flashcard-session-done">
        <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#B4FF39] mb-4">SESSION COMPLETE</div>
        <h2 className="font-display italic text-[56px] leading-[1] mb-6">Recall builds retention.</h2>
        <div className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92] mb-10">
          {reviewed} CARDS REVIEWED · +{xp} XP EARNED
        </div>
        <button onClick={onExit} className="px-5 py-2.5 bg-[#B4FF39] text-black font-medium rounded-full">Back to decks</button>
      </div>
    );
  }

  if (!card) return null;

  return (
    <div className="max-w-2xl mx-auto py-12" data-testid="flashcard-review-mode">
      <div className="flex items-center justify-between mb-8">
        <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">
          CARD {idx + 1} / {queue.length}
        </div>
        <button onClick={onExit} className="text-white/40 hover:text-white transition" data-testid="flashcard-close">
          <X className="w-5 h-5" strokeWidth={1.5} />
        </button>
      </div>
      <motion.div
        key={card.card_id}
        onClick={() => setFlipped((f) => !f)}
        data-testid="flashcard-flip"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="cursor-pointer bg-[#111114] border border-white/[0.08] rounded-2xl p-10 min-h-[300px] flex flex-col justify-center backdrop-blur-xl"
        style={{ boxShadow: "0 0 40px rgba(139,92,246,0.06)" }}
      >
        <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62] mb-6">
          {flipped ? "[ ANSWER ]" : "[ FRONT · TAP OR SPACE TO FLIP ]"}
        </div>
        <div className="text-[20px] leading-[1.55] text-white/95 whitespace-pre-wrap">
          {flipped ? card.back_markdown : card.front_markdown}
        </div>
        {flipped && card.hint && (
          <div className="mt-6 pt-4 border-t border-white/[0.06] font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">
            HINT · {card.hint}
          </div>
        )}
      </motion.div>
      <AnimatePresence>
        {flipped && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 grid grid-cols-4 gap-2">
            {GRADE_META.map((g) => (
              <button
                key={g.key}
                onClick={() => handleGrade(g.key)}
                data-testid={`flashcard-grade-${g.key}`}
                className="py-3 font-mono uppercase tracking-[0.22em] text-[11px] transition"
                style={{ color: g.color, border: `1px solid ${g.color}`, background: `${g.color}0F` }}
              >
                <div>[ {g.label} ]</div>
                <div className="text-[9px] text-white/40 mt-1">{g.shortcut}</div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Flashcards() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const deckParam = params.get("deck");
  const [decks, setDecks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      api.get("/flashcards/decks"),
      api.get("/flashcards/stats"),
    ]).then(([d, s]) => {
      setDecks(d.data.items || []);
      setStats(s.data);
    }).catch(() => toast.error("Could not load flashcards"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  if (deckParam) {
    return (
      <AppShell breadcrumb="APP / FLASHCARDS / REVIEW">
        <GridBackground />
        <div className="relative min-h-screen">
          <ReviewMode deckId={deckParam} onExit={() => { setParams({}); loadAll(); }} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumb="APP / FLASHCARDS">
      <GridBackground />
      <div className="relative max-w-[1080px] mx-auto px-6 lg:px-10 py-16" data-testid="flashcards-page">
        <header className="mb-14">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ FLASHCARDS · SPACED REPETITION ]</div>
          <h1 className="font-display italic leading-[0.96] tracking-[-0.03em]" style={{ fontSize: "clamp(56px, 10vw, 128px)" }}>
            Recall builds<br /><span style={{ color: "#8B5CF6" }}>retention.</span>
          </h1>
          <div className="mt-8 font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">
            {stats?.due_today ?? 0} DUE TODAY · {stats?.mastered_count ?? 0} MASTERED · {stats?.total_cards_studied ?? 0} STUDIED
          </div>
        </header>

        {loading && <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div>}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((d) => (
            <div
              key={d.deck_id}
              onClick={() => setParams({ deck: d.deck_id })}
              data-testid={`flashcard-deck-${d.deck_id}`}
              className="cursor-pointer border border-white/[0.06] hover:border-[#8B5CF6]/60 bg-[#0F0F12] p-6 transition"
            >
              <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-3">[ {d.paper_code} ]</div>
              <h3 className="font-display italic text-[24px] leading-[1.1] text-white/95 mb-6">{d.title}</h3>
              <div className="grid grid-cols-3 gap-2 font-mono uppercase tracking-[0.2em] text-[10px] text-[#5A5A62]">
                <div>
                  <div>DUE</div>
                  <div className="text-[#B4FF39] text-[16px] tabular-nums mt-0.5">{d.user_progress?.due_today ?? 0}</div>
                </div>
                <div>
                  <div>MASTERED</div>
                  <div className="text-[#8B5CF6] text-[16px] tabular-nums mt-0.5">{d.user_progress?.mastered ?? 0}</div>
                </div>
                <div>
                  <div>TOTAL</div>
                  <div className="text-white/80 text-[16px] tabular-nums mt-0.5">{d.card_count}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
