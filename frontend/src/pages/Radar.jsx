import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

const IMPACT_META = {
  critical: { label: "CRITICAL", color: "#FF6B6B", glow: "0 0 24px rgba(255,107,107,0.35)" },
  moderate: { label: "MODERATE", color: "#8B5CF6", glow: "0 0 16px rgba(139,92,246,0.25)" },
  info: { label: "INFO", color: "#8B8B92", glow: "none" },
};

const IMPACT_CHIPS = [
  { key: "all", label: "ALL" },
  { key: "critical", label: "CRITICAL" },
  { key: "moderate", label: "MODERATE" },
  { key: "info", label: "INFO" },
];

const DAY_CHIPS = [
  { key: 7, label: "7 DAYS" },
  { key: 30, label: "30 DAYS" },
  { key: 90, label: "90 DAYS" },
  { key: 0, label: "ALL" },
];

function formatDate(iso) {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  return { day, mon, year: d.getUTCFullYear() };
}

export default function Radar() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [impact, setImpact] = useState("all");
  const [days, setDays] = useState(90);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (impact !== "all") params.set("impact", impact);
      if (days > 0) params.set("days", days);
      const r = await api.get(`/radar/alerts?${params.toString()}`);
      setItems(r.data.items || []);
    } catch (e) {
      toast.error("Could not load radar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [impact, days]);

  const handleDismiss = async (alert_id) => {
    setItems((prev) => prev.filter((a) => a.alert_id !== alert_id));
    try {
      await api.post(`/radar/alerts/${alert_id}/dismiss`);
      toast.success("Dismissed");
    } catch (e) {
      toast.error("Could not dismiss");
      load();
    }
  };

  const unread = items.length;

  return (
    <AppShell breadcrumb={`APP / RADAR · ${user?.journey_level?.toUpperCase() || ""}`}>
      <GridBackground />
      <div className="relative max-w-[960px] mx-auto px-6 lg:px-10 py-16" data-testid="radar-page">
        <header className="mb-12">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">
            [ REGULATORY RADAR ]
          </div>
          <h1 className="font-display italic leading-[0.96] tracking-[-0.03em]" style={{ fontSize: "clamp(56px, 10vw, 128px)" }}>
            What<br/><span style={{ color: "#8B5CF6" }}>changed.</span>
          </h1>
          <div className="mt-8 font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">
            YOUR LEVEL · {(user?.journey_level || "ALL").toUpperCase()} · {unread} UNREAD
          </div>
        </header>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {IMPACT_CHIPS.map((f) => (
            <button
              key={f.key}
              onClick={() => setImpact(f.key)}
              data-testid={`radar-impact-${f.key}`}
              className="px-3 py-1.5 font-mono uppercase tracking-[0.22em] text-[10.5px] transition"
              style={{
                color: impact === f.key ? "#0A0A0C" : "#8B8B92",
                background: impact === f.key ? "#B4FF39" : "transparent",
                border: `1px solid ${impact === f.key ? "#B4FF39" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-12">
          {DAY_CHIPS.map((f) => (
            <button
              key={f.key}
              onClick={() => setDays(f.key)}
              data-testid={`radar-days-${f.key}`}
              className="px-3 py-1.5 font-mono uppercase tracking-[0.22em] text-[10.5px] transition"
              style={{
                color: days === f.key ? "#F2F2F2" : "#5A5A62",
                background: "transparent",
                border: `1px solid ${days === f.key ? "#8B5CF6" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div>}
        {!loading && items.length === 0 && (
          <div className="py-24 text-center" data-testid="radar-empty">
            <div className="font-display italic text-[40px] md:text-[56px] text-white/50">nothing new.</div>
            <div className="font-display italic text-[40px] md:text-[56px] text-white/50">keep grinding.</div>
          </div>
        )}
        <div className="divide-y divide-white/[0.06]">
          <AnimatePresence initial={false}>
            {items.map((a) => {
              const meta = IMPACT_META[a.impact_level] || IMPACT_META.info;
              const d = formatDate(a.published_at);
              return (
                <motion.article
                  key={a.alert_id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 60 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="py-8 group relative"
                  data-testid={`radar-alert-${a.alert_id}`}
                >
                  <div className="grid grid-cols-[64px_1fr] md:grid-cols-[96px_1fr] gap-6">
                    <div className="pt-1">
                      <div className="font-mono uppercase tracking-[0.2em] text-[11px] text-[#F2F2F2]">
                        {d.day} {d.mon}
                      </div>
                      <div className="font-mono uppercase tracking-[0.2em] text-[10px] text-[#5A5A62] mt-0.5">
                        {d.year}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="font-mono uppercase tracking-[0.2em] text-[10.5px] text-[#8B8B92] truncate">
                          {a.source}
                        </div>
                        <div
                          className="font-mono uppercase tracking-[0.2em] text-[10px] flex-shrink-0"
                          style={{
                            color: meta.color,
                            textShadow: meta.glow !== "none" ? `0 0 8px ${meta.color}` : undefined,
                          }}
                        >
                          {meta.label}
                        </div>
                      </div>
                      <h2 className="font-display italic text-[24px] md:text-[28px] leading-[1.15] mt-2 text-white/95">
                        {a.title}
                      </h2>
                      <p className="mt-4 text-[15px] leading-[1.65] text-white/70 max-w-[62ch]">
                        {a.body_markdown}
                      </p>
                      {a.affected_topics && a.affected_topics.length > 0 && (
                        <div className="mt-5 flex flex-wrap gap-2">
                          {a.affected_topics.map((t) => (
                            <React.Fragment key={t.paper_code}>
                              {t.chapters.length === 0 ? (
                                <Link
                                  to={`/syllabus?paper=${t.paper_code}`}
                                  className="px-2 py-1 font-mono uppercase tracking-[0.2em] text-[10px] border border-white/[0.1] hover:border-[#8B5CF6] text-white/70 hover:text-white transition"
                                >
                                  {t.paper_code} · {t.paper_name?.slice(0, 24)}
                                </Link>
                              ) : (
                                t.chapters.slice(0, 3).map((c) => (
                                  <Link
                                    key={c.chapter_id}
                                    to={`/syllabus?paper=${t.paper_code}&chapter=${c.chapter_id}`}
                                    className="px-2 py-1 font-mono uppercase tracking-[0.2em] text-[10px] border border-white/[0.1] hover:border-[#8B5CF6] text-white/70 hover:text-white transition"
                                  >
                                    {t.paper_code} · CH {String(c.number).padStart(2, "0")} · {c.name.slice(0, 20)}
                                  </Link>
                                ))
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                      <div className="mt-5 flex items-center gap-6 font-mono uppercase tracking-[0.2em] text-[10px]">
                        {a.source_url && (
                          <a
                            href={a.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[#5A5A62] hover:text-white transition"
                          >
                            <ExternalLink className="w-3 h-3" strokeWidth={1.5} /> SOURCE
                          </a>
                        )}
                        <button
                          onClick={() => handleDismiss(a.alert_id)}
                          data-testid={`radar-dismiss-${a.alert_id}`}
                          className="flex items-center gap-1 text-[#5A5A62] hover:text-[#FF6B6B] transition opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3" strokeWidth={1.5} /> DISMISS
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
  );
}
