import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

const FACET_LABELS = {
  overall: "OVERALL", wlb: "WLB", learning: "LEARNING",
  mentorship: "MENTORSHIP", exit_ops: "EXIT OPS", stipend_fairness: "STIPEND",
};

function Histogram({ hist }) {
  const max = Math.max(1, ...Object.values(hist || {}));
  return (
    <div className="grid grid-cols-10 gap-1 items-end h-[80px]">
      {Array.from({ length: 10 }).map((_, i) => {
        const k = String(i + 1);
        const v = hist?.[k] || 0;
        const h = (v / max) * 100;
        return (
          <div key={k} className="flex flex-col items-center gap-1">
            <div className="w-full flex-1 flex items-end">
              <div className="w-full bg-[#8B5CF6]/40 border-t border-[#8B5CF6]" style={{ height: `${h}%`, minHeight: v ? "3px" : "0" }} title={`${k}/10 · ${v} review${v === 1 ? "" : "s"}`} />
            </div>
            <div className="font-mono text-[9px] text-[#5A5A62]">{k}</div>
          </div>
        );
      })}
    </div>
  );
}

function ReviewForm({ slug, onSubmit }) {
  const [values, setValues] = useState({ overall: 7, wlb: 7, learning: 7, mentorship: 7, exit_ops: 7, stipend_fairness: 5 });
  const [quote, setQuote] = useState("");
  const [tenure, setTenure] = useState("Second-year article");
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setValues((s) => ({ ...s, [k]: Number(v) }));

  const submit = async () => {
    if (quote.trim().length < 20) return toast.error("Review must be at least 20 characters");
    setSubmitting(true);
    try {
      await api.post(`/firms/${slug}/reviews`, { ...values, quote, tenure });
      toast.success("Review submitted");
      onSubmit?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-16 border border-white/[0.06] p-6 md:p-8" data-testid="firm-review-form">
      <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-3">[ WRITE A REVIEW ]</div>
      <h3 className="font-display italic text-[28px] md:text-[36px] leading-tight text-white mb-6">Share your experience.</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(FACET_LABELS).map(([k, label]) => (
          <div key={k}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B8B92]">{label}</div>
              <div className="font-mono tabular-nums text-[12px] text-[#B4FF39]">{values[k]}/10</div>
            </div>
            <input
              type="range" min={1} max={10} value={values[k]}
              onChange={(e) => set(k, e.target.value)}
              data-testid={`review-input-${k}`}
              className="w-full accent-[#8B5CF6]"
            />
          </div>
        ))}
      </div>
      <div className="mt-6">
        <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B8B92] mb-1">YOUR ROLE</div>
        <input
          type="text" value={tenure} onChange={(e) => setTenure(e.target.value)} data-testid="review-input-tenure"
          className="w-full bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[13px] text-white focus:border-[#8B5CF6] outline-none"
        />
      </div>
      <div className="mt-4">
        <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B8B92] mb-1">QUOTE (MIN 20 CHARS)</div>
        <textarea
          value={quote} onChange={(e) => setQuote(e.target.value)} rows={5} data-testid="review-input-quote"
          placeholder="What was it really like?"
          className="w-full bg-transparent border border-white/[0.08] px-3 py-2 font-body text-[14px] text-white focus:border-[#8B5CF6] outline-none"
        />
      </div>
      <button
        onClick={submit} disabled={submitting}
        data-testid="review-submit-btn"
        className="mt-6 px-6 py-2.5 font-mono uppercase tracking-[0.22em] text-[11px] border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition disabled:opacity-50"
      >{submitting ? "[ SUBMITTING… ]" : "[ SUBMIT REVIEW → ]"}</button>
    </div>
  );
}

