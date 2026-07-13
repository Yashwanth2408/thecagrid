import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { X, Flag, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/apiClient";

function fmtSec(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function MockAttempt() {
  const { mock_id } = useParams();
  const nav = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({}); // qid -> {selected_option, subjective_text}
  const [flags, setFlags] = useState(new Set());
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const saveTimerRef = useRef({});

  useEffect(() => {
    api.post(`/mocks/${mock_id}/start`).then((r) => {
      setAttempt(r.data);
      const start = new Date(r.data.started_at).getTime();
      const durSec = r.data.duration_minutes * 60;
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setRemaining(Math.max(0, durSec - elapsed));
      localStorage.setItem(`mock_attempt_${mock_id}`, r.data.attempt_id);
    }).catch((e) => {
      toast.error("Could not start mock");
      nav("/mocks");
    }).finally(() => setLoading(false));
  }, [mock_id, nav]);

  // Timer
  useEffect(() => {
    if (!attempt || remaining <= 0) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          handleSubmit(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [attempt]);

  const q = attempt?.questions?.[current];

  const saveAnswer = useCallback((qid, patch) => {
    setAnswers((prev) => ({ ...prev, [qid]: { ...(prev[qid] || {}), ...patch } }));
    if (saveTimerRef.current[qid]) clearTimeout(saveTimerRef.current[qid]);
    saveTimerRef.current[qid] = setTimeout(() => {
      const payload = {
        question_id: qid,
        selected_option: (patch.selected_option ?? answers[qid]?.selected_option) || null,
        subjective_text: (patch.subjective_text ?? answers[qid]?.subjective_text) || null,
        time_spent_seconds: 0,
      };
      api.post(`/mocks/attempts/${attempt.attempt_id}/answer`, payload).catch(() => {});
    }, 400);
  }, [answers, attempt]);

  const handleSubmit = async (auto = false) => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/mocks/attempts/${attempt.attempt_id}/submit`);
      localStorage.removeItem(`mock_attempt_${mock_id}`);
      if (!auto) toast.success("Submitted");
      nav(`/mocks/results/${attempt.attempt_id}`);
    } catch (e) {
      toast.error("Submit failed");
      setSubmitting(false);
    }
  };

  // Keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") setCurrent((c) => Math.max(0, c - 1));
      if (e.key === "ArrowRight") setCurrent((c) => Math.min((attempt?.questions?.length || 1) - 1, c + 1));
      if (e.key === "Escape") setConfirmSubmit(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [attempt]);

  if (loading || !attempt) {
    return <div className="min-h-screen flex items-center justify-center text-white/60 font-mono">loading mock…</div>;
  }

  const timerColor = remaining < 300 ? "#FF6B6B" : remaining < 900 ? "#F59E0B" : "#B4FF39";
  const total = attempt.questions.length;

  return (
    <div className="min-h-screen relative" style={{ background: "#0A0A0C", color: "#F2F2F2" }} data-testid="mock-attempt-page">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-[#0A0A0C]/95 backdrop-blur border-b border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] truncate">
            MOCK · {attempt.title}
          </div>
          <div data-testid="mock-timer" className="font-display italic tabular-nums text-[32px] leading-none" style={{ color: timerColor }}>
            {fmtSec(remaining)}
          </div>
          <button
            data-testid="mock-submit-open"
            onClick={() => setConfirmSubmit(true)}
            className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#B4FF39] hover:text-white transition"
          >
            SUBMIT [→]
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        {/* Navigator */}
        <aside>
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62] mb-3">[ QUESTIONS · {total} ]</div>
          <div className="grid grid-cols-6 lg:grid-cols-5 gap-1.5">
            {attempt.questions.map((qq, i) => {
              const ans = answers[qq.question_id];
              const answered = !!(ans?.selected_option || ans?.subjective_text);
              const flagged = flags.has(qq.question_id);
              const isCurrent = i === current;
              return (
                <button
                  key={qq.question_id}
                  onClick={() => setCurrent(i)}
                  data-testid={`mock-nav-${i + 1}`}
                  className="w-8 h-8 font-mono text-[10px] tabular-nums relative"
                  style={{
                    color: isCurrent ? "#0A0A0C" : answered ? "#F2F2F2" : "#5A5A62",
                    background: isCurrent ? "#8B5CF6" : answered ? "rgba(139,92,246,0.15)" : "transparent",
                    border: `1px solid ${isCurrent ? "#8B5CF6" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                  {flagged && <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#F59E0B]" />}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Question card */}
        <main className="min-w-0">
          {q && (
            <div data-testid={`mock-question-${current + 1}`}>
              <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62] mb-4">
                QUESTION {current + 1} / {total} · {q.marks} MARK{q.marks === 1 ? "" : "S"}
                {q.negative_marks > 0 && ` · −${q.negative_marks} PENALTY`}
              </div>
              <div className="text-[17px] leading-[1.65] text-white/90 mb-8 whitespace-pre-wrap">
                {q.question_markdown}
              </div>
              {q.type === "mcq" && q.options && (
                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const selected = answers[q.question_id]?.selected_option === opt.key;
                    return (
                      <button
                        key={opt.key}
                        data-testid={`mock-option-${current + 1}-${opt.key}`}
                        onClick={() => saveAnswer(q.question_id, { selected_option: opt.key })}
                        className="w-full text-left p-4 border transition flex gap-4"
                        style={{
                          borderColor: selected ? "#8B5CF6" : "rgba(255,255,255,0.08)",
                          background: selected ? "rgba(139,92,246,0.08)" : "transparent",
                          color: "#F2F2F2",
                        }}
                      >
                        <span className="font-mono text-[13px] text-[#8B5CF6] flex-shrink-0">[{opt.key}]</span>
                        <span className="text-[15px]">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {q.type !== "mcq" && (
                <textarea
                  value={answers[q.question_id]?.subjective_text || ""}
                  onChange={(e) => saveAnswer(q.question_id, { subjective_text: e.target.value })}
                  placeholder="type your answer…"
                  data-testid={`mock-subjective-${current + 1}`}
                  rows={10}
                  className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-[#8B5CF6] focus:outline-none px-4 py-3 text-[15px] leading-[1.6] text-white/90 font-sans"
                />
              )}

              <div className="mt-8 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                    disabled={current === 0}
                    className="px-3 py-2 font-mono uppercase tracking-[0.22em] text-[10.5px] border border-white/[0.08] hover:border-white/40 disabled:opacity-30 transition flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3 h-3" strokeWidth={1.5} /> PREV
                  </button>
                  <button
                    onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
                    disabled={current === total - 1}
                    className="px-3 py-2 font-mono uppercase tracking-[0.22em] text-[10.5px] border border-white/[0.08] hover:border-white/40 disabled:opacity-30 transition flex items-center gap-1"
                  >
                    NEXT <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFlags((f) => { const n = new Set(f); n.has(q.question_id) ? n.delete(q.question_id) : n.add(q.question_id); return n; })}
                    className="px-3 py-2 font-mono uppercase tracking-[0.22em] text-[10.5px] border border-white/[0.08] hover:border-[#F59E0B] transition flex items-center gap-1"
                  >
                    <Flag className="w-3 h-3" strokeWidth={1.5} /> {flags.has(q.question_id) ? "UNFLAG" : "FLAG"}
                  </button>
                  <button
                    onClick={() => saveAnswer(q.question_id, { selected_option: null, subjective_text: null })}
                    className="px-3 py-2 font-mono uppercase tracking-[0.22em] text-[10.5px] border border-white/[0.08] hover:border-white/40 transition"
                  >
                    CLEAR
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Submit confirm */}
      {confirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
          <div className="bg-[#111114] border border-white/10 p-8 max-w-md w-full">
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#F59E0B] mb-4">CONFIRM SUBMIT</div>
            <h2 className="font-display italic text-[32px] leading-[1.05] mb-4">Submit this attempt?</h2>
            <p className="text-white/60 text-[15px] mb-6">Answers are locked once submitted. You can review the result immediately.</p>
            <div className="flex gap-3">
              <button
                data-testid="mock-submit"
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="px-4 py-2 bg-[#B4FF39] text-black font-medium rounded-full hover:opacity-90 transition disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit now"}
              </button>
              <button onClick={() => setConfirmSubmit(false)} className="px-4 py-2 border border-white/15 hover:border-white/40 transition rounded-full">
                Keep working
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
