import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

export default function Rooms() {
  const nav = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("Direct Tax");
  const [level, setLevel] = useState("");
  const [publicRoom, setPublicRoom] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/rooms?public=true").then((r) => setRooms(r.data.items)).catch(() => toast.error("Could not load"));
  }, []);

  const create = async () => {
    if (name.trim().length < 4) return toast.error("Name too short");
    setBusy(true);
    try {
      const r = await api.post("/rooms", { name: name.trim(), subject_tag: subject, level_focus: level || null, is_public: publicRoom });
      nav(`/rooms/${r.data.code}`);
    } catch (e) { toast.error(e?.response?.data?.detail || "Could not create"); } finally { setBusy(false); }
  };
  const join = async () => {
    if (!/^[A-Z0-9]{6}$/i.test(joinCode)) return toast.error("Code must be 6 chars");
    try { await api.post(`/rooms/${joinCode.toUpperCase()}/join`); nav(`/rooms/${joinCode.toUpperCase()}`); }
    catch (e) { toast.error(e?.response?.data?.detail || "Could not join"); }
  };

  return (
    <AppShell breadcrumb="APP / ROOMS">
      <GridBackground />
      <div className="relative max-w-[1200px] mx-auto px-6 lg:px-10 py-16" data-testid="rooms-page">
        <header className="mb-12">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ STUDY ROOMS ]</div>
          <h1 className="font-display italic leading-[0.94] tracking-[-0.03em]" style={{ fontSize: "clamp(56px, 10vw, 128px)" }}>
            Focus,<br /><span style={{ color: "#8B5CF6" }}>together.</span>
          </h1>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="border border-white/[0.06] p-5" data-testid="rooms-create-card">
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#B4FF39] mb-3">[ CREATE ROOM ]</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Room name" data-testid="create-room-name" className="w-full bg-transparent border border-white/[0.08] px-3 py-2 font-display italic text-[18px] text-white focus:border-[#8B5CF6] outline-none" />
            <div className="grid grid-cols-2 gap-3 mt-3">
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="SUBJECT TAG" data-testid="create-room-subject" className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono uppercase tracking-[0.18em] text-[11px] text-white focus:border-[#8B5CF6] outline-none" />
              <input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="LEVEL (OPTIONAL)" data-testid="create-room-level" className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono uppercase tracking-[0.18em] text-[11px] text-white focus:border-[#8B5CF6] outline-none" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input type="checkbox" checked={publicRoom} onChange={(e) => setPublicRoom(e.target.checked)} data-testid="create-room-public" id="pubchk" />
              <label htmlFor="pubchk" className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B8B92]">PUBLIC (LISTED)</label>
            </div>
            <button disabled={busy} onClick={create} data-testid="rooms-create-btn" className="mt-4 w-full py-2.5 font-mono uppercase tracking-[0.22em] text-[11px] border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition disabled:opacity-50">
              {busy ? "[ CREATING… ]" : "[ CREATE + JOIN → ]"}
            </button>
          </div>
          <div className="border border-white/[0.06] p-5" data-testid="rooms-join-card">
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-3">[ JOIN BY CODE ]</div>
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={6} placeholder="6-CHAR CODE" data-testid="rooms-join-input" className="w-full bg-transparent border border-white/[0.08] px-3 py-3 font-mono tabular-nums tracking-widest text-[20px] text-white focus:border-[#8B5CF6] outline-none text-center" />
            <button onClick={join} data-testid="rooms-join-btn" className="mt-4 w-full py-2.5 font-mono uppercase tracking-[0.22em] text-[11px] border border-[#8B5CF6] text-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-black transition">
              [ JOIN ROOM → ]
            </button>
          </div>
        </div>

        <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ PUBLIC ROOMS · {rooms.length} ]</div>
        <div className="divide-y divide-white/[0.06]" data-testid="rooms-list">
          {rooms.length === 0 && <div className="py-6 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">no public rooms right now. start one.</div>}
          {rooms.map((r, i) => (
            <motion.div key={r.room_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Link to={`/rooms/${r.code}`} data-testid={`room-${r.code}`} className="py-5 grid grid-cols-[110px_1fr_120px_50px] gap-4 items-center hover:bg-white/[0.02] transition">
                <div className="font-mono tabular-nums tracking-[0.14em] text-[16px] text-[#B4FF39]">{r.code}</div>
                <div>
                  <div className="font-display italic text-[22px] text-white leading-tight">{r.name}</div>
                  <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62] mt-1">{r.subject_tag} {r.level_focus ? `· ${r.level_focus}` : ""}</div>
                </div>
                <div>
                  <div className="font-display italic text-[22px] text-white">{r.presence_count}</div>
                  <div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">IN THE ROOM</div>
                </div>
                <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] text-right">→</div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