export default function FirmDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    api.get(`/firms/${slug}`).then((r) => setData(r.data)).catch(() => toast.error("Firm not found")).finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug]);

  if (loading || !data) return <AppShell breadcrumb="APP / FIRMS"><div className="p-16 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div></AppShell>;
  const { firm, reviews, histogram, facets_avg, review_count } = data;

  return (
    <AppShell breadcrumb={`APP / FIRMS / ${firm.slug.toUpperCase()}`}>
      <GridBackground />
      <div className="relative max-w-[1200px] mx-auto px-6 lg:px-10 py-16" data-testid="firm-detail-page">
        <Link to="/firms" className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62] hover:text-white transition" data-testid="firm-back">← BACK TO FIRMS</Link>
        <header className="mt-6 mb-12">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] border border-[#8B5CF6]/30 px-2 py-0.5">[ {firm.tier.toUpperCase()} ]</span>
            <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">{(firm.cities || []).join(" · ")}</span>
          </div>
          <h1 className="font-display italic leading-[0.96] tracking-[-0.03em]" style={{ fontSize: "clamp(44px, 8vw, 96px)" }}>
            {firm.name}
          </h1>
          <p className="mt-6 max-w-[720px] font-body text-[16px] text-[#B0B0B8] leading-relaxed">{firm.about}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {(firm.practice_areas || []).map((p) => (
              <span key={p} className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62] border border-white/[0.06] px-2 py-1">{p}</span>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="border border-white/[0.06] p-5">
            <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62] mb-2">STIPEND (Y1)</div>
            <div className="font-display italic text-[36px] text-white leading-tight">₹{Math.round((firm.stipend_first_year_min || 0) / 1000)}k<span className="text-[16px] text-white/50"> — ₹{Math.round((firm.stipend_first_year_max || 0) / 1000)}k</span></div>
          </div>
          <div className="border border-white/[0.06] p-5">
            <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62] mb-2">SIZE</div>
            <div className="font-display italic text-[36px] text-white leading-tight">{firm.size}</div>
          </div>
          <div className="border border-white/[0.06] p-5">
            <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62] mb-2">AVG OVERALL</div>
            <div className="font-display italic text-[36px] text-white leading-tight">{facets_avg?.overall ?? "—"}<span className="text-[16px] text-white/50">/10</span></div>
          </div>
        </div>

        <div className="mb-14">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ RATING DISTRIBUTION · {review_count} REVIEW{review_count === 1 ? "" : "S"} ]</div>
          <div className="border border-white/[0.06] p-6">
            <Histogram hist={histogram} />
            {facets_avg && (
              <div className="mt-8 grid grid-cols-2 md:grid-cols-6 gap-6">
                {Object.entries(FACET_LABELS).map(([k, label]) => (
                  <div key={k}>
                    <div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62] mb-1">{label}</div>
                    <div className="font-display italic text-[22px] text-white">{facets_avg[k]}<span className="text-[11px] text-white/50">/10</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mb-14">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ REVIEWS ]</div>
          <div className="divide-y divide-white/[0.06]">
            {reviews.map((r) => (
              <motion.div
                key={r.review_id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                data-testid={`review-${r.review_id}`}
                className="py-6 grid grid-cols-1 md:grid-cols-[100px_1fr_auto] gap-6 items-start"
              >
                <div>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#4C1D95] flex items-center justify-center text-xs font-bold">{r.reviewer_initials}</div>
                  <div className="mt-2 font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">{r.reviewer_level}</div>
                  {r.is_verified && <div className="mt-1 font-mono uppercase tracking-[0.22em] text-[9px] text-[#B4FF39]">✓ VERIFIED</div>}
                </div>
                <div>
                  <div className="font-body italic text-[18px] text-white/90 leading-relaxed">"{r.quote}"</div>
                  <div className="mt-3 font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">{r.tenure}</div>
                </div>
                <div className="text-right">
                  <div className="font-display italic text-[36px] text-white leading-tight">{r.ratings?.overall}<span className="text-[14px] text-white/50">/10</span></div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-right">
                    {Object.entries(FACET_LABELS).filter(([k]) => k !== "overall").map(([k, l]) => (
                      <React.Fragment key={k}>
                        <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#5A5A62]">{l}</div>
                        <div className="font-mono tabular-nums text-[10.5px] text-white/70">{r.ratings?.[k]}/10</div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
            {reviews.length === 0 && <div className="py-8 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">No reviews yet. Be the first.</div>}
          </div>
        </div>

        <ReviewForm slug={firm.slug} onSubmit={load} />
      </div>
    </AppShell>
  );
}
