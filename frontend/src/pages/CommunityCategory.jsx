import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const SORTS = [
  { key: "hot", label: "HOT" },
  { key: "new", label: "NEW" },
  { key: "top", label: "TOP" },
];

function relTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function CommunityCategory() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cat, setCat] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("hot");
  const [q, setQ] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [posting, setPosting] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ sort });
    if (q) params.set("q", q);
    api.get(`/community/categories/${slug}/threads?${params}`)
      .then((r) => { setCat(r.data.category); setItems(r.data.items || []); })
      .catch(() => toast.error("Could not load category"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug, sort, q]);

  const post = async () => {
    if (title.trim().length < 6) return toast.error("Title too short");
    if (body.trim().length < 20) return toast.error("Post body must be at least 20 chars");
    setPosting(true);
    try {
      const r = await api.post("/community/threads", {
        category_slug: slug,
        title: title.trim(),
        body_markdown: body,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      toast.success("Posted");
      navigate(`/community/threads/${r.data.thread_id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <AppShell breadcrumb={`APP / COMMUNITY / ${slug.toUpperCase()}`}>
      <GridBackground />
      <div className="relative max-w-[1100px] mx-auto px-6 lg:px-10 py-16" data-testid="community-category-page">
        <Link to="/community" className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62] hover:text-white transition" data-testid="cat-back">← BACK TO COMMUNITY</Link>
        <header className="mt-6 mb-10">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ {(cat?.kind || "").toUpperCase()} · {cat?.thread_count ?? "?"} THREADS ]</div>
          <h1 className="font-display italic leading-[0.96] tracking-[-0.03em]" style={{ fontSize: "clamp(44px, 8vw, 96px)" }}>{cat?.name || "…"}</h1>
          <p className="mt-4 font-body text-[16px] text-[#B0B0B8]">{cat?.description}</p>
        </header>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          {SORTS.map((s) => (
            <button key={s.key} data-testid={`cat-sort-${s.key}`} onClick={() => setSort(s.key)} className="px-3 py-1.5 font-mono uppercase tracking-[0.22em] text-[10.5px]" style={{
              color: sort === s.key ? "#0A0A0C" : "#8B8B92",
              background: sort === s.key ? "#B4FF39" : "transparent",
              border: `1px solid ${sort === s.key ? "#B4FF39" : "rgba(255,255,255,0.1)"}`,
            }}>{s.label}</button>
          ))}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="SEARCH THREADS…" data-testid="cat-search" className="flex-1 min-w-[180px] bg-transparent border border-white/[0.08] px-3 py-1.5 font-mono uppercase tracking-[0.18em] text-[11px] text-white placeholder:text-[#5A5A62] focus:border-[#8B5CF6] outline-none" />
          <button onClick={() => setShowCompose((s) => !s)} data-testid="cat-new-btn" className="ml-auto font-mono uppercase tracking-[0.22em] text-[10.5px] px-3 py-1.5 border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition">
            {showCompose ? "[ CANCEL ]" : "[ NEW THREAD → ]"}
          </button>
        </div>

        {showCompose && (
          <div className="border border-white/[0.06] p-5 mb-8" data-testid="cat-compose">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={180} placeholder="Thread title" data-testid="compose-title" className="w-full bg-transparent border-b border-white/[0.08] px-1 py-2 font-display italic text-[22px] text-white placeholder:text-[#5A5A62] focus:border-[#8B5CF6] outline-none" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={8000} rows={6} data-testid="compose-body" placeholder="Markdown-friendly body (min 20 chars)" className="mt-3 w-full bg-transparent border border-white/[0.08] px-3 py-2 font-body text-[14px] text-white focus:border-[#8B5CF6] outline-none" />
            <input value={tags} onChange={(e) => setTags(e.target.value)} data-testid="compose-tags" placeholder="tags, comma separated (optional)" className="mt-3 w-full bg-transparent border border-white/[0.08] px-3 py-2 font-mono uppercase tracking-[0.14em] text-[11px] text-white placeholder:text-[#5A5A62] focus:border-[#8B5CF6] outline-none" />
            <button disabled={posting} onClick={post} data-testid="compose-submit" className="mt-4 px-5 py-2 font-mono uppercase tracking-[0.22em] text-[10.5px] border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition disabled:opacity-50">
              {posting ? "[ POSTING… ]" : "[ POST → ]"}
            </button>
          </div>
        )}

        {loading && <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div>}
        <div className="divide-y divide-white/[0.06]">
          {items.length === 0 && !loading && <div className="py-8 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">no threads yet. start one.</div>}
          {items.map((t) => (
            <motion.div key={t.thread_id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <Link to={`/community/threads/${t.thread_id}`} data-testid={`thread-${t.thread_id}`} className="py-5 grid grid-cols-[70px_1fr_auto] gap-6 items-start hover:bg-white/[0.02] transition">
                <div className="text-center">
                  <div className="font-display italic text-[28px] text-white leading-tight">{t.upvotes}</div>
                  <div className="font-mono uppercase tracking-[0.22em] text-[9px] text-[#5A5A62]">UPVOTES</div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {t.is_pinned && <span className="font-mono uppercase tracking-[0.22em] text-[9px] text-[#F59E0B]">📌 PINNED</span>}
                    {t.is_verified_ca && <span className="font-mono uppercase tracking-[0.22em] text-[9px] text-[#B4FF39]">✓ CA</span>}
                  </div>
                  <div className="font-display italic text-[22px] text-white/95 leading-tight">{t.title}</div>
                  <div className="mt-1 font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">
                    {t.author_initials} · {t.author_level} · {relTime(t.created_at)} · {t.reply_count} REPLIES
                  </div>
                  {(t.tags || []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {t.tags.map((tg) => <span key={tg} className="font-mono uppercase tracking-[0.18em] text-[9px] text-[#5A5A62] border border-white/[0.06] px-1.5 py-0.5">{tg}</span>)}
                    </div>
                  )}
                </div>
                <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">→</div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
