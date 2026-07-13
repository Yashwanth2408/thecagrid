import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

export default function StudyGroupDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/community/study-groups/${slug}`).then((r) => setData(r.data)).catch(() => toast.error("Group not found")).finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug]);

  const join = async () => {
    setBusy(true);
    try {
      await api.post(`/community/study-groups/${slug}/join`);
      toast.success("Joined");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not join");
    } finally { setBusy(false); }
  };
  const leave = async () => {
    setBusy(true);
    try {
      await api.post(`/community/study-groups/${slug}/leave`);
      toast.success("Left group");
      load();
    } catch (e) {
      toast.error("Could not leave");
    } finally { setBusy(false); }
  };

  if (loading || !data) return <AppShell breadcrumb="APP / STUDY GROUPS"><div className="p-16 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div></AppShell>;
  const { group, members, is_member } = data;

  return (
    <AppShell breadcrumb={`APP / STUDY GROUPS / ${group.slug.toUpperCase()}`}>
      <GridBackground />
      <div className="relative max-w-[1000px] mx-auto px-6 lg:px-10 py-16" data-testid="study-group-detail-page">
        <Link to="/study-groups" className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62] hover:text-white transition" data-testid="group-back">← ALL GROUPS</Link>
        <header className="mt-6 mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] border border-[#8B5CF6]/30 px-2 py-0.5">[ {group.level_key} ]</span>
            <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">{group.member_count}/{group.max_members} MEMBERS</span>
          </div>
          <h1 className="font-display italic leading-[0.98] tracking-[-0.02em] text-white" style={{ fontSize: "clamp(40px, 7vw, 80px)" }}>{group.name}</h1>
          <p className="mt-5 font-body text-[16px] text-[#B0B0B8] leading-relaxed max-w-[720px]">{group.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(group.topics || []).map((t) => <span key={t} className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62] border border-white/[0.06] px-2 py-0.5">{t}</span>)}
          </div>
          <div className="mt-6">
            {is_member ? (
              <button disabled={busy} onClick={leave} data-testid="group-leave" className="px-5 py-2 font-mono uppercase tracking-[0.22em] text-[10.5px] border border-white/[0.1] text-white/70 hover:border-[#FF6B6B] hover:text-[#FF6B6B] transition disabled:opacity-50">
                {busy ? "[ LEAVING… ]" : "[ LEAVE GROUP ]"}
              </button>
            ) : (
              <button disabled={busy} onClick={join} data-testid="group-join" className="px-5 py-2 font-mono uppercase tracking-[0.22em] text-[10.5px] border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition disabled:opacity-50">
                {busy ? "[ JOINING… ]" : "[ JOIN GROUP → ]"}
              </button>
            )}
          </div>
        </header>

        <div className="mb-10">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ MEMBERS · {members.length} ]</div>
          <div className="flex flex-wrap gap-2" data-testid="group-members">
            {members.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}
                className="border border-white/[0.06] px-3 py-2 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#4C1D95] flex items-center justify-center text-[9px] font-bold">{m.initials}</div>
                <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-white/80">{m.journey_level || "—"}</div>
                {m.is_verified_ca && <span className="font-mono uppercase tracking-[0.22em] text-[9px] text-[#B4FF39]">✓</span>}
                {m.role === "owner" && <span className="font-mono uppercase tracking-[0.22em] text-[9px] text-[#F59E0B]">OWNER</span>}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="border border-white/[0.06] p-6" data-testid="group-info">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-2">[ HOW TO CONNECT ]</div>
          <p className="font-body text-[14px] text-[#B0B0B8] leading-relaxed">
            The Grid provides visibility into who's studying what. Once you're in, coordinate via your favourite chat — Discord / WhatsApp / Telegram — set up an off-platform channel and drop the invite in the group description. Rich real-time chat inside The Grid is planned for a future phase.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
