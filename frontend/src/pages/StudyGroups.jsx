import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

const LEVELS = ["", "Aspiring", "Foundation", "Intermediate", "Articleship", "Final", "Qualified CA"];

export default function StudyGroups() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState("");
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [levelKey, setLevelKey] = useState("Intermediate");
  const [topics, setTopics] = useState("");
  const [maxMembers, setMaxMembers] = useState(20);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (level) params.set("level", level);
    if (q) params.set("q", q);
    api.get(`/community/study-groups?${params}`).then((r) => setItems(r.data.items || [])).catch(() => toast.error("Could not load groups")).finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [level, q]);

  const create = async () => {
    if (name.trim().length < 6) return toast.error("Name too short");
    if (description.trim().length < 10) return toast.error("Description too short");
    setBusy(true);
    try {
      const r = await api.post("/community/study-groups", {
        name: name.trim(), description: description.trim(), level_key: levelKey,
        topics: topics.split(",").map((t) => t.trim()).filter(Boolean),
        max_members: Number(maxMembers) || 20,
      });
      toast.success("Group created");
      window.location.href = `/study-groups/${r.data.slug}`;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not create");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell breadcrumb="APP / STUDY GROUPS">
      <GridBackground />
      <div className="relative max-w-[1200px] mx-auto px-6 lg:px-10 py-16" data-testid="study-groups-page">
        <header className="mb-12">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ STUDY GROUPS ]</div>
          <h1 className="font-display italic leading-[0.96] tracking-[-0.03em]" style={{ fontSize: "clamp(56px, 10vw, 128px)" }}>
            Study together.<br /><span style={{ color: "#8B5CF6" }}>Grind less alone.</span>
          </h1>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">{items.length} GROUPS · JOIN OR START ONE</div>
            <Link to="/community" className="font-mono uppercase tracking-[0.22em] text-[10.5px] px-3 py-1.5 border border-white/[0.08] text-white/70 hover:border-[#8B5CF6] hover:text-[#8B5CF6] transition" data-testid="groups-community-link">
              [ BACK TO FORUMS ]
            </Link>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <select value={level} onChange={(e) => setLevel(e.target.value)} data-testid="groups-level-filter" className="bg-transparent border border-white/[0.08] px-3 py-1.5 font-mono uppercase tracking-[0.18em] text-[11px] text-white focus:border-[#8B5CF6] outline-none">
            {LEVELS.map((l) => <option key={l} value={l}>{l || "ALL LEVELS"}</option>)}
          </select>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="SEARCH GROUPS…" data-testid="groups-search" className="flex-1 min-w-[180px] bg-transparent border border-white/[0.08] px-3 py-1.5 font-mono uppercase tracking-[0.18em] text-[11px] text-white placeholder:text-[#5A5A62] focus:border-[#8B5CF6] outline-none" />
          <button onClick={() => setShowNew((s) => !s)} data-testid="groups-new-btn" className="font-mono uppercase tracking-[0.22em] text-[10.5px] px-3 py-1.5 border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition">
            {showNew ? "[ CANCEL ]" : "[ START GROUP → ]"}
          </button>
        </div>

        {showNew && (
          <div className="border border-white/[0.06] p-5 mb-8" data-testid="groups-new-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="GROUP NAME (6+ chars)" data-testid="new-group-name" className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[13px] text-white focus:border-[#8B5CF6] outline-none" />
              <select value={levelKey} onChange={(e) => setLevelKey(e.target.value)} data-testid="new-group-level" className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono uppercase tracking-[0.18em] text-[11px] text-white focus:border-[#8B5CF6] outline-none">
                {LEVELS.filter(Boolean).map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <input value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="TOPICS (comma separated)" data-testid="new-group-topics" className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono uppercase tracking-[0.14em] text-[11px] text-white placeholder:text-[#5A5A62] focus:border-[#8B5CF6] outline-none" />
              <input type="number" min="3" max="200" value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} placeholder="MAX MEMBERS" data-testid="new-group-max" className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[13px] text-white focus:border-[#8B5CF6] outline-none" />
            </div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Description (10+ chars)" data-testid="new-group-desc" className="mt-3 w-full bg-transparent border border-white/[0.08] px-3 py-2 font-body text-[14px] text-white focus:border-[#8B5CF6] outline-none" />
            <button disabled={busy} onClick={create} data-testid="new-group-submit" className="mt-4 px-5 py-2 font-mono uppercase tracking-[0.22em] text-[10.5px] border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition disabled:opacity-50">
              {busy ? "[ CREATING… ]" : "[ CREATE GROUP → ]"}
            </button>
          </div>
        )}

        {loading && <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((g, i) => (
            <motion.div key={g.slug} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Link to={`/study-groups/${g.slug}`} data-testid={`group-${g.slug}`} className="block border border-white/[0.06] hover:border-[#8B5CF6] transition p-5 group">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] border border-[#8B5CF6]/30 px-2 py-0.5">[ {g.level_key} ]</span>
                  <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">{g.member_count}/{g.max_members} MEMBERS</span>
                </div>
                <div className="font-display italic text-[24px] text-white group-hover:text-[#8B5CF6] transition">{g.name}</div>
                <div className="mt-2 font-body text-[13px] text-[#B0B0B8]">{g.description}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(g.topics || []).map((t) => <span key={t} className="font-mono uppercase tracking-[0.18em] text-[9px] text-[#5A5A62] border border-white/[0.06] px-1.5 py-0.5">{t}</span>)}
                </div>
              </Link>
            </motion.div>
          ))}
          {items.length === 0 && !loading && <div className="col-span-2 py-10 text-center font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">no groups match. try starting one.</div>}
        </div>
      </div>
    </AppShell>
  );
}
