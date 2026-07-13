import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

export default function Invite() {
  const [data, setData] = useState(null);
  const [leaders, setLeaders] = useState([]);
  const [emails, setEmails] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => Promise.all([api.get("/referrals/me"), api.get("/referrals/leaderboard?scope=all-time")])
    .then(([a, b]) => { setData(a.data); setLeaders(b.data.items || []); });
  useEffect(() => { load(); }, []);

  const copy = async () => { try { await navigator.clipboard.writeText(data.code); toast.success("Copied"); } catch {} };
  const send = async () => {
    const list = emails.split(/[,\n\s;]+/).map((e) => e.trim()).filter(Boolean).slice(0, 5);
    if (list.length === 0) return toast.error("Add at least 1 email");
    setBusy(true);
    try {
      const r = await api.post("/referrals/invite", { emails: list });
      toast.success(`Invited ${r.data.sent}`);
      setEmails("");
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Could not invite"); }
    finally { setBusy(false); }
  };

  if (!data) return <AppShell breadcrumb="APP / INVITE"><div className="p-16 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div></AppShell>;
  return (
    <AppShell breadcrumb="APP / INVITE">
      <GridBackground />
      <div className="relative max-w-[1100px] mx-auto px-6 lg:px-10 py-16" data-testid="invite-page">
        <header className="mb-12">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ REFERRAL ]</div>
          <h1 className="font-display italic leading-[0.94] tracking-[-0.03em]" style={{ fontSize: "clamp(56px, 10vw, 128px)" }}>
            Bring someone<br /><span style={{ color: "#8B5CF6" }}>to the grid.</span>
          </h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-14">
          <div>
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62] mb-2">YOUR CODE · CLICK TO COPY</div>
            <button onClick={copy} data-testid="invite-code" className="font-mono tabular-nums tracking-widest text-[36px] md:text-[48px] text-white hover:text-[#8B5CF6] transition">{data.code}</button>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div><div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">SENT</div><div className="font-display italic text-[30px] text-white">{data.sent_count}</div></div>
              <div><div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">SIGNED UP</div><div className="font-display italic text-[30px] text-white">{data.signed_up_count}</div></div>
              <div><div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">XP EARNED</div><div className="font-display italic text-[30px] text-[#B4FF39]">{data.xp_earned}</div></div>
            </div>
            {(data.badges_unlocked || []).length > 0 && (
              <div className="mt-4 font-mono uppercase tracking-[0.22em] text-[10px] text-[#F59E0B]">BADGES UNLOCKED · {data.badges_unlocked.join(" · ")}</div>
            )}
          </div>
          <div className="border border-white/[0.06] p-5" data-testid="invite-form">
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#B4FF39] mb-3">[ SEND INVITES · MAX 5 ]</div>
            <textarea value={emails} onChange={(e) => setEmails(e.target.value)} rows={4} placeholder="friend@example.com, colleague@icai.org …" data-testid="invite-emails" className="w-full bg-transparent border border-white/[0.08] px-3 py-2 font-body text-[14px] text-white placeholder:text-[#5A5A62] focus:border-[#8B5CF6] outline-none" />
            <button disabled={busy} onClick={send} data-testid="invite-send" className="mt-3 w-full py-2.5 font-mono uppercase tracking-[0.22em] text-[11px] border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition disabled:opacity-50">
              {busy ? "[ SENDING… ]" : "[ SEND INVITES → ]"}
            </button>
            <div className="mt-3 font-mono uppercase tracking-[0.22em] text-[9px] text-[#5A5A62]">
              +200 XP TO YOU WHEN THEY ONBOARD · +100 XP WELCOME TO THEM
            </div>
          </div>
        </div>

        <div>
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ LEADERBOARD · ALL-TIME · TOP 20 ]</div>
          <div className="divide-y divide-white/[0.06]" data-testid="invite-leaderboard">
            {leaders.length === 0 && <div className="py-6 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">no one on the board yet — you could be first.</div>}
            {leaders.map((l, i) => (
              <motion.div key={l.user_id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="py-4 grid grid-cols-[60px_60px_1fr_80px] gap-4 items-center" data-testid={`leader-${i}`}>
                <div className="font-display italic text-[24px] text-[#8B5CF6]">#{i + 1}</div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#4C1D95] flex items-center justify-center text-[10px] font-bold">{l.initials}</div>
                <div>
                  <div className="font-display italic text-[18px] text-white">{l.name_first}{l.is_verified_ca ? " ✓" : ""}</div>
                  <div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">{l.city || "—"}</div>
                </div>
                <div className="text-right"><div className="font-display italic text-[24px] text-[#B4FF39]">{l.onboarded_count}</div><div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">JOINED</div></div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
