import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Circle, Loader, RotateCcw, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

const STATUS_META = {
  not_started: { label: "NOT", color: "#5A5A62", Icon: Circle },
  in_progress: { label: "PROGRESS", color: "#F59E0B", Icon: Loader },
  revised: { label: "REVISED", color: "#8B5CF6", Icon: RotateCcw },
  mastered: { label: "MASTERED", color: "#B4FF39", Icon: Check },
};
const STATUS_ORDER = ["not_started", "in_progress", "revised", "mastered"];

function Ring({ pct, size = 56, stroke = 3 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <svg width={size} height={size} className="block">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="#8B5CF6"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 0.5s ease-out" }}
      />
      <text
        x="50%"
        y="52%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#F2F2F2"
        fontFamily="JetBrains Mono, monospace"
        fontSize={size * 0.24}
      >
        {Math.round(pct)}
      </text>
    </svg>
  );
}

function StatusControl({ status, onChange, testId }) {
  return (
    <div className="flex items-center gap-0.5" data-testid={testId}>
      {STATUS_ORDER.map((s) => {
        const meta = STATUS_META[s];
        const active = status === s;
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            data-testid={`${testId}-${s}`}
            aria-label={`Mark ${meta.label}`}
            className="px-2 py-1 font-mono uppercase tracking-[0.16em] text-[9.5px] transition"
            style={{
              color: active ? "#0A0A0C" : meta.color,
              background: active ? meta.color : "transparent",
              border: `1px solid ${active ? meta.color : "rgba(255,255,255,0.08)"}`,
            }}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

function PaperRow({ paper, expanded, onToggle, onStatusChange, filter, highlightChapterId }) {
  const chapters = (paper.chapters || []).filter((c) => {
    if (filter === "all") return true;
    if (filter === "not_started") return c.status === "not_started";
    if (filter === "in_progress") return c.status === "in_progress";
    if (filter === "mastered") return c.status === "mastered";
    if (filter === "needs_revision") return c.status === "revised";
    return true;
  });

  const agg = paper.aggregate || {};
  const pct = agg.completion_pct ?? 0;

  return (
    <div className="border-b border-white/[0.06]" data-testid={`syllabus-paper-${paper.paper_code}`}>
      <button
        onClick={onToggle}
        className="w-full py-6 flex items-center gap-8 text-left transition hover:bg-white/[0.02] group px-2 -mx-2"
      >
        <div className="flex-1 min-w-0">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-1">
            [ {paper.paper_code} ]
          </div>
          <div className="font-display italic text-[24px] md:text-[28px] leading-[1.1] text-white/95 truncate">
            {paper.paper_name}
          </div>
        </div>
        <div className="hidden md:block font-mono uppercase tracking-[0.2em] text-[10.5px] text-[#8B8B92] whitespace-nowrap">
          {agg.chapters_mastered ?? 0} / {agg.chapters_total ?? 0} CH
        </div>
        <div className="hidden lg:block font-mono uppercase tracking-[0.2em] text-[10.5px] text-[#5A5A62] whitespace-nowrap">
          {agg.estimated_hours_remaining ?? 0}h REM
        </div>
        <Ring pct={pct} />
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-white/40" strokeWidth={1.5} />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" strokeWidth={1.5} />
        )}
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-6 pt-2 border-t border-white/[0.04]">
              {chapters.length === 0 && (
                <div className="py-6 text-center font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">
                  No chapters in this filter.
                </div>
              )}
              {chapters.map((c) => (
                <ChapterRow
                  key={c.chapter_id}
                  paper={paper}
                  chapter={c}
                  onStatusChange={onStatusChange}
                  highlight={highlightChapterId === c.chapter_id}
                />
              ))}
              <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-wrap gap-x-8 gap-y-2 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">
                <span>MASTERED <span className="text-[#B4FF39]">{agg.chapters_mastered}</span></span>
                <span>IN PROGRESS <span className="text-[#F59E0B]">{agg.chapters_in_progress}</span></span>
                <span>REVISED <span className="text-[#8B5CF6]">{agg.chapters_revised}</span></span>
                <span>~ <span className="text-white/70">{agg.estimated_hours_remaining}h</span> REMAINING</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChapterRow({ paper, chapter, onStatusChange, highlight }) {
  const [pulse, setPulse] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(chapter.notes || "");
  const rowRef = React.useRef(null);
  const meta = STATUS_META[chapter.status] || STATUS_META.not_started;
  const Icon = meta.Icon;
  const highWeight = (chapter.weightage_pct || 0) >= 10;

  useEffect(() => {
    if (highlight && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlight]);

  const handleStatus = async (s) => {
    setPulse(true);
    setTimeout(() => setPulse(false), 700);
    await onStatusChange(paper.paper_code, chapter.chapter_id, s, notes);
  };

  const handleSaveNotes = async () => {
    await onStatusChange(paper.paper_code, chapter.chapter_id, chapter.status, notes);
    toast.success("Notes saved");
    setShowNotes(false);
  };

  const glowStyle = highlight
    ? { boxShadow: "0 0 0 1px #B4FF39, 0 0 24px rgba(180,255,57,0.4)", background: "rgba(180,255,57,0.05)" }
    : pulse
    ? { background: "rgba(180,255,57,0.06)" }
    : {};

  return (
    <div
      ref={rowRef}
      className="relative py-3 flex items-start gap-4 border-b border-white/[0.04] last:border-b-0"
      style={{ transition: "background 0.6s ease-out, box-shadow 0.6s ease-out", ...glowStyle }}
      data-testid={`syllabus-chapter-row-${chapter.chapter_id}`}
    >
      <div className="w-10 flex-shrink-0 flex items-center justify-center pt-1">
        <Icon className="w-4 h-4" style={{ color: meta.color }} strokeWidth={1.5} />
      </div>
      <div className="w-8 flex-shrink-0 font-mono text-[10.5px] tabular-nums text-[#5A5A62] pt-1">
        {String(chapter.number).padStart(2, "0")}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] text-white/85">{chapter.name}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#5A5A62]">
          <span>~{chapter.estimated_hours}h</span>
          <span className="text-[#3A3A42]">·</span>
          <span className="flex items-center gap-1">
            ~{chapter.weightage_pct}% weight
            {highWeight && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#B4FF39]" />}
          </span>
          {chapter.revised_count > 0 && (
            <>
              <span className="text-[#3A3A42]">·</span>
              <span className="text-[#8B5CF6]">REV × {chapter.revised_count}</span>
            </>
          )}
          <button
            onClick={() => setShowNotes((s) => !s)}
            className="ml-2 flex items-center gap-1 text-[#5A5A62] hover:text-[#8B5CF6] transition"
            data-testid={`syllabus-chapter-${chapter.chapter_id}-note-toggle`}
          >
            <Plus className="w-3 h-3" strokeWidth={1.5} /> NOTE
          </button>
        </div>
        {showNotes && (
          <div className="mt-3 space-y-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="A quick note on this chapter…"
              data-testid={`syllabus-chapter-${chapter.chapter_id}-note-input`}
              className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-[#8B5CF6] focus:outline-none px-3 py-2 text-[13px] text-white/85 font-sans"
            />
            <button
              onClick={handleSaveNotes}
              data-testid={`syllabus-chapter-${chapter.chapter_id}-note-save`}
              className="px-3 py-1 font-mono uppercase tracking-[0.2em] text-[10px] bg-[#B4FF39] text-black hover:opacity-90 transition"
            >
              save note
            </button>
          </div>
        )}
      </div>
      <div className="flex-shrink-0 pt-1">
        <StatusControl
          status={chapter.status}
          onChange={handleStatus}
          testId={`syllabus-chapter-${chapter.chapter_id}-status`}
        />
      </div>
    </div>
  );
}

const FILTER_CHIPS = [
  { key: "all", label: "ALL" },
  { key: "not_started", label: "NOT STARTED" },
  { key: "in_progress", label: "IN PROGRESS" },
  { key: "mastered", label: "MASTERED" },
  { key: "needs_revision", label: "NEEDS REVISION" },
];

export default function Syllabus() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [aggregate, setAggregate] = useState([]);
  const [papers, setPapers] = useState({});
  const [expanded, setExpanded] = useState(params.get("paper") || null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [highlightChapter, setHighlightChapter] = useState(params.get("chapter") || null);

  const level = user?.journey_level;

  useEffect(() => {
    if (!level) return;
    setLoading(true);
    api.get("/syllabus/progress")
      .then((r) => setAggregate(r.data || []))
      .catch(() => setAggregate([]))
      .finally(() => setLoading(false));
  }, [level]);

  const loadPaper = async (code) => {
    if (papers[code]) return;
    try {
      const r = await api.get(`/syllabus/${code}`);
      setPapers((p) => ({ ...p, [code]: r.data }));
    } catch (e) {
      toast.error("Could not load paper");
    }
  };

  // Deep-link: auto-load the paper and expand it when ?paper=… is in URL
  useEffect(() => {
    const p = params.get("paper");
    if (p) {
      setExpanded(p);
      loadPaper(p);
    }
    // eslint-disable-next-line
  }, [params]);

  // Clear the highlight after 2.5s
  useEffect(() => {
    if (!highlightChapter) return;
    const t = setTimeout(() => setHighlightChapter(null), 2500);
    return () => clearTimeout(t);
  }, [highlightChapter]);

  const onToggle = (code) => {
    if (expanded === code) {
      setExpanded(null);
    } else {
      setExpanded(code);
      loadPaper(code);
    }
  };

  const onStatusChange = async (paperCode, chapterId, status, notes) => {
    try {
      const r = await api.post("/syllabus/progress", {
        paper_code: paperCode, chapter_id: chapterId, status, notes: notes || undefined,
      });
      // Update local paper cache
      setPapers((prev) => {
        const p = prev[paperCode];
        if (!p) return prev;
        const chapters = p.chapters.map((c) =>
          c.chapter_id === chapterId
            ? { ...c, status, notes: notes ?? c.notes, revised_count: r.data.record.revised_count, updated_at: r.data.record.updated_at }
            : c
        );
        return { ...prev, [paperCode]: { ...p, chapters, aggregate: r.data.paper } };
      });
      setAggregate((prev) => prev.map((a) => (a.paper_code === paperCode ? r.data.paper : a)));
    } catch (e) {
      toast.error("Could not save progress");
    }
  };

  const totalRemHrs = useMemo(() => aggregate.reduce((s, p) => s + (p.estimated_hours_remaining || 0), 0), [aggregate]);

  if (!level) {
    return (
      <AppShell breadcrumb="APP / SYLLABUS">
        <div className="max-w-3xl mx-auto px-6 lg:px-10 py-24 text-center" data-testid="syllabus-empty-onboarding">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">SYLLABUS · UNLOCKED AFTER ONBOARDING</div>
          <h1 className="font-display italic text-[48px] md:text-[64px] leading-[0.98] tracking-[-0.02em] mb-6">
            Finish setting up<br/>your journey first.
          </h1>
          <p className="text-white/60 mb-8 max-w-md mx-auto">
            We&apos;ll show the ICAI papers and chapters relevant to your level once you complete onboarding.
          </p>
          <button
            onClick={() => navigate("/onboarding")}
            className="px-5 py-2.5 bg-[#B4FF39] text-black font-medium rounded-full hover:opacity-90 transition"
            data-testid="syllabus-goto-onboarding"
          >
            Complete onboarding
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumb={`APP / SYLLABUS · ${level.toUpperCase()}`}>
      <GridBackground />
      <div className="relative max-w-[1120px] mx-auto px-6 lg:px-10 py-16" data-testid="syllabus-page">
        {/* Header */}
        <header className="mb-14">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">
            [ SYLLABUS · YOUR MAP ]
          </div>
          <h1 className="font-display italic leading-[0.96] tracking-[-0.03em]" style={{ fontSize: "clamp(56px, 10vw, 128px)" }}>
            Where you<br/>
            <span style={{ color: "#8B5CF6" }}>stand.</span>
          </h1>
          <div className="mt-8 font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">
            LEVEL · {level.toUpperCase()} · {aggregate.length} PAPERS · {totalRemHrs}h ESTIMATED REMAINING
          </div>
        </header>

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-10">
          {FILTER_CHIPS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              data-testid={`syllabus-filter-${f.key}`}
              className="px-3 py-1.5 font-mono uppercase tracking-[0.22em] text-[10.5px] transition"
              style={{
                color: filter === f.key ? "#0A0A0C" : "#8B8B92",
                background: filter === f.key ? "#B4FF39" : "transparent",
                border: `1px solid ${filter === f.key ? "#B4FF39" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Papers */}
        {loading && <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div>}
        {!loading && aggregate.map((p) => {
          const paperFull = papers[p.paper_code];
          const paperWithAgg = paperFull ? paperFull : { ...p, chapters: [], aggregate: p };
          return (
            <PaperRow
              key={p.paper_code}
              paper={paperWithAgg}
              expanded={expanded === p.paper_code}
              onToggle={() => onToggle(p.paper_code)}
              onStatusChange={onStatusChange}
              filter={filter}
              highlightChapterId={expanded === p.paper_code ? highlightChapter : null}
            />
          );
        })}
      </div>
    </AppShell>
  );
}
