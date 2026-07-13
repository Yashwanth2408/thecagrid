import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

function VoteButtons({ target_type, target_id, upvotes, userVote, onChange }) {
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(upvotes || 0);
  const [dir, setDir] = useState(userVote || 0);
  useEffect(() => { setCount(upvotes || 0); setDir(userVote || 0); }, [upvotes, userVote]);

  const cast = async (nextDir) => {
    if (busy) return;
    setBusy(true);
    // if same direction, clear (0)
    const toSend = dir === nextDir ? 0 : nextDir;
    try {
      const r = await api.post("/community/vote", { target_type, target_id, direction: toSend });
      setCount(r.data.upvotes || 0);
      setDir(r.data.user_direction || 0);
      onChange?.(r.data);
    } catch (e) {
      toast.error("Could not vote");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <button data-testid={`vote-up-${target_id}`} onClick={() => cast(1)} className="p-1 hover:text-[#B4FF39] transition" style={{ color: dir === 1 ? "#B4FF39" : "#5A5A62" }}>
        <ChevronUp className="w-5 h-5" strokeWidth={2} />
      </button>
      <div className="font-mono tabular-nums text-[13px]" style={{ color: dir !== 0 ? "#F2F2F2" : "#8B8B92" }}>{count}</div>
      <button data-testid={`vote-down-${target_id}`} onClick={() => cast(-1)} className="p-1 hover:text-[#FF6B6B] transition" style={{ color: dir === -1 ? "#FF6B6B" : "#5A5A62" }}>
        <ChevronDown className="w-5 h-5" strokeWidth={2} />
      </button>
    </div>
  );
}

function relTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function CommunityThread() {
  const { thread_id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [posting, setPosting] = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/community/threads/${thread_id}`).then((r) => setData(r.data)).catch(() => toast.error("Thread not found")).finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [thread_id]);

  const postReply = async () => {
    if (reply.trim().length < 1) return;
    setPosting(true);
    try {
      await api.post(`/community/threads/${thread_id}/replies`, { body_markdown: reply });
      setReply("");
      toast.success("Reply posted");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not post");
    } finally {
      setPosting(false);
    }
  };

  if (loading || !data) return <AppShell breadcrumb="APP / COMMUNITY"><div className="p-16 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div></AppShell>;
  const t = data.thread;

  return (
    <AppShell breadcrumb={`APP / COMMUNITY / ${t.category_slug.toUpperCase()}`}>
      <GridBackground />
      <div className="relative max-w-[900px] mx-auto px-6 lg:px-10 py-16" data-testid="community-thread-page">
        <Link to={`/community/${t.category_slug}`} className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62] hover:text-white transition" data-testid="thread-back">← BACK</Link>
        <article className="mt-6 mb-10 grid grid-cols-[60px_1fr] gap-6" data-testid="thread-body">
          <VoteButtons target_type="thread" target_id={t.thread_id} upvotes={t.upvotes} userVote={data.user_vote_thread} />
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {t.is_pinned && <span className="font-mono uppercase tracking-[0.22em] text-[9px] text-[#F59E0B]">📌 PINNED</span>}
              {t.is_verified_ca && <span className="font-mono uppercase tracking-[0.22em] text-[9px] text-[#B4FF39]">✓ VERIFIED CA</span>}
              <span className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">{t.author_initials} · {t.author_level} · {relTime(t.created_at)}</span>
            </div>
            <h1 className="font-display italic leading-[1.02] tracking-[-0.02em] text-white" style={{ fontSize: "clamp(30px, 5vw, 56px)" }}>{t.title}</h1>
            <div className="mt-6 font-body text-[16px] text-[#E0E0E5] whitespace-pre-wrap leading-relaxed">{t.body_markdown}</div>
            {(t.tags || []).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {t.tags.map((tg) => <span key={tg} className="font-mono uppercase tracking-[0.18em] text-[9.5px] text-[#5A5A62] border border-white/[0.06] px-2 py-0.5">{tg}</span>)}
              </div>
            )}
          </div>
        </article>

        <div className="border border-white/[0.06] p-5 mb-10" data-testid="thread-reply-form">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-2">[ ADD A REPLY ]</div>
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} placeholder="Your reply…" data-testid="reply-input" className="w-full bg-transparent border border-white/[0.08] px-3 py-2 font-body text-[14px] text-white focus:border-[#8B5CF6] outline-none" />
          <button disabled={posting || reply.trim().length === 0} onClick={postReply} data-testid="reply-submit" className="mt-3 px-5 py-2 font-mono uppercase tracking-[0.22em] text-[10.5px] border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition disabled:opacity-50">
            {posting ? "[ POSTING… ]" : "[ POST REPLY → ]"}
          </button>
        </div>

        <div className="mb-6 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">[ {data.replies.length} REPL{data.replies.length === 1 ? "Y" : "IES"} ]</div>
        <div className="space-y-4">
          {data.replies.map((r) => (
            <motion.div key={r.reply_id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-[60px_1fr] gap-6 border-t border-white/[0.06] pt-5" data-testid={`reply-${r.reply_id}`}>
              <VoteButtons target_type="reply" target_id={r.reply_id} upvotes={r.upvotes} userVote={data.user_votes_reply?.[r.reply_id] || 0} />
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#4C1D95] flex items-center justify-center text-[10px] font-bold">{r.author_initials}</div>
                  {r.is_verified_ca && <span className="font-mono uppercase tracking-[0.22em] text-[9px] text-[#B4FF39]">✓ CA</span>}
                  <span className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">{r.author_level} · {relTime(r.created_at)}</span>
                </div>
                <div className="font-body text-[15px] text-white/90 whitespace-pre-wrap leading-relaxed">{r.body_markdown}</div>
              </div>
            </motion.div>
          ))}
          {data.replies.length === 0 && <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">no replies yet. be the first.</div>}
        </div>
      </div>
    </AppShell>
  );
}
