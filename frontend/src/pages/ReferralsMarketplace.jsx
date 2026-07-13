import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function ReferralsMarketplace() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/referrals/marketplace").then((r) => setItems(r.data.items || [])).catch(() => toast.error("Could not load")).finally(() => setLoading(false));
  }, []);

  const apply = async () => {
    if (message.trim().length < 20) return toast.error("Explain your fit (20+ chars)");
    setBusy(true);
    try {
      await api.post(`/referrals/${applyOpen.referral_id}/apply`, { message });
      toast.success("Application sent");
      setApplyOpen(null); setMessage("");
    } catch (e) { toast.error(e?.response?.data?.detail || "Could not apply"); } finally { setBusy(false); }
  };

  return (
    <AppShell breadcrumb="APP / REFERRALS">
      <GridBackground />
      <div className="relative max-w-[1200px] mx-auto px-6 lg:px-10 py-16" data-testid="referrals-market-page">
        <header className="mb-12">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ REFERRAL MARKETPLACE ]</div>
          <h1 className="font-display italic leading-[0.94] tracking-[-0.03em]" style={{ fontSize: "clamp(56px, 10vw, 128px)" }}>
            Trade<br /><span style={{ color: "#8B5CF6" }}>opportunities.</span>
          </h1>
          <div className="mt-8 font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">
            {items.length} OPEN REFERRALS · POSTING REQUIRES ✓ VERIFIED CA
          </div>
        </header>

        {!user?.is_verified_ca && (
          <div className="border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-5 mb-10" data-testid="referrals-locked-hint">
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#F59E0B] mb-2">[ POSTING LOCKED ]</div>
            <div className="font-body text-[14px] text-white/90">Only verified CAs can post referrals. You can browse and apply. Verify from <a href="/community" className="text-[#B4FF39] underline">Community</a>.</div>
          </div>
        )}

        {loading && <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div>}
        <div className="divide-y divide-white/[0.06]">
          {items.map((r, i) => (
            <motion.div key={r.referral_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="py-6 grid grid-cols-1 md:grid-cols-[1fr_130px] gap-6" data-testid={`ref-market-${r.referral_id}`}>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] border border-[#8B5CF6]/30 px-2 py-0.5">[ {r.client_type.toUpperCase()} ]</span>
                  <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">{r.location}</span>
                </div>
                <div className="font-display italic text-[24px] text-white leading-tight">{r.title}</div>
                <div className="mt-2 font-body text-[14px] text-[#B0B0B8] line-clamp-3">{r.description_markdown}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(r.service_needed || []).map((s) => <span key={s} className="font-mono uppercase tracking-[0.14em] text-[9.5px] text-[#5A5A62] border border-white/[0.06] px-1.5 py-0.5">{s}</span>)}
                </div>
              </div>
              <div className="text-right">
                {r.estimated_value && <>
                  <div className="font-display italic text-[24px] text-[#B4FF39]">₹{(r.estimated_value / 100000).toFixed(1)}L</div>
                  <div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">EST. VALUE</div>
                </>}
                <div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62] mt-2">{r.applications_count || 0} APPLICATIONS</div>
                <button onClick={() => setApplyOpen(r)} data-testid={`ref-apply-${r.referral_id}`} className="mt-3 font-mono uppercase tracking-[0.22em] text-[10px] px-3 py-1.5 border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition">
                  [ APPLY → ]
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {applyOpen && (
          <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-6" onClick={() => setApplyOpen(null)}>
            <div className="max-w-md w-full border border-white/[0.08] bg-[#111114] p-6" onClick={(e) => e.stopPropagation()} data-testid="ref-apply-modal">
              <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#B4FF39] mb-2">[ APPLY ]</div>
              <h3 className="font-display italic text-[22px] text-white leading-tight mb-3">{applyOpen.title}</h3>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Why you? Prior experience, capacity, timeline…" data-testid="ref-apply-message" className="w-full bg-transparent border border-white/[0.08] px-3 py-2 font-body text-[14px] text-white placeholder:text-[#5A5A62] focus:border-[#8B5CF6] outline-none" />
              <button disabled={busy} onClick={apply} data-testid="ref-apply-submit" className="mt-3 w-full py-2 font-mono uppercase tracking-[0.22em] text-[10.5px] border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition disabled:opacity-50">
                {busy ? "[ SENDING… ]" : "[ SUBMIT APPLICATION → ]"}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
