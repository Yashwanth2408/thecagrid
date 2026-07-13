import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronDown, ChevronUp, Check, X, Sparkles } from "lucide-react";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";

function scoreBand(s) {
  if (s >= 85) return { label: "GRADE A", color: "#B4FF39" };
  if (s >= 70) return { label: "GRADE B", color: "#8B5CF6" };
  if (s >= 40) return { label: "PASSING", color: "#F59E0B" };
  return { label: "BELOW LINE", color: "#FF6B6B" };
}

function QuestionReview({ q, i }) {
  const [open, setOpen] = useState(false);
  const ans = q.user_answer;
  const isMcq = q.type === "mcq";
  const correct = isMcq ? (ans?.selected_option === q.correct_option) : (ans?.marks_awarded > 0);
  const awarded = ans?.marks_awarded ?? 0;
  return (
    <div className="border-b border-white/[0.06]" data-testid={`mock-review-${i + 1}`}>
      <button onClick={() => setOpen(!open)} className="w-full py-4 flex items-center gap-4 text-left group">
        <div className="font-mono text-[11px] tabular-nums text-[#5A5A62] w-8">{String(i + 1).padStart(2, "0")}</div>
        <div className="w-4 h-4 flex-shrink-0">
          {isMcq && correct && <Check className="w-4 h-4 text-[#B4FF39]" strokeWidth={2} />}
          {isMcq && !correct && ans?.selected_option && <X className="w-4 h-4 text-[#FF6B6B]" strokeWidth={2} />}
          {!isMcq && <Sparkles className="w-4 h-4 text-[#F59E0B]" strokeWidth={1.5} />}
        </div>
        <div className="flex-1 min-w-0 text-white/85 text-[14px] truncate">{q.question_markdown}</div>
        <div className="font-mono uppercase tracking-[0.22em] text-[10.5px]" style={{ color: awarded > 0 ? "#B4FF39" : awarded < 0 ? "#FF6B6B" : "#5A5A62" }}>
          {awarded > 0 ? "+" : ""}{awarded} MARKS
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-white/40" strokeWidth={1.5} /> : <ChevronDown className="w-4 h-4 text-white/40" strokeWidth={1.5} />}
      </button>
      {open && (
        <div className="pb-6 pl-16 pr-4 space-y-3 text-[14px]">
          <div className="text-white/80 whitespace-pre-wrap">{q.question_markdown}</div>
          {isMcq && q.options && (
            <div className="space-y-1.5">
              {q.options.map((opt) => {
                const isCorrect = opt.key === q.correct_option;
                const isPicked = opt.key === ans?.selected_option;
                return (
                  <div
                    key={opt.key}
                    className="p-2 flex gap-3 text-[13px]"
                    style={{
                      background: isCorrect ? "rgba(180,255,57,0.08)" : isPicked && !isCorrect ? "rgba(255,107,107,0.08)" : "transparent",
                      border: `1px solid ${isCorrect ? "rgba(180,255,57,0.3)" : isPicked ? "rgba(255,107,107,0.3)" : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    <span className="font-mono text-[11px] text-[#8B5CF6]">[{opt.key}]</span>
                    <span className="text-white/80 flex-1">{opt.text}</span>
                    {isCorrect && <span className="font-mono uppercase tracking-[0.22em] text-[9px] text-[#B4FF39]">CORRECT</span>}
                    {isPicked && !isCorrect && <span className="font-mono uppercase tracking-[0.22em] text-[9px] text-[#FF6B6B]">YOUR PICK</span>}
                  </div>
                );
              })}
            </div>
          )}
          {!isMcq && ans?.subjective_text && (
            <div className="p-3 bg-white/[0.02] border border-white/[0.06]">
              <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62] mb-2">YOUR ANSWER</div>
              <div className="text-white/85 whitespace-pre-wrap">{ans.subjective_text}</div>
            </div>
          )}
          {q.explanation_markdown && (
            <div className="p-3 bg-[#8B5CF6]/[0.05] border-l-2 border-[#8B5CF6]">
              <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] mb-1">EXPLANATION</div>
              <div className="text-white/85 whitespace-pre-wrap">{q.explanation_markdown}</div>
            </div>
          )}
          {q.model_answer_markdown && !isMcq && (
            <div className="p-3 bg-[#B4FF39]/[0.05] border-l-2 border-[#B4FF39]">
              <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#B4FF39] mb-1">MODEL ANSWER</div>
              <div className="text-white/85 whitespace-pre-wrap text-[13px]">{q.model_answer_markdown}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MockResults() {
  const { attempt_id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/mocks/attempts/${attempt_id}`).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [attempt_id]);

  if (loading || !data) {
    return <AppShell breadcrumb="APP / MOCKS / RESULT"><div className="p-16 text-center font-mono text-white/50">loading…</div></AppShell>;
  }

  const { attempt, mock, questions } = data;
  const band = scoreBand(attempt.score || 0);
  const timeMin = Math.round((attempt.time_taken_seconds || 0) / 60);

  // Topic breakdown
  const topicStats = {};
  questions.forEach((q) => {
    const ans = q.user_answer;
    const correct = q.type === "mcq" ? ans?.selected_option === q.correct_option : (ans?.marks_awarded > 0);
    (q.topic_tags || []).forEach((t) => {
      if (!topicStats[t]) topicStats[t] = { total: 0, correct: 0 };
      topicStats[t].total++;
      if (correct) topicStats[t].correct++;
    });
  });
  const topics = Object.entries(topicStats).sort((a, b) => b[1].total - a[1].total);

  return (
    <AppShell breadcrumb={`APP / MOCKS / RESULT · ${attempt.paper_code}`}>
      <GridBackground />
      <div className="relative max-w-[1080px] mx-auto px-6 lg:px-10 py-16" data-testid="mock-results-page">
        <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">
          [ RESULT · {mock.title} ]
        </div>
        <div className="grid md:grid-cols-[auto_1fr] gap-10 items-baseline mb-14">
          <div>
            <div className="font-mono uppercase tracking-[0.22em] text-[11px] mb-3" style={{ color: band.color }}>{band.label}</div>
            <div data-testid="mock-result-score" className="font-display italic leading-[0.9] tracking-[-0.03em]" style={{ fontSize: "clamp(80px, 14vw, 200px)", color: "#F2F2F2" }}>
              {Math.round(attempt.score || 0)}<span className="text-[0.4em] text-white/50">%</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 font-mono uppercase tracking-[0.22em] text-[10.5px]">
            <div>
              <div className="text-[#5A5A62]">MARKS</div>
              <div className="text-[22px] font-display italic normal-case tracking-normal text-white/90 mt-1">{attempt.marks_obtained}/{attempt.total_marks}</div>
            </div>
            <div>
              <div className="text-[#5A5A62]">TIME</div>
              <div className="text-[22px] font-display italic normal-case tracking-normal text-white/90 mt-1">{timeMin}m</div>
            </div>
            <div>
              <div className="text-[#5A5A62]">PERCENTILE</div>
              <div className="text-[22px] font-display italic normal-case tracking-normal text-white/90 mt-1">{attempt.percentile_estimate}th</div>
            </div>
            <div>
              <div className="text-[#5A5A62]">QUESTIONS</div>
              <div className="text-[22px] font-display italic normal-case tracking-normal text-white/90 mt-1">{questions.length}</div>
            </div>
          </div>
        </div>

        {/* Topic breakdown */}
        <section className="mb-14" data-testid="mock-topic-breakdown">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ TOPIC BREAKDOWN ]</div>
          <div className="space-y-2.5">
            {topics.map(([t, s]) => {
              const pct = Math.round((s.correct / s.total) * 100);
              const isWeak = pct < 50;
              const isStrong = pct >= 80;
              return (
                <div key={t} className="grid grid-cols-[1fr_auto_120px] gap-4 items-center">
                  <div className="text-[14px]" style={{ color: isStrong ? "#B4FF39" : isWeak ? "#FF6B6B" : "#F2F2F2" }}>{t}</div>
                  <div className="font-mono tabular-nums text-[11px] text-[#5A5A62]">{s.correct}/{s.total}</div>
                  <div className="relative h-1.5 bg-white/[0.05] rounded">
                    <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${pct}%`, background: isStrong ? "#B4FF39" : isWeak ? "#FF6B6B" : "#8B5CF6" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Question review */}
        <section className="mb-14">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ QUESTION REVIEW ]</div>
          <div className="border-t border-white/[0.06]">
            {questions.map((q, i) => <QuestionReview key={q.question_id} q={q} i={i} />)}
          </div>
        </section>

        {/* Next actions */}
        <section data-testid="mock-next-actions">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ NEXT ACTIONS ]</div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/syllabus?paper=${attempt.paper_code}`} className="px-3 py-2 border border-white/[0.1] hover:border-[#8B5CF6] font-mono uppercase tracking-[0.22em] text-[10.5px] text-white/80 hover:text-white transition">
              [ REVISE WEAK TOPICS → ]
            </Link>
            <Link to="/flashcards" className="px-3 py-2 border border-white/[0.1] hover:border-[#8B5CF6] font-mono uppercase tracking-[0.22em] text-[10.5px] text-white/80 hover:text-white transition">
              [ FLASHCARDS FOR THIS PAPER → ]
            </Link>
            <Link to={`/mocks/${attempt.mock_id}/attempt`} className="px-3 py-2 border border-[#B4FF39] font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition">
              [ MOCK AGAIN → ]
            </Link>
            <Link to="/mentor" className="px-3 py-2 border border-white/[0.1] hover:border-[#8B5CF6] font-mono uppercase tracking-[0.22em] text-[10.5px] text-white/80 hover:text-white transition">
              [ ASK MENTOR → ]
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
